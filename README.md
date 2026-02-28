# ShipOS 📦

[![CI](https://github.com/shivbardolabs/ShipOS/actions/workflows/ci.yml/badge.svg)](https://github.com/shivbardolabs/ShipOS/actions/workflows/ci.yml)

**The modern operating system for postal retail stores.**

ShipOS is an all-in-one management platform for postal stores, mailbox rental businesses, and shipping centers. It replaces fragmented workflows with a unified system for package tracking, customer management, shipping operations, and USPS CMRA compliance.

## Features

### 📦 Package Management
- **Check-In Wizard** — Multi-step guided workflow for receiving packages with barcode scanning, carrier detection, and instant customer notifications
- **Check-Out & Release** — PMB lookup, fee calculation, signature capture, and package release workflow
- **Package Inventory** — Real-time dashboard of all held packages with carrier tracking, status filters, and batch operations
- **Automated Notifications** — Email + SMS alerts to customers on check-in, with configurable reminders for uncollected packages

### 👥 Customer & Mailbox Management
- **Unified Customer Database** — Single source of truth for all customers across physical, iPostal, Anytime Mailbox, and PostScan platforms
- **Customer Profiles** — Comprehensive profile with package history, mail history, shipping records, compliance documents, and billing
- **Data Import** — Bulk import from CSV/Google Sheets with field mapping and duplicate detection
- **PMB Management** — Private mailbox assignments, renewal tracking, and billing terms

### 📬 Mail Management
- **Mail Scan & Assignment** — Scan incoming mail, assign to customers, and notify
- **Customer Mail Actions** — Hold, forward, discard, or open & scan options per customer preference
- **Mail Notification** — Automated email/SMS when mail arrives

### 🚚 Shipping Center
- **Multi-Carrier Support** — UPS, FedEx, USPS, DHL with wholesale rate management
- **Rate Shopping** — Compare carrier rates with automatic retail markup calculation
- **Profit Tracking** — Per-shipment cost breakdown: wholesale, retail, insurance, packing
- **Shipping Reconciliation** — Invoice reconciliation with running tally and carrier reports

### ✅ USPS CMRA Compliance
- **ID Expiration Tracking** — Visual countdown with color-coded urgency (green/yellow/red/critical)
- **Form 1583 Management** — Track submission status, dates, and renewal requirements
- **Compliance Dashboard** — At-a-glance view of all compliance statuses
- **Automated Reminders** — 90, 60, 30, and 7-day advance alerts via email + SMS

### 📊 Reports & Analytics
- **Operational Dashboard** — Daily package volume, revenue, and activity metrics
- **Shipping Profit Reports** — Per-carrier profitability analysis
- **Sales Tax Reports** — Multi-agency tax configuration and report generation
- **Data Export** — CSV/Excel export for accounting integration

### 🔔 Notifications
- **Dual-Channel** — Email + SMS notification support
- **Template Editor** — Customizable notification templates with marketing content
- **Per-Customer Preferences** — Individual notification service assignment

### ⚙️ Operations
- **End of Day** — Carrier pickup workflow, manifest generation, day close
- **Invoicing** — Invoice generation, statement delivery, payment tracking
- **POS Integration** — Package checkout syncs with point-of-sale register
- **Label Printing** — Zebra printer support for package ID labels and notification slips

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Prisma ORM + SQLite (dev) / PostgreSQL (prod) |
| Auth | NextAuth.js |
| Charts | Recharts |
| Icons | Lucide React |
| iOS | React Native (Expo) |

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/shivbardolabs/ShipOS.git
cd ShipOS

# Install dependencies
npm install

# Set up the database
cp .env.example .env
npx prisma generate
npx prisma db push

# Seed demo data
npx tsx prisma/seed.ts

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Demo Login
- **Admin:** admin@shipos.com
- **Manager:** manager@shipos.com  
- **Employee:** employee@shipos.com

## Project Structure

```
ShipOS/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/          # Main application
│   │   │   ├── packages/       # Package check-in, check-out, management
│   │   │   ├── customers/      # Customer list + profiles
│   │   │   ├── mail/           # Mail management
│   │   │   ├── shipping/       # Shipping center
│   │   │   ├── compliance/     # CMRA compliance
│   │   │   ├── notifications/  # Notification management
│   │   │   ├── reports/        # Reports & analytics
│   │   │   ├── end-of-day/     # End of day workflows
│   │   │   ├── invoicing/      # Invoice management
│   │   │   └── settings/       # System settings
│   │   └── login/              # Authentication
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   └── layout/             # Sidebar, header, breadcrumb
│   └── lib/                    # Utilities, types, data
├── prisma/                     # Database schema + seed
├── ios/                        # React Native iOS app
├── docs/                       # Deployment & configuration docs
└── public/                     # Static assets
```

## Deployment

See [AWS Deployment Guide](./docs/AWS_DEPLOYMENT.md) for production deployment instructions.

## iOS App

See [iOS App README](./ios/README.md) for mobile app setup and development.

## License

Proprietary — Bardo Labs © 2026
