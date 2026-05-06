# 🤖 FINFLOW PRO — AI CODE GENERATION PROMPTS
## Complete Phased Build System for Coding AI (Claude / Cursor / GPT-4o)

> **HOW TO USE THIS FILE:**
> Each section below is a **self-contained prompt** you paste into your coding AI.
> Follow the order. Each prompt builds on the previous one.
> Start a fresh conversation for each Phase to avoid context overflow.

---

# ════════════════════════════════════════════════════════
# PHASE 0 — PROJECT SCAFFOLD PROMPT
# Paste this FIRST in a new conversation
# ════════════════════════════════════════════════════════

```
You are a senior full-stack engineer building a production-grade fintech platform called "FinFlow Pro".

This is a financial transaction management system for mobile banking agents in Bangladesh. The system has:
- A Node.js + Express + MongoDB backend (REST API)
- A Flutter Admin App
- A Flutter Agent App

Your task RIGHT NOW is ONLY: Generate the complete project folder structure and all configuration files. Do NOT write feature code yet.

## TECH STACK (EXACT — do not change):
- Backend: Node.js 20 LTS, Express 4, Mongoose 8, MongoDB Atlas
- Auth: JWT (access token 15min, refresh token 7d), bcrypt (12 rounds)
- Cache: Redis (Upstash) via ioredis
- Queue: BullMQ for async jobs (notifications, PDF generation)
- File Storage: Cloudinary (PDF receipts)
- SMS: Twilio
- WhatsApp: Twilio WhatsApp Business
- Telegram: grammy.js bot library
- PDF: puppeteer (server-side)
- Flutter: 3.22+, Dart 3.4+
- State Management: Riverpod 2.x
- HTTP: Dio with interceptors
- Local Storage: flutter_secure_storage
- Navigation: go_router

## GENERATE:

### 1. Backend folder structure:
finflow-backend/
├── src/
│   ├── config/          (db.js, redis.js, env.js)
│   ├── controllers/     (auth, clients, transactions, wallets, agents, reports, integrations)
│   ├── models/          (User, Admin, Agent, Transaction, Wallet, WalletLog, CommissionLedger, Settings, RefreshToken, Notification, Report)
│   ├── routes/          (one file per resource)
│   ├── services/        (feeCalculator, commissionEngine, paymentSuggestion, telegramService, smsService, pdfService, notificationService)
│   ├── middleware/       (auth.js, roleGuard.js, rateLimiter.js, validate.js, errorHandler.js)
│   ├── utils/           (apiResponse.js, logger.js, idempotency.js, encryption.js, dateUtils.js)
│   ├── jobs/            (notificationWorker.js, reportWorker.js, reconciliationJob.js)
│   └── app.js
├── .env.example
├── .env
├── package.json         (with all exact package names and versions)
├── Dockerfile
├── docker-compose.yml
└── README.md

### 2. Flutter Admin App folder structure:
finflow_admin/
├── lib/
│   ├── core/
│   │   ├── constants/   (app_colors.dart, app_text_styles.dart, app_spacing.dart, api_constants.dart)
│   │   ├── errors/      (failures.dart, exceptions.dart)
│   │   ├── network/     (dio_client.dart, api_interceptor.dart)
│   │   ├── storage/     (secure_storage.dart)
│   │   └── utils/       (currency_formatter.dart, date_formatter.dart, validators.dart)
│   ├── features/
│   │   ├── auth/        (data/, domain/, presentation/)
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── clients/
│   │   ├── agents/
│   │   ├── wallets/
│   │   ├── reports/
│   │   └── settings/
│   ├── shared/
│   │   └── widgets/     (app_button.dart, app_text_field.dart, wallet_card.dart, transaction_card.dart, agent_card.dart, fee_calculator_widget.dart, split_payment_sheet.dart, loading_overlay.dart, empty_state.dart, error_state.dart)
│   ├── providers/       (auth_provider.dart, transaction_provider.dart, wallet_provider.dart, agent_provider.dart)
│   └── main.dart
├── pubspec.yaml         (with all exact package names and versions)
└── README.md

### 3. Flutter Agent App folder structure:
finflow_agent/
├── lib/
│   ├── core/            (same as admin)
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── clients/
│   │   ├── earnings/
│   │   └── settings/
│   ├── shared/widgets/
│   ├── providers/
│   └── main.dart
└── pubspec.yaml

### 4. Generate these files with FULL CONTENT (not placeholder):
- finflow-backend/package.json (all dependencies with exact versions)
- finflow-backend/.env.example (all required env variables)
- finflow-backend/docker-compose.yml
- finflow_admin/pubspec.yaml (all dependencies)
- finflow_agent/pubspec.yaml (all dependencies)

### RULES:
- Every folder must have a purpose comment
- package.json must include: express, mongoose, jsonwebtoken, bcryptjs, ioredis, bullmq, grammy, twilio, puppeteer, joi, morgan, helmet, cors, dotenv, express-rate-limit, uuid, cloudinary, multer, winston
- pubspec.yaml must include: flutter_riverpod, dio, go_router, flutter_secure_storage, shared_preferences, intl, pdf, printing, fl_chart, cached_network_image, image_picker, connectivity_plus, flutter_local_notifications, lottie, shimmer
- Output the COMPLETE content of each config file
```

---

# ════════════════════════════════════════════════════════
# PHASE 1 — DATABASE SCHEMA PROMPT
# Start a new conversation. Paste this.
# ════════════════════════════════════════════════════════

