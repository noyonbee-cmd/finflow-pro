# 📋 PRODUCT REQUIREMENTS DOCUMENT
## FinFlow Pro — Financial Transaction & Payout Management Platform
### Admin App + Agent App | Mobile-First Fintech System

---

> **Document Version:** 1.0.0  
> **Status:** Production-Ready Draft  
> **Classification:** Confidential — Internal Engineering  
> **Last Updated:** 2026-05-06  
> **Author:** Product Architecture Team  

---

## TABLE OF CONTENTS

1. [Product Overview](#1-product-overview)
2. [System Architecture](#2-system-architecture)
3. [Core Business Logic](#3-core-business-logic)
4. [Feature Breakdown](#4-feature-breakdown)
5. [UI/UX Design System](#5-uiux-design-system)
6. [Screen-by-Screen Breakdown](#6-screen-by-screen-breakdown)
7. [Integration Architecture](#7-integration-architecture)
8. [Database Structure](#8-database-structure)
9. [API Overview](#9-api-overview)
10. [Edge Case Handling](#10-edge-case-handling)
11. [Future Enhancements](#11-future-enhancements)
12. [Appendix](#12-appendix)

---

## 1. PRODUCT OVERVIEW

### 1.1 Executive Summary

**FinFlow Pro** is a dual-app mobile financial management platform built for small-to-medium financial service operators (e.g., mobile banking agents, remittance handlers, hawala operators) in markets like Bangladesh, India, and Southeast Asia. The platform consists of:

- **Admin App** — Full-control dashboard for business owners to manage transactions, wallets, agents, and reporting.
- **Agent App** — A streamlined app for field agents to process client transactions, track commissions, and communicate with the admin.

The system is engineered around a **DR/CR fee logic model**, **multi-wallet accounting**, **agent commission tracking**, and an **intelligent auto-payment suggestion engine** — all wrapped in a clean, fast, mobile-first fintech UI.

### 1.2 Problem Statement

Financial agents and operators managing bKash/Nagad/Bank/Cash flows face:

| Pain Point | Impact |
|---|---|
| Manual fee calculation errors | Revenue leakage |
| No real-time wallet balance visibility | Overdraft/operational failure |
| Commission disputes with agents | Trust breakdown |
| Fragmented communication (WhatsApp + manual) | Delayed operations |
| No structured reporting | Tax/audit risk |
| No client transaction history | Poor client retention |

### 1.3 Solution Pillars

```
┌─────────────────────────────────────────────────────────────┐
│                      FINFLOW PRO                            │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  Smart Fee   │  Multi-Wallet│   Agent      │  Notification  │
│  Engine      │  Accounting  │  Commission  │  Ecosystem     │
│              │              │  Tracker     │                │
├──────────────┴──────────────┴──────────────┴────────────────┤
│         Auto-Payment Suggestion Intelligence Layer          │
├─────────────────────────────────────────────────────────────┤
│    PDF Reports  │  Telegram Bot  │  SMS/WhatsApp Gateway    │
└─────────────────────────────────────────────────────────────┘
```

### 1.4 Target Users

| User Type | Description | Primary App |
|---|---|---|
| **Admin/Owner** | Business owner managing all operations | Admin App |
| **Senior Agent** | Trusted agent with limited admin access | Admin App (restricted) |
| **Field Agent** | Ground-level transaction processor | Agent App |
| **Client** | End customer (passive — receives receipts) | N/A |

### 1.5 Success Metrics (KPIs)

- Transaction entry time: **< 30 seconds** per transaction
- Fee calculation accuracy: **100%** (zero manual error)
- Agent commission dispute rate: **< 1%**
- Daily report generation time: **< 5 seconds**
- App crash rate: **< 0.1%**
- Notification delivery rate: **> 99%**

---

## 2. SYSTEM ARCHITECTURE

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
├────────────────────────┬────────────────────────────────────────────┤
│    ADMIN APP           │         AGENT APP                          │
│    (React Native)      │         (React Native)                     │
│    iOS + Android       │         iOS + Android                      │
└──────────┬─────────────┴────────────────┬───────────────────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (REST + WebSocket)                 │
│                     Node.js / Express / Fastify                     │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        ▼                          ▼                          ▼
┌───────────────┐      ┌───────────────────┐      ┌──────────────────┐
│  Auth Service │      │ Transaction Engine│      │ Notification Svc │
│  (JWT + OTP)  │      │ (Fee/Commission   │      │ (Telegram/SMS/   │
│               │      │  Calculator)      │      │  WhatsApp)       │
└───────────────┘      └───────────────────┘      └──────────────────┘
        │                          │                          │
        └──────────────────────────┼──────────────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                     │
├──────────────────────┬──────────────────────┬───────────────────────┤
│   Firebase Firestore │   Firebase Storage   │   Redis Cache         │
│   (Primary DB)       │   (PDFs, Receipts)   │   (Balances, Sessions)│
└──────────────────────┴──────────────────────┴───────────────────────┘
```

### 2.2 Technology Stack

#### Frontend (Both Apps)
| Component | Technology | Rationale |
|---|---|---|
| Framework | React Native 0.74+ | Cross-platform, performance |
| Navigation | React Navigation v6 | Industry standard |
| State Management | Zustand + React Query | Lightweight, server-state sync |
| UI Components | Custom Design System | Brand consistency |
| Charts | Victory Native | Financial chart rendering |
| PDF Generation | react-native-html-to-pdf | On-device PDF generation |
| Local Storage | MMKV | 10x faster than AsyncStorage |
| Offline Support | React Query + MMKV | Optimistic updates |

#### Backend
| Component | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Fastify v4 |
| Auth | Firebase Auth + custom JWT |
| Database | Cloud Firestore |
| Cache | Redis (Upstash) |
| Queue | BullMQ (notifications, reports) |
| File Storage | Firebase Storage |
| SMS | Twilio / SSLCommerz SMS |
| WhatsApp | WhatsApp Business API / Twilio |
| Telegram | Bot API via Grammy.js |

### 2.3 Security Architecture

```
┌─────────────────────────────────────────────────┐
│              SECURITY LAYERS                    │
│                                                 │
│  L1: Network    → HTTPS/TLS 1.3 + Certificate  │
│                   Pinning                       │
│                                                 │
│  L2: Auth       → Firebase Auth (OTP) + JWT     │
│                   Refresh Token Rotation        │
│                                                 │
│  L3: API        → Rate Limiting (Redis)         │
│                   Request Signing (HMAC)        │
│                                                 │
│  L4: Data       → Firestore Security Rules      │
│                   Field-level Encryption        │
│                   (AES-256 for amounts)         │
│                                                 │
│  L5: Device     → Jailbreak Detection           │
│                   Screenshot Prevention         │
│                   Biometric Lock                │
└─────────────────────────────────────────────────┘
```

### 2.4 Data Flow Architecture

```
USER ACTION
    │
    ▼
[Input Validation Layer] ──FAIL──► Error Message
    │ PASS
    ▼
[Business Logic Engine]
    │
    ├──► [Fee Calculator]
    │         └──► Returns: fee, net_amount, profit
    │
    ├──► [Commission Calculator]
    │         └──► Returns: agent_commission
    │
    ├──► [Wallet Balance Checker]
    │         └──► Returns: balances, suggestion
    │
    ▼
[Transaction Writer] ──► Firestore (Atomic Batch Write)
    │
    ├──► [Wallet Balance Updater] (atomic)
    ├──► [Commission Ledger Writer] (atomic)
    ├──► [Notification Dispatcher] (async queue)
    └──► [Report Cache Invalidator] (async)
```

---

## 3. CORE BUSINESS LOGIC

### 3.1 Transaction Type Definitions

#### CR — Credit Transaction (Money Received)
> The business **receives** money from a client. The client pays a **fee** for this service.

```
CR Transaction Model:
─────────────────────────────────────────────
  Gross Amount    = Amount client sends to us
  Fee (income)    = (Gross Amount / 1000) × Fee%
  Net to Client   = Gross Amount − Fee
  Wallet Impact   = +Gross Amount (wallet increases)
  P&L Impact      = +Fee (revenue)
─────────────────────────────────────────────

Example:
  Client sends: 5,000 BDT
  Fee Rate: 1.5%
  Fee = (5000 / 1000) × 1.5 = 7.5 BDT
  Net to Client = 4,992.5 BDT
  Revenue = 7.5 BDT
```

#### DR — Debit Transaction (Money Sent)
> The business **sends** money to a client or third party. The business **earns** a fee/profit for processing.

```
DR Transaction Model:
─────────────────────────────────────────────
  Payout Amount   = Amount to be sent
  Fee (earned)    = (Payout Amount / 1000) × Fee%
  Total Collected = Payout Amount + Fee
  Wallet Impact   = −Payout Amount (wallet decreases)
  P&L Impact      = +Fee (revenue earned)
─────────────────────────────────────────────

Example:
  Payout: 10,000 BDT
  Fee Rate: 2%
  Fee = (10,000 / 1000) × 2 = 20 BDT
  Collected from client = 10,020 BDT
  Revenue = 20 BDT
```

### 3.2 Fee Calculation Engine (Detailed)

```javascript
/**
 * Core Fee Calculator
 * Formula: Fee = (Amount / 1000) × FeePercent
 */
function calculateFee(params) {
  const {
    amount,          // number: transaction amount
    feePercent,      // number: fee percentage (e.g., 1.5 for 1.5%)
    transactionType, // 'CR' | 'DR'
    extraFee,        // { amount: number, note: string, type: '+' | '-' }
    agentCommissionPercent, // number: agent's cut
  } = params;

  // Step 1: Base fee calculation
  const baseFee = (amount / 1000) * feePercent;

  // Step 2: Apply extra fee adjustment
  let adjustedFee = baseFee;
  if (extraFee) {
    adjustedFee = extraFee.type === '+'
      ? baseFee + extraFee.amount
      : baseFee - extraFee.amount;
  }

  // Step 3: Agent commission (calculated on main amount, not fee)
  const agentCommission = (amount / 1000) * agentCommissionPercent;

  // Step 4: Net profit after commission
  const netProfit = adjustedFee - agentCommission;

  // Step 5: Calculate wallet impacts
  const walletDebit  = transactionType === 'DR' ? amount : 0;
  const walletCredit = transactionType === 'CR' ? amount : 0;

  return {
    baseFee: round2(baseFee),
    extraFeeAmount: extraFee?.amount || 0,
    extraFeeNote: extraFee?.note || '',
    totalFee: round2(adjustedFee),
    agentCommission: round2(agentCommission),
    netProfit: round2(netProfit),
    walletDebit,
    walletCredit,
    // Display values
    clientReceives: transactionType === 'CR'
      ? round2(amount - adjustedFee)
      : round2(amount),
    clientPays: transactionType === 'DR'
      ? round2(amount + adjustedFee)
      : round2(amount),
  };
}

function round2(num) {
  return Math.round(num * 100) / 100;
}
```

### 3.3 Fee Percent Precedence Rules

```
Fee % Resolution Order (highest priority first):
─────────────────────────────────────────────────
1. Transaction-level override (set manually per transaction)
2. Client-specific fee rate (set on client profile)
3. Agent-specific default fee rate (set on agent profile)
4. Global default fee rate (system settings)
─────────────────────────────────────────────────
```

### 3.4 Agent Commission System

```
Commission Model:
─────────────────────────────────────────────────────────────
  Base: Calculated on MAIN AMOUNT (not on fee)
  Formula: Commission = (Amount / 1000) × CommissionPercent
  
  Commission can be set at:
  ├── Agent Profile Level (default for all transactions)
  ├── Client Level (override for specific clients)
  └── Transaction Level (one-time override)

  Commission Resolution:
  ├── If agent handles transaction → agent earns commission
  ├── If admin handles transaction → no agent commission
  └── If agent is suspended → commission held pending review

  Commission Settlement:
  ├── Auto-credit to agent wallet (if enabled)
  ├── Manual settlement (admin approves payout)
  └── Request-based (agent requests settlement)
─────────────────────────────────────────────────────────────
```

### 3.5 Extra Fee System

```javascript
// Extra Fee can be:
// TYPE A: Fixed surcharge (add to fee)
//   e.g., "+50 BDT — Urgent processing"
// TYPE B: Discount (deduct from fee)  
//   e.g., "-20 BDT — Loyal customer discount"
// TYPE C: Percentage-based (of base fee)
//   e.g., "+10% of fee — Holiday surcharge"

const extraFeeSchema = {
  type: 'FIXED_ADD' | 'FIXED_DEDUCT' | 'PERCENT_ADD' | 'PERCENT_DEDUCT',
  value: Number,
  note: String,       // REQUIRED: reason for extra fee
  visibility: 'RECEIPT_VISIBLE' | 'INTERNAL_ONLY',
};
```

### 3.6 Multi-Wallet Balance Tracking

Each wallet maintains a **running balance ledger** with every transaction atomically updating the balance:

```
Wallet State Machine:
─────────────────────────────────────────────────────────────
  Initial State: { balance: 0, locked: 0, available: 0 }

  On CR Transaction:
    balance    += transaction.amount
    available  += transaction.amount
  
  On DR Transaction:
    balance    -= transaction.amount
    available  -= transaction.amount
    [GUARD: available must be >= 0, else BLOCK or WARN]

  On Commission Payout to Agent Wallet:
    adminWallet.balance    -= commission
    agentWallet.balance    += commission

  Locked Balance:
    Set when transaction is PENDING (e.g., bank transfer in progress)
    Released when transaction is COMPLETED or FAILED
─────────────────────────────────────────────────────────────
```

---

## 4. FEATURE BREAKDOWN

### 4.1 Admin App — Feature Matrix

#### Module 1: Dashboard
| Feature | Priority | Complexity |
|---|---|---|
| Today's transaction summary (CR/DR) | P0 | Low |
| Net profit display | P0 | Low |
| Wallet balance cards (all wallets) | P0 | Medium |
| Agent performance summary | P1 | Medium |
| Quick action shortcuts | P1 | Low |
| Recent transactions feed | P1 | Low |
| Profit trend mini-chart (7d) | P2 | High |
| Outstanding commission widget | P1 | Medium |

#### Module 2: Transaction Management
| Feature | Priority | Complexity |
|---|---|---|
| Add CR transaction | P0 | High |
| Add DR transaction | P0 | High |
| Live fee preview (real-time) | P0 | Medium |
| Extra fee addition | P1 | Medium |
| Multi-wallet payment selector | P0 | High |
| Auto-payment suggestion | P1 | High |
| Transaction history (filterable) | P0 | Medium |
| Transaction search (client/date/type) | P1 | Medium |
| Edit transaction (within 24h) | P1 | Medium |
| Cancel/void transaction | P1 | High |
| Transaction receipt view | P0 | Low |
| Batch import (CSV) | P3 | High |

#### Module 3: Client Management
| Feature | Priority | Complexity |
|---|---|---|
| Add/edit client profile | P0 | Low |
| Client transaction history | P0 | Medium |
| Client-specific fee rate | P1 | Low |
| Client balance/credit tracking | P2 | Medium |
| Send receipt to client (SMS/WA) | P1 | Medium |
| Client search | P0 | Low |
| Client tags/categories | P2 | Low |

#### Module 4: Agent Management (Admin Only)
| Feature | Priority | Complexity |
|---|---|---|
| Add/edit agent profile | P0 | Low |
| Set agent commission rate | P0 | Low |
| Agent transaction list | P0 | Medium |
| Agent earnings dashboard | P0 | Medium |
| Commission settlement | P0 | High |
| Agent wallet view | P1 | Medium |
| Suspend/activate agent | P1 | Low |
| Agent performance comparison | P2 | High |

#### Module 5: Wallet Management
| Feature | Priority | Complexity |
|---|---|---|
| Wallet balance view (all) | P0 | Low |
| Wallet transaction log | P0 | Medium |
| Manual wallet adjustment | P1 | Medium |
| Wallet-to-wallet transfer | P1 | High |
| Wallet commission tracking | P1 | Medium |
| Low balance alert configuration | P1 | Low |

#### Module 6: Reports & Analytics
| Feature | Priority | Complexity |
|---|---|---|
| Daily P&L report (PDF) | P0 | High |
| Client transaction history PDF | P1 | Medium |
| Agent commission report PDF | P1 | Medium |
| Date-range filtering | P0 | Low |
| CSV export | P2 | Medium |
| Custom branding on PDFs | P1 | Medium |

#### Module 7: Settings
| Feature | Priority | Complexity |
|---|---|---|
| Business profile | P0 | Low |
| Default fee rates | P0 | Low |
| Telegram bot setup | P1 | Medium |
| SMS/WhatsApp toggle | P1 | Medium |
| Message template editor | P1 | Medium |
| Notification preferences | P1 | Low |
| User management (sub-admins) | P2 | High |
| App PIN/biometric lock | P0 | Medium |
| Backup & restore | P2 | High |

### 4.2 Agent App — Feature Matrix

| Feature | Priority | Notes |
|---|---|---|
| Personal dashboard (earnings only) | P0 | No admin financials |
| Add transaction (assigned clients only) | P0 | |
| View own commission | P0 | |
| Request commission payout | P1 | |
| Client list (own clients) | P0 | |
| Add new client | P1 | Admin approval option |
| Transaction history (own only) | P0 | |
| Telegram bot personal connection | P2 | |
| Receive notifications | P0 | |
| PDF commission statement | P1 | |

### 4.3 Auto-Payment Suggestion Engine

```
SUGGESTION ALGORITHM:

INPUT: required_amount, available_wallets[]

STEP 1: Filter wallets with available_balance > 0
  sufficient_wallets = wallets.filter(w => w.available >= required_amount)

STEP 2: If single wallet can cover
  → Rank by: 
    a) Lowest fee wallet first (bKash agent commission logic)
    b) Highest balance first (minimize wallet count)
    c) User preference (sticky last-used)
  → Return: top 1 wallet as PRIMARY suggestion

STEP 3: If no single wallet can cover (SPLIT REQUIRED)
  → Algorithm: Greedy fill from highest balance wallet
  → Generate all combinations that cover required_amount
  → Score each combination by:
      score = (num_wallets * -10) + preference_bonus + balance_health
  → Return: top 3 split combinations

STEP 4: If total available < required_amount
  → Flag: INSUFFICIENT_BALANCE
  → Show: deficit amount
  → Option: partial payment + mark remainder as PENDING

STEP 5: User Override
  → Always show manual selector
  → Save user choice as preference signal (ML future)
  → Never auto-submit without explicit confirmation
```

---

## 5. UI/UX DESIGN SYSTEM

### 5.1 Design Philosophy

**"Trusted Precision"** — Every pixel communicates reliability, speed, and clarity. The interface must feel like a professional financial instrument — not a flashy app. Inspired by Wise's clarity, bKash's speed, and Payoneer's trustworthiness.

**Core Principles:**
1. **Speed first** — Key actions reachable in ≤ 2 taps
2. **Number legibility** — Financial numbers must be impossible to misread
3. **Error prevention > error correction** — Guide users before they make mistakes
4. **Color as data** — Colors carry meaning, not just aesthetics
5. **Progressive disclosure** — Show simple by default, complex on demand

### 5.2 Color System

```
PRIMARY PALETTE
───────────────────────────────────────────────
$brand-primary:     #1A56DB   (Electric Blue — Actions, Links)
$brand-secondary:   #7C3AED   (Violet — Secondary CTAs)

SEMANTIC COLORS
───────────────────────────────────────────────
$profit-green:      #059669   (Net profit, earnings)
$profit-green-bg:   #ECFDF5   (Profit card backgrounds)
$fee-red:           #DC2626   (Fees, expenses, losses)
$fee-red-bg:        #FEF2F2   (Fee card backgrounds)
$warning-amber:     #D97706   (Low balance, pending)
$warning-amber-bg:  #FFFBEB

NEUTRAL SYSTEM
───────────────────────────────────────────────
$gray-900:          #111827   (Primary text)
$gray-700:          #374151   (Secondary text)
$gray-500:          #6B7280   (Placeholder, labels)
$gray-300:          #D1D5DB   (Borders, dividers)
$gray-100:          #F3F4F6   (Page backgrounds)
$white:             #FFFFFF   (Cards, surfaces)

DARK MODE VARIANTS
───────────────────────────────────────────────
$dark-bg:           #0F172A
$dark-surface:      #1E293B
$dark-border:       #334155
$dark-text:         #F1F5F9

WALLET BRAND COLORS
───────────────────────────────────────────────
$bkash-pink:        #E2136E
$nagad-orange:      #F05A28
$bank-blue:         #1D4ED8
$cash-green:        #15803D
```

### 5.3 Typography System

```
FONT: "Inter Variable" (system-level performance)
Secondary Display: "Outfit" (large numbers, headers)

TYPE SCALE
───────────────────────────────────────────────
$text-xs:     11px / 16px  (Timestamps, fine print)
$text-sm:     13px / 18px  (Labels, secondary)
$text-base:   15px / 22px  (Body text)
$text-lg:     17px / 24px  (Card titles)
$text-xl:     20px / 28px  (Section headers)
$text-2xl:    24px / 32px  (Page headers)
$text-3xl:    30px / 38px  (Dashboard numbers)
$text-4xl:    36px / 44px  (Hero amounts)
$text-5xl:    48px / 56px  (Balance display)

WEIGHT SCALE
───────────────────────────────────────────────
Regular:   400  (body text)
Medium:    500  (labels, secondary)
Semibold:  600  (card values, CTAs)
Bold:      700  (amounts, critical info)
Extrabold: 800  (hero balance displays)

NUMBER FORMATTING RULE (CRITICAL)
───────────────────────────────────────────────
All financial numbers use:
  - Outfit Bold font family
  - Tabular numeric variant (tnum)
  - Always show 2 decimal places
  - Thousands separator (comma)
  - Currency prefix: ৳ (taka) or configurable
  
  Example: ৳ 12,345.50
```

### 5.4 Spacing & Grid System

```
BASE UNIT: 4px

$space-1:   4px
$space-2:   8px
$space-3:  12px
$space-4:  16px
$space-5:  20px
$space-6:  24px
$space-8:  32px
$space-10: 40px
$space-12: 48px

SCREEN MARGINS:  16px (phone) / 24px (tablet)
CARD PADDING:    16px all sides
CARD RADIUS:     12px
INNER RADIUS:     8px
BUTTON RADIUS:   10px
PILL RADIUS:     999px

CARD SHADOW (Light Mode):
  shadow-sm: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)
  shadow-md: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)
  shadow-lg: 0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.05)
```

### 5.5 Custom Component Library

#### Component 1: WalletBalanceCard

```
┌─────────────────────────────────────────┐
│  [bKash Icon]  bKash Wallet       [⋮]  │
│                                         │
│  ৳ 45,230.00                           │
│  ──────────────────────                 │
│  Available: ৳ 43,230.00               │
│  Locked:    ৳  2,000.00               │
│                                         │
│  [Commission: ৳ 1,245 this month]      │
│                                         │
│  [View Log]            [Transfer]       │
└─────────────────────────────────────────┘

States:
• Normal:      White card, brand accent left border
• Low Balance: Amber tint, warning icon
• Zero/Negative: Red tint, urgent indicator
• Loading:     Shimmer skeleton animation
```

#### Component 2: TransactionCard

```
┌─────────────────────────────────────────┐
│  [Client Name]      CR  [Green Badge]   │
│  via bKash • 2:45 PM                    │
│  Agent: Rahim                           │
│  ─────────────────────────────────────  │
│  Amount:    ৳ 10,000.00                │
│  Fee:        ৳    15.00  [Red]         │
│  Net:        ৳  9,985.00               │
│  Commission: ৳     8.00  [Purple]      │
│  Profit:     ৳     7.00  [Green]       │
└─────────────────────────────────────────┘

Swipe Actions:
  ← Swipe Left:  [Edit] [Cancel]
  → Swipe Right: [Copy] [Receipt]
```

#### Component 3: Smart Fee Calculator Widget

```
┌─────────────────────────────────────────┐
│  💡 FEE CALCULATOR                      │
│                                         │
│  Amount: [___________] BDT              │
│  Fee %:  [1.5%  ▼]                     │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Base Fee:     ৳    15.00        │  │
│  │  Extra Fee:  + ৳     5.00  [📝]  │  │
│  │  ─────────────────────────────── │  │
│  │  Total Fee:    ৳    20.00  [🔴]  │  │
│  │  Commission:   ৳     8.00  [🟣]  │  │
│  │  Net Profit:   ৳    12.00  [🟢]  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Updates live as you type]             │
└─────────────────────────────────────────┘
```

#### Component 4: Split Payment Selector

```
┌─────────────────────────────────────────┐
│  💳 PAYMENT SOURCE                      │
│  Total Required: ৳ 25,000.00           │
│                                         │
│  🤖 SUGGESTED:                          │
│  ┌─────────────────────────────────┐   │
│  │  ✓ bKash    ৳ 15,000  (Tap ±) │   │
│  │  ✓ Nagad    ৳ 10,000  (Tap ±) │   │
│  │  ─────────────────────────────  │   │
│  │  Total:     ৳ 25,000  ✅       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  OTHER OPTIONS                          │
│  ○ Bank only (insufficient ৳18,200)    │
│  ○ Cash only (insufficient ৳8,500)     │
│                                         │
│  [Customize Split]  [Use Suggested ▶]  │
└─────────────────────────────────────────┘
```

#### Component 5: Agent Earnings Card

```
┌─────────────────────────────────────────┐
│  👤 Rahim Ahmed            [Active 🟢]  │
│  Agent ID: #AGT-042                     │
│                                         │
│  THIS MONTH                             │
│  Transactions:  47                      │
│  Commission:   ৳ 3,245.00  [🟣]       │
│  Settled:      ৳ 2,000.00  [🟢]       │
│  Pending:      ৳ 1,245.00  [🟡]       │
│                                         │
│  [View Details]    [Settle Commission]  │
└─────────────────────────────────────────┘
```

#### Component 6: Floating Action Button (FAB)

```
Main FAB (+ icon, brand blue, 56px)
Expands to:
  ╭──────────────╮
  │  📥 CR       │  ← Credit (money in)
  │  📤 DR       │  ← Debit (money out)
  │  🔄 Transfer │  ← Wallet to wallet
  ╰──────────────╯
  
Animation: Spring expand from center
Background: Blurred scrim overlay
```

### 5.6 Navigation Architecture

#### Admin App Navigation
```
BOTTOM TAB BAR (5 Tabs)
────────────────────────────────────────────────────────────
Tab 1: 🏠 Dashboard     → Main overview
Tab 2: 📊 Transactions  → History + Add (via FAB)
Tab 3: 👥 Clients       → Client management
Tab 4: 👤 Agents        → Agent management (Admin only)
Tab 5: ⚙️ More          → Wallets, Reports, Settings
────────────────────────────────────────────────────────────

Tab bar specs:
  Height: 83px (+ safe area)
  Active: $brand-primary icon + label
  Inactive: $gray-400 icon, no label
  Badge: Red dot for unread notifications
  FAB: Floats above center of tab bar
```

#### Agent App Navigation
```
BOTTOM TAB BAR (4 Tabs)
────────────────────────────────────────────────────────────
Tab 1: 🏠 Home          → Earnings dashboard
Tab 2: 📊 Transactions  → Own transactions
Tab 3: 👥 Clients       → Own clients
Tab 4: 👤 Profile       → Settings, bot connection
────────────────────────────────────────────────────────────
```

### 5.7 Micro-UX Patterns

| Pattern | Implementation |
|---|---|
| **Live fee preview** | Debounced 150ms after keystroke stops |
| **Amount input** | Numeric keyboard, auto-format with commas |
| **Haptic feedback** | Success = soft tap, Error = double tap |
| **Loading states** | Skeleton screens (not spinners) for lists |
| **Empty states** | Illustrated, contextual, with CTA |
| **Pull to refresh** | Standard pattern with elastic overdrag |
| **Transaction confirmation** | Bottom sheet with full summary before submit |
| **Error messages** | Inline, field-level, non-blocking |
| **Offline indicator** | Persistent top banner, queue local actions |

---

## 6. SCREEN-BY-SCREEN BREAKDOWN

### 6.1 ADMIN APP SCREENS

---

#### SCREEN A1: Splash / Onboarding

**Purpose:** App initialization, auth check, brand moment

**Flow:**
```
App Launch
    ↓
Logo animation (600ms)
    ↓
[Check auth state]
    ├── Authenticated + no PIN → Dashboard
    ├── Authenticated + PIN set → PIN Screen
    └── Not authenticated → Login Screen
```

**Components:** Logo, brand color fill, loading indicator

---

#### SCREEN A2: Login Screen

**Purpose:** Secure authentication entry point

**Layout:**
```
┌──────────────────────────────────┐
│                                  │
│     [Business Logo / Name]       │
│                                  │
│     "Welcome Back"               │
│     Manage your finances          │
│                                  │
│  ┌────────────────────────────┐  │
│  │ 📱 Phone Number            │  │
│  └────────────────────────────┘  │
│                                  │
│  [Send OTP →]                    │
│                                  │
│  ─── or ───                      │
│                                  │
│  [🔐 Use PIN / Biometric]        │
│                                  │
│  First time? Contact your admin  │
└──────────────────────────────────┘
```

**Validation:**
- Phone: Bangladesh/international format regex
- OTP: 6-digit, 2-minute expiry, auto-submit on complete
- Failed OTP: 3 attempts then 5-minute lockout

---

#### SCREEN A3: Admin Dashboard

**Purpose:** Real-time financial overview and quick actions

**Layout:**
```
┌──────────────────────────────────┐
│ FinFlow Pro     🔔(3)     [👤]   │
│ Wednesday, 6 May 2026            │
├──────────────────────────────────┤
│  TODAY'S SUMMARY                 │
│  ┌──────────┐  ┌──────────────┐  │
│  │ Total IN │  │ Total OUT    │  │
│  │ ৳42,000  │  │ ৳28,500     │  │
│  │ 12 txns  │  │ 8 txns      │  │
│  └──────────┘  └──────────────┘  │
│                                  │
│  NET PROFIT TODAY                │
│  ৳ 1,245.50  ▲ +12% vs yday    │
├──────────────────────────────────┤
│  WALLETS           [View All →]  │
│  ┌────────────────────────────┐  │
│  │ 💗 bKash    ৳ 45,230.00   │  │
│  │ 🟠 Nagad    ৳ 18,150.00   │  │
│  │ 🔵 Bank     ৳ 82,400.00   │  │
│  │ 🟢 Cash     ৳  5,800.00   │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  AGENT COMMISSIONS  [Settle →]   │
│  Pending: ৳ 4,320.00            │
│  3 agents awaiting settlement    │
├──────────────────────────────────┤
│  RECENT TRANSACTIONS             │
│  [Transaction cards list]        │
│  [Load More ▼]                   │
└──────────────────────────────────┘
│ 🏠 │ 📊 │ [+] │ 👥 │ ⚙️ │
└──────────────────────────────────┘
```

**Data refresh:** WebSocket real-time for balances, polling 30s for summary

---

#### SCREEN A4: Add Transaction (CR)

**Purpose:** Record a credit transaction with full fee logic

**Layout:**
```
┌──────────────────────────────────┐
│ ← Add Transaction    [Draft 💾]  │
│  ● CR  ○ DR                      │
├──────────────────────────────────┤
│  CLIENT                          │
│  ┌─[🔍 Search or add client]──┐  │
│  │ Karim Uddin                 │  │
│  └────────────────────────────┘  │
│                                  │
│  AMOUNT                          │
│  ┌────────────────────────────┐  │
│  │ ৳ [10,000]________________│  │
│  └────────────────────────────┘  │
│                                  │
│  FEE RATE                        │
│  [1.5% ▼]  Source: [Client ▼]   │
│                                  │
│  ──────────────────────────────  │
│  💡 LIVE PREVIEW                 │
│  ┌────────────────────────────┐  │
│  │ Base Fee:     ৳    15.00  │  │
│  │ Extra Fee:    ৳     0.00  │  │
│  │ Total Fee:    ৳    15.00  │  │
│  │ Commission:   ৳     6.00  │  │
│  │ Net Profit:   ৳     9.00  │  │
│  │ Client Gets:  ৳ 9,985.00  │  │
│  └────────────────────────────┘  │
│                                  │
│  EXTRA FEE (Optional)            │
│  [+ Add extra fee]               │
│                                  │
│  WALLET SOURCE                   │
│  [Auto-suggest ▼ or Manual]      │
│  ✓ bKash ৳10,000                │
│                                  │
│  AGENT                           │
│  [Rahim Ahmed ▼]                 │
│                                  │
│  NOTE (Optional)                 │
│  [___________________________]   │
│                                  │
│  [RECORD TRANSACTION →]          │
└──────────────────────────────────┘
```

**Behavior:**
- Live fee updates: Debounced 150ms after last keypress
- Client selection: Bottom sheet search with recent/favorites
- Fee rate: Auto-populated from client/agent/global; editable
- Wallet: Auto-suggested; tapping opens split payment sheet
- Agent: Auto-assigned if agent added the transaction
- Confirmation: Bottom sheet showing full transaction summary

---

#### SCREEN A5: Add Transaction (DR)

Same as A4 but:
- Label changes: "Client Pays" instead of "Client Gets"
- Wallet source → "Paying from" (balance decreases)
- Visual cue: Red accent instead of green
- Warning if wallet balance insufficient

---

#### SCREEN A6: Transaction Confirmation Sheet

```
┌──────────────────────────────────┐
│  ▐▌ CONFIRM TRANSACTION          │
│                                  │
│  Type:      CREDIT (CR)          │
│  Client:    Karim Uddin          │
│  Wallet:    bKash                │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Amount:       ৳ 10,000.00 │  │
│  │ Fee (1.5%):   ৳     15.00 │  │
│  │ Client Gets:  ৳  9,985.00 │  │
│  │ Commission:   ৳      6.00 │  │
│  │ Net Profit:   ৳      9.00 │  │
│  └────────────────────────────┘  │
│                                  │
│  Agent: Rahim Ahmed              │
│  Time:  2026-05-06 14:32         │
│                                  │
│  📲 Send receipt? [Toggle ON]    │
│     via: [SMS] [WhatsApp]        │
│                                  │
│  [← Edit]      [✓ Confirm]      │
└──────────────────────────────────┘
```

---

#### SCREEN A7: Transaction History

**Purpose:** Searchable, filterable list of all transactions

```
┌──────────────────────────────────┐
│ ← Transactions         [Filter] │
│ [🔍 Search client, amount...]    │
├──────────────────────────────────┤
│ FILTERS (chip row)               │
│ [All] [CR] [DR] [Today] [Custom] │
├──────────────────────────────────┤
│ SUMMARY BAR                      │
│ 20 results  │ IN: ৳84k  OUT:৳56k │
├──────────────────────────────────┤
│ TODAY                            │
│  [TransactionCard]               │
│  [TransactionCard]               │
│ YESTERDAY                        │
│  [TransactionCard]               │
│  ...                             │
└──────────────────────────────────┘
```

**Filter options:** Type (CR/DR/Transfer), Date range, Client, Agent, Wallet, Amount range, Status

---

#### SCREEN A8: Client Profile

```
┌──────────────────────────────────┐
│ ← Karim Uddin            [Edit] │
│  📞 01700-000000                 │
│  Fee Rate: 1.5% (Custom)        │
│  Added: 15 Mar 2025             │
├──────────────────────────────────┤
│  LIFETIME STATS                  │
│  Transactions: 87                │
│  Total Volume: ৳ 4,23,500       │
│  Total Fees:   ৳   1,245        │
├──────────────────────────────────┤
│  [TRANSACTION HISTORY]           │
│  [SEND MESSAGE]                  │
│  [GENERATE STATEMENT]            │
├──────────────────────────────────┤
│  RECENT TRANSACTIONS             │
│  [Transaction cards...]          │
└──────────────────────────────────┘
```

---

#### SCREEN A9: Agent Management List

```
┌──────────────────────────────────┐
│ ← Agents            [+ Add]     │
│ [🔍 Search agents...]            │
├──────────────────────────────────┤
│ SUMMARY                          │
│ 5 Active │ 1 Suspended           │
│ Total Pending: ৳ 8,430          │
├──────────────────────────────────┤
│  [Agent Earnings Card - Rahim]   │
│  [Agent Earnings Card - Sakib]   │
│  [Agent Earnings Card - Nasrin]  │
│  ...                             │
└──────────────────────────────────┘
```

---

#### SCREEN A10: Agent Detail

```
┌──────────────────────────────────┐
│ ← Rahim Ahmed            [Edit] │
│  📞 01800-000000                 │
│  Commission Rate: 0.8%           │
│  Status: Active 🟢               │
│  Joined: 1 Jan 2025             │
├──────────────────────────────────┤
│  THIS MONTH          [◀ May ▶]  │
│  Transactions: 47                │
│  Volume:    ৳ 4,85,000          │
│  Commission: ৳     3,245        │
│  Settled:   ৳     2,000         │
│  Pending:   ৳     1,245  [🟡]  │
├──────────────────────────────────┤
│  [SETTLE ৳1,245]                 │
│  [SETTLEMENT HISTORY]            │
│  [VIEW TRANSACTIONS]             │
│  [SUSPEND AGENT]                 │
└──────────────────────────────────┘
```

---

#### SCREEN A11: Commission Settlement Flow

```
Step 1: Settlement Amount Review
┌──────────────────────────────────┐
│  ← Settle Commission             │
│  Agent: Rahim Ahmed              │
│  Period: 1-31 May 2026          │
│                                  │
│  Pending Commission: ৳ 1,245    │
│  [Settle Amount: ৳ 1,245.00]    │
│   (editable — partial possible)  │
│                                  │
│  Pay from: [Cash Wallet ▼]       │
│  Note: [________________]        │
│                                  │
│  [Preview Settlement →]          │
└──────────────────────────────────┘

Step 2: Confirmation + auto-debit from selected wallet
```

---

#### SCREEN A12: Wallet Detail

```
┌──────────────────────────────────┐
│ ← bKash Wallet                  │
│                                  │
│  ৳ 45,230.00                    │
│  Available: ৳ 43,230            │
│  Locked:    ৳  2,000            │
│                                  │
│  COMMISSION EARNED (this month)  │
│  ৳ 1,245.00                     │
│                                  │
│  [+ Add Funds] [Transfer Out]    │
├──────────────────────────────────┤
│  TRANSACTION LOG                 │
│  [Date range filter]             │
│  ┌────────────────────────────┐  │
│  │ ▲ CR  Karim  +৳10,000     │  │
│  │ ▼ DR  Rahim  -৳5,000      │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

---

#### SCREEN A13: Report Generation

```
┌──────────────────────────────────┐
│ ← Generate Report               │
├──────────────────────────────────┤
│  REPORT TYPE                     │
│  ○ Daily Summary                 │
│  ● Client Statement              │
│  ○ Agent Commission              │
│  ○ Wallet Ledger                 │
├──────────────────────────────────┤
│  DATE RANGE                      │
│  From: [01 May 2026]            │
│  To:   [06 May 2026]            │
├──────────────────────────────────┤
│  CLIENT (if applicable)          │
│  [Select Client ▼]               │
├──────────────────────────────────┤
│  INCLUDE                         │
│  ☑ Fee breakdown                 │
│  ☑ Commission detail             │
│  ☑ Business logo & branding      │
│  ☑ Running balance               │
├──────────────────────────────────┤
│  [Preview]  [Download PDF]       │
└──────────────────────────────────┘
```

---

#### SCREEN A14: Settings — Telegram Bot Setup

```
┌──────────────────────────────────┐
│ ← Telegram Bot Setup            │
├──────────────────────────────────┤
│  STATUS: Not Connected           │
│                                  │
│  STEP 1: Create a bot            │
│  Open @BotFather → /newbot       │
│  Copy your bot token             │
│                                  │
│  STEP 2: Enter Token             │
│  ┌────────────────────────────┐  │
│  │ Bot Token: [____________]  │  │
│  └────────────────────────────┘  │
│  [Verify & Connect]              │
│                                  │
│  ──────────────────────────────  │
│  NOTIFICATIONS (after connect)   │
│  ☑ New transaction alert         │
│  ☑ Daily summary (8 PM auto)     │
│  ☑ Low balance warning           │
│  ☑ Agent commission request      │
│                                  │
│  TEST: [Send Test Message]       │
└──────────────────────────────────┘
```

---

#### SCREEN A15: Settings — SMS/WhatsApp Templates

```
┌──────────────────────────────────┐
│ ← Message Templates             │
│                                  │
│  GLOBAL TOGGLE                   │
│  Send receipts to clients: [ON]  │
│                                  │
│  DEFAULT CHANNEL                 │
│  ● SMS  ○ WhatsApp  ○ Both      │
│                                  │
│  TEMPLATES                       │
│  ┌────────────────────────────┐  │
│  │ Receipt Template           │  │
│  │ Dear {client_name},        │  │
│  │ Transaction complete.       │  │
│  │ Amount: {amount}           │  │
│  │ Fee: {fee}                  │  │
│  │ Ref: {ref_id}               │  │
│  │ -{business_name}           │  │
│  └────────────────────────────┘  │
│  [Edit Template]                 │
│                                  │
│  VARIABLES AVAILABLE:            │
│  {client_name} {amount} {fee}    │
│  {ref_id} {date} {wallet}        │
│  {business_name}                 │
└──────────────────────────────────┘
```

---

### 6.2 AGENT APP SCREENS

---

#### SCREEN B1: Agent Dashboard

```
┌──────────────────────────────────┐
│ FinFlow Agent    🔔      [👤]    │
│ Hi, Rahim!                       │
├──────────────────────────────────┤
│  MY EARNINGS — MAY 2026          │
│  ┌────────────────────────────┐  │
│  │  Commission Earned         │  │
│  │  ৳ 3,245.00  [🟣]         │  │
│  │                            │  │
│  │  Settled:  ৳ 2,000  [🟢]  │  │
│  │  Pending:  ৳ 1,245  [🟡]  │  │
│  └────────────────────────────┘  │
│  [Request Payout →]              │
├──────────────────────────────────┤
│  MY ACTIVITY TODAY               │
│  Transactions: 6  │  Volume: ৳42k│
├──────────────────────────────────┤
│  RECENT TRANSACTIONS             │
│  [Transaction cards — own only]  │
└──────────────────────────────────┘
│ 🏠 │ 📊 │ [+] │ 👥 │ 👤 │
└──────────────────────────────────┘
```

---

#### SCREEN B2: Agent — Add Transaction

Same as A4/A5 but:
- Agent field: Auto-set to self (not changeable)
- Wallet: Not selectable by agent (admin-controlled setting)
- Commission preview shown (agent sees own commission)
- No profit visibility (privacy)

---

#### SCREEN B3: Agent — Commission Request

```
┌──────────────────────────────────┐
│ ← Request Payout                │
│                                  │
│  PENDING COMMISSION              │
│  ৳ 1,245.00                     │
│                                  │
│  REQUEST AMOUNT                  │
│  ┌────────────────────────────┐  │
│  │ ৳ [1,245.00]              │  │
│  └────────────────────────────┘  │
│  (Max: ৳1,245.00)               │
│                                  │
│  PAYOUT METHOD                   │
│  [bKash: 017XX-XXXXX ▼]          │
│                                  │
│  NOTE                            │
│  [________________]              │
│                                  │
│  [Submit Request →]              │
│                                  │
│  STATUS: No pending requests     │
└──────────────────────────────────┘
```

---

## 7. INTEGRATION ARCHITECTURE

### 7.1 Telegram Bot Integration

```
SETUP FLOW:
──────────────────────────────────────────────────
Admin creates bot via @BotFather (external step)
    ↓
Admin enters bot token in Settings
    ↓
Backend: POST /integrations/telegram/connect
  { token: "BOT_TOKEN", chatId: "ADMIN_CHAT_ID" }
    ↓
System validates token via Telegram API
  GET https://api.telegram.org/bot{token}/getMe
    ↓
On success: Store encrypted token in Firestore
Start webhook: POST /setWebhook
    ↓
Admin: Send /start to bot → Bot registers chat_id
──────────────────────────────────────────────────

EVENT TRIGGERS → TELEGRAM MESSAGES:
──────────────────────────────────────────────────
EVENT: transaction.created
  Message template:
  ┌─────────────────────────────────────────┐
  │ 💰 New Transaction                      │
  │ Type: CR | Client: Karim               │
  │ Amount: ৳ 10,000.00                    │
  │ Fee: ৳ 15.00 | Profit: ৳ 9.00         │
  │ Wallet: bKash | Agent: Rahim           │
  │ Time: 14:32 | Ref: #TXN-2847          │
  └─────────────────────────────────────────┘

EVENT: balance.low
  Message: ⚠️ LOW BALANCE: bKash wallet is
  below ৳5,000 threshold. Current: ৳3,200

EVENT: commission.requested
  Message: 🔔 Agent Rahim has requested
  commission payout of ৳1,245. Approve?
  [/approve_1245] [/reject]

EVENT: daily.summary (scheduled 8 PM)
  Message: 📊 Daily Summary — 6 May 2026
  CR: ৳42,000 (12 txn)
  DR: ৳28,500 (8 txn)
  Net Profit: ৳1,245.50
  Top Wallet: bKash ৳45,230
──────────────────────────────────────────────────

AGENT BOT (Optional):
  Agent connects personal bot via agent app settings
  Receives: Own transaction confirmations only
  Cannot receive admin-level notifications
```

### 7.2 SMS / WhatsApp Gateway

```
PROVIDER PRIORITY:
  Primary:  Twilio (WhatsApp Business API + SMS)
  Fallback: SSLCommerz SMS (Bangladesh local)
  Backup:   BulkSMSBD

RECEIPT DELIVERY FLOW:
──────────────────────────────────────────────────
Transaction CONFIRMED
    ↓
Check: client.hasPhone && notifications.receiptsEnabled
    ↓ YES
Resolve template (client-specific or global default)
    ↓
Interpolate variables:
  {client_name}, {amount}, {fee}, {net_amount},
  {ref_id}, {date}, {wallet}, {business_name}
    ↓
Select channel:
  WhatsApp (preferred if client uses WA)
  SMS (fallback or user preference)
    ↓
Enqueue: NotificationQueue (BullMQ)
    ↓
Worker processes: POST to provider API
    ↓
Log: delivery status, timestamp, provider
    ↓
Retry: 3 attempts on failure (exponential backoff)
──────────────────────────────────────────────────

MESSAGE EXAMPLE (SMS):
"Dear Karim, ৳9,985 credited via bKash.
Fee: ৳15.00. Ref: TXN-2847. 
Thank you. -FinFlow Business"

WHATSAPP EXAMPLE (rich):
Title: Payment Receipt
Body: [Formatted above]
Footer: FinFlow Pro | [Business Name]
```

### 7.3 PDF Report System

```
GENERATION STACK:
  React Native: react-native-html-to-pdf (on-device)
  Backend: Puppeteer (server-side for complex reports)
  Storage: Firebase Storage (30-day retention)

PDF TYPES AND CONTENTS:
──────────────────────────────────────────────────

1. DAILY SUMMARY REPORT
   Header: Business logo + name + report date
   Section 1: Summary table (CR/DR/Net/Profit)
   Section 2: Wallet balances (opening/closing)
   Section 3: Agent commission breakdown
   Section 4: Transaction list (all)
   Footer: Generated by FinFlow Pro + timestamp

2. CLIENT STATEMENT
   Header: Business + client info
   Section 1: Period summary
   Section 2: Transaction table:
     [Date | Type | Amount | Fee | Net | Wallet | Ref]
   Section 3: Running balance
   Footer: Digital signature + confidentiality note

3. AGENT COMMISSION REPORT  
   Header: Business + agent info
   Section 1: Commission summary by period
   Section 2: Transaction breakdown with commission
   Section 3: Settlement history
   Section 4: Balance due

4. WALLET LEDGER REPORT
   Header: Wallet name + period
   Section 1: Opening balance
   Section 2: All entries (debit/credit)
   Section 3: Closing balance
   Section 4: Reconciliation summary

BRANDING OPTIONS (Configurable):
  - Business logo (upload in settings)
  - Brand color (hex input)
  - Business address + contact
  - Custom footer text
  - Report watermark
──────────────────────────────────────────────────
```

---

## 8. DATABASE STRUCTURE

### 8.1 Firestore Collections Schema

#### Collection: `users`
```javascript
{
  uid: string,                // Firebase Auth UID
  role: 'ADMIN' | 'AGENT',
  name: string,
  phone: string,
  email: string,
  businessId: string,         // Foreign key → businesses
  agentId: string | null,     // Foreign key → agents (if AGENT role)
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING',
  preferences: {
    language: 'bn' | 'en',
    currency: 'BDT',
    notifications: {
      telegram: boolean,
      sms: boolean,
      whatsapp: boolean,
    },
    biometricEnabled: boolean,
    pinEnabled: boolean,
  },
  telegramChatId: string | null,  // If agent connects personal bot
  createdAt: Timestamp,
  updatedAt: Timestamp,
}

Indexes:
  - phone (unique)
  - businessId + role
  - status
```

#### Collection: `businesses`
```javascript
{
  id: string,
  name: string,
  logo_url: string | null,
  address: string,
  phone: string,
  adminUserId: string,        // Primary admin
  branding: {
    primaryColor: string,
    logoUrl: string,
    reportFooterText: string,
  },
  settings: {
    defaultFeePercent: number,    // e.g., 1.5
    defaultCommissionPercent: number,
    currency: 'BDT',
    lowBalanceThreshold: number,
    receiptEnabled: boolean,
    receiptChannel: 'SMS' | 'WHATSAPP' | 'BOTH',
    receiptTemplate: string,
    agentCanAddClients: boolean,
    requireAdminApproval: boolean,
  },
  integrations: {
    telegram: {
      botToken: string,           // Encrypted AES-256
      chatId: string,
      enabled: boolean,
      webhookUrl: string,
      events: {
        newTransaction: boolean,
        lowBalance: boolean,
        dailySummary: boolean,
        commissionRequest: boolean,
      }
    },
    sms: {
      provider: 'TWILIO' | 'SSLCOMMERZ',
      apiKey: string,             // Encrypted
      enabled: boolean,
    },
    whatsapp: {
      provider: 'TWILIO' | 'META',
      apiKey: string,             // Encrypted
      phoneNumberId: string,
      enabled: boolean,
    }
  },
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

#### Collection: `clients`
```javascript
{
  id: string,
  businessId: string,
  name: string,
  phone: string,
  email: string | null,
  address: string | null,
  customFeePercent: number | null,    // null = use default
  customCommissionPercent: number | null,
  assignedAgentId: string | null,
  tags: string[],
  notes: string | null,
  stats: {                            // Denormalized for performance
    totalTransactions: number,
    totalVolume: number,
    totalFeesPaid: number,
    lastTransactionAt: Timestamp | null,
  },
  createdBy: string,                  // userId
  createdAt: Timestamp,
  updatedAt: Timestamp,
  isArchived: boolean,
}

Indexes:
  - businessId + name
  - businessId + phone (unique within business)
  - businessId + assignedAgentId
  - businessId + isArchived + lastTransactionAt (desc)
```

#### Collection: `agents`
```javascript
{
  id: string,
  businessId: string,
  userId: string,                     // Link to users collection
  name: string,
  phone: string,
  commissionPercent: number,          // Default commission rate
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE',
  wallet: {
    balance: number,                  // Current commission balance
    totalEarned: number,
    totalSettled: number,
    lastUpdatedAt: Timestamp,
  },
  stats: {
    totalTransactions: number,
    totalVolume: number,
    totalCommissionEarned: number,
    currentMonthTransactions: number,
    currentMonthVolume: number,
    currentMonthCommission: number,
  },
  telegramChatId: string | null,
  telegramBotToken: string | null,    // Agent's personal bot
  createdAt: Timestamp,
  updatedAt: Timestamp,
}

Indexes:
  - businessId + status
  - businessId + userId (unique)
  - wallet.balance (for pending settlements)
```

#### Collection: `wallets`
```javascript
{
  id: string,
  businessId: string,
  type: 'BKASH' | 'NAGAD' | 'BANK' | 'CASH' | 'CUSTOM',
  name: string,                       // Display name
  accountNumber: string | null,
  balance: number,                    // Current balance (atomic)
  lockedBalance: number,              // Funds in pending transactions
  availableBalance: number,           // balance - lockedBalance
  currency: 'BDT',
  lowBalanceThreshold: number,
  stats: {
    totalIn: number,
    totalOut: number,
    totalCommissionEarned: number,    // Wallet-level commission (bKash/Nagad)
    lastTransactionAt: Timestamp | null,
  },
  isActive: boolean,
  displayOrder: number,               // For UI ordering
  createdAt: Timestamp,
  updatedAt: Timestamp,
}

Indexes:
  - businessId + isActive
  - businessId + type
```

#### Collection: `transactions`
```javascript
{
  id: string,                         // Auto-generated
  refId: string,                      // Human-readable: TXN-YYYYMMDD-XXXX
  businessId: string,
  type: 'CR' | 'DR',
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED' | 'FAILED',
  
  // Parties
  clientId: string,
  clientName: string,                 // Denormalized
  agentId: string | null,
  agentName: string | null,           // Denormalized
  
  // Amounts
  amount: number,                     // Main transaction amount
  feePercent: number,                 // Applied fee percentage
  feeSource: 'TRANSACTION' | 'CLIENT' | 'AGENT' | 'GLOBAL',
  baseFee: number,                    // (amount / 1000) * feePercent
  extraFee: {
    amount: number,
    type: 'FIXED_ADD' | 'FIXED_DEDUCT' | 'PERCENT_ADD' | 'PERCENT_DEDUCT',
    note: string,
    visibility: 'RECEIPT_VISIBLE' | 'INTERNAL_ONLY',
  } | null,
  totalFee: number,                   // baseFee ± extraFee
  agentCommissionPercent: number,
  agentCommission: number,            // (amount / 1000) * commissionPercent
  netProfit: number,                  // totalFee - agentCommission
  
  // Wallet(s) used
  walletEntries: [
    {
      walletId: string,
      walletType: string,
      amount: number,                 // Amount from this wallet
      direction: 'IN' | 'OUT',
    }
  ],
  
  // Metadata
  note: string | null,
  receiptSent: boolean,
  receiptChannel: 'SMS' | 'WHATSAPP' | null,
  receiptSentAt: Timestamp | null,
  telegramNotified: boolean,
  
  // Audit
  createdBy: string,                  // userId
  createdAt: Timestamp,
  updatedAt: Timestamp,
  cancelledAt: Timestamp | null,
  cancelledBy: string | null,
  cancelReason: string | null,
  
  // Edit history
  editHistory: [
    {
      editedBy: string,
      editedAt: Timestamp,
      changes: Object,
    }
  ],
}

Indexes:
  - businessId + createdAt (desc)  ← PRIMARY query
  - businessId + clientId + createdAt (desc)
  - businessId + agentId + createdAt (desc)
  - businessId + type + status + createdAt (desc)
  - businessId + walletEntries.walletId + createdAt (desc)
  - refId (unique)
  - status + businessId
```

#### Collection: `commissionLedger`
```javascript
{
  id: string,
  businessId: string,
  agentId: string,
  transactionId: string,
  type: 'EARNED' | 'SETTLED' | 'HELD' | 'REVERSED',
  amount: number,
  balance: number,                    // Running balance after this entry
  note: string | null,
  createdBy: string,
  createdAt: Timestamp,
}

Indexes:
  - agentId + createdAt (desc)
  - businessId + agentId + type + createdAt (desc)
```

#### Collection: `walletLedger`
```javascript
{
  id: string,
  businessId: string,
  walletId: string,
  transactionId: string | null,       // null for manual adjustments
  type: 'CREDIT' | 'DEBIT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT',
  amount: number,
  balanceAfter: number,               // Running balance snapshot
  note: string | null,
  createdBy: string,
  createdAt: Timestamp,
}

Indexes:
  - walletId + createdAt (desc)
  - businessId + walletId + type + createdAt (desc)
```

#### Collection: `notifications`
```javascript
{
  id: string,
  businessId: string,
  userId: string | null,              // null = all admins
  type: 'TRANSACTION' | 'BALANCE_ALERT' | 'COMMISSION_REQUEST' | 'SYSTEM',
  title: string,
  body: string,
  data: Object,                       // Structured payload
  channel: 'IN_APP' | 'TELEGRAM' | 'SMS' | 'WHATSAPP' | 'PUSH',
  status: 'PENDING' | 'SENT' | 'FAILED' | 'READ',
  isRead: boolean,
  createdAt: Timestamp,
  sentAt: Timestamp | null,
}
```

#### Collection: `reports`
```javascript
{
  id: string,
  businessId: string,
  type: 'DAILY_SUMMARY' | 'CLIENT_STATEMENT' | 'AGENT_COMMISSION' | 'WALLET_LEDGER',
  parameters: {
    dateFrom: Timestamp,
    dateTo: Timestamp,
    clientId: string | null,
    agentId: string | null,
    walletId: string | null,
  },
  status: 'GENERATING' | 'READY' | 'FAILED',
  fileUrl: string | null,
  fileSize: number | null,
  generatedBy: string,
  generatedAt: Timestamp,
  expiresAt: Timestamp,               // 30 days
}
```

### 8.2 Database Optimization Strategies

```
PERFORMANCE STRATEGIES:
────────────────────────────────────────────────────────────
1. DENORMALIZATION
   - Embed clientName, agentName in transactions
   - Pre-compute stats in client/agent documents
   - Avoid joins (Firestore doesn't support them)

2. COMPOSITE INDEXES
   - All list queries use composite indexes
   - businessId is ALWAYS the first field in all indexes
   - createdAt (desc) as final sort field

3. PAGINATION
   - All list queries use cursor-based pagination
   - pageSize: 20 (configurable)
   - Use Firestore startAfter() for cursors

4. CACHING (Redis)
   - Dashboard summary: 60s TTL
   - Wallet balances: 10s TTL (real-time feel)
   - Agent stats: 5-minute TTL
   - Report generation status: 30s polling

5. ATOMIC WRITES
   - All transaction + wallet updates in Firestore batch
   - Max batch size: 500 operations (Firestore limit)
   - Complex multi-wallet splits: Firestore transactions

6. SECURITY RULES
   - businessId scope: ALL queries filter by businessId
   - Role-based: Admin reads all, Agent reads own only
   - Agents CANNOT read: wallet balances, other agent data
   - Timestamps: server-set only (FieldValue.serverTimestamp)
────────────────────────────────────────────────────────────
```

---

## 9. API OVERVIEW

### 9.1 REST API Design

**Base URL:** `https://api.finflow.app/v1`  
**Auth:** Bearer JWT in Authorization header  
**Content-Type:** `application/json`  
**Rate Limiting:** 100 req/min (standard), 10 req/min (write)

### 9.2 Core Endpoints

#### Authentication
```
POST   /auth/send-otp           → Send OTP to phone
POST   /auth/verify-otp         → Verify OTP, return JWT
POST   /auth/refresh            → Refresh access token
POST   /auth/logout             → Invalidate token
POST   /auth/pin/set            → Set/update app PIN
POST   /auth/pin/verify         → Verify PIN
```

#### Transactions
```
GET    /transactions            → List (paginated, filterable)
POST   /transactions            → Create new transaction
GET    /transactions/:id        → Get single transaction
PATCH  /transactions/:id        → Edit (within 24h, admin only)
POST   /transactions/:id/cancel → Cancel (admin only)
GET    /transactions/:id/receipt → Get receipt HTML
POST   /transactions/:id/send-receipt → Trigger SMS/WA send

Query params for GET /transactions:
  type=CR|DR
  status=COMPLETED|PENDING|CANCELLED
  clientId=xxx
  agentId=xxx
  walletId=xxx
  dateFrom=ISO8601
  dateTo=ISO8601
  amountMin=number
  amountMax=number
  search=string (client name/phone/refId)
  page=number
  limit=number
  cursor=string (for cursor pagination)
```

#### Fee Calculator (Stateless Utility)
```
POST   /calculator/fee
Body: {
  amount: number,
  feePercent: number,
  transactionType: 'CR' | 'DR',
  extraFee: { type, value, note } | null,
  agentCommissionPercent: number,
}
Response: {
  baseFee, extraFeeAmount, totalFee,
  agentCommission, netProfit,
  clientReceives, clientPays
}
```

#### Payment Suggestion
```
POST   /wallets/suggest-payment
Body: {
  requiredAmount: number,
  preferredWalletId: string | null,
}
Response: {
  suggestions: [
    {
      rank: 1,
      type: 'SINGLE' | 'SPLIT',
      wallets: [{ walletId, walletName, amount }],
      totalCovered: number,
      reasoning: string,
    }
  ],
  isInsufficient: boolean,
  deficit: number | null,
}
```

#### Clients
```
GET    /clients                 → List clients (paginated)
POST   /clients                 → Create client
GET    /clients/:id             → Get client details
PATCH  /clients/:id             → Update client
DELETE /clients/:id             → Archive client
GET    /clients/:id/transactions → Client transaction history
GET    /clients/:id/statement   → Generate statement (returns job id)
```

#### Agents
```
GET    /agents                  → List agents (admin only)
POST   /agents                  → Create agent (admin only)
GET    /agents/:id              → Get agent details
PATCH  /agents/:id              → Update agent (admin only)
GET    /agents/:id/transactions → Agent transaction history
GET    /agents/:id/commission   → Commission ledger
POST   /agents/:id/settle       → Settle commission (admin only)
POST   /agents/commission/request → Agent requests payout
```

#### Wallets
```
GET    /wallets                 → List all wallets
GET    /wallets/:id             → Wallet detail + current balance
GET    /wallets/:id/ledger      → Transaction ledger (paginated)
POST   /wallets/:id/adjust      → Manual balance adjustment (admin)
POST   /wallets/transfer        → Transfer between wallets
```

#### Reports
```
POST   /reports/generate        → Start report generation (async)
GET    /reports/:jobId/status   → Check generation status
GET    /reports/:jobId/download → Download PDF (signed URL)
GET    /reports                 → Report history
```

#### Integrations
```
POST   /integrations/telegram/connect    → Connect bot
DELETE /integrations/telegram/disconnect → Disconnect bot
POST   /integrations/telegram/test       → Send test message
GET    /integrations/sms/templates       → Get message templates
PUT    /integrations/sms/templates/:id   → Update template
PATCH  /integrations/settings            → Toggle channels on/off
```

### 9.3 WebSocket Events

```
Connection: wss://api.finflow.app/v1/ws
Auth: token in query param

SERVER → CLIENT EVENTS:
──────────────────────────────────────────────────────────────
event: "transaction.created"
  payload: { transaction: TransactionObject }

event: "wallet.balance.updated"
  payload: { walletId, newBalance, availableBalance, change }

event: "notification.new"
  payload: { notification: NotificationObject }

event: "commission.updated"
  payload: { agentId, newBalance, type }

event: "report.ready"
  payload: { jobId, downloadUrl }
──────────────────────────────────────────────────────────────
```

### 9.4 API Error Schema

```javascript
// Standard error response
{
  success: false,
  error: {
    code: "INSUFFICIENT_BALANCE",        // Machine-readable
    message: "bKash wallet balance is insufficient for this transaction.",
    details: {
      required: 10000,
      available: 8500,
      deficit: 1500,
      suggestions: ["Use Nagad wallet", "Split payment"]
    },
    timestamp: "2026-05-06T14:32:00Z",
    requestId: "req_abc123"
  }
}

ERROR CODES:
  AUTH_INVALID_TOKEN
  AUTH_EXPIRED_TOKEN
  AUTH_INSUFFICIENT_PERMISSION
  VALIDATION_ERROR            (+ field-level details)
  INSUFFICIENT_BALANCE
  TRANSACTION_NOT_EDITABLE    (past 24h window)
  AGENT_SUSPENDED
  CLIENT_NOT_FOUND
  DUPLICATE_TRANSACTION       (idempotency check)
  RATE_LIMIT_EXCEEDED
  INTEGRATION_ERROR
  REPORT_GENERATION_FAILED
```

---

## 10. EDGE CASE HANDLING

### 10.1 Insufficient Balance Scenarios

```
SCENARIO A: Single wallet insufficient
────────────────────────────────────────────────────────────
Detection: availableBalance < transactionAmount
Response:
  1. Show warning banner: "bKash has ৳8,500. Need ৳10,000"
  2. Auto-suggest: split with Nagad/Bank/Cash
  3. Option: "Continue with partial + mark ৳1,500 as pending"
  4. Option: "Cancel transaction"
  5. NEVER: Allow wallet to go negative without explicit override

SCENARIO B: ALL wallets insufficient
────────────────────────────────────────────────────────────
Detection: sum(availableBalances) < transactionAmount
Response:
  1. Show total available vs required
  2. Options:
     a) Record as PENDING (process when funded)
     b) Record partial payment + outstanding amount
     c) Cancel
  3. Notify admin via Telegram: "Insufficient funds for TXN"
```

### 10.2 Negative Payout Guard

```javascript
// Pre-submission validation
function validateTransaction(params) {
  const { amount, totalFee, type } = params;

  // Guard: Fee cannot exceed amount
  if (totalFee >= amount) {
    return {
      valid: false,
      error: "Fee (৳" + totalFee + ") cannot be ≥ transaction amount (৳" + amount + ")"
    };
  }

  // Guard: Net profit cannot be negative (fee < commission)
  if (params.netProfit < 0) {
    return {
      valid: false,
      warning: "Commission (৳" + params.agentCommission + ") exceeds fee (৳" + totalFee + "). This transaction results in a loss of ৳" + Math.abs(params.netProfit),
      requiresAdminOverride: true
    };
  }

  // Guard: Amount must be positive
  if (amount <= 0) {
    return { valid: false, error: "Amount must be greater than 0" };
  }

  return { valid: true };
}
```

### 10.3 Missing Fee Input

```
SCENARIO: Admin starts transaction without entering fee %
────────────────────────────────────────────────────────────
Resolution chain (in order):
  1. Check: client.customFeePercent → use if set
  2. Check: agent.defaultFeePercent → use if set
  3. Check: business.defaultFeePercent → use as fallback
  4. If ALL null: Show "⚠️ No fee rate set. Enter manually."
     → Block submission until fee % is provided
  5. Never: Submit with 0% fee without explicit confirmation

DISPLAY: "Fee rate applied from: [Client/Agent/Global Default]"
         Blue info badge showing resolution source
```

### 10.4 Agent Conflicts

```
SCENARIO A: Agent suspended mid-transaction
────────────────────────────────────────────────────────────
  - Active agent suspended → all pending transactions held
  - Admin receives notification
  - Commission held, not paid out
  - Option: Reassign pending transactions to another agent

SCENARIO B: Commission rate changed after transaction entry
────────────────────────────────────────────────────────────
  - Each transaction stores the commission % AT TIME OF ENTRY
  - Rate changes are NOT retroactive
  - Historical transactions use historical rates
  - Clear audit trail of rate changes

SCENARIO C: Agent submits duplicate transaction
────────────────────────────────────────────────────────────
  - Idempotency key: hash(clientId + amount + agentId + floor(timestamp/60))
  - If same key submitted within 60 seconds: warn "Possible duplicate"
  - Require explicit confirmation to proceed
  - Log both transactions if confirmed

SCENARIO D: Agent has negative commission balance
────────────────────────────────────────────────────────────
  - Can occur if commission reversed (transaction cancelled)
  - Show negative balance in red with explanation
  - Block payout requests until balance is positive
  - Admin can manually adjust
```

### 10.5 Concurrent Transaction Race Condition

```javascript
// Firestore Transaction for atomic wallet updates
const transactionResult = await firestore.runTransaction(async (t) => {
  const walletRef = db.collection('wallets').doc(walletId);
  const walletDoc = await t.get(walletRef);
  const currentBalance = walletDoc.data().availableBalance;

  if (currentBalance < requiredAmount) {
    throw new Error('INSUFFICIENT_BALANCE');
  }

  // Atomic deduction
  t.update(walletRef, {
    availableBalance: currentBalance - requiredAmount,
    balance: FieldValue.increment(-requiredAmount),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Write transaction record
  t.set(txnRef, transactionData);

  // Write ledger entry
  t.set(ledgerRef, ledgerEntry);

  return { success: true, newBalance: currentBalance - requiredAmount };
});
```

### 10.6 Data Consistency Checks

```
DAILY RECONCILIATION JOB (runs at 00:00):
────────────────────────────────────────────────────────────
1. Sum all wallet ledger entries → should equal wallet.balance
2. Sum all transaction commissions → should equal agent.totalEarned
3. Sum all commission settlements → should equal agent.totalSettled
4. Flag any discrepancies > ৳0.01
5. Alert admin via Telegram if discrepancy found
6. Generate reconciliation log in reports collection
```

### 10.7 Network & Offline Handling

```
OFFLINE STRATEGY:
────────────────────────────────────────────────────────────
1. READ operations: Serve from local cache (Firestore offline)
2. WRITE operations (create transaction):
   a. Queue locally (MMKV + React Query mutation cache)
   b. Show "Queued — will submit when online"
   c. On reconnect: Auto-submit with original timestamp
   d. Conflict resolution: Server timestamp wins

3. Wallet balances while offline:
   a. Show last-known balance with "⚠️ May be outdated" badge
   b. Disable payment suggestion engine (stale data risk)
   c. Allow manual amount entry with explicit acknowledgment

4. On reconnect:
   a. Sync pending writes
   b. Refresh all cached data
   c. Show success/failure summary
```

---

## 11. FUTURE ENHANCEMENTS

### Phase 2 (3-6 months post-launch)

| Feature | Business Value | Effort |
|---|---|---|
| ML-based auto fee suggestion | Reduce manual input | High |
| Multi-currency support | International clients | High |
| Client mobile app (read-only) | Client self-service | Medium |
| Biometric payment approval | Security | Low |
| QR code transaction initiation | Speed | Medium |
| Bulk transaction import (CSV/Excel) | Power users | Medium |
| Google Sheets sync | Accounting workflow | Medium |
| Advanced analytics dashboard | Business insights | High |

### Phase 3 (6-12 months)

| Feature | Business Value | Effort |
|---|---|---|
| bKash/Nagad API direct integration | Real-time balance | Very High |
| Bank account aggregation | Balance sync | Very High |
| Tax/VAT calculation module | Compliance | High |
| Multi-business (SaaS model) | Scale | Very High |
| White-label solution | B2B revenue | High |
| AI-powered fraud detection | Risk management | Very High |
| Client credit scoring | Business expansion | High |
| Recurring transaction templates | Efficiency | Medium |

### Phase 4 (12+ months)

- Open API for third-party integration
- Marketplace for agent onboarding
- Mobile POS terminal support
- Regulatory compliance module (Bangladesh BB)
- Native iOS/Android apps (from React Native migration)
- Self-hosted enterprise option

---

## 12. APPENDIX

### 12.1 Glossary

| Term | Definition |
|---|---|
| **CR** | Credit — money received into the business |
| **DR** | Debit — money sent out from the business |
| **Fee %** | Per-thousand fee rate (not standard percent) |
| **Commission** | Agent's share of the fee, calculated on main amount |
| **Extra Fee** | Fixed amount added/deducted from base fee |
| **Available Balance** | Wallet balance minus locked funds |
| **Locked Balance** | Funds reserved for pending transactions |
| **Net Profit** | Total fee minus agent commission |
| **Split Payment** | Using multiple wallets for a single transaction |
| **Settlement** | Admin paying an agent their accumulated commission |
| **Reconciliation** | Daily check to ensure ledger matches balances |
| **Idempotency Key** | Hash to prevent duplicate transaction submission |

### 12.2 Fee Calculation Quick Reference

```
FORMULA: Fee = (Amount ÷ 1000) × Fee%

EXAMPLES:
──────────────────────────────────────────
Amount      Fee%    Fee
──────────────────────────────────────────
৳   1,000  1.5%    ৳  1.50
৳   5,000  1.5%    ৳  7.50
৳  10,000  1.5%    ৳ 15.00
৳  50,000  1.5%    ৳ 75.00
৳ 100,000  2.0%    ৳200.00
──────────────────────────────────────────
```

### 12.3 User Permission Matrix

| Permission | Admin | Agent |
|---|---|---|
| View all transactions | ✅ | ❌ (own only) |
| Create transaction | ✅ | ✅ |
| Edit transaction | ✅ | ❌ |
| Cancel transaction | ✅ | ❌ |
| View wallet balances | ✅ | ❌ |
| Adjust wallet balance | ✅ | ❌ |
| View all agents | ✅ | ❌ |
| Create agent | ✅ | ❌ |
| View own commission | ✅ | ✅ |
| Request commission payout | N/A | ✅ |
| Settle commission | ✅ | ❌ |
| Add client | ✅ | ✅ (if enabled) |
| Edit client | ✅ | ✅ (own clients) |
| Generate reports | ✅ | ✅ (limited) |
| Access settings | ✅ | ❌ |
| Manage integrations | ✅ | ❌ |
| Connect personal Telegram | ✅ | ✅ |

### 12.4 API Rate Limiting Policy

| Endpoint Category | Rate Limit | Burst |
|---|---|---|
| Auth (OTP send) | 3/phone/hour | 5 |
| Auth (verify) | 10/hour | 15 |
| Transaction create | 60/hour | 10/min |
| Calculator (stateless) | 300/hour | 60/min |
| Report generate | 10/hour | 3/min |
| Webhook (Telegram) | Unlimited | — |

### 12.5 Notification Priority Matrix

| Event | In-App | Push | Telegram | SMS |
|---|---|---|---|---|
| Transaction created | ✅ | ✅ | ✅ | Client receipt only |
| Low wallet balance | ✅ | ✅ | ✅ | ❌ |
| Commission request | ✅ | ✅ | ✅ | ❌ |
| Commission settled | ✅ | ✅ | Optional | ❌ |
| Daily summary | ✅ | ❌ | ✅ | ❌ |
| Transaction cancelled | ✅ | ✅ | ✅ | ❌ |
| Report ready | ✅ | ✅ | ❌ | ❌ |

### 12.6 Development Phases & Milestones

```
SPRINT 1-2 (Weeks 1-4): Foundation
  - Project setup, CI/CD, Firebase config
  - Auth flow (OTP + JWT)
  - Basic transaction CRUD
  - Core fee calculation engine

SPRINT 3-4 (Weeks 5-8): Core Features
  - Multi-wallet system
  - Agent management
  - Commission tracking
  - Basic dashboard

SPRINT 5-6 (Weeks 9-12): Advanced Features
  - Auto-payment suggestion engine
  - Split payment UI
  - PDF report generation
  - SMS/WhatsApp integration

SPRINT 7-8 (Weeks 13-16): Integrations & Polish
  - Telegram bot integration
  - Agent app (separate build)
  - Notification system
  - Offline support

SPRINT 9-10 (Weeks 17-20): QA & Launch
  - Security audit
  - Performance testing
  - Beta testing with real agents
  - App Store / Play Store submission
```

---

*End of Document*

---

**Document Metadata**

| Field | Value |
|---|---|
| Total Sections | 12 |
| Total Features Specified | 80+ |
| Database Collections | 8 |
| API Endpoints | 45+ |
| Custom UI Components | 6 |
| Edge Cases Covered | 15+ |
| Target Platform | iOS 16+ / Android 10+ |
| Estimated Development Time | 20 sprints (5 months) |

---

> *This PRD is a living document. All estimates and decisions are subject to revision based on technical discovery and business feedback.*
