# 🏞️ Land Management System

A comprehensive full-stack web application for managing land properties, customers, employees, and installment payments — featuring multi-role authentication, image uploads, interactive maps, Razorpay online payments with refunds, role-based dashboards, and audit logging.

## 📋 Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Default Credentials](#default-credentials)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Git & Deployment](#git--deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## ✨ Features

### 🔐 Authentication & Roles
- **Multi-role login**: Admin, Employee, and Customer accounts
- **Secure passwords**: bcrypt hashing with strong-password validation (8+ chars, uppercase, lowercase, number, special character)
- **Auto-generated IDs**: `AD-0001`, `EMP-0001`, `CUS-0001`

### 🏞️ Land Management
- **Full CRUD** for land records with auto IDs (`LAND-0001`)
- **Image uploads** via Multer (served from `/uploads`)
- **Location tracking**: latitude/longitude + address with OpenStreetMap search and reverse geocoding (proxied through the backend with rate-limit handling and caching)
- **Interactive maps**: Leaflet map view in land details popup
- **Employee assignment**: link lands to employees and customer owners

### 💳 Payments & Billing
- **Installment tracking**: monthly price × total installments with automatic balance calculation
- **Payment modes**: cash, online, pending — statuses: paid, due, refunded, partial_refund
- **Full & partial refunds** with balance recalculation
- **Razorpay integration**: order creation + signature verification, plus a built-in **demo mode** for testing without real keys
- **Payment reports**: cash vs online totals and counts

### 📊 Dashboards & Reports
- **Admin stats**: total lands, employees, customers, revenue
- **Employee stats**: assigned lands, payments collected, dues, completed lands
- **Customer stats**: lands owned, total paid, dues, remaining balance

### 📝 Audit Logging
- Every create / update / delete / refund action is recorded with user, role, and entity details (`GET /api/auditlogs`)

## 🛠️ Technologies Used

### Backend
- **Node.js** — Runtime
- **Express.js 5** — Web framework
- **MongoDB + Mongoose 9** — Database & ODM
- **Razorpay SDK** — Payment gateway
- **Multer** — Image upload handling
- **bcryptjs** — Password hashing
- **CORS / dotenv / nodemailer** — Middleware & utilities
- **OpenStreetMap Nominatim** — Geocoding (proxied)

### Frontend
- **React 19** — UI library
- **React Router DOM 6** — Routing
- **Vite 8** — Build tool & dev server
- **Leaflet 1.9.4** — Interactive maps (CDN)
- **Razorpay Checkout SDK** — Payment checkout (CDN)
- **ESLint** — Code quality

## 📋 Prerequisites