```
You are a senior MongoDB/Mongoose engineer. Build the complete database schema for "FinFlow Pro" — a fintech transaction management platform.

## CONTEXT:
- Business owners (Admins) manage bKash/Nagad/Bank/Cash wallets
- Agents process client transactions and earn commission
- Fee formula: Fee = (Amount / 1000) × FeePercent
- Commission formula: Commission = (Amount / 1000) × CommissionPercent
- Wallets have real-time balance tracking with atomic updates
- All money is in BDT (Bangladeshi Taka), stored as integers in paisa (multiply by 100)

## YOUR TASK: Write complete Mongoose model files for ALL of the following:

---

### MODEL 1: src/models/Admin.js
Fields:
- _id, name, email (unique, lowercase), password (hashed), businessName, businessLogo (url), phone
- role: enum ['SUPER_ADMIN', 'ADMIN'] default ADMIN
- settings: { defaultFeePercent: Number, defaultCommissionPercent: Number, currency: String default 'BDT', lowBalanceThreshold: Number }
- branding: { primaryColor: String, reportFooterText: String }
- status: enum ['ACTIVE', 'SUSPENDED'] default ACTIVE
- lastLoginAt: Date
- timestamps: true
- Pre-save hook: hash password with bcrypt 12 rounds
- Instance method: comparePassword(plain)
- Index: email (unique)

---

### MODEL 2: src/models/Agent.js
Fields:
- _id, adminId (ref Admin), userId (ref User — for auth), name, phone (unique per admin), email
- commissionPercent: Number (0-100), default 0
- status: enum ['ACTIVE', 'SUSPENDED', 'PENDING_APPROVAL'] default PENDING_APPROVAL
- wallet: { balance: Number default 0, totalEarned: Number default 0, totalSettled: Number default 0 }
- stats: { totalTransactions: Number, totalVolume: Number, currentMonthCommission: Number }
- telegramChatId: String (optional, for personal bot)
- telegramBotToken: String (encrypted, optional)
- approvedAt: Date, approvedBy (ref Admin)
- timestamps: true
- Index: adminId + status, phone

---

### MODEL 3: src/models/Client.js
Fields:
- _id, adminId (ref Admin), name, phone, email (optional), address (optional)
- customFeePercent: Number (null = use default)
- customCommissionPercent: Number (null = use default)
- assignedAgentId (ref Agent, optional)
- tags: [String]
- notes: String
- stats: { totalTransactions: Number default 0, totalVolume: Number default 0, totalFeesPaid: Number default 0, lastTransactionAt: Date }
- isArchived: Boolean default false
- createdBy: { id: ObjectId, role: String }
- timestamps: true
- Index: adminId + isArchived, adminId + phone, adminId + assignedAgentId

---

### MODEL 4: src/models/Wallet.js
Fields:
- _id, adminId (ref Admin)
- type: enum ['BKASH', 'NAGAD', 'BANK', 'CASH', 'CUSTOM']
- name: String (display name)
- accountNumber: String (optional)
- balance: Number default 0 (in paisa — multiply BDT × 100)
- lockedBalance: Number default 0
- availableBalance: Number (virtual: balance - lockedBalance)
- currency: String default 'BDT'
- lowBalanceThreshold: Number default 500000 (= ৳5000)
- stats: { totalIn: Number default 0, totalOut: Number default 0, totalCommissionEarned: Number default 0, lastTransactionAt: Date }
- displayOrder: Number default 0
- isActive: Boolean default true
- timestamps: true
- Virtual: availableBalance = this.balance - this.lockedBalance
- Index: adminId + isActive, adminId + type

---

### MODEL 5: src/models/Transaction.js
Fields:
- _id
- refId: String (unique, format: TXN-YYYYMMDD-XXXX, auto-generated)
- adminId (ref Admin)
- type: enum ['CR', 'DR']
- status: enum ['COMPLETED', 'PENDING', 'CANCELLED', 'FAILED'] default 'COMPLETED'

Parties:
- clientId (ref Client), clientName: String (denormalized)
- agentId (ref Agent, optional), agentName: String (denormalized)

Amounts (all stored in paisa):
- amount: Number (required, > 0)
- feePercent: Number
- feeSource: enum ['TRANSACTION', 'CLIENT', 'AGENT', 'GLOBAL']
- baseFee: Number
- extraFee: { amount: Number, type: enum ['FIXED_ADD','FIXED_DEDUCT','PERCENT_ADD','PERCENT_DEDUCT'], note: String, visibility: enum ['RECEIPT_VISIBLE','INTERNAL_ONLY'] }
- totalFee: Number
- agentCommissionPercent: Number
- agentCommission: Number
- netProfit: Number

Wallet entries:
- walletEntries: [{ walletId (ref Wallet), walletType: String, amount: Number, direction: enum ['IN','OUT'] }]

Notifications:
- receiptSent: Boolean default false
- receiptChannel: enum ['SMS','WHATSAPP',null]
- receiptSentAt: Date
- telegramNotified: Boolean default false

Idempotency:
- idempotencyKey: String (unique index, sparse)

Audit:
- createdBy: { id: ObjectId, role: String, name: String }
- editHistory: [{ editedBy: ObjectId, editedAt: Date, changes: Mixed }]
- cancelledAt: Date, cancelledBy: ObjectId, cancelReason: String
- note: String
- timestamps: true

Indexes:
- adminId + createdAt desc (primary query index)
- adminId + clientId + createdAt desc
- adminId + agentId + createdAt desc
- adminId + type + status + createdAt desc
- adminId + walletEntries.walletId + createdAt desc
- refId (unique)
- idempotencyKey (unique, sparse)

---

### MODEL 6: src/models/WalletLog.js
Fields:
- _id, adminId, walletId (ref Wallet), transactionId (ref Transaction, optional)
- type: enum ['CREDIT','DEBIT','TRANSFER_IN','TRANSFER_OUT','ADJUSTMENT','LOCK','UNLOCK']
- amount: Number (in paisa)
- balanceAfter: Number (snapshot)
- note: String
- createdBy: { id: ObjectId, role: String }
- timestamps: true
- Index: walletId + createdAt desc, adminId + createdAt desc

---

### MODEL 7: src/models/CommissionLedger.js
Fields:
- _id, adminId, agentId (ref Agent), transactionId (ref Transaction, optional)
- type: enum ['EARNED','SETTLED','HELD','REVERSED','ADJUSTED']
- amount: Number (in paisa)
- balanceAfter: Number (running balance snapshot)
- note: String
- settledBy: ObjectId (ref Admin, optional)
- createdBy: { id: ObjectId, role: String }
- timestamps: true
- Index: agentId + createdAt desc, adminId + agentId + type + createdAt desc

---

### MODEL 8: src/models/RefreshToken.js
Fields:
- _id, userId: ObjectId, userType: enum ['ADMIN','AGENT']
- token: String (hashed, unique)
- expiresAt: Date
- isRevoked: Boolean default false
- deviceInfo: String
- createdAt: Date (TTL index: auto-delete after expiresAt)
- Index: token (unique), userId + userType

---

### MODEL 9: src/models/Settings.js (singleton per admin)
Fields:
- _id, adminId (ref Admin, unique)
- feeDefaults: { defaultFeePercent: Number, defaultCommissionPercent: Number }
- notifications: { telegramEnabled: Boolean, telegramBotToken: String (encrypted), telegramChatId: String, smsEnabled: Boolean, whatsappEnabled: Boolean, receiptEnabled: Boolean, receiptChannel: enum ['SMS','WHATSAPP','BOTH'] }
- receiptTemplate: String (default template text with placeholders)
- reportBranding: { logoUrl: String, primaryColor: String, footerText: String }
- security: { requirePinOnOpen: Boolean, biometricEnabled: Boolean }
- timestamps: true

---

### MODEL 10: src/models/Notification.js
Fields:
- _id, adminId, recipientId: ObjectId, recipientType: enum ['ADMIN','AGENT']
- type: enum ['TRANSACTION_CREATED','BALANCE_ALERT','COMMISSION_REQUEST','COMMISSION_SETTLED','SYSTEM','REPORT_READY']
- title: String, body: String
- data: Mixed (structured payload)
- channels: [{ channel: enum ['IN_APP','TELEGRAM','SMS','WHATSAPP','PUSH'], status: enum ['PENDING','SENT','FAILED'], sentAt: Date, error: String }]
- isRead: Boolean default false
- createdAt: Date
- Index: recipientId + isRead + createdAt desc, adminId + type + createdAt desc

---

### ALSO GENERATE: src/config/db.js
- Connect to MongoDB Atlas using MONGODB_URI from env
- Handle connection errors with retry logic (3 attempts, 5s delay)
- Log connection status
- Handle graceful shutdown

### RULES:
- Use Mongoose 8 syntax
- All monetary values stored as integers (paisa = BDT × 100)
- Add JSDoc comments on every model explaining the purpose
- Include all indexes as specified
- Add toJSON transform: remove __v, transform _id to id
- Add a static method generateRefId() on Transaction model
- Make every file production-grade and complete — no TODOs
```

---

# ════════════════════════════════════════════════════════
# PHASE 2 — BACKEND CORE SERVICES PROMPT
# Start a new conversation. Paste this.
# ════════════════════════════════════════════════════════

```
You are a senior Node.js engineer. Build the core business logic services for "FinFlow Pro" fintech platform.

## ASSUMED ALREADY BUILT:
- All Mongoose models (Admin, Agent, Client, Wallet, Transaction, WalletLog, CommissionLedger, Settings, RefreshToken, Notification)
- MongoDB is connected
- All amounts stored in paisa (integer, BDT × 100)

## YOUR TASK: Write complete, production-grade service files:

---

### SERVICE 1: src/services/feeCalculator.js

Build a pure function calculator. No side effects. Export:

```javascript
// Main calculator
calculateFee({ amount, feePercent, transactionType, extraFee, agentCommissionPercent })
// Returns: { baseFee, extraFeeAmount, totalFee, agentCommission, netProfit, clientReceives, clientPays }

// Fee resolution (finds correct fee % for a transaction)
resolveFeePercent({ clientCustomFee, agentDefaultFee, globalDefaultFee, transactionOverride })
// Returns: { feePercent, source: 'TRANSACTION'|'CLIENT'|'AGENT'|'GLOBAL' }

// Idempotency key generator
generateIdempotencyKey({ clientId, amount, agentId })
// Returns: SHA-256 hash string

// Validation before submission
validateTransaction({ amount, totalFee, agentCommission, netProfit, walletEntries, totalAvailable })
// Returns: { valid: boolean, errors: string[], warnings: string[], requiresAdminOverride: boolean }
```

Fee formula: Fee = (amount / 1000) × feePercent
Commission formula: Commission = (amount / 1000) × commissionPercent
All inputs and outputs in PAISA (integers)

---

### SERVICE 2: src/services/paymentSuggestionEngine.js

Build the auto-payment suggestion system. Export:

```javascript
// Main suggestion function
async suggestPayment({ adminId, requiredAmount, preferredWalletId })
/*
Algorithm:
1. Fetch all active wallets for adminId, sorted by availableBalance desc
2. Filter wallets with availableBalance > 0
3. Try to find single wallet that can cover requiredAmount
   - Rank by: preferredWalletId first, then highest balance
4. If no single wallet: run greedy split algorithm
   - Fill from highest balance wallet first
   - Generate top 3 combinations
   - Score: (numWallets × -10) + preferenceBonus
5. If total < requiredAmount: return INSUFFICIENT with deficit
6. Return: { suggestions[], isInsufficient, deficit, totalAvailable }
*/

