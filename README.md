# King Food Project

## Admin Login
- Email: `Admin2030@gmail.com`
- Password: `Admin2030KingFood`

## Mongo + Gmail SMTP
Set `.env`:
```env
PORT=3000
MONGO_URI=mongodb+srv://drantonhanna2005_db_user:g9h6ArdIDaWQBSRo@cluster0.iygqaqj.mongodb.net/
SESSION_SECRET=change_me_to_a_long_random_secret
SMTP_USER=yourgmail@gmail.com
SMTP_PASS=your_gmail_app_password
```

> For real Gmail inbox delivery, use Gmail App Password in `SMTP_PASS`.

## Features
- Password eye toggle in login/register/forgot-reset pages.
- Register blocks duplicated email and shows red "already exist" warning.
- Fully responsive pages for mobile/tablet/desktop.
- Admin dashboard with hamburger menu on phone.
- MongoDB CRUD for categories/products/orders/users/coupons/notifications/logs/analytics.
- Import 15 food API categories and products into MongoDB.
