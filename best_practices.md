# 📘 Project Best Practices

## 1. Project Purpose
This is a comprehensive finance tracking application built with Next.js that helps users manage their personal finances. The app supports household-based financial management with features including transaction tracking, budgeting, recurring transactions, asset management, and financial reporting. It's designed as a Progressive Web App (PWA) with offline-first capabilities, allowing users to continue working even without internet connectivity.

## 2. Project Structure
- **`src/app/`** - Next.js App Router pages and layouts using the new app directory structure
- **`src/components/`** - Reusable React components organized by feature (budget, dashboard, transaction, etc.)
- **`src/components/ui/`** - Base UI components built with Radix UI and styled with Tailwind CSS
- **`src/lib/`** - Business logic services (transactionService, budgetService, etc.) and utilities
- **`src/types/`** - TypeScript type definitions for the entire application
- **`src/contexts/`** - React context providers for global state management
- **`src/hooks/`** - Custom React hooks for reusable logic
- **`src/utils/supabase/`** - Supabase client configuration for server and client-side usage
- **`supabase/`** - Database migrations and configuration files
- **`public/`** - Static assets including PWA manifest and icons

## 3. Test Strategy
- **Framework**: Jest with React Testing Library for component testing
- **Configuration**: Custom Jest config with Next.js integration via `next/jest`
- **Setup**: Tests use `@testing-library/jest-dom` for enhanced DOM assertions
- **Location**: Tests are co-located with components (e.g., `TransactionModal.test.tsx`)
- **Mocking**: Transform ignore patterns configured for Supabase and Next.js modules
- **Commands**: `npm test` for single run, `npm run test:watch` for watch mode

## 4. Code Style
- **Language**: TypeScript with strict type checking enabled
- **Linting**: ESLint with Next.js, React, and TypeScript rules
- **Formatting**: Tailwind CSS for styling with `cn()` utility for class merging
- **Naming Conventions**:
  - Files: kebab-case for components (`TransactionModal.tsx`), camelCase for services (`transactionService.ts`)
  - Functions: camelCase (`saveTransaction`, `fetchCategories`)
  - Types/Interfaces: PascalCase (`Transaction`, `BudgetAssignment`)
  - Constants: UPPER_SNAKE_CASE for environment variables
- **Import Aliases**: Use `@/` for src directory imports
- **Error Handling**: Use try-catch blocks with toast notifications via Sonner
- **Async/Await**: Prefer async/await over Promises for better readability

## 5. Common Patterns
- **Service Layer**: Business logic separated into service files (`transactionService.ts`, `budgetService.ts`)
- **Type Safety**: Comprehensive TypeScript types with proper generic usage
- **Offline-First**: Dexie for local storage with sync queue for offline operations
- **Toast Notifications**: Consistent user feedback using Sonner toast library
- **Component Composition**: Radix UI primitives with custom styling
- **Data Fetching**: SWR for client-side data fetching with caching
- **Form Handling**: Controlled components with proper validation
- **Currency Formatting**: Centralized `formatCurrency` utility for Indonesian Rupiah (IDR)

## 6. Do's and Don'ts
### ✅ Do's
- Always use TypeScript types for function parameters and return values
- Use the `cn()` utility for combining Tailwind classes
- Implement proper error handling with user-friendly toast messages
- Follow the service layer pattern for business logic
- Use proper React hooks for state management and side effects
- Implement offline-first patterns with Dexie for data persistence
- Use Supabase RLS (Row Level Security) for data access control
- Follow the household-based data model for multi-user support

### ❌ Don'ts
- Don't use `any` type - prefer `unknown` or proper type definitions
- Don't put business logic directly in components
- Don't forget to handle offline scenarios in data operations
- Don't bypass TypeScript strict mode warnings
- Don't use direct DOM manipulation - use React patterns
- Don't hardcode currency formats - use the `formatCurrency` utility
- Don't ignore ESLint warnings, especially for React hooks dependencies

## 7. Tools & Dependencies
- **Framework**: Next.js 15+ with App Router
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **Local Storage**: Dexie (IndexedDB wrapper) for offline capabilities
- **UI Components**: Radix UI primitives with Tailwind CSS styling
- **State Management**: React Context + SWR for server state
- **Charts**: Recharts and Tremor for data visualization
- **Authentication**: Supabase Auth with household-based access control
- **PWA**: @ducanh2912/next-pwa for Progressive Web App features
- **Testing**: Jest + React Testing Library
- **Type Checking**: TypeScript with strict configuration

## 8. Other Notes
- The application uses a household-based data model where users belong to households and share financial data
- All monetary values are stored as integers (cents) and formatted using the `formatCurrency` utility
- The app supports offline functionality with automatic sync when connectivity is restored
- Indonesian Rupiah (IDR) is the default currency with proper localization
- Real-time updates are implemented using Supabase subscriptions
- The sync queue pattern ensures data consistency between local and remote storage
- Components should be responsive and work well on mobile devices (PWA)
- Use proper loading states and skeleton components for better UX
- Follow the established folder structure when adding new features
- Always test offline scenarios when implementing new data operations