// Validate a manually chosen split
validateManualSplit({ walletSelections, requiredAmount })
// Returns: { valid, errors, totalSelected, deficit }
```

---

### SERVICE 3: src/services/transactionEngine.js

Build the core transaction processor. Export:

```javascript
// Create a complete transaction (atomic)
async createTransaction({ adminId, agentId, type, clientId, amount, feePercent, feeSource, extraFee, agentCommissionPercent, walletEntries, note, idempotencyKey, createdBy })
/*
Steps:
1. Check idempotency key — return existing if duplicate
2. Resolve fee percent using feeCalculator.resolveFeePercent
3. Calculate all fees using feeCalculator.calculateFee
4. Validate using feeCalculator.validateTransaction
5. Check each wallet has sufficient availableBalance
6. Run Mongoose session transaction (atomic):
   a. Create Transaction document
   b. For each walletEntry:
      - Update wallet.balance (increment/decrement)
      - Update wallet.stats.totalIn or totalOut
      - Create WalletLog entry
   c. If agentId exists:
      - Create CommissionLedger entry (EARNED)
      - Update Agent.wallet.balance += commission
      - Update Agent.stats
   d. Update Client.stats
7. Dispatch async jobs (notifications, telegram) via BullMQ — do NOT await
8. Return created transaction (populated)
*/

// Cancel a transaction
async cancelTransaction({ transactionId, adminId, reason, cancelledBy })
// Reverses all wallet entries atomically, marks commission as REVERSED

// Edit a transaction (within 24h, admin only)
async editTransaction({ transactionId, adminId, changes, editedBy })
```

---

### SERVICE 4: src/services/commissionService.js

Export:

```javascript
// Settle agent commission (admin pays agent)
async settleCommission({ adminId, agentId, amount, payFromWalletId, note, settledBy })
/*
Steps:
1. Verify agent has sufficient pending commission (>= amount)
2. Check wallet has sufficient balance
3. Atomic:
   a. Deduct from admin wallet
   b. Create WalletLog (DEBIT)
   c. Create CommissionLedger (SETTLED)
   d. Update Agent.wallet.balance -= amount
   e. Update Agent.wallet.totalSettled += amount
4. Send notification to agent
*/

// Agent requests payout
async requestCommissionPayout({ agentId, amount, payoutMethod, payoutDetails })
// Creates a PENDING payout request, notifies admin

// Get agent commission summary for a period
async getAgentCommissionSummary({ agentId, dateFrom, dateTo })
// Returns: { totalEarned, totalSettled, pending, transactionCount, ledgerEntries[] }
```

---

### SERVICE 5: src/services/walletService.js

Export:

```javascript
// Manual wallet adjustment
async adjustWalletBalance({ adminId, walletId, amount, type: 'ADD'|'DEDUCT', note, adjustedBy })

// Transfer between wallets
async transferBetweenWallets({ adminId, fromWalletId, toWalletId, amount, note, createdBy })
// Atomic: deduct from source, credit to destination, create 2 WalletLogs

// Get wallet summary for dashboard
async getWalletSummary({ adminId })
// Returns all wallets with balances, sorted by displayOrder

// Check and emit low balance alerts
async checkLowBalanceAlerts({ adminId })
// For each wallet below threshold: dispatch notification
```

---

### SERVICE 6: src/services/notificationService.js

Export:

```javascript
// Queue a notification (dispatches to BullMQ)
async queueNotification({ adminId, recipientId, recipientType, type, title, body, data, channels })

// Mark notification as read
async markAsRead({ notificationId, recipientId })

// Get unread count
async getUnreadCount({ recipientId, recipientType })
```

---

### ALSO GENERATE: src/utils/apiResponse.js

Standard response wrapper:
```javascript
class ApiResponse {
  static success(res, data, message = 'Success', statusCode = 200)
  static error(res, message, statusCode = 400, errorCode = null, details = null)
  static paginated(res, data, total, page, limit, message = 'Success')
}
```

### src/utils/encryption.js
AES-256-GCM encryption/decryption for sensitive fields (bot tokens, API keys):
```javascript
encrypt(text)   // returns { iv, authTag, encrypted } as base64 string
decrypt(data)   // returns original string
```

### src/middleware/errorHandler.js
Global Express error handler:
- Handle Mongoose ValidationError → 422
- Handle Mongoose CastError → 400 (invalid ID)
- Handle JWT errors → 401
- Handle duplicate key errors (11000) → 409
- Handle all others → 500
- Never expose stack traces in production
- Log all 5xx errors with winston

### src/middleware/validate.js
Joi validation middleware factory:
```javascript
validate(schema) // returns Express middleware that validates req.body
```

### RULES:
- Every service must use Mongoose sessions for multi-document atomic operations
- All monetary calculations use integer arithmetic ONLY (no floating point)
- Every async function has try/catch with proper error throwing
- Use winston logger (not console.log) everywhere
- No hardcoded values — all config from environment variables
- Every function has JSDoc with @param and @returns
```

---

# ════════════════════════════════════════════════════════
# PHASE 3 — AUTHENTICATION API PROMPT
# Start a new conversation. Paste this.
# ════════════════════════════════════════════════════════

```
You are a senior Node.js security engineer. Build the complete authentication system for "FinFlow Pro".

## CONTEXT:
- Two user types: ADMIN and AGENT
- Admin signs up (creates a business account)
- Agent is created by admin OR self-registers with admin approval
- JWT: access token (15 min), refresh token (7 days, stored in DB)
- Refresh tokens are rotated on every use (old one revoked)
- All tokens are hashed before storing in DB (SHA-256)

## GENERATE ALL OF THE FOLLOWING:

### 1. src/controllers/auth.controller.js

Implement these controller functions (each as a separate named export):

#### adminSignup(req, res)
- Validate: name, email, password (min 8 chars), businessName, phone
- Check email uniqueness
- Hash password (bcrypt, 12 rounds)
- Create Admin document
- Create default Settings document for this admin
- Create default 4 wallets: BKASH, NAGAD, BANK, CASH (balance 0)
- Generate access token + refresh token
- Hash refresh token, store in RefreshToken collection
- Return: { admin: { id, name, email, businessName }, tokens: { accessToken, refreshToken } }

#### adminLogin(req, res)
- Validate: email, password
- Find admin by email
- Compare password
- Check admin.status === 'ACTIVE'
- Update admin.lastLoginAt
- Generate + store tokens (same as signup)
- Return: { admin: { id, name, email, role }, tokens }

#### agentLogin(req, res)
- Validate: phone, password
- Find agent by phone (within scope of their admin)
- Check agent.status === 'ACTIVE' (not PENDING_APPROVAL or SUSPENDED)
- Compare password
- Generate tokens (agentId in payload, role: 'AGENT')
- Return: { agent: { id, name, phone, commissionPercent }, tokens }

#### refreshToken(req, res)
- Accept refresh token from Authorization header or body
- Hash it, find in DB
- Check: exists, not revoked, not expired
- Revoke old token (isRevoked: true)
- Generate new access token + new refresh token (rotation)
- Store new refresh token
- Return: { tokens: { accessToken, refreshToken } }

#### logout(req, res)
- Revoke current refresh token in DB
- Return: 200 OK

#### adminSelfSetup(req, res)
- After signup, admin can complete profile: businessLogo, address
- Update Admin document

### 2. src/controllers/agentAuth.controller.js

#### agentSelfRegister(req, res)
- Agent provides: name, phone, password, adminCode (a unique code the admin shares)
- Look up admin by adminCode
- Create User doc for auth + Agent doc
- Status: PENDING_APPROVAL
- Notify admin via Telegram/in-app

#### adminCreateAgent(req, res) [Admin only]
- Admin creates agent: name, phone, email, commissionPercent
- Auto-generate temp password
- Create Agent document (status: ACTIVE immediately)
- Return agent credentials for admin to share

#### adminApproveAgent(req, res) [Admin only]
- Change agent status: PENDING_APPROVAL → ACTIVE
- Notify agent

#### adminSuspendAgent(req, res) [Admin only]
- Change agent status: ACTIVE → SUSPENDED

### 3. src/middleware/auth.js

#### authenticate
- Extract Bearer token from Authorization header
- Verify JWT signature + expiry
- Decode: { id, role: 'ADMIN'|'AGENT', adminId }
- Attach to req.user
- Return 401 if invalid/expired

#### requireAdmin
- Check req.user.role === 'ADMIN'
- Return 403 if not

#### requireAgent
- Check req.user.role === 'AGENT'
- Return 403 if not

#### requireActiveAgent
- Check agent status === 'ACTIVE' in DB (cached in Redis, 60s TTL)
- Return 403 if suspended

### 4. src/routes/auth.routes.js
- POST /api/v1/auth/admin/signup
- POST /api/v1/auth/admin/login
- POST /api/v1/auth/agent/login
- POST /api/v1/auth/agent/register
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout (protected)
- PATCH /api/v1/auth/admin/setup (protected, admin only)

### 5. JWT Token Payload Structure:
```json
// Admin token
{ "sub": "adminId", "role": "ADMIN", "businessId": "adminId", "iat": 0, "exp": 0 }

