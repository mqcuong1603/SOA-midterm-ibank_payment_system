# iBanking API Documentation - Streamlined for Transactions

## Available Backend API Endpoints

### 🔐 Authentication

- `POST /api/auth/login` - User login
  - **Input:** `{ username, password }`
  - **Output:** `{ token, user: { id, username, fullName, email, phone, balance } }`

### 👤 User Profile (Read-Only)

- `GET /api/user/profile` - Get user profile information
  - **Headers:** `Authorization: Bearer <token>`
  - **Output:** `{ fullName, phone, email, balance }`

### 🎓 Student Information

- `GET /api/student/:studentId` - Get student details for payment
  - **Headers:** `Authorization: Bearer <token>`
  - **Output:** `{ studentId, studentName, tuitionAmount, isPaid, academicYear, semester, dueDate }`

### 💳 Payment Processing

- `POST /api/payment/initiate` - Start payment process

  - **Headers:** `Authorization: Bearer <token>`
  - **Input:** `{ studentId }`
  - **Output:** `{ transactionId, transactionCode, studentId, studentName, amount, status }`

- `POST /api/payment/send-otp` - Send OTP for verification

  - **Headers:** `Authorization: Bearer <token>`
  - **Input:** `{ transactionId }`
  - **Output:** `{ message, otpSent }`

- `POST /api/payment/confirm` - Confirm payment with OTP
  - **Headers:** `Authorization: Bearer <token>`
  - **Input:** `{ transactionId, otp }`
  - **Output:** `{ success, transactionCode, message }`

### 📊 Transaction History

- `GET /api/transactions/history` - Get user's transaction history
  - **Headers:** `Authorization: Bearer <token>`
  - **Query Params:** `limit` (default: 10), `offset` (default: 0)
  - **Output:** `{ transactions[], total, limit, offset }`

## ❌ Removed Features (Not Available)

### Security Settings (Removed)

- ❌ Change password functionality
- ❌ Two-factor authentication settings
- ❌ SMS alerts configuration
- ❌ Email notification preferences

### Profile Management (Removed)

- ❌ Edit profile information
- ❌ Update personal details
- ❌ Profile picture upload
- ❌ Account settings

### Additional Features (Not Implemented)

- ❌ User registration (admin-only user creation)
- ❌ Password reset
- ❌ Account management
- ❌ Administrative functions

## 🎯 Frontend Structure (Streamlined)

### Pages Available:

1. **index.html** - Login page
2. **dashboard.html** - Main dashboard with account overview
3. **payment.html** - Tuition payment process
4. **history.html** - Transaction history
5. **profile.html** - Redirect page (profile now in navbar dropdown)

### Navigation:

- **Navbar tabs:** Dashboard, Pay Tuition, History
- **User dropdown:** View Profile (modal), Logout
- **Removed:** Separate Profile tab/page

### Key Features:

- ✅ Login/Logout
- ✅ View account balance
- ✅ Search and pay student tuition
- ✅ OTP verification for payments
- ✅ View transaction history
- ✅ View profile information (modal only)

### Security:

- ✅ JWT token authentication
- ✅ OTP verification for payments
- ✅ Rate limiting on API endpoints
- ✅ Input validation

## 🔧 Usage Notes

1. **Profile Access:** Profile information is now only accessible through the user dropdown menu as a modal popup.

2. **Transaction Flow:**

   - User searches for student ID
   - System displays student info and tuition amount
   - User initiates payment
   - OTP is sent to user's email
   - User enters OTP to confirm payment
   - Transaction is completed and recorded

3. **Authentication:** All API endpoints (except login) require a valid JWT token in the Authorization header.

4. **Error Handling:** All endpoints return appropriate HTTP status codes with error messages.

This streamlined version focuses exclusively on the core transaction functionality while removing unnecessary profile management and security features.
