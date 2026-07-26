# SellSync - Point of Sale & Retail Management System

## Overview

**SellSync** is a comprehensive Point of Sale (POS) and Retail Management System designed for small to medium retail stores. It provides full-featured retail operations management with AI-powered insights.

**Primary Market**: Nigerian market (NGN currency, FIRS VAT compliance, +234 phone formats)

---

## Tech Stack

### Frontend
- **Framework**: React 18.3 with TypeScript
- **Build Tool**: Vite 7.2
- **Styling**: Tailwind CSS 3.4
- **UI Components**: Radix UI (headless)
- **State Management**: React Context + useReducer
- **Charts**: Recharts 3.8
- **Animations**: Framer Motion 12.38
- **Forms**: React Hook Form 7.72 + Zod validation
- **PDF Generation**: jsPDF 4.2
- **Excel Export**: xlsx 0.18
- **Routing**: React Router DOM 6.30
- **Icons**: Lucide React
- **Notifications**: Sonner (toast)

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js 5.2
- **Database**: PostgreSQL with Prisma ORM 7.4
- **Authentication**: JWT + bcrypt
- **AI Integration**: Groq SDK, Google GenAI
- **Email**: Nodemailer
- **File Uploads**: Multer
- **Scheduled Jobs**: node-cron
- **PDF Generation**: PDFKit
- **Caching**: node-cache

---

## Directory Structure

```
/home/benny/sellsync-app/
├── frontend/                    # React + Vite frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.tsx         # Main app component
│   │   │   ├── components/     # Reusable UI components
│   │   │   ├── pages/          # Page components
│   │   │   └── state/          # React Context store
│   │   ├── lib/
│   │   │   ├── api.ts          # API service layer
│   │   │   ├── utils.ts        # Utility functions
│   │   │   └── receipt.ts      # Receipt PDF generation
│   │   ├── animations/         # Framer Motion variants
│   │   └── main.tsx           # React entry point
│   └── package.json
│
├── updated/                    # Express.js backend API
│   ├── src/
│   │   ├── app.js             # Express app & routes
│   │   ├── server.js          # Server entry point
│   │   ├── controller/        # Business logic (MVC)
│   │   ├── routes/            # API routes
│   │   ├── services/          # External services
│   │   ├── middleware/         # Express middleware
│   │   ├── jobs/              # Scheduled jobs (cron)
│   │   ├── lib/               # Prisma client
│   │   └── utils/             # Utilities
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   └── package.json
│
├── landing/                    # Static landing pages
├── requirements.txt           # Python dependencies
├── .env.example               # Environment template
└── .env                       # Environment variables
```

---

## Database Models (Prisma Schema)

| Model | Description |
|-------|-------------|
| User | Users with roles: OWNER, MANAGER, CASHIER |
| Store | Retail store locations |
| Product | Product catalog |
| Inventory | Stock tracking per store |
| Transaction | Sales transactions |
| TransactionItem | Line items in transactions |
| Forecast | Sales forecasts |
| Insight | AI-generated insights |
| Notification | User notifications |
| ApiKey | API authentication keys |
| AuditLog | Action audit trail |
| SalesGoal | Sales targets |

---

## Main Features

### 1. Point of Sale (POS)
- Product grid with search and filtering
- Barcode/QR code scanning
- Shopping cart with quantity adjustments
- Multiple payment methods:
  - Cash
  - POS Terminal
  - Bank Transfer
  - Linked Account
  - Account Balance
- Partial payment support
- Discount application (fixed amount or percentage)
- Receipt generation (PDF) with auto-download
- SMS/Email receipt sharing
- Voice input button
- Offline mode detection

### 2. Dashboard
- Real-time KPIs:
  - Revenue
  - Sales Count
  - Low Stock count
  - Products Sold
- Animated counters
- Sales trend chart (7-day)
- AI insights panel
- Top products table
- Low stock alerts
- Expiry alerts (30-day warning)
- Live updates badge

### 3. Products Management
- Product catalog with sortable columns
- Search by name, SKU, category
- Category filtering
- Bulk selection
- QR code generation per product
- Add/Edit/Delete products
- Stock level indicators
- Expiry date tracking
- Sales analytics per product
- Bulk price editing

### 4. Reports
- Sales reports (Excel multi-sheet)
- Inventory reports (Excel)
- Performance reports (Excel)
- Financial summaries (PDF)
- VAT Return Form generator (Nigerian FIRS format)
- AI-powered report insights
- Report preview modal
- Email/SMS sharing
- Custom report builder
- Scheduled report generation

### 5. Inventory
- Stock level monitoring
- Reorder point tracking
- Bulk purchase order modal
- Reorder table with supplier info
- Low stock alerts

### 6. AI Features
- AI-powered business insights (Groq LLM)
- Sales forecasting
- Stockout predictions
- AI chat interface
- Ask AI modal for custom queries
- Daily analytics job (scheduled)

### 7. Staff Management
- User roles (Owner, Manager, Cashier)
- Role-based permissions
- Staff list with search
- Add/Edit/Delete staff
- Attendance tracking (Clock In/Out)
- Payroll management
- Commission tracking
- Salary settings

### 8. Notifications
- In-app notification system
- Low stock alerts
- Sales milestones
- Refund requests
- Expiry warnings
- Mark read/unread
- Clear all functionality