// Agent token  
{ "sub": "agentId", "role": "AGENT", "adminId": "adminId", "iat": 0, "exp": 0 }
```

### 6. src/config/jwt.js
- generateAccessToken(payload)
- generateRefreshToken(payload)
- verifyToken(token, type: 'access'|'refresh')
- hashToken(token) → SHA-256 hex

### 7. Joi Validation Schemas: src/validators/auth.validators.js
- adminSignupSchema
- adminLoginSchema
- agentLoginSchema
- agentRegisterSchema
- refreshTokenSchema

### RULES:
- Never return password or token hash to client
- Log all auth events (login, signup, token refresh, logout) with IP address
- Rate limit auth endpoints: 5 attempts per 15 minutes per IP
- Return consistent error messages (don't reveal whether email exists)
- bcrypt rounds: 12
- Access token secret: JWT_ACCESS_SECRET from env
- Refresh token secret: JWT_REFRESH_SECRET from env
- All code production-grade, no TODOs
```

---

# ════════════════════════════════════════════════════════
# PHASE 4 — TRANSACTION & WALLET API PROMPT
# Start a new conversation. Paste this.
# ════════════════════════════════════════════════════════

```
You are a senior Node.js engineer. Build the transaction and wallet API controllers for "FinFlow Pro".

## ASSUMED ALREADY BUILT:
- All models, feeCalculator service, paymentSuggestionEngine, transactionEngine, walletService
- Auth middleware (authenticate, requireAdmin, requireAgent)
- ApiResponse utility

## FEE FORMULA (critical — implement exactly):
Fee = (amount / 1000) × feePercent
Commission = (amount / 1000) × commissionPercent
All stored as integers in paisa (BDT × 100)

## GENERATE:

### 1. src/controllers/transaction.controller.js

#### createTransaction(req, res)
Body: { type, clientId, amount (in BDT), feePercent (optional), extraFee (optional), walletEntries, note, idempotencyKey }
- Convert amount from BDT to paisa (× 100)
- If feePercent not provided: resolve from client → agent → global settings
- If walletEntries not provided: run paymentSuggestionEngine.suggestPayment()
- Call transactionEngine.createTransaction()
- Return full transaction with calculated fields

#### getTransactions(req, res)
- Query params: type, status, clientId, agentId, walletId, dateFrom, dateTo, amountMin, amountMax, search, page (default 1), limit (default 20)
- ADMIN sees all transactions for their adminId
- AGENT sees only their own transactions (agentId filter auto-applied)
- Return paginated list with summary: { totalCR, totalDR, totalFee, totalProfit }
- Include cursor for next page (use _id for cursor, not skip)

#### getTransaction(req, res)
- Get single transaction by id or refId
- Populate: clientId (name, phone), agentId (name)
- AGENT can only see own transactions

#### editTransaction(req, res) [Admin only]
- Allow edit within 24 hours of creation only
- Editable fields: note, extraFee only (not amount — too complex)
- Log edit in editHistory

#### cancelTransaction(req, res) [Admin only]
- Call transactionEngine.cancelTransaction()
- Reason required

#### getTransactionReceipt(req, res)
- Generate HTML receipt string for a transaction
- Include: ref, date, client, amount, fee, wallet, agent, business branding

#### sendReceipt(req, res)
- Send receipt via SMS or WhatsApp to client.phone
- Use smsService or whatsappService
- Update transaction.receiptSent = true

#### calculateFeePreview(req, res)
- POST /transactions/calculate
- Stateless: just run feeCalculator.calculateFee()
- Return full breakdown without creating anything
- This is the "live preview" endpoint for the Flutter app

#### suggestPayment(req, res)
- POST /transactions/suggest-payment
- Body: { requiredAmount, preferredWalletId }
- Run paymentSuggestionEngine.suggestPayment()
- Return suggestions

---

### 2. src/controllers/wallet.controller.js

#### getWallets(req, res)
- Return all wallets for adminId, sorted by displayOrder
- Include availableBalance virtual field
- Include stats

#### getWallet(req, res)
- Single wallet detail by ID
- Include last 10 ledger entries

#### getWalletLedger(req, res)
- Paginated WalletLog for a wallet
- Filter: type, dateFrom, dateTo
- Return with running balance per entry

#### adjustWallet(req, res) [Admin only]
- Body: { amount (BDT), type: 'ADD'|'DEDUCT', note }
- Call walletService.adjustWalletBalance()

#### transferBetweenWallets(req, res) [Admin only]
- Body: { fromWalletId, toWalletId, amount, note }
- Call walletService.transferBetweenWallets()

#### updateWalletSettings(req, res) [Admin only]
- Update: name, lowBalanceThreshold, displayOrder, isActive

---

### 3. src/controllers/client.controller.js

#### createClient(req, res)
- Admin or Agent (if agentCanAddClients setting enabled)
- Body: { name, phone, email, address, customFeePercent, customCommissionPercent, assignedAgentId, tags, notes }
- Check phone uniqueness within adminId
- If created by agent: auto-assign to that agent

#### getClients(req, res)
- Admin: all clients
- Agent: only clients where assignedAgentId === req.user.sub
- Filters: search (name/phone), agentId, isArchived, tags
- Paginated

#### getClient(req, res)
- Full client detail + transaction summary stats

#### updateClient(req, res)
- Admin: all fields
- Agent: limited fields only (notes, tags)

#### archiveClient(req, res) [Admin only]

#### getClientTransactions(req, res)
- Paginated transaction list for a specific client

---

### 4. src/controllers/agent.controller.js

#### getAgents(req, res) [Admin only]
- All agents for adminId
- Filter: status
- Include commission summary

#### getAgent(req, res) [Admin only]
- Full agent profile + commission stats

#### updateAgent(req, res) [Admin only]
- Name, phone, email, commissionPercent, status

#### getAgentCommission(req, res)
- Admin: any agent
- Agent: own commission only
- Params: dateFrom, dateTo
- Returns: CommissionLedger entries + summary

#### settleAgentCommission(req, res) [Admin only]
- Body: { amount, payFromWalletId, note }
- Call commissionService.settleCommission()

#### requestCommissionPayout(req, res) [Agent only]
- Body: { amount, payoutMethod, payoutDetails }
- Call commissionService.requestCommissionPayout()

---

### 5. src/routes/ — Generate ALL route files:

#### transaction.routes.js
POST   /api/v1/transactions/calculate     (no auth — or with auth)
POST   /api/v1/transactions/suggest-payment (authenticated)
POST   /api/v1/transactions              (Admin or Agent)
GET    /api/v1/transactions              (Admin or Agent — filtered)
GET    /api/v1/transactions/:id          (Admin or Agent)
PATCH  /api/v1/transactions/:id          (Admin only)
DELETE /api/v1/transactions/:id/cancel   (Admin only)
GET    /api/v1/transactions/:id/receipt  (Admin or Agent)
POST   /api/v1/transactions/:id/send-receipt (Admin)

#### wallet.routes.js
GET    /api/v1/wallets                   (Admin)
GET    /api/v1/wallets/:id               (Admin)
GET    /api/v1/wallets/:id/ledger        (Admin)
PATCH  /api/v1/wallets/:id              (Admin)
POST   /api/v1/wallets/:id/adjust        (Admin)
POST   /api/v1/wallets/transfer          (Admin)

#### client.routes.js
GET    /api/v1/clients                   (Admin + Agent filtered)
POST   /api/v1/clients                   (Admin + Agent with permission)
GET    /api/v1/clients/:id               (Admin + Agent)
PATCH  /api/v1/clients/:id              (Admin + Agent limited)
DELETE /api/v1/clients/:id/archive       (Admin)
GET    /api/v1/clients/:id/transactions  (Admin + Agent)

#### agent.routes.js
GET    /api/v1/agents                    (Admin)
POST   /api/v1/agents                    (Admin — create agent)
GET    /api/v1/agents/:id                (Admin)
PATCH  /api/v1/agents/:id               (Admin)
GET    /api/v1/agents/:id/commission     (Admin + own Agent)
POST   /api/v1/agents/:id/settle         (Admin)
POST   /api/v1/agents/commission/request (Agent only)

### 6. src/app.js — Complete Express App Setup
- helmet(), cors (config from env), morgan (dev/prod)
- express-rate-limit (global: 100/min, auth: 5/15min)
- Mount all routes under /api/v1
- Global error handler (last middleware)
- Health check: GET /health
- 404 handler for unknown routes

### RULES:
- Every controller uses async/await with try/catch (errors passed to next())
- Use cursor-based pagination (not skip/limit) for large collections
- Admin always scoped to req.user.adminId or req.user.sub
- Never expose other admins' data — enforce businessId scope on every query
- Return amounts in BOTH paisa (raw) and BDT (formatted) in response
- Input amounts from Flutter are in BDT (decimal) — convert to paisa immediately
```

