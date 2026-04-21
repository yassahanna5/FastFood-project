# FastFood Auth (HTML/CSS/JS + Node + Express + MongoDB)

## Features
- Register page with:
  - first name, last name, email, password, repeat password.
  - strong password policy (>=8, upper, lower, number, special).
  - password strength meter.
  - confirm password match check.
- Login page with:
  - email + password validation against DB.
  - Remember me session extension.
  - link to forgot-password page.
- Forgot/Reset page:
  - request reset code by email.
  - reset password with code and new strong password.
- Tooltip on interactive buttons/links using Bootstrap 5 Tooltip.
- UI style inspired by the shared food auth design.

## Tech
- HTML, CSS, Vanilla JS
- Bootstrap 5
- Node.js + Express
- MongoDB + Mongoose

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   cp .env.example .env
   ```
3. Put your Mongo URI and session secret in `.env`.
4. Run project:
   ```bash
   npm start
   ```
5. Open:
   - Register: `http://localhost:3000/register.html`
   - Login: `http://localhost:3000/login.html`
   - Forgot/Reset: `http://localhost:3000/forgot-password.html`

## Important security note
- Current forgot-password flow returns reset code in API response for demo/testing.
- For production: integrate real email service (SMTP/SendGrid/etc.) and never expose code to frontend.