### 9. Settings
- Store profile management
- Multi-store switching
- Payment settings (Cash, Transfer, Card)
- Bank account linking
- POS terminal management
- Receipt defaults
- Shift settings (clock times, penalties, overtime)
- Theme toggle (light/dark)
- Preferences (date format, time format, notifications)

### 10. Security & Audit
- JWT authentication
- Role-based access control
- Audit logging (all actions)
- Email verification
- Password reset flow

---

## API Endpoints

### Authentication (`/api/auth/*`)
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/reset-password` - Password reset
- `PUT /api/auth/password` - Change password

### Products (`/api/products/*`)
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/barcode/:barcode` - Lookup by barcode
- `POST /api/products/bulk` - Bulk operations

### Transactions (`/api/transactions/*`)
- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/:id` - Get transaction
- `POST /api/transactions/:id/refund` - Process refund

### Analytics (`/api/analytics/*`)
- `GET /api/analytics/dashboard` - Dashboard data
- `GET /api/analytics/sales` - Sales analytics
- `GET /api/analytics/inventory` - Inventory analytics
- `GET /api/analytics/forecasts` - Sales forecasts

### AI (`/api/ai/*`)
- `POST /api/ai/insights` - Generate insights
- `POST /api/ai/chat` - AI chat
- `POST /api/ai/forecast` - Generate forecast

### Cashiers/Staff (`/api/cashiers/*`)
- `GET /api/cashiers` - List staff
- `POST /api/cashiers` - Add staff
- `GET /api/cashiers/:id` - Get staff
- `PUT /api/cashiers/:id` - Update staff
- `DELETE /api/cashiers/:id` - Remove staff
- `POST /api/cashiers/:id/clock-in` - Clock in
- `POST /api/cashiers/:id/clock-out` - Clock out

### Stores (`/api/stores/*`)
- `GET /api/stores` - List stores
- `POST /api/stores` - Create store
- `GET /api/stores/:id` - Get store
- `PUT /api/stores/:id` - Update store
- `DELETE /api/stores/:id` - Delete store

### Notifications (`/api/notifications/*`)
- `GET /api/notifications` - List notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all read
- `DELETE /api/notifications/clear` - Clear all

### Sales Goals (`/api/salesGoal/*`)
- `GET /api/salesGoal` - List goals
- `POST /api/salesGoal` - Create goal
- `PUT /api/salesGoal/:id` - Update goal
- `DELETE /api/salesGoal/:id` - Delete goal

### Audit Logs (`/api/auditLogs/*`)
- `GET /api/auditLogs` - List logs
- `GET /api/auditLogs/export` - Export logs

---

## Frontend Pages

| Page | File | Purpose |
|------|------|---------|
| Dashboard | `DashboardPage.tsx` | Main dashboard with KPIs, charts, insights |
| POS | `PosPage.tsx` | Point of Sale interface |
| Products | `ProductsPage.tsx` | Product catalog with analytics |
| Inventory | `InventoryPage.tsx` | Stock management |
| Transactions | `TransactionsPage.tsx` | Transaction history |
| Reports | `ReportsPage.tsx` | Report generation and export |
| Insights | `InsightsPage.tsx` | AI insights display |
| Forecasts | `ForecastsPage.tsx` | Sales forecasting |
| Staff | `StaffPage.tsx` | Staff management |
| Settings | `SettingsPage.tsx` | App configuration |
| Notifications | `NotificationsPage.tsx` | Notification center |
| Login | `LoginPage.tsx` | Authentication |

---

## Key Components

### UI Components (`/frontend/src/app/components/ui/`)
- button, card, input, dialog, table, badge, select, tabs, sheet, switch, checkbox, calendar, form, tooltip, popover, dropdown-menu, separator, scroll-area, avatar, alert, progress, skeleton, toggle, accordion, navigation-menu, label, breadcrumb, pagination, carousel, chart, alert-dialog, context-menu, drawer, menubar, radio-group, sonner

### Business Components
- `Layout.tsx` - App layout wrapper
- `ProtectedRoute.tsx` - Auth guard
- `ProductCard.tsx` - Product grid card
- `ProductDetailModal.tsx` - Product details view
- `AddProductModal.tsx` - Add/Edit product form
- `QrScannerModal.tsx` - Barcode scanner
- `QrGeneratorModal.tsx` - QR code generator
- `EmailShareModal.tsx` - Email report sharing
- `SMSShareModal.tsx` - SMS report sharing
- `ReportPreviewModal.tsx` - Report preview
- `BulkPOModal.tsx` - Bulk purchase orders
- `ReorderTable.tsx` - Restocking interface
- `AskAIModal.tsx` - AI query interface
- `AIChatModal.tsx` - AI chatbot
- `AISummaryCard.tsx` - AI insight display
- `ForecastChart.tsx` - Sales forecast visualization
- `POSVoiceButton.tsx` - Voice input
- `CustomReportModal.tsx` - Custom report builder
- `ErrorBoundary.tsx` - Error handling

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-key

# Groq AI
GROQ_API_KEY=your-groq-api-key

# Google AI
GOOGLE_GENERATIVE_AI_API_KEY=your-google-api-key

# Email
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your-email
EMAIL_PASS=your-password

# WhatsApp
WHATSAPP_API_URL=your-whatsapp-api
WHATSAPP_API_KEY=your-key

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

---

## Installation & Running

### Backend
```bash
cd updated
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Generated Documentation

This documentation was auto-generated from codebase analysis.
For the complete codebase structure and source files, refer to the associated `sellsync_codebase.json` file.

**Analysis Date**: 2026-04-17
