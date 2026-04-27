# Frontend App

This folder contains a simple app-style frontend built with HTML, CSS, and TypeScript.

## Features

- Login with email and role choice: Admin or User
- Signup with role choice: Admin or User
- Admin dashboard:
  - Post new listings
  - View own listings
- User dashboard:
  - View listings
  - Create bookings
  - View own bookings

## Run

1. Build frontend assets:

   npm run frontend:build

2. Start backend server:

   npm run dev

3. Open in browser:

   http://localhost:3000/app

If port 3000 is busy:

1. Start with another port:

   $env:PORT=3001; npm run dev

2. Open:

   http://localhost:3001/app

## Notes

- Backend currently has no password field or JWT auth, so login is based on email and chosen role.
- Role mapping in frontend:
  - Admin -> HOST
  - User -> GUEST
- Booking dates are sent as YYYY-MM-DD.
