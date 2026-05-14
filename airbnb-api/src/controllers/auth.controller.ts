import crypto from "crypto";
import { NextFunction, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendEmail } from "../config/email.js";
import { passwordResetEmail, passwordResetSuccessEmail, welcomeEmail } from "../templates/emails.js";
import { getOptimizedUrl } from "../config/cloudinary.js";

const getJwtSecret = (): string => {
  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
};

const getJwtExpiresIn = (): string => process.env["JWT_EXPIRES_IN"] ?? "7d";

const getAppUrl = (): string => {
  const appUrl = process.env["APP_URL"];
  if (appUrl) {
    return appUrl.replace(/\/$/, "");
  }

  const apiUrl = (process.env["API_URL"] ?? "http://localhost:3000").replace(/\/$/, "");
  return apiUrl.replace(/\/api\/v1$/, "");
};

const sanitizeUser = <T extends Record<string, unknown>>(user: T): T => {
  const safeUser = { ...user } as Record<string, unknown>;
  delete safeUser.password;
  delete safeUser.resetToken;
  delete safeUser.resetTokenExpiry;
  return safeUser as T;
};

const isRole = (value: unknown): value is Role => value === Role.HOST || value === Role.GUEST;

export const register = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, username, phone, password, role } = req.body as {
      name?: string;
      email?: string;
      username?: string;
      phone?: string;
      password?: string;
      role?: string;
    };

    if (!name || !email || !username || !phone || !password) {
      res.status(400).json({ message: "Missing required fields: name, email, username, phone, password" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ message: "Password must be at least 8 characters" });
      return;
    }

    const normalizedRole = typeof role === "string" ? role.toUpperCase() : undefined;
    if (normalizedRole !== undefined && !isRole(normalizedRole)) {
      res.status(400).json({ message: "Invalid role. Allowed roles: guest, host" });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ message: "Email already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const roleToCreate = (normalizedRole as Role | undefined) ?? Role.GUEST;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        username,
        phone,
        password: hashedPassword,
        role: roleToCreate
      }
    });


    res.status(201).json(sanitizeUser(user));

    void sendEmail(email, "Welcome to Airbnb!", welcomeEmail(name, roleToCreate)).catch((emailError) => {
      console.warn("Welcome email failed", {
        operation: "register",
        message: emailError instanceof Error ? emailError.message : emailError
      });
    });
  } catch (error) {
    next({ error, operation: "register" });
  }
};

export const login = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ message: "Missing required fields: email, password" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: "Account disabled" });
      return;
    }

    const userPassword = (user as { password?: string }).password;
    if (!userPassword) {
      res.status(500).json({ message: "User password is not available" });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, userPassword);
    if (!passwordMatches) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      getJwtSecret(),
      { expiresIn: getJwtExpiresIn() as jwt.SignOptions["expiresIn"] }
    );

    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    next({ error, operation: "login" });
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId }
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.role === "ADMIN") {
      res.json(sanitizeUser(user));
      return;
    }

    if (user.role === Role.HOST) {
      const host = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          listings: {
            include: {
              photos: {
                select: {
                  id: true,
                  url: true,
                  publicId: true
                }
              }
            }
          }
        }
      });

      if (!host) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.json(
        sanitizeUser({
          ...host,
          listings: host.listings.map((listing) => ({
            ...listing,
            photos: listing.photos.map((photo) => ({
              ...photo,
              optimizedUrl: getOptimizedUrl(photo.url, 600, 400)
            }))
          }))
        })
      );
      return;
    }

    const guest = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        bookings: {
          include: {
            listing: true
          }
        }
      }
    });

    if (!guest) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(sanitizeUser(guest));
  } catch (error) {
    next({ error, operation: "getMe" });
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: "Missing required fields: currentPassword, newPassword" });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ message: "Password must be at least 8 characters" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const userPassword = (user as { password?: string }).password;
    if (!userPassword) {
      res.status(500).json({ message: "User password is not available" });
      return;
    }

    const currentPasswordMatches = await bcrypt.compare(currentPassword, userPassword);
    if (!currentPasswordMatches) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    next({ error, operation: "changePassword" });
  }
};

export const forgotPassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      res.status(400).json({ message: "Missing required field: email" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    let resetLink: string | null = null;

    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: hashedToken,
          resetTokenExpiry
        }
      });

      resetLink = `${getAppUrl()}/app?resetToken=${rawToken}`;
    }

    res.status(200).json({ message: "If that email is registered, a reset link has been sent" });

    if (user && resetLink) {
      void sendEmail(
        user.email,
        "Reset your Airbnb password",
        passwordResetEmail(user.name, resetLink)
      ).catch((emailError) => {
        console.warn("Password reset email failed", {
          operation: "forgotPassword",
          message: emailError instanceof Error ? emailError.message : emailError
        });
      });
    }
  } catch (error) {
    next({ error, operation: "forgotPassword" });
  }
};

export const resetPassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.params["token"];
    const { newPassword } = req.body as { newPassword?: string };

    if (!newPassword) {
      res.status(400).json({ message: "Missing required field: newPassword" });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ message: "Password must be at least 8 characters" });
      return;
    }

    const hashedToken = crypto.createHash("sha256").update(String(token)).digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: {
          gt: new Date()
        }
      } as never
    });

    if (!user) {
      res.status(400).json({ message: "Invalid or expired reset token" });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    res.status(200).json({ message: "Password reset successfully" });

    void sendEmail(
      user.email,
      "Password Reset Successful",
      passwordResetSuccessEmail(user.name)
    ).catch((emailError) => {
      console.warn("Password reset success email failed", {
        operation: "resetPassword",
        message: emailError instanceof Error ? emailError.message : emailError
      });
    });
  } catch (error) {
    next({ error, operation: "resetPassword" });
  }
};