---

# ════════════════════════════════════════════════════════
# PHASE 5 — INTEGRATIONS PROMPT
# Start a new conversation. Paste this.
# ════════════════════════════════════════════════════════

```
You are a senior integration engineer. Build all third-party integrations for "FinFlow Pro".

## GENERATE THESE COMPLETE SERVICE FILES:

---

### 1. src/services/telegramService.js

Use: grammy (npm package)

```javascript
// Create and configure a bot instance for an admin
async createBot(botToken)
// Returns a grammy Bot instance, validates token via getMe API

// Send a message to a chat
async sendMessage({ botToken, chatId, text, parseMode: 'HTML'|'Markdown' })

// Setup webhook for a bot (for production)
async setWebhook({ botToken, webhookUrl })

// Validate a bot token
async validateToken(botToken)
// Returns: { valid, botUsername, botName } or throws

// Message formatters (return HTML-formatted strings):
formatTransactionAlert({ type, clientName, amount, fee, profit, wallet, agentName, refId, time })
// Returns formatted HTML message for Telegram

formatLowBalanceAlert({ walletName, walletType, currentBalance, threshold })

formatDailySummary({ date, totalCR, totalDR, totalTransactions, netProfit, topWallet })

formatCommissionRequest({ agentName, amount, requestId })

// Bot command setup (for admin bot)
setupAdminBotCommands(bot)
// /start — Register chat ID
// /balance — Show wallet balances
// /summary — Today's summary
// /approve_{requestId} — Approve commission request
// /reject_{requestId} — Reject commission request
```

Also handle: webhook handler for incoming bot messages (Express route: POST /webhooks/telegram/:adminId)

---

### 2. src/services/smsService.js

Use: Twilio (npm: twilio)

```javascript
// Send SMS
async sendSMS({ to, message })
// Handles: Twilio API call, error handling, retry once on failure
// Returns: { success, messageId, provider: 'TWILIO' }

// Send payment receipt SMS
async sendPaymentReceipt({ clientPhone, template, variables })
/*
variables: { client_name, amount, fee, net_amount, ref_id, date, wallet, business_name }
Interpolates template string: "Dear {client_name}, your payment of ৳{amount}..."
*/

// Generate default receipt message
generateReceiptMessage(variables)

// Check if phone number is valid (Bangladesh: 01XXXXXXXXX format + international)
validatePhone(phone)
```

---

### 3. src/services/whatsappService.js

Use: Twilio WhatsApp Business API

```javascript
// Send WhatsApp message
async sendWhatsApp({ to, message })
// Prepends 'whatsapp:' to phone number as required by Twilio

// Send payment receipt via WhatsApp
async sendPaymentReceipt({ clientPhone, template, variables })

// Check if WhatsApp is configured (check env vars)
isConfigured()
```

---

### 4. src/services/pdfService.js

Use: puppeteer

Generate 4 report types:

```javascript
// Daily Summary Report
async generateDailySummaryReport({ adminId, date, branding })
/*
HTML report including:
- Business logo + name + date header
- Summary table: Total CR, Total DR, Net Profit, Total Transactions
- Wallet opening/closing balances
- Agent commission breakdown table  
- Full transaction list for the day
- Footer: generated by FinFlow Pro + timestamp
Returns: Buffer (PDF bytes)
*/

// Client Statement Report
async generateClientStatement({ adminId, clientId, dateFrom, dateTo, branding })
/*
- Client info header
- Period summary
- Transaction table: Date | Type | Amount | Fee | Net | Wallet | Ref
- Running balance column
*/

// Agent Commission Report  
async generateAgentCommissionReport({ adminId, agentId, dateFrom, dateTo, branding })
/*
- Agent info + period
- Commission summary: earned, settled, pending
- Transaction breakdown with commission per row
- Settlement history
*/

// Wallet Ledger Report
async generateWalletLedgerReport({ adminId, walletId, dateFrom, dateTo, branding })
/*
- Wallet name, type, period
- Opening balance
- All entries: date, type, amount, balance after
- Closing balance
- Reconciliation: sum of entries = closing - opening
*/

// Shared HTML template builder
buildReportHTML({ title, content, branding })
// Wraps content in branded HTML shell with CSS

// Upload PDF to Cloudinary and return URL
async uploadPDF({ buffer, fileName })
```

---

### 5. src/controllers/report.controller.js + routes

#### generateReport(req, res)
- Body: { type: 'DAILY_SUMMARY'|'CLIENT_STATEMENT'|'AGENT_COMMISSION'|'WALLET_LEDGER', dateFrom, dateTo, clientId?, agentId?, walletId? }
- Queue report generation job via BullMQ
- Create Report document with status: GENERATING
- Return: { jobId, reportId, status: 'GENERATING' }

#### getReportStatus(req, res)
- GET /reports/:reportId
- Return current status + downloadUrl if READY

#### downloadReport(req, res)
- GET /reports/:reportId/download
- Return signed Cloudinary URL (or stream PDF)

#### listReports(req, res)
- GET /reports
- List past reports for admin

### 6. src/jobs/reportWorker.js (BullMQ worker)
- Process 'report' queue
- Run appropriate pdfService function
- Upload to Cloudinary
- Update Report document: status → READY, fileUrl
- Send in-app notification: report ready

### 7. src/controllers/integration.controller.js + routes

#### connectTelegram(req, res) [Admin]
- POST /integrations/telegram/connect
- Body: { botToken, chatId }
- Validate token via telegramService.validateToken()
- Encrypt bot token, save to Settings
- Setup webhook
- Return: { connected, botUsername }

#### testTelegram(req, res) [Admin]
- POST /integrations/telegram/test
- Send test message to admin's chatId

#### disconnectTelegram(req, res) [Admin]
- DELETE /integrations/telegram
- Remove token, disable

#### updateNotificationSettings(req, res) [Admin]
- PATCH /integrations/notifications
- Toggle: telegramEnabled, smsEnabled, whatsappEnabled, receiptEnabled, receiptChannel

#### updateReceiptTemplate(req, res) [Admin]
- PATCH /integrations/receipt-template
- Body: { template: string }
- Validate template contains required placeholders

### 8. src/jobs/notificationWorker.js (BullMQ worker)
Process 'notification' queue:
- For TELEGRAM channel: call telegramService.sendMessage()
- For SMS channel: call smsService.sendSMS()
- For WHATSAPP channel: call whatsappService.sendWhatsApp()
- Update Notification.channels[].status
- Handle failures: retry 3 times with exponential backoff
- Log all delivery attempts

### RULES:
- All API keys from environment variables ONLY
- Telegram bot token encrypted with AES-256-GCM before storing
- PDF generation: use puppeteer in headless mode, auto-close browser after use
- WhatsApp/SMS: never throw if delivery fails (non-critical) — just log and update status
- All integrations gracefully degraded: if not configured, skip silently
- BullMQ jobs: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
```

---

# ════════════════════════════════════════════════════════
# PHASE 6 — FLUTTER ADMIN APP PROMPT
# Start a new conversation. Paste this.
# ════════════════════════════════════════════════════════