- **Node.js 18+** — [Download](https://nodejs.org/) — verify: `node -v && npm -v`
- **MongoDB** (local or cloud) — default: `mongodb://localhost:27017/landmgmt`
- **Razorpay test keys** (optional) — [Dashboard](https://dashboard.razorpay.com/app/dashboard) — the app runs in demo mode without them

## 🚀 Installation

### Step 1: Clone the Repository
```bash
git clone https://github.com/Nandish-C/land-management-system.git
cd land-management-system
```

### Step 2: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 3: Install Frontend Dependencies
```bash
cd Frontend
npm install
```

### Step 4: Environment File
Create `backend/.env` (see [Configuration](#configuration)).

## 🗄️ Database Setup

- MongoDB connects automatically via `MONGODB_URI`
- On first run, a default **Admin** account is created automatically
- **Reset database** (clears all data, recreates admin): `GET /api/reset`
- **Fix duplicate IDs**: `GET /api/fix-ids`

### Database Structure
- **users** — admins, employees, customers
- **lands** — land records with images, location, pricing
- **payments** — installment payments, dues, refunds
- **auditlogs** — activity history

## ⚙️ Configuration

Create `backend/.env`:
```env
# Razorpay Payment Gateway (test keys start with rzp_test_)
RAZORPAY_KEY_ID=rzp_test_YOUR_TEST_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_TEST_KEY_SECRET

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/landmgmt

# Server Port
PORT=5000
```

> **Demo mode**: `DEMO_MODE = true` in `backend/server.js` (default) mocks Razorpay payments. Set it to `false` to use real Razorpay keys.

## ▶️ Running the Application

### Terminal 1: Backend
```bash
cd backend
npm start
```
Backend runs on: http://localhost:5000

### Terminal 2: Frontend
```bash
cd Frontend
npm run dev
```
Frontend runs on: http://localhost:5173

### Production Build
```bash
cd Frontend
npm run build
npm run preview
```

## 🔑 Default Credentials

Admin account auto-created on first run:
- **Email**: `admin@landmail.com`
- **Password**: `Admin123$`

⚠️ Change this password immediately in production.

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` — User login

### Users
- `GET /api/admins` · `POST /api/admins` · `DELETE /api/admins/:id`
- `GET /api/employees` · `POST /api/employees` · `PUT /api/employees/:id` · `DELETE /api/employees/:id`
- `GET /api/customers` · `POST /api/customers` · `PUT /api/customers/:id` · `DELETE /api/customers/:id`

### Lands
- `GET /api/lands` — List all lands
- `GET /api/lands/customer/:customerId` — Lands by customer
- `GET /api/lands/employee/:employeeId` — Lands by employee
- `POST /api/lands` — Create land (multipart/form-data with optional `image`)
- `PUT /api/lands/:id` — Update land (optional new `image`)
- `DELETE /api/lands/:id` — Delete land

### Payments
- `GET /api/payments` · `GET /api/payments/customer/:customerId` · `GET /api/payments/employee/:employeeId`
- `POST /api/payments` — Create payment (auto-calculates balance)
- `PUT /api/payments/:id` — Update payment
- `DELETE /api/payments/:id` — Delete payment
- `POST /api/payments/:id/refund` — Full or partial refund

### Razorpay
- `POST /api/payments/create-order` — Create Razorpay order
- `POST /api/payments/verify` — Verify payment signature
- `GET /api/payments/key` — Get Razorpay key / demo status

### Statistics & Reports
- `GET /api/stats/admin` — Admin dashboard stats
- `GET /api/stats/employee/:employeeId` — Employee stats
- `GET /api/stats/customer/:customerId` — Customer stats
- `GET /api/reports/payments` — Cash vs online payment summary

### Geocoding
- `GET /api/geocode/search?q=...` — Location search (India)
- `GET /api/geocode/reverse?lat=...&lon=...` — Coordinates → address

### Audit & Utility
- `GET /api/auditlogs` · `POST /api/auditlogs`
- `GET /api/reset` — Reset DB & recreate admin
- `GET /api/fix-ids` — Show current/next land & payment IDs
- `/uploads/*` — Static uploaded images

## 📁 Project Structure

```
land-management-system/
├── backend/                        # Express + MongoDB backend
│   ├── server.js                   # All API routes, middleware, Razorpay & geocoding
│   ├── models/
│   │   ├── User.js                 # Admin / Employee / Customer
│   │   ├── Land.js                 # Land records, location, pricing
│   │   ├── Payment.js              # Installments, dues, refunds
│   │   └── AuditLog.js             # Activity log
│   ├── uploads/                    # Uploaded land images (auto-created)
│   ├── .env                        # Environment variables (not committed)
│   └── package.json
│
├── Frontend/                      # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx                 # Main application (land details, maps, payments)
│   │   ├── App.css / index.css
│   │   └── main.jsx
│   ├── index.html                  # Leaflet + Razorpay CDN links
│   ├── vite.config.js
│   └── package.json
│
├── payment_report.csv              # Sample payment report
└── README.md                       # This file
```

## 🌿 Git & Deployment

```bash
git init
git add .
git commit -m "Initial commit: Land Management System"
git remote add origin <your-repo-url>
git push -u origin main
```

- `backend/.gitignore` excludes `node_modules/`, `uploads/`, and `.env` — never commit secrets or uploaded files
- Deploy backend (e.g., Render/Railway) with env vars set; deploy frontend build (`dist/`) on any static host

## 🔧 Troubleshooting

### 1. **MongoDB Connection Error**
```bash
# Check MongoDB is running
mongosh --eval "db.runCommand('ping')"
# Or update MONGODB_URI in backend/.env for a cloud database
```

### 2. **Port 5000 Already in Use**
Change `PORT` in `backend/.env` and restart.

### 3. **Razorpay Not Working**
- Demo mode is ON by default (`DEMO_MODE = true` in `server.js`) — payments are mocked
- For real payments: set `DEMO_MODE = false` and ensure keys start with `rzp_`

### 4. **Geocoding Rate Limited (429)**
The server enforces a 5-second delay, caches results for 1 hour, and retries once. If Nominatim is unavailable, coordinates are formatted as a fallback address.

### 5. **Images Not Loading**
The `backend/uploads/` folder is created automatically and served at `/uploads`. Ensure the backend has write permissions.

### 6. **Frontend Can't Reach API**
The frontend calls `http://localhost:5000/api` (`src/App.jsx`). Ensure the backend is running before using the app.

### 7. **npm install Fails**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 8. **Duplicate Land/Payment IDs**
Call `GET /api/fix-ids` to inspect current max IDs — new records continue from the highest existing number.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section above
- Review the API endpoints list

---

github id : Nandish-C

**Happy Coding! 🎉**
