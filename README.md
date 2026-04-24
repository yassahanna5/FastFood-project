# King Food Project

## Admin Login
- Email: `Admin2030@gmail.com`
- Password: `Admin2030KingFood`

## Mongo
Set `.env`:
```env
PORT=3000
MONGO_URI=mongodb+srv://drantonhanna2005_db_user:g9h6ArdIDaWQBSRo@cluster0.iygqaqj.mongodb.net/
SESSION_SECRET=change_me_to_a_long_random_secret
```

## Features
- Register/Login/Forgot/Reset with password show/hide eye icon.
- Admin dashboard with MongoDB CRUD for:
  - categories
  - products
  - orders (status/update/view only)
  - users (update role/send email log)
  - coupons
  - notifications
  - logs
  - analytics from real Mongo data.
- Import 15 food categories/products from provided APIs to MongoDB.

## Run
```bash
npm install
npm start
```