```
You are a senior Flutter engineer. Build the complete Admin App for "FinFlow Pro" fintech platform.

## DESIGN SYSTEM (follow exactly):
Primary: #1A56DB (Blue)
Secondary: #7C3AED (Violet)
Profit Green: #059669, bg: #ECFDF5
Fee Red: #DC2626, bg: #FEF2F2
Warning Amber: #D97706
Dark bg: #0F172A
Surface: #1E293B
Body font: Inter
Number font: Outfit (bold, tabular figures)
Currency prefix: ৳
Card border radius: 12px
Button border radius: 10px

## FLUTTER STACK:
- flutter_riverpod 2.x (state management)
- dio (HTTP with interceptor)
- go_router (navigation)
- flutter_secure_storage (JWT storage)
- intl (currency/date formatting)
- fl_chart (charts)
- shimmer (loading skeletons)
- lottie (empty states)
- connectivity_plus (offline detection)
- flutter_local_notifications (push)

## GENERATE ALL OF THE FOLLOWING — complete, production-ready Flutter code:

---

### CORE FILES:

#### lib/core/constants/app_colors.dart
All colors as static const Color with the design system above

#### lib/core/constants/app_text_styles.dart
TextStyle constants using Inter + Outfit fonts, all sizes from design system

#### lib/core/constants/api_constants.dart
- baseUrl (from env/flavor)
- All endpoint paths as constants

#### lib/core/network/dio_client.dart
- DioClient class (singleton via Riverpod)
- Base URL, headers, timeout
- Interceptors:
  - AuthInterceptor: add Bearer token from secure storage
  - On 401: attempt token refresh, retry request
  - On refresh fail: logout, navigate to login
- LogInterceptor (debug mode only)
- Error interceptor: convert DioException to AppException

#### lib/core/network/api_interceptor.dart
Full implementation of the auth + refresh interceptor

#### lib/core/storage/secure_storage.dart
- saveTokens({ accessToken, refreshToken })
- getAccessToken()
- getRefreshToken()
- clearTokens()
- saveAdminProfile(admin)
- getAdminProfile()

#### lib/core/utils/currency_formatter.dart
- formatBDT(int paisa) → "৳ 1,234.50"
- formatBDTCompact(int paisa) → "৳ 1.2k" or "৳ 1.2M"
- parseBDT(String) → int paisa (from user input string)

---

### FEATURE: AUTH

#### lib/features/auth/data/auth_repository.dart
- login(email, password) → Future<AuthResponse>
- signup(AdminSignupRequest) → Future<AuthResponse>
- logout() → Future<void>
- refreshToken() → Future<TokenPair>

#### lib/features/auth/presentation/screens/login_screen.dart
Full login UI:
- Email + password text fields
- Show/hide password toggle
- "Login" button with loading state
- Error display (snackbar or inline)
- Link to signup

#### lib/features/auth/presentation/screens/signup_screen.dart
Full signup UI:
- Name, email, password, business name, phone
- Password strength indicator
- Terms checkbox
- Submit with loading

#### lib/providers/auth_provider.dart
- authStateProvider (AsyncNotifier)
- Handles login, logout, token refresh
- Persists session

---

### FEATURE: DASHBOARD

#### lib/features/dashboard/presentation/screens/dashboard_screen.dart
Build the complete dashboard UI:

TOP SECTION:
- Header: "FinFlow Pro" + notification bell (badge count) + avatar
- Today's date

SUMMARY CARDS ROW:
- Card 1: "Total IN" — big green number + transaction count
- Card 2: "Total OUT" — big red number + transaction count

NET PROFIT CARD:
- Large ৳ number in Outfit Bold
- % change vs yesterday (▲ green or ▼ red)

WALLET CARDS HORIZONTAL SCROLL:
- Each wallet: icon (bKash=pink, Nagad=orange, Bank=blue, Cash=green), name, balance
- Low balance wallets highlighted in amber

AGENT COMMISSION WIDGET:
- "Pending commission: ৳X" with agent count
- "Settle" button

RECENT TRANSACTIONS:
- Last 5 transaction cards
- "View All →" link

All sections use shimmer loading skeleton while data loads

---

### FEATURE: ADD TRANSACTION

#### lib/features/transactions/presentation/screens/add_transaction_screen.dart
This is the most complex screen. Build fully:

CR/DR TOGGLE:
- Segmented control, CR=green, DR=red

CLIENT SELECTOR:
- Tap to open bottom sheet with search
- Shows recent/frequent clients at top
- Can add new client inline

AMOUNT INPUT:
- Large numeric text field
- Auto-format with commas as user types
- Currency prefix ৳

FEE RATE FIELD:
- Pre-filled from client/agent/global default
- Editable override
- Show source label: "From: Client Profile"

LIVE PREVIEW WIDGET (updates every 150ms debounce):
```
┌─────────────────────────────────┐
│ Base Fee:      ৳    15.00      │
│ Extra Fee:   + ৳     5.00      │
│ Total Fee:     ৳    20.00 🔴   │
│ Commission:    ৳     8.00 🟣   │
│ Net Profit:    ৳    12.00 🟢   │
│ Client Gets:   ৳  9,980.00     │
└─────────────────────────────────┘
```

EXTRA FEE SECTION (collapsible):
- Type dropdown: Add/Deduct
- Amount input
- Note (required)

PAYMENT SOURCE:
- Auto-suggested wallets shown
- Tap to customize split
- Opens SplitPaymentBottomSheet

AGENT SELECTOR:
- Dropdown with agents list
- Auto-assigns if agent is logged in

NOTE FIELD

SUBMIT BUTTON:
- Shows full confirmation bottom sheet before submitting
- Confirmation sheet shows all values with "Edit" and "Confirm" buttons

---

### SHARED WIDGETS:

#### lib/shared/widgets/wallet_balance_card.dart
Wallet card with: icon, name, balance, available balance, low balance indicator

#### lib/shared/widgets/transaction_card.dart
Transaction list item: client, type badge, amount, fee, profit, time, agent, swipe actions

#### lib/shared/widgets/fee_calculator_widget.dart
Live calculation preview widget (stateful, debounced)

#### lib/shared/widgets/split_payment_sheet.dart
Bottom sheet for selecting/customizing payment split across wallets

#### lib/shared/widgets/agent_earnings_card.dart
Agent card: name, status badge, commission earned/settled/pending, actions

#### lib/shared/widgets/app_button.dart
Primary button with: loading state, disabled state, icon support, full-width option

#### lib/shared/widgets/app_text_field.dart
Custom text field with: label, hint, prefix/suffix, error, validation

#### lib/shared/widgets/loading_skeleton.dart
Shimmer skeleton variants: card, list item, dashboard

---

### NAVIGATION:

#### lib/main.dart + lib/router.dart
go_router setup with:
- /splash
- /login
- /signup
- /dashboard (shell route with bottom nav)
- /transactions (tab)
- /transactions/add
- /transactions/:id
- /clients (tab)
- /clients/:id
- /clients/add
- /agents (tab)
- /agents/:id
- /wallets (shell under "More")
- /reports
- /settings
- /settings/telegram
- /settings/templates
Bottom navigation bar with 5 tabs + FAB

---

### REMAINING SCREENS (generate full UI code for each):

#### lib/features/transactions/presentation/screens/transaction_history_screen.dart
- Filter bar (chips: All, CR, DR, Today, This Week, Custom)
- Search bar
- Summary banner (filtered totals)
- Grouped by date list
- Infinite scroll with cursor pagination

#### lib/features/clients/presentation/screens/client_list_screen.dart
#### lib/features/clients/presentation/screens/client_detail_screen.dart
#### lib/features/agents/presentation/screens/agent_list_screen.dart
#### lib/features/agents/presentation/screens/agent_detail_screen.dart
#### lib/features/wallets/presentation/screens/wallet_list_screen.dart
#### lib/features/wallets/presentation/screens/wallet_detail_screen.dart
#### lib/features/reports/presentation/screens/report_screen.dart
#### lib/features/settings/presentation/screens/settings_screen.dart
#### lib/features/settings/presentation/screens/telegram_setup_screen.dart

### RULES:
- Every screen uses Riverpod for state
- Every API call shows loading state (shimmer or CircularProgressIndicator)
- Error states handled gracefully with retry option
- Empty states with Lottie animation + contextual message
- Offline: show banner, queue write operations
- Amounts displayed with formatBDT() — never raw numbers
- All hard-coded strings use l10n (even if only English for now)
- No business logic in widgets — use providers
```

---

