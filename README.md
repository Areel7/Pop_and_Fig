# Pop & Figs — Full-Stack E-commerce

A complete store for pops, minifigures and collectibles: a customer storefront, a customer account area and an admin panel, backed by a REST API and MongoDB.

```
React (Vite) ──► RTK Query ──► Express REST API ──► MongoDB
                                   │
                                   └──► Gmail API (OAuth 2.0, store account) — order-completion emails
Contact form ──► EmailJS (browser) — contact messages only
```

- **Frontend** (`frontend/`): React 19, Vite, React Router, Redux Toolkit + RTK Query, Tailwind CSS v4, lucide-react.
- **Backend** (`backend/`): Node.js, Express 5, MongoDB/Mongoose, JWT in an httpOnly cookie, bcrypt, Zod validation, Helmet, rate limiting, CORS.

---

## Contents

1. [Project overview](#1-project-overview)
2. [Frontend setup](#2-frontend-setup)
3. [Backend setup](#3-backend-setup)
4. [MongoDB setup](#4-mongodb-setup)
5. [Environment variables](#5-environment-variables)
6. [Admin account setup](#6-admin-account-setup)
7. [Gmail API setup (Google Cloud)](#7-gmail-api-setup-google-cloud)
8. [Gmail OAuth refresh-token setup](#8-gmail-oauth-refresh-token-setup)
9. [EmailJS setup (contact form)](#9-emailjs-setup-contact-form)
10. [Running the frontend](#10-running-the-frontend)
11. [Running the backend](#11-running-the-backend)
12. [Build commands](#12-build-commands)
13. [Production deployment notes](#13-production-deployment-notes)
14. [How to authorize the store Gmail account](#14-how-to-authorize-the-store-gmail-account)
15. [Troubleshooting Gmail OAuth](#15-troubleshooting-gmail-oauth)
16. [How to test the order-completion email](#16-how-to-test-the-order-completion-email)
17. [API reference](#17-api-reference)
18. [Business rules](#18-business-rules)

---

## 1. Project overview

**Storefront** — Home (hero and promo configurable in Admin Settings), Shop (search, category, price, sale, stock and condition filters, sorting, pagination), Categories, Product details (gallery, reviews, related products), Search, Cart, Checkout, Wishlist, Contact, Login / Sign up / Forgot & Reset password.

**Customer account** (`/account`) — overview, profile and default address, password change, order history and order details (with timeline, cancel while pending), wishlist, own reviews (edit/delete).

**Admin panel** — `/fahad-azeem-pop-and-figs-admin-fahad-login` (dashboard at `…/dashboard`). The unusual URL is intentional but it is **not** the security mechanism: every `/api/admin/*` endpoint verifies (1) a valid session and (2) the `admin` role.

- Dashboard: revenue, orders, products, customers, pending/completed orders, reviews, revenue and orders over time, top-selling products, **top customers by total spending**, recent orders — all computed from MongoDB.
- Products (CRUD, images, stock, featured, enable/disable, explicit **On sale** switch with sale price), Categories (CRUD, image, activate/deactivate, safe delete), Orders (status workflow, payment status, completion email status + retry), Customers (spending stats, block/unblock), Reviews (hide/publish/delete), Discounts / Sales (sale campaigns for all products, products or categories), Settings (colors, fonts, hero, promo, store info, shipping, social links, Gmail status and test email).

### Currency

```text
Store currency: PKR (Pakistani Rupee)
Display symbol: ₨   e.g. ₨ 2,500 · ₨ 12,500
```

- MongoDB stores plain numbers (`price: 2500`) — never formatted strings. All calculations (unit price × quantity = subtotal, subtotal + shipping = total) use these numeric PKR values on the backend.
- Display goes through one formatter: `formatPrice()` in `frontend/src/utils/format.js` (and `backend/Utils/currency.js` for emails). There is no currency setting; PKR is a business rule.
- The Unicode rupee sign `₨` (U+20A8) is drawn as an “Rs” glyph by most fonts, including Inter.

### Product sales (no coupons)

- A new product is **not on sale** (`onSale: false`, `salePrice: null`, `discountPercent: 0`).
- The admin turns **On sale** on explicitly and enters a sale price; the backend requires `0 < salePrice < price` and rejects anything else (the product is not saved). Turning the sale off forces `salePrice = null`.
- The discount is always calculated, never typed: `discount = round((price − salePrice) / price × 100)` → shown as “20% OFF”.
- Orders use `salePrice` when the product is on sale, otherwise `price`. A running sale campaign (Admin → Discounts / Sales) can lower the price further; the lowest price wins.
- The coupon system has been removed completely — there is no coupon code at checkout. Checkout is **Subtotal + Shipping = Total**.

### Folder structure

```
backend/
  Config/        env.js (loads root .env), db.js, gmail.js (Gmail OAuth + send)
  Controllers/   auth, googleAuth, user, product, category, order, review, discount, settings, admin
  Middlewares/   authMiddleware (authenticate / authorizeAdmin / optionalAuth), validate, security, upload, errorMiddleware
  Models/        User, Product, Category, Order, Review, Discount, Settings
  Routes/        one router per resource (+ adminRoutes)
  Services/      pricingService, orderService, emailService, emailTemplates, uploadService, adminBootstrap
  Validators/    schemas.js (Zod)
  Scripts/       createAdmin.js
  index.js
frontend/src/
  main.jsx       all routes (createBrowserRouter)
  App.jsx        storefront shell: Navbar + page + Footer
  layouts/       RootLayout (theme, session, cart sync, toasts), AdminLayout
  redux/         store.js, features/(auth, cart), api/(apiSlice + one file per domain)
  components/    common, forms, products, cart, orders, admin
  pages/         Home, Shop, Category, ProductDetails, Search, Cart, Checkout, Wishlist, Contact, Auth, Account, Admin/*
  hooks/, utils/
```

---

## 2. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env     # then fill in the EmailJS values (optional)
```

In development the frontend calls `/api/...` on its own origin and Vite proxies it to `http://localhost:5000`, so the auth cookie stays first-party. Leave `VITE_API_URL` empty for local development.

## 3. Backend setup

From the project root:

```bash
npm install              # backend dependencies (root package.json)
cp .env.example .env     # then edit the values
```

Or install everything at once: `npm run install:all`.

## 4. MongoDB setup

Use either:

- **Local MongoDB** (Community Server 6+ running as a service): `MONGODB_URI=mongodb://localhost:27017/popandfigs`
- **MongoDB Atlas**: create a cluster → Database Access (user) → Network Access (allow your IP / host) → copy the connection string: `MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.xxxx.mongodb.net/popandfigs`

Collections and indexes are created automatically on first start. (`MONGO_URI` is still accepted for backwards compatibility.)

## 5. Environment variables

### Backend — project root `.env` (never commit it; never prefix with `VITE_`)

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | yes | `development` or `production` |
| `PORT` | no | API port (default `5000`) |
| `MONGODB_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Long random secret (32+ characters; enforced in production). Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | no | Session length (default `7d`) |
| `CLIENT_URL` | yes | Storefront origin(s) for CORS and email links, comma separated (e.g. `http://localhost:5173`) |
| `SERVER_URL` | no | Public API origin, used in URLs of locally stored uploads (e.g. `http://localhost:5000`) |
| `COOKIE_SAMESITE` | no | `lax` (default). Use `none` when frontend and API are on different sites (requires HTTPS) |
| `GMAIL_CLIENT_ID` | for email | Google OAuth client ID |
| `GMAIL_CLIENT_SECRET` | for email | Google OAuth client secret |
| `GMAIL_REDIRECT_URI` | for email | `http://localhost:5000/api/auth/google/callback` (must match Google Cloud exactly) |
| `GMAIL_REFRESH_TOKEN` | for email | Obtained once via the setup flow (section 8) |
| `GMAIL_SENDER_EMAIL` | for email | The store Gmail address that authorized the app |
| `GMAIL_SENDER_NAME` | no | Display name for outgoing mail (default `Pop & Figs`) |
| `GMAIL_OAUTH_SETUP_ENABLED` | no | `true` enables `/api/auth/google`; set `false` after setup |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | optional | Image hosting. If empty, uploads are saved to `/uploads` on the server |
| `CLOUDINARY_FOLDER` | no | Cloudinary folder (default `pop-and-figs`) |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | first run | First admin account (section 6) |

### Frontend — `frontend/.env` (everything here is public, bundled into the browser)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Empty in development (Vite proxy). In production: the API origin, e.g. `https://api.popandfigs.com` |
| `VITE_DEV_API_PROXY` | Dev proxy target (default `http://localhost:5000`) |
| `VITE_EMAILJS_SERVICE_ID` | EmailJS service ID (contact form) |
| `VITE_EMAILJS_TEMPLATE_ID` | EmailJS template ID |
| `VITE_EMAILJS_PUBLIC_KEY` | EmailJS public key (safe to expose) |

> **Never** put `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `JWT_SECRET` or `CLOUDINARY_API_SECRET` in any `VITE_` variable. `.env`, `.env.*` and `.secrets/` are git-ignored; the `.env.example` files are committed.

## 6. Admin account setup

1. In the root `.env` set `ADMIN_EMAIL`, `ADMIN_PASSWORD` (8+ characters) and optionally `ADMIN_NAME`.
2. Either restart the backend (the account is created automatically if it does not exist) **or** run:

   ```bash
   npm run create-admin            # create, or promote an existing user with that email to admin
   npm run create-admin -- --reset # also reset its password to ADMIN_PASSWORD
   ```

3. Log in at `http://localhost:5173/fahad-azeem-pop-and-figs-admin-fahad-login`.

An existing password is never overwritten unless you pass `--reset`. You may remove `ADMIN_PASSWORD` from `.env` after the account exists.

## 7. Gmail API setup (Google Cloud)

Order-completion emails are sent **by the backend** through the Gmail API using OAuth 2.0 on behalf of the **store owner's Gmail account**. No Gmail password is used or stored, and customers never authorize anything — their address is only the recipient.

1. Go to <https://console.cloud.google.com/> and create/select a project (e.g. "Pop & Figs").
2. **APIs & Services → Library** → search **Gmail API** → **Enable**.
3. Open **Google Auth Platform** (APIs & Services → OAuth consent screen).
4. **Branding**: app name (e.g. "Pop & Figs Store"), support email, developer contact email. Save.
5. **Audience**: user type **External** (or Internal for Google Workspace). While the app is in *Testing*, add the store Gmail address under **Test users**.
6. **Data access → Add or remove scopes** → add `https://www.googleapis.com/auth/gmail.send` (the only scope needed — send-only). Save.
7. **Clients → Create client** → Application type **Web application** → name "Pop & Figs backend".
8. **Authorized redirect URIs** → add exactly:
   ```
   http://localhost:5000/api/auth/google/callback
   ```
9. Create, then copy the **Client ID** and **Client secret** into the root `.env`:
   ```env
   GMAIL_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   GMAIL_CLIENT_SECRET=xxxxxxxx
   GMAIL_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
   GMAIL_SENDER_EMAIL=popandfigs@gmail.com
   ```
10. Restart the backend.

> **Refresh-token lifetime:** while the OAuth app's publishing status is **Testing**, Google expires refresh tokens after **7 days**. For a long-lived token, set the audience to **In production** (Audience → Publish app). For a single store account you can use the app unverified; Google shows an "unverified app" warning once during authorization, which the store owner can accept (Advanced → Go to app).

## 8. Gmail OAuth refresh-token setup

The backend provides a one-time, admin-only setup flow:

- `GET /api/auth/google` — builds the Google authorization URL (client ID, redirect URI, `gmail.send` scope, `access_type=offline`, `prompt=consent`, CSRF `state`) and redirects to Google. Requires an **admin session** in the same browser.
- `GET /api/auth/google/callback` — verifies `state`, exchanges the authorization code for tokens, **saves the refresh token to the backend `.env`** as `GMAIL_REFRESH_TOKEN` and activates it immediately (no restart). If `.env` cannot be written (e.g. a read-only host) it falls back to `.secrets/gmail-refresh-token.txt` (git-ignored, mode 600) and tells you to copy it into your environment. The token is **never** returned in an HTTP response, shown on the page or written to logs.

After authorizing (section 14) you can set `GMAIL_OAUTH_SETUP_ENABLED=false` to disable the setup routes.

If anything is missing, the backend says exactly what — e.g. `Gmail API is not configured. Missing: GMAIL_REFRESH_TOKEN` — in the server log at start-up, in **Settings → Email / Gmail**, and on the order's completion-email card (secret values are never shown).

At runtime the backend exchanges the refresh token for short-lived access tokens (cached until shortly before expiry) and sends RFC 2822 messages via `POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send`.

## 9. EmailJS setup (contact form)

EmailJS is used **only** for the contact form (`/contact`). Order emails never use EmailJS.

1. Create an account at <https://www.emailjs.com/>.
2. **Email Services → Add New Service** (e.g. Gmail) → note the **Service ID**.
3. **Email Templates → Create New Template**. Use these variables:
   - Subject: `New message: {{subject}}`
   - Body: `From: {{from_name}} <{{from_email}}>` … `{{message}}` … (optionally `{{store_name}}`)
   - Reply-To: `{{reply_to}}`
   Note the **Template ID**.
4. **Account → General** → copy the **Public Key**.
5. Put them in `frontend/.env`:
   ```env
   VITE_EMAILJS_SERVICE_ID=service_xxx
   VITE_EMAILJS_TEMPLATE_ID=template_xxx
   VITE_EMAILJS_PUBLIC_KEY=xxxxxxxx
   ```
6. Restart the Vite dev server (env files are read at start-up). In EmailJS → Account → Security you can restrict requests to your domain.

If these are missing, the form validates normally and shows a friendly "not configured" message instead of failing silently.

## 10. Running the frontend

```bash
npm run frontend          # from the root, or: cd frontend && npm run dev
```

Open <http://localhost:5173>.

## 11. Running the backend

```bash
npm run backend           # nodemon, restarts on changes in backend/
npm start                 # plain node (production)
```

API: <http://localhost:5000/api> · health check: `GET /api/health`.

Run both together: `npm run dev` (or `npm run fullstack`).

## 12. Build commands

```bash
npm run build             # builds the frontend into frontend/dist
cd frontend && npm run lint
cd frontend && npm run preview   # preview the production build
```

## 13. Production deployment notes

- **Backend**: `NODE_ENV=production`, strong `JWT_SECRET` (32+ chars, enforced), MongoDB Atlas URI, `CLIENT_URL=https://your-store.com`, `SERVER_URL=https://api.your-store.com`. Start with `npm start` behind HTTPS (the app sets `trust proxy` for platforms such as Render/Railway/Heroku/Nginx).
- **Cookies**: if the frontend and API are on different *sites*, set `COOKIE_SAMESITE=none` (cookies become `Secure`, HTTPS required). Same-site subdomains (`www.` + `api.`) can keep `lax`.
- **Frontend**: set `VITE_API_URL=https://api.your-store.com` **before** `npm run build`, then serve `frontend/dist` as a static SPA with a fallback to `index.html` for unknown paths (all routes, including the admin URL, are client-side).
- **Gmail**: add the production callback (e.g. `https://api.your-store.com/api/auth/google/callback`) to the OAuth client's **Authorized redirect URIs** in Google Cloud and set `GMAIL_REDIRECT_URI` to the same value. Publish the OAuth app so the refresh token does not expire after 7 days. Set `GMAIL_OAUTH_SETUP_ENABLED=false` once configured.
- **Images**: configure Cloudinary — many hosts have ephemeral disks, so the local `/uploads` fallback is for development.
- Never commit `.env` files or `.secrets/`. No `localhost` URL is hard-coded: API URL, client URL, redirect URI, MongoDB, JWT, Gmail, EmailJS and image storage all come from environment variables.

## 14. How to authorize the store Gmail account

This is done **once, by the store owner** with the store Gmail account **popandfigs@gmail.com** — never by customers. Customers do not need any Google authorization; their email address is only the recipient. Completion emails are sent as `Pop & Figs <popandfigs@gmail.com>` to the customer email stored on the order.

1. Complete section 7 and restart the backend.
2. Log in to the admin panel (`/fahad-azeem-pop-and-figs-admin-fahad-login`) in your browser.
3. Go to **Settings → Email / Gmail** and click **Authorize store Gmail account** (or open `http://localhost:5000/api/auth/google` in the same browser).
4. Sign in as **popandfigs@gmail.com** (the `GMAIL_SENDER_EMAIL` account) and allow **"Send email on your behalf"**.
5. You land on a "Gmail authorized successfully" page. The refresh token is now saved in `.env` and active — no copying or restart needed.
6. In **Settings → Email / Gmail**, use **Send test email** to confirm delivery.

## 15. Troubleshooting Gmail OAuth

| Symptom | Cause / fix |
|---|---|
| `Error 400: redirect_uri_mismatch` | The redirect URI in Google Cloud must match `GMAIL_REDIRECT_URI` exactly (scheme, host, port, path, no trailing slash). |
| "Admin login required" page at `/api/auth/google` | Log in to the admin panel in the same browser first (the setup route is admin-only). |
| "Invalid or expired setup request" | The `state` check failed: start again from `/api/auth/google` in the same browser and finish within 10 minutes. |
| `access_denied` / "app has not completed verification" | Add the store Gmail as a **Test user** (Audience), or publish the app and accept the unverified-app warning. |
| "Google did not return a refresh token" | The app was already authorized. Remove it at <https://myaccount.google.com/permissions> and authorize again (the flow always sends `prompt=consent`). |
| Emails fail with "refresh token is invalid, expired or revoked" (`invalid_grant`) | Token revoked, password changed, or 7-day Testing expiry. Re-run the authorization and replace `GMAIL_REFRESH_TOKEN`. |
| "OAuth client ID/secret are invalid" (`invalid_client`) | Check `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` (no quotes or spaces) and restart. |
| `Gmail send failed: Request had insufficient authentication scopes` | The token was issued without `gmail.send`; re-authorize and make sure the scope is ticked. |
| `Gmail API has not been used in project … or it is disabled` | Enable the Gmail API for the same Google Cloud project as the OAuth client. |
| Order shows **Email: Failed** | Open the order in the admin panel — the error is shown; fix the configuration and click **Retry email**. |

Server logs contain the failure reason (never tokens or secrets): look for `[order-email]` and `[gmail-oauth]` lines.

## 16. How to test the order-completion email

1. Configure Gmail (sections 7, 8, 14) and send a test email from **Settings → Email / Gmail**.
2. In the storefront, sign up with an email address you can read, add products to the cart and place an order.
3. In the admin panel open **Orders → your order**. Move it through statuses (e.g. Processing), then choose **Completed** and confirm.
4. The backend detects the transition into `completed`, calls `sendOrderCompletionEmail(order)`, obtains an access token with the refresh token and sends the email through the Gmail API. The order's **Completion email** card shows **Sent** with the timestamp.
5. Check the customer inbox: branded HTML email from `Pop & Figs <popandfigs@gmail.com>` with order number, date, items, quantities, prices, subtotal, shipping and total in PKR (₨), delivery address and a thank-you message (plain-text alternative included).
6. **Duplicate prevention**: saving the order as Completed again does nothing (`completed → completed` is a no-op), completed orders are final, and the send is guarded atomically — concurrent requests cannot send twice.
7. **Failure handling**: if Gmail is misconfigured, the order still completes, `emailStatus` becomes `failed` with the error stored (e.g. `Gmail API is not configured. Missing: GMAIL_REFRESH_TOKEN`), and **Retry email** re-sends once the problem is fixed (failed → Sent). An email that was already sent is never sent again.

Tracking fields on each order: `emailStatus` (`not_sent` · `pending` · `sent` · `failed`), `emailSent`, `emailSentAt`, `emailError`, `emailAttempts`.

## 17. API reference

All responses use `{ success, message, data, meta? }`; errors use `{ success: false, message, errors? }` with proper HTTP status codes.

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/admin/login` · `POST /api/auth/logout` · `GET /api/auth/me` · `POST /api/auth/forgot-password` · `POST /api/auth/reset-password` |
| Gmail OAuth (store owner) | `GET /api/auth/google` · `GET /api/auth/google/callback` |
| Account | `GET/PATCH /api/users/profile` · `PATCH /api/users/password` · `GET/POST /api/users/wishlist` · `DELETE /api/users/wishlist/:productId` · `GET /api/users/reviews` |
| Cart | `POST /api/cart/quote` (server-side totals) · `GET/PUT /api/cart` (persistent cart) |
| Products | `GET /api/products` · `GET /api/products/price-range` · `GET /api/products/:id` (id or slug) · `POST` · `PATCH /:id` · `DELETE /:id` (admin) |
| Categories | `GET /api/categories` · `GET /api/categories/:id` · `POST` · `PATCH /:id` · `DELETE /:id` (admin) |
| Orders | `POST /api/orders` · `GET /api/orders/my-orders` · `GET /api/orders/:id` · `PATCH /api/orders/:id/cancel` |
| Reviews | `GET /api/reviews` (recent) · `GET/POST /api/products/:id/reviews` · `PATCH/DELETE /api/reviews/:id` |
| Discounts | `GET /api/discounts` (running sale campaigns) |
| Settings | `GET /api/settings` |
| Admin | `GET /api/admin/dashboard` · `GET /api/admin/customers` · `GET /api/admin/customers/:id` · `PATCH /api/admin/customers/:id/status` · `GET /api/admin/orders` · `GET /api/admin/orders/:id` · `PATCH /api/admin/orders/:id/status` · `PATCH /api/admin/orders/:id/payment` · `POST /api/admin/orders/:id/resend-email` · `GET /api/admin/reviews` · `PATCH/DELETE /api/admin/reviews/:id` · `GET/POST /api/admin/discounts` · `PATCH/DELETE /api/admin/discounts/:id` · `PATCH /api/admin/settings` · `POST /api/admin/uploads` · `GET /api/admin/email/status` · `POST /api/admin/email/test` |

## 18. Business rules

- **Prices are always computed by the backend** from MongoDB, in PKR. The client only sends product IDs and quantities — any price, subtotal or total it sends is ignored. The unit price is the sale price when the product is on sale, otherwise the regular price (or a lower running sale campaign). Subtotal = Σ unit price × quantity; Total = Subtotal + Shipping. Shipping = flat rate (default ₨ 250) unless a free-shipping threshold is set (Admin → Settings → Shipping; 0 = off). There are no coupons.
- **Stock** is reserved atomically when an order is placed (never below zero) and returned when an order is cancelled.
- **Order statuses** move forward only: `pending → confirmed → processing → shipped → delivered → completed`, with `cancelled` possible before shipping. `completed` and `cancelled` are final. Customers may cancel their own order while it is `pending`.
- **Reviews** are limited to customers with a delivered/completed order containing the product (one review per product). Ratings (`rating`, `reviewCount`) are recalculated from published reviews after every change.
- **Categories** that still contain products cannot be deleted (deactivate them instead). Inactive categories and inactive products are hidden from customers.
- **Security**: bcrypt password hashing, JWT in an httpOnly cookie, admin role checks on every admin endpoint, Zod validation on every input, Mongo operator stripping, Helmet, CORS allow-list, rate limits on auth and password reset, centralized error handling, and no password hashes, tokens or secrets in API responses.
