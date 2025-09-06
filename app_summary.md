# Finance Tracker Application Summary

## Overview
Finance Tracker is a comprehensive personal and family finance management application built with Next.js 15. It provides features for tracking income and expenses, budgeting, generating financial reports, and managing recurring transactions. The app is designed as a Progressive Web App (PWA) with offline capabilities and real-time synchronization.

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom color themes
- **UI Components**: 
  - shadcn/ui component library
  - Radix UI primitives
  - Tremor React for data visualization
- **State Management**: React Context API with Dexie.js for local database
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form (implied through project structure)
- **Data Fetching**: SWR for data fetching and caching
- **Routing**: Next.js App Router with dynamic routes

### Backend & Database
- **Backend**: Supabase (PostgreSQL with Supabase services)
- **Authentication**: Supabase Auth with email/password flow
- **Real-time**: Supabase Real-time (partially implemented)
- **Storage**: Supabase Storage (for user assets)
- **Local Database**: Dexie.js (IndexedDB wrapper) for offline functionality

### Key Libraries & Tools
- **PWA Support**: next-pwa for Progressive Web App features
- **Date Handling**: date-fns for date manipulation
- **Icons**: Lucide React icons
- **Notifications**: Sonner for toast notifications
- **Testing**: Jest with Testing Library
- **Linting**: ESLint with TypeScript ESLint
- **Build Tool**: Next.js compiler
- **Package Manager**: npm (inferred from package-lock.json)

## Core Features

### 1. Transaction Management
- Track income, expenses, and transfers
- Categorize transactions with hierarchical categories
- Attach notes to transactions
- Support for asset transactions (buy/sell)
- Bulk category updates
- Transaction import/export capabilities

### 2. Account Management
- Multiple account types (generic, goal, asset)
- Account balance tracking
- Goal tracking for savings targets

### 3. Budgeting System
- Monthly budget allocation by category
- Rollover budgets (unused funds carry to next month)
- Flexible budgeting for parent categories
- Budget priorities for focused tracking
- Ready-to-assign funds calculation

### 4. Recurring Transactions
- Recurring template system for regular transactions
- Automatic instance generation based on schedule
- Manual confirmation of recurring instances
- Support for daily, weekly, monthly, yearly frequencies

### 5. Reporting & Analytics
- Dashboard with key financial metrics
- Cash flow visualization
- Spending by category analysis
- Transaction summaries and comparisons
- Export functionality for financial data

### 6. Offline Support
- Local database (Dexie.js/IndexedDB) for offline data storage
- Sync queue for offline transaction processing
- Automatic sync when back online
- Offline-aware UI with appropriate notifications

### 7. PWA Features
- Installable as a standalone app
- Offline functionality
- Background sync capabilities
- Mobile-responsive design

## Data Models

### Core Entities
1. **User**: Authenticated user with profile information
2. **Household**: Grouping for shared finances (family/roommates)
3. **Account**: Financial accounts (bank, cash, credit cards, etc.)
4. **Category**: Transaction categories with hierarchical structure
5. **Transaction**: Income/expense/transfer records
6. **Budget**: Monthly budget allocations
7. **RecurringTemplate**: Templates for recurring transactions
8. **RecurringInstance**: Generated instances from templates
9. **Asset**: Investment/asset tracking
10. **AssetTransaction**: Buy/sell transactions for assets

## Application Structure

### Main Pages
- `/login` - Authentication page
- `/dashboard` - Main dashboard with financial overview
- `/transactions` - Transaction list and management
- `/accounts` - Account management
- `/categories` - Category management
- `/budgets` - Budget planning and tracking
- `/recurring` - Recurring transaction templates
- `/reports` - Financial reporting and analytics
- `/settings` - User and application settings

### Key Components
- Dashboard widgets (cash flow chart, spending by category, recent transactions)
- Transaction forms with validation
- Category combobox with search
- Date range pickers
- Data tables with sorting and filtering
- Modal and drawer-based UI patterns
- Responsive design for mobile and desktop

## Key Services

### Frontend Services
- `transactionService.ts` - Transaction CRUD operations
- `accountService.ts` - Account management
- `categoryService.ts` - Category management
- `budgetService.ts` - Budgeting functionality
- `recurringService.ts` - Recurring transaction handling
- `reportService.ts` - Reporting and analytics
- `syncService.ts` - Offline sync functionality
- `assetService.ts` - Asset tracking

### Backend (Supabase RPC Functions)
- `get_accounts_with_balance` - Account retrieval with calculated balances
- `get_budget_data` - Comprehensive budget data for periods
- `get_transaction_summary` - Transaction summaries
- `get_recurring_templates` - Recurring template retrieval
- `generate_recurring_instances` - Instance generation
- Various reporting functions for cash flow, spending analysis, etc.

## Development Setup

### Requirements
- Node.js 18+
- Supabase account and project
- Environment variables for Supabase connection

### Key Scripts
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run seed` - Seed database with sample data

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for server-side operations

## Design System
- Custom OKLCH color system for consistent theming
- Responsive design with mobile-first approach
- Dark mode support
- Consistent spacing and typography
- Accessible UI components
- Haptic feedback for interactive elements (buttons, switches, checkboxes)

## Haptic Feedback Implementation
The application implements haptic feedback for user interactions on supported devices:
- Uses the Web Vibration API (`navigator.vibrate()`)
- Currently provides a fixed 50ms vibration pattern
- Applied to buttons, switches, and checkboxes
- Works on mobile devices that support the Vibration API

## Offline Capabilities
- Local data storage using Dexie.js
- Sync queue for offline operations
- Network status detection
- Optimistic UI updates
- Automatic sync when connectivity is restored

## Security
- Supabase Row Level Security (RLS) for data protection
- User authentication and session management
- Secure API communication
- Environment variable protection

## Testing
- Unit tests with Jest
- Component tests with Testing Library
- End-to-end tests (implied structure)

## Deployment
- Optimized for Vercel deployment
- PWA manifest for installable experience
- Static asset optimization
- Serverless function support