# ════════════════════════════════════════════════════════
# PHASE 7 — FLUTTER AGENT APP PROMPT
# Start a new conversation. Paste this.
# ════════════════════════════════════════════════════════

```
You are a senior Flutter engineer. Build the complete Agent App for "FinFlow Pro".

## CONTEXT:
The Agent App is simpler than Admin. Agents can:
- Login with phone + password
- See ONLY their own transactions and earnings
- Add transactions (if admin permits)
- Add/view their own clients
- Request commission payout
- See their earnings dashboard
- Connect their personal Telegram bot (optional)

Agents CANNOT see: wallet balances, other agents, admin financials, settings

## USE SAME DESIGN SYSTEM as Admin App (same colors, typography)

## SAME FLUTTER STACK — reuse core/ files from admin app

## GENERATE:

### lib/features/auth/presentation/screens/agent_login_screen.dart
- Phone number input (with country code +880)
- Password input
- Login button with loading
- "Contact admin" link instead of signup
- Biometric login option (after first login)

### lib/features/dashboard/presentation/screens/agent_dashboard_screen.dart
EARNINGS CARD (prominent, top):
- This Month: Commission Earned (purple, large)
- Settled: green, Pending: amber
- "Request Payout" button

MY ACTIVITY TODAY:
- Transactions count + Volume

RECENT TRANSACTIONS:
- Own transactions only
- No fee/profit visible — only commission earned per transaction

### lib/features/earnings/presentation/screens/earnings_screen.dart
- Month/date range selector
- Commission breakdown:
  - Total earned
  - Total settled  
  - Pending
  - This month's transactions
- CommissionLedger list (earned, settled entries)
- Bar chart: weekly commission (fl_chart)

### lib/features/earnings/presentation/screens/request_payout_screen.dart
- Show pending balance
- Amount input (max = pending balance)
- Payout method: bKash/Nagad/Bank with account input
- Note field
- Submit with confirmation

### lib/features/transactions/presentation/screens/agent_transaction_screen.dart
- Same as admin transaction list but:
  - Only own transactions
  - Each row shows commission earned (not profit)
  - No cancel/edit options

### lib/features/transactions/presentation/screens/agent_add_transaction_screen.dart
- Same as admin add transaction BUT:
  - Agent field: pre-set to self, hidden
  - Wallet field: hidden (admin-controlled)
  - Shows: commission preview (not profit)
  - Only shows clients assigned to this agent

### lib/features/clients/presentation/screens/agent_client_list_screen.dart
- Only assigned clients
- Can add new client (if admin permits)
- Each client shows total transactions + volume

### lib/features/settings/presentation/screens/agent_settings_screen.dart
- Profile view (name, phone — read only)
- Commission rate (read only)
- Change password
- Telegram personal bot setup:
  - Enter bot token
  - Enter personal chat ID
  - Test connection
  - Notifications: receive own transaction alerts
- Biometric toggle
- Logout

### lib/router.dart (Agent App)
go_router:
- /login
- /dashboard (bottom nav shell)
  - /dashboard/home (tab 1)
  - /dashboard/transactions (tab 2)
  - /dashboard/clients (tab 3)
  - /dashboard/earnings (tab 4)
  - /dashboard/settings (tab 5, icon: person)
- /transactions/add
- /transactions/:id
- /clients/:id
- /clients/add
- /earnings/request-payout

Bottom nav: Home | Transactions | Clients | Earnings | Settings

### RULES:
- Agents never see wallet data
- Commission amounts shown in purple (#7C3AED)
- No profit/fee visibility — only what the agent earned
- Payout request goes to pending, admin must approve — make this clear in UI
- Same Riverpod + Dio setup as admin app
- Reuse all shared widgets from admin app
```

---

# ════════════════════════════════════════════════════════
# PHASE 8 — DEPLOYMENT & SETUP PROMPT
# Start a new conversation. Paste this.
# ════════════════════════════════════════════════════════

```
You are a senior DevOps engineer. Generate complete deployment and setup guides for "FinFlow Pro".

## GENERATE ALL OF THE FOLLOWING:

---

### 1. LOCAL DEVELOPMENT SETUP GUIDE (finflow-backend/README.md)

Step-by-step for a developer joining the team:

#### Prerequisites
- Node.js 20 LTS (nvm recommended)
- MongoDB 7 (local) or MongoDB Atlas free tier
- Redis (local via Docker OR Upstash free tier)
- Git

#### Backend Setup
```bash
git clone <repo>
cd finflow-backend
npm install
cp .env.example .env
# Edit .env with your values
npm run dev          # nodemon for hot reload
npm run test         # jest tests
npm run lint         # eslint
```

#### .env Configuration Guide (explain EVERY variable):
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...
JWT_ACCESS_SECRET=<generate: openssl rand -hex 32>
JWT_REFRESH_SECRET=<generate: openssl rand -hex 32>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
ENCRYPTION_KEY=<generate: openssl rand -hex 32>  # AES-256 key
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
TELEGRAM_WEBHOOK_BASE_URL=https://yourdomain.com
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=debug
ADMIN_INVITE_CODE=<random string for agent self-registration>
```

#### Docker Compose (for local MongoDB + Redis):
Include full docker-compose.yml

---

### 2. PRODUCTION DEPLOYMENT — RENDER.COM (Recommended for solo devs)

Step by step:
1. Create Render account
2. Connect GitHub repo
3. New Web Service: Node.js
4. Build command: `npm install`
5. Start command: `node src/app.js`
6. Set all env variables in Render dashboard
7. MongoDB Atlas setup (free tier → M0):
   - Create cluster
   - Create database user
   - Whitelist all IPs (0.0.0.0/0) for Render
   - Get connection string
8. Upstash Redis setup (free tier):
   - Create database
   - Get REDIS_URL
9. Custom domain + HTTPS (Render provides free SSL)
10. Set TELEGRAM_WEBHOOK_BASE_URL to your Render domain

---

### 3. PRODUCTION DEPLOYMENT — VPS (Ubuntu 22.04)

```bash
# Server setup
apt update && apt upgrade -y
apt install -y nodejs npm nginx certbot python3-certbot-nginx

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2
npm install -g pm2

# Clone and setup app
git clone <repo> /var/www/finflow
cd /var/www/finflow
npm install --production
cp .env.example .env
# Edit .env

# PM2 setup
pm2 start src/app.js --name finflow-api
pm2 startup
pm2 save

# Nginx config
```

Full nginx config for reverse proxy:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

SSL with Certbot:
```bash
certbot --nginx -d api.yourdomain.com
```

---

### 4. FLUTTER APP BUILD GUIDE

#### Android APK / AAB:

```bash
# 1. Update version in pubspec.yaml:
# version: 1.0.0+1

# 2. Set API URL for production in api_constants.dart

# 3. Generate keystore (first time only):
keytool -genkey -v -keystore ~/finflow-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias finflow

# 4. Configure key.properties:
# android/key.properties
storePassword=<your password>
keyPassword=<your password>
keyAlias=finflow
storeFile=/Users/yourname/finflow-release.jks

# 5. Update android/app/build.gradle (signing config)

# 6. Build APK:
flutter build apk --release

# 7. Build AAB (for Play Store):
flutter build appbundle --release

# Output: build/app/outputs/bundle/release/app-release.aab
```

#### iOS IPA (requires macOS + Xcode):
```bash
# 1. Open ios/Runner.xcworkspace in Xcode
# 2. Set Bundle ID: com.yourcompany.finflowadmin
# 3. Set signing team (Apple Developer account required)
# 4. Product → Archive
# 5. Upload to App Store Connect
```

---

### 5. PLAY STORE SUBMISSION GUIDE

Step by step:
1. Create Google Play Console account ($25 one-time)
2. Create new app:
   - App name: "FinFlow Pro Admin"
   - Default language: English (US) or Bengali
   - App type: App
   - Category: Finance
