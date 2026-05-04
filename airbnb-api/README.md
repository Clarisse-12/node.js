# Airbnb API

A full-stack Airbnb-style listings platform built with Node.js, Express, TypeScript, Prisma, PostgreSQL, and a small browser-based demo frontend.

The backend provides authentication, users, listings, bookings, reviews, file uploads, email notifications, rate limiting, caching, and Swagger documentation. The bundled frontend in `frontend/` is a lightweight API playground that lets you explore the system from the browser.

## Features

- JWT-based authentication with register, login, profile, password change, forgot password, and reset password flows.
- Role-based access for `HOST` and `GUEST` users.
- Listings CRUD with search, statistics, and host ownership rules.
- Bookings CRUD with status updates, booking totals, and email notifications.
- Reviews for listings with create, list, and delete operations.
- Cloudinary-powered avatar and listing photo uploads.
- PostgreSQL persistence through Prisma.
- Swagger UI and raw OpenAPI JSON for interactive API exploration.
- Static demo frontend served from the same backend.

## Tech Stack

- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JSON Web Tokens
- bcrypt
- Nodemailer
- Cloudinary
- Swagger / OpenAPI
- Multer
- express-rate-limit
- compression

## Project Structure

```text
airbnb-api/
├─ README.md
├─ render.yaml
├─ package.json
├─ prisma.config.ts
├─ src/
│  ├─ index.ts
│  ├─ config/
│  ├─ controllers/
│  ├─ middlewares/
│  ├─ models/
│  ├─ routes/
│  ├─ templates/
│  └─ utils/
├─ prisma/
│  ├─ schema.prisma
│  ├─ seed.ts
│  └─ migrations/
└─ frontend/
   ├─ README.md
   ├─ public/
   │  ├─ index.html
   │  └─ styles.css
   ├─ src/
   │  └─ app.ts
   └─ dist/
      └─ app.js
```

The backend code lives under `src/`, Prisma schema and migrations live under `prisma/`, and the browser demo frontend lives under `frontend/`.

## Prerequisites

- Node.js 20+ recommended
- PostgreSQL database
- Cloudinary account for image uploads
- SMTP credentials for email notifications

## Environment Variables

Create a `.env` file in the project root with the variables below.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma |
| `JWT_SECRET` | Yes | Secret used to sign and verify JWT tokens |
| `JWT_EXPIRES_IN` | No | Token lifetime, default: `7d` |
| `PORT` | No | Server port, default: `3000` |
| `API_URL` | No | Base URL used in password reset emails, default: `http://localhost:3000` |
| `CLOUDINARY_CLOUD_NAME` | Yes for uploads | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes for uploads | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes for uploads | Cloudinary API secret |
| `EMAIL_HOST` | Yes for email features | SMTP host |
| `EMAIL_PORT` | No | SMTP port, default: `587` |
| `EMAIL_SECURE` | No | Set to `true` when using SSL SMTP |
| `EMAIL_ALLOW_SELF_SIGNED` | No | Set to `true` to allow self-signed SMTP certificates in dev |
| `EMAIL_USER` | Yes for email features | SMTP username |
| `EMAIL_PASS` | Yes for email features | SMTP password |
| `EMAIL_FROM` | Yes for email features | Sender address used in outgoing email |
| `NODE_ENV` | No | Controls logging behavior |

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your `.env` file and set the variables listed above.

3. Run database migrations:

   ```bash
   npx prisma migrate dev
   ```

4. Seed the database if you want starter data:

   ```bash
   npx prisma db seed
   ```

## Development

Start the API in watch mode:

```bash
npm run dev
```

The server runs at `http://localhost:3000` by default.

## Build and Start

Compile the TypeScript sources:

```bash
npm run build
```

Run the app:

```bash
npm start
```

For production database migrations, use:

```bash
npm run migrate
```

## Frontend Demo

The browser demo is served by the backend and available at:

- `http://localhost:3000/app`

It loads the static shell from `frontend/public/` and the compiled client script from `frontend/dist/`.

If you change the frontend TypeScript, rebuild it with:

```bash
npx tsc -p frontend/tsconfig.json
```

## API Documentation

Swagger UI:

- `http://localhost:3000/api/v1/api-docs`

Raw OpenAPI JSON:

- `http://localhost:3000/api/v1/api-docs.json`

Health check:

- `http://localhost:3000/health`

## Main API Areas

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/change-password`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password/:token`
- `GET /api/v1/users`
- `POST /api/v1/users`
- `GET /api/v1/users/:id`
- `PUT /api/v1/users/:id`
- `DELETE /api/v1/users/:id`
- `GET /api/v1/users/:id/listings`
- `GET /api/v1/users/:id/bookings`
- `GET /api/v1/listings`
- `POST /api/v1/listings`
- `GET /api/v1/listings/search`
- `GET /api/v1/listings/stats`
- `GET /api/v1/listings/:id`
- `PUT /api/v1/listings/:id`
- `DELETE /api/v1/listings/:id`
- `GET /api/v1/bookings`
- `POST /api/v1/bookings`
- `GET /api/v1/bookings/:id`
- `PUT /api/v1/bookings/:id`
- `DELETE /api/v1/bookings/:id`
- `GET /api/v1/listings/:id/reviews`
- `POST /api/v1/listings/:id/reviews`
- `DELETE /api/v1/listings/:listingId/reviews/:id`
- `POST /api/v1/users/:id/avatar`
- `DELETE /api/v1/users/:id/avatar`
- `POST /api/v1/listings/:id/photos`
- `DELETE /api/v1/listings/:id/photos/:photoId`

## Deployment Notes

The repository includes a `render.yaml` configuration for deployment on Render. Make sure the production environment is configured with the same required variables, especially `DATABASE_URL`, `JWT_SECRET`, Cloudinary credentials, and SMTP credentials.

## Notes

- Backend roles are `HOST` and `GUEST`.
- The bundled demo frontend labels those roles as Admin and User for convenience.
- File uploads are limited to `jpeg`, `png`, and `webp` images up to 5 MB.
- The API uses rate limiting and compression by default.
