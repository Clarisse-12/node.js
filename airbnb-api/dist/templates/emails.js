"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordResetSuccessEmail = exports.passwordResetEmail = exports.bookingCancellationEmail = exports.bookingConfirmationEmail = exports.welcomeEmail = void 0;
const BRAND_COLOR = "#FF5A5F";
const getAppUrl = () => {
    const appUrl = process.env["APP_URL"];
    if (appUrl) {
        return appUrl.replace(/\/$/, "");
    }
    const apiUrl = (process.env["API_URL"] ?? "http://localhost:3000").replace(/\/$/, "");
    return apiUrl.replace(/\/api\/v1$/, "");
};
const baseTemplate = (title, content) => {
    return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; max-width: 640px; margin: 0 auto; line-height: 1.5;">
      <h2 style="color: ${BRAND_COLOR}; margin-bottom: 16px;">${title}</h2>
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;">
        ${content}
      </div>
      <p style="font-size: 12px; color: #6b7280; margin-top: 16px;">Airbnb API notifications</p>
    </div>
  `;
};
const button = (label, href) => {
    return `<a href="${href}" style="display: inline-block; background: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-weight: 600;">${label}</a>`;
};
const welcomeEmail = (name, role) => {
    const roleText = role === "HOST"
        ? "Start by creating your first listing and welcome your first guests."
        : "Explore amazing listings and plan your next stay.";
    return baseTemplate("Welcome to Airbnb", `
      <p>Hi ${name},</p>
      <p>Your account has been created successfully.</p>
      <p>${roleText}</p>
      <p style="margin-top: 16px;">${button("Open Airbnb", `${getAppUrl()}/app`)}</p>
    `);
};
exports.welcomeEmail = welcomeEmail;
const bookingConfirmationEmail = (guestName, listingTitle, location, checkIn, checkOut, totalPrice) => {
    return baseTemplate("Booking Confirmed", `
      <p>Hi ${guestName},</p>
      <p>Your booking has been confirmed.</p>
      <p><strong>Listing:</strong> ${listingTitle}</p>
      <p><strong>Location:</strong> ${location}</p>
      <p><strong>Check-in:</strong> ${checkIn}</p>
      <p><strong>Check-out:</strong> ${checkOut}</p>
      <p><strong>Total price:</strong> $${totalPrice.toFixed(2)}</p>
      <p style="margin-top: 12px;">Cancellation policy applies according to listing terms and booking window.</p>
      <p style="margin-top: 16px;">${button("Open Airbnb", `${getAppUrl()}/app`)}</p>
    `);
};
exports.bookingConfirmationEmail = bookingConfirmationEmail;
const bookingCancellationEmail = (guestName, listingTitle, checkIn, checkOut) => {
    return baseTemplate("Booking Cancelled", `
      <p>Hi ${guestName},</p>
      <p>Your booking for <strong>${listingTitle}</strong> has been cancelled.</p>
      <p><strong>Check-in:</strong> ${checkIn}</p>
      <p><strong>Check-out:</strong> ${checkOut}</p>
      <p style="margin-top: 12px;">You can find another great place anytime.</p>
      <p>${button("Find Listings", `${getAppUrl()}/app`)}</p>
    `);
};
exports.bookingCancellationEmail = bookingCancellationEmail;
const passwordResetEmail = (name, resetLink) => {
    return baseTemplate("Reset Your Password", `
      <p>Hi ${name},</p>
      <p>Click the button below to reset your password.</p>
      <p style="margin-top: 16px;">${button("Reset Password", resetLink)}</p>
      <p style="margin-top: 12px;"><strong>This link expires in 1 hour.</strong></p>
      <p>If you did not request this, ignore this email.</p>
    `);
};
exports.passwordResetEmail = passwordResetEmail;
const passwordResetSuccessEmail = (name) => {
    return baseTemplate("Password Reset Successful", `
      <p>Hi ${name},</p>
      <p>Your password has been reset successfully.</p>
      <p>If you did not make this change, please contact support immediately.</p>
    `);
};
exports.passwordResetSuccessEmail = passwordResetSuccessEmail;