3. Upload AAB to Internal Testing first
4. Fill in:
   - Store listing (title, short/full description, screenshots)
   - App content (questionnaire — declare it's a financial app)
   - Privacy policy URL (required)
   - Contact email
5. Screenshots required (phone + 7" tablet):
   - At least 2 screenshots, up to 8
   - Recommended: Dashboard, Add Transaction, Reports
6. Review checklist before submitting to Production

---

### 6. APP STORE SUBMISSION GUIDE

Step by step:
1. Enroll in Apple Developer Program ($99/year)
2. Create App ID in developer.apple.com
3. Create app in App Store Connect
4. Build + archive from Xcode
5. Upload via Xcode Organizer
6. Fill in:
   - App information, pricing (Free), categories (Finance)
   - Age rating, privacy policy URL
   - Screenshots for iPhone 6.7", 6.5", iPad
7. Submit for review (typically 24-48 hours)

---

### 7. SECURITY CHECKLIST (production)

Generate a checklist:
- [ ] All secrets in env vars (never in code)
- [ ] HTTPS enforced (redirect HTTP → HTTPS)
- [ ] Rate limiting enabled on all endpoints
- [ ] MongoDB network access restricted to app server IP
- [ ] Helmet.js configured (CSP, HSTS, etc.)
- [ ] JWT secrets are minimum 256-bit random strings
- [ ] Bot tokens encrypted in database
- [ ] Input validation on ALL endpoints (Joi)
- [ ] CORS restricted to app origins only
- [ ] Error messages don't leak stack traces
- [ ] PM2 / process manager restarts on crash
- [ ] Database backups enabled (MongoDB Atlas: daily)
- [ ] Log rotation configured
- [ ] Flutter app: certificate pinning (production)
- [ ] Flutter app: jailbreak detection (optional)
- [ ] Flutter app: screenshot disabled on sensitive screens

---

### 8. POSTMAN COLLECTION (export as JSON)

Generate a complete Postman collection with:
- Environment variables: baseUrl, accessToken, refreshToken
- All API endpoints organized in folders:
  - Auth (signup, login, refresh, logout)
  - Transactions (calculate preview first, then CRUD)
  - Wallets (CRUD, ledger, adjust, transfer)
  - Clients (CRUD, transactions)
  - Agents (CRUD, commission, settle)
  - Reports (generate, status, download)
  - Integrations (telegram connect, test, SMS settings)
- Pre-request scripts: auto-inject auth token
- Test scripts: validate response structure
- Example request bodies for every endpoint
- Sample response examples

Format: Postman Collection v2.1 JSON
```

---

# ════════════════════════════════════════════════════════
# PHASE 9 — EXPANSION SUB-PROMPTS
# Use these in FUTURE conversations to extend the system
# ════════════════════════════════════════════════════════

---

## 🔧 SUB-PROMPT A: Add a New Backend Feature

```
You are a senior Node.js engineer continuing work on "FinFlow Pro" fintech backend.

EXISTING SYSTEM:
- Node.js + Express + MongoDB (Mongoose)
- Auth: JWT (ADMIN/AGENT roles)
- Models: Admin, Agent, Client, Transaction, Wallet, WalletLog, CommissionLedger
- All amounts in paisa (BDT × 100)
- Pattern: controllers/ + routes/ + services/ + models/
- ApiResponse utility for consistent responses
- BullMQ for async jobs

NEW FEATURE TO BUILD: [DESCRIBE YOUR FEATURE HERE]

Follow existing patterns exactly:
1. Model: add to existing or create new with proper indexes
2. Service: pure business logic, no HTTP concerns, use Mongoose sessions for atomic ops
3. Controller: HTTP layer only, delegate to service
4. Route: add to appropriate route file with correct middleware (authenticate, requireAdmin/Agent)
5. Validation: Joi schema
6. Tests: Jest unit test for service logic

Output all files needed. Do NOT duplicate existing code — reference it by import.
```

---

## 🎨 SUB-PROMPT B: Add a New Flutter Screen

```
You are a senior Flutter engineer continuing work on "FinFlow Pro" [Admin/Agent] App.

EXISTING SYSTEM:
- Flutter 3.22, Riverpod 2.x, Dio, go_router
- Design system: Blue #1A56DB, Green #059669, Red #DC2626, Purple #7C3AED
- Currency: formatBDT(int paisa) → "৳ 1,234.50" (always use this)
- Fonts: Inter (body), Outfit Bold (numbers)
- Pattern: features/[name]/data/ + domain/ + presentation/
- Shared widgets in lib/shared/widgets/
- Riverpod providers for all state

NEW SCREEN TO BUILD: [DESCRIBE YOUR SCREEN HERE]

Requirements:
1. Full screen Dart file with Riverpod ConsumerWidget
2. Loading state: shimmer skeleton
3. Error state: error card with retry
4. Empty state: Lottie + contextual message
5. All API calls via DioClient (already set up)
6. Add route to router.dart
7. Follow existing widget patterns exactly

Output complete file(s) only. No placeholder code.
```

---

## 🗄️ SUB-PROMPT C: Upgrade Database Schema

```
You are a senior MongoDB/Mongoose engineer working on "FinFlow Pro".

EXISTING SCHEMA VERSION: 1.0
EXISTING COLLECTIONS: Admin, Agent, Client, Transaction, Wallet, WalletLog, CommissionLedger, Settings, RefreshToken, Notification, Report

UPGRADE REQUEST: [DESCRIBE WHAT YOU WANT TO ADD/CHANGE]

Requirements:
1. Write the updated Mongoose model file(s) — complete, not partial
2. Write a migration script: scripts/migrate_v1_to_v2.js
   - Safe to run multiple times (idempotent)
   - Handles existing documents
   - Adds defaults for new fields
   - Creates new indexes
   - Has dry-run mode: node migrate.js --dry-run
3. Update any affected services if field names changed
4. Document: what changed and why

Never remove existing fields without a deprecation plan.
Output complete files.
```

---

## 🐛 SUB-PROMPT D: Debug an Issue

```
You are a senior engineer debugging "FinFlow Pro" fintech platform.

STACK: Node.js + Express + MongoDB + Flutter + Riverpod

ISSUE DESCRIPTION: [PASTE YOUR ERROR MESSAGE, STACK TRACE, OR BEHAVIOR DESCRIPTION]

CONTEXT:
- Error occurs when: [DESCRIBE WHEN]
- Expected behavior: [WHAT SHOULD HAPPEN]
- Actual behavior: [WHAT IS HAPPENING]
- Relevant code (paste it):

[PASTE CODE HERE]

Instructions:
1. Identify the root cause
2. Explain WHY this happens (technically)
3. Provide the fix (complete corrected code)
4. Explain what the fix does
5. List any other places in the codebase that might have the same issue
6. Add a unit test that would catch this in the future
```

---

## 📊 SUB-PROMPT E: Add a New Report Type

```
You are a senior engineer adding a new PDF report to "FinFlow Pro".

EXISTING REPORTS: Daily Summary, Client Statement, Agent Commission, Wallet Ledger
TOOLS: puppeteer (Node.js), Cloudinary (storage), BullMQ (async generation)

NEW REPORT: [DESCRIBE THE REPORT]

Build:
1. pdfService function: async generateXXXReport({ adminId, params, branding })
   - Fetch data from MongoDB
   - Build HTML with branded header/footer
   - Use puppeteer to convert to PDF Buffer
   - Upload to Cloudinary, return { url, size }
2. Add case to reportWorker.js job handler
3. Add API endpoint in report.controller.js
4. Add route in report.routes.js
5. Add UI in Flutter reports screen:
   - New report type card
   - Date/parameter selectors
   - Generate + Download/Share buttons

Output complete code for all files.
```

---

# ════════════════════════════════════════════════════════
# QUICK REFERENCE: PROMPT ORDER
# ════════════════════════════════════════════════════════

```
BUILD ORDER:
────────────────────────────────────────────────
Phase 0 → Folder structure + config files
Phase 1 → Database models (all 10)
Phase 2 → Core services (feeCalculator, transactionEngine, walletService, etc.)
Phase 3 → Authentication API (Admin + Agent login/signup)
Phase 4 → Transaction + Wallet + Client + Agent APIs
Phase 5 → Integrations (Telegram, SMS, WhatsApp, PDF)
Phase 6 → Flutter Admin App (all screens)
Phase 7 → Flutter Agent App (all screens)
Phase 8 → Deployment (local + production + app stores)
────────────────────────────────────────────────

TIPS FOR BEST RESULTS:
• Start a FRESH conversation for each phase
• If output is cut off, continue with: "Continue from where you left off. 
  Next: [last thing it was building]"
• After each phase, test before moving to the next
• Use Sub-Prompts A-E for future features
• Always paste the relevant context section at the top 
  when using sub-prompts
────────────────────────────────────────────────
```

---

*FINFLOW PRO — AI Build Prompt System v1.0*
*Total Prompts: 9 Phases + 5 Sub-Prompts*
*Estimated Build Time: 40-80 hours of AI-assisted development*
