# FastFood Project

## Added in this update
- Full **Admin Dashboard Panel** page: `admin.html`.
- Dashboard sections:
  - CRUD Analysis
  - Logs
  - Products Management
  - Users Management
  - Orders Management
  - Coupons Management
  - Notifications Management
- PWA support with:
  - `manifest.webmanifest`
  - `sw.js`
  - "Install Get The App" button in sidebar
- Direct food APIs added in dashboard table and used to preload product samples.
- Notification types implemented in dashboard:
  - `system` => all users
  - `delivery` => specific user
  - `order_update` => specific user
  - `promotion`

## Run
```bash
npm install
npm start
```

Open:
- Register: `http://localhost:3000/register.html`
- Login: `http://localhost:3000/login.html`
- Admin: `http://localhost:3000/admin.html`

## Check syntax
```bash
npm run check
```
