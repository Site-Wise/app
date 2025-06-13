# SiteWise - Construction Site Management Application

## Overview

SiteWise is a comprehensive construction site management application built with Vue 3, TypeScript, TailwindCSS, and PocketBase. It provides a complete solution for managing construction projects, vendors, items, payments, and team collaboration across multiple construction sites.

## Key Features

### 🏗️ **Multi-Site Management**
- Manage multiple construction sites from a single dashboard
- Site-based data isolation for security and organization
- Role-based access control (Owner, Supervisor, Accountant)
- Site invitation and user management system

### 📦 **Item & Inventory Management**
- Track construction items with quantities and categories
- Monitor delivery history and price trends
- Stock quantity tracking with average pricing
- Comprehensive item details with photo support

### 🛠️ **Service Management**
- Manage construction services (Labor, Equipment, Professional, Transport)
- Service booking and scheduling system
- Rate management with standard pricing
- Service category organization with tagging

### 👥 **Vendor Management**
- Comprehensive vendor contact database
- Vendor specialties and capability tracking
- Financial relationship management
- Outstanding payment tracking

### 💰 **Financial Management**
- Multiple payment account support (Bank, Credit Card, Cash, Digital Wallet)
- Real-time balance tracking and calculations
- Payment status management (Pending, Partial, Paid)
- Financial reporting and expense tracking

### 📝 **Quotation System**
- Price quote management from vendors
- Support for both item and service quotations
- Quotation validity tracking
- Approval workflow management

### 🚚 **Delivery Tracking**
- Record incoming item deliveries with photos
- Delivery documentation and receipt management
- Payment status integration
- Vendor delivery history

### 💳 **Payment Management**
- Record payments to vendors with account tracking
- Automatic payment allocation to outstanding items/services
- Payment reference and note management
- Account balance updates

### 📊 **Dashboard & Analytics**
- Real-time site overview with key metrics
- Expense tracking per square foot
- Outstanding amount monitoring
- Payment trend analysis

### 🔐 **Security & Permissions**
- JWT-based authentication
- Site-based data isolation
- Role-based access control
- Secure API with PocketBase backend

### 💼 **Subscription Management**
- Free tier with basic functionality
- Paid plans with unlimited features
- Usage tracking and limit enforcement
- Razorpay payment integration

### 🌐 **Progressive Web App (PWA)**
- Offline capability
- Mobile-responsive design
- App installation support
- Push notifications

### 🌍 **Internationalization**
- Multi-language support (English, Hindi)
- Localized user interface
- Currency and date formatting

## Technical Architecture

### Frontend Stack
- **Vue 3** - Modern JavaScript framework with Composition API
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **TailwindCSS** - Utility-first CSS framework
- **Vue Router** - Client-side routing
- **Lucide Vue Next** - Icon library
- **Chart.js & Vue-ChartJS** - Data visualization
- **Vue Toastification** - Toast notifications

### Backend
- **PocketBase** - Self-contained backend with SQLite
- **Real-time subscriptions** - Live data updates
- **File storage** - Photo and document management
- **Authentication** - Built-in user management

### Development Tools
- **Vitest** - Unit testing framework
- **Vue Test Utils** - Vue component testing
- **Happy DOM** - DOM testing environment
- **TypeScript** - Static type checking
- **ESLint & Prettier** - Code quality and formatting

## Project Structure

```
src/
├── components/          # Reusable Vue components
│   ├── AppLayout.vue   # Main application layout
│   ├── LanguageSelector.vue
│   ├── PWAPrompt.vue
│   ├── PhotoGallery.vue
│   ├── SiteSelector.vue
│   ├── SubscriptionBanner.vue
│   └── ThemeToggle.vue
├── composables/         # Vue composables for shared logic
│   ├── useAuth.ts      # Authentication management
│   ├── useI18n.ts      # Internationalization
│   ├── useInvitations.ts # Site invitations
│   ├── usePWA.ts       # Progressive Web App features
│   ├── usePermissions.ts # Role-based permissions
│   ├── useSite.ts      # Site management
│   ├── useSubscription.ts # Subscription management
│   └── useTheme.ts     # Theme switching
├── router/             # Vue Router configuration
│   └── index.ts        # Route definitions and guards
├── services/           # API services
│   └── pocketbase.ts   # PocketBase integration
├── views/              # Page components
│   ├── AccountDetailView.vue
│   ├── AccountsView.vue
│   ├── DashboardView.vue
│   ├── IncomingView.vue
│   ├── InvitesView.vue
│   ├── ItemDetailView.vue
│   ├── ItemsView.vue
│   ├── LoginView.vue
│   ├── PaymentsView.vue
│   ├── QuotationsView.vue
│   ├── ServiceBookingsView.vue
│   ├── ServiceDetailView.vue
│   ├── ServicesView.vue
│   ├── SiteSelectionView.vue
│   ├── SubscriptionView.vue
│   ├── UserManagementView.vue
│   ├── VendorDetailView.vue
│   └── VendorsView.vue
├── locales/            # Internationalization files
│   ├── en.json        # English translations
│   ├── hi.json        # Hindi translations
│   └── index.ts       # Language configuration
├── test/              # Test files
│   ├── components/    # Component tests
│   ├── composables/   # Composable tests
│   ├── integration/   # Integration tests
│   ├── mocks/         # Test mocks
│   ├── utils/         # Test utilities
│   └── views/         # View tests
├── main.ts            # Application entry point
└── style.css          # Global styles
```

## User Roles & Permissions

### Owner
- **Full Access**: Complete CRUD operations on all resources
- **User Management**: Invite users, assign roles, manage site access
- **Financial Control**: Full access to payments, accounts, and financial data
- **Subscription Management**: Upgrade/downgrade plans, manage billing
- **Site Administration**: Create, modify, and delete sites

### Supervisor
- **Operational Access**: Create, read, and update most resources
- **Limited Deletion**: Cannot delete core items, vendors, or services
- **Financial Access**: View and create payments and accounts
- **No User Management**: Cannot manage site users or roles
- **Data Export**: Can export operational reports

### Accountant
- **Read-Only Access**: View all resources but cannot modify
- **Financial Focus**: Primary access to payments, accounts, and reports
- **Export Capabilities**: Generate financial and operational reports
- **No Administrative Rights**: Cannot manage users or core data

## Data Models

### Core Entities

#### Site
- Site information (name, description, units, area)
- Admin user and team members
- Subscription and billing details

#### User
- Authentication and profile information
- Site access and role assignments
- Multi-site support

#### Item
- Construction materials and supplies
- Quantity tracking and categorization
- Delivery history and pricing

#### Service
- Construction services (labor, equipment, professional)
- Rate management and booking system
- Category-based organization

#### Vendor
- Supplier and contractor information
- Contact details and specialties
- Financial relationship tracking

#### Account
- Payment accounts (bank, credit card, cash, digital wallet)
- Balance tracking and transaction history
- Multi-account support

#### Quotation
- Price quotes for items and services
- Vendor comparison and approval workflow
- Validity and status tracking

#### Incoming Item
- Delivery records with photos and documentation
- Payment status and amount tracking
- Vendor and item relationship

#### Service Booking
- Service scheduling and execution
- Duration and rate management
- Completion tracking with photos

#### Payment
- Payment records to vendors
- Account allocation and balance updates
- Reference and note management

### Subscription Models

#### Subscription Plans
- Free tier with basic limits
- Paid plans with unlimited features
- Feature-based pricing model

#### Usage Tracking
- Resource consumption monitoring
- Limit enforcement and notifications
- Billing cycle management

## API & Database

### PocketBase Collections
- `users` - User authentication and profiles
- `sites` - Construction site information
- `site_users` - User-site role assignments
- `site_invitations` - Site invitation management
- `accounts` - Payment account information
- `items` - Construction item catalog
- `services` - Service definitions
- `vendors` - Vendor directory
- `quotations` - Price quotations
- `incoming_items` - Delivery records
- `service_bookings` - Service scheduling
- `payments` - Payment transactions
- `subscription_plans` - Subscription plan definitions
- `site_subscriptions` - Site subscription status
- `subscription_usage` - Usage tracking
- `payment_transactions` - Billing transactions

### Security Rules
- Site-based data isolation
- Role-based access control
- Authentication required for all operations
- Subscription limit enforcement

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- PocketBase server
- Modern web browser

### Development Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables:
   ```env
   VITE_POCKETBASE_URL=http://127.0.0.1:8090
   VITE_APP_NAME=SiteWise
   VITE_APP_ENV=development
   ```
4. Start PocketBase server
5. Start development server: `npm run dev`

### Production Build
```bash
npm run build
npm run preview
```

### Testing
```bash
npm run test          # Run unit tests
npm run test:ui       # Run tests with UI
npm run test:coverage # Generate coverage report
```

## Deployment

### Frontend Deployment
- Build optimized production bundle
- Deploy to static hosting (Netlify, Vercel, etc.)
- Configure environment variables

### Backend Setup
- Deploy PocketBase server
- Configure database collections
- Set up API rules and permissions
- Configure file storage

### PWA Configuration
- Service worker registration
- Manifest file configuration
- Offline capability setup

## Contributing

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Use semantic commit messages
- Maintain code documentation

### Code Quality
- ESLint for code linting
- Prettier for code formatting
- Vitest for unit testing
- Vue Test Utils for component testing

## License

This project is licensed under the MIT License.

## Support & Maintenance

### Performance Optimization
- Lazy loading for route components
- Image optimization and compression
- Database query optimization
- Caching strategies

### Monitoring & Analytics
- Error tracking and reporting
- Performance monitoring
- User analytics
- API usage tracking

### Backup & Recovery
- Database backup strategies
- File storage backup
- Disaster recovery planning
- Data migration procedures

## Future Enhancements

### Planned Features
- Advanced reporting and analytics
- Mobile app development
- API integrations (accounting software)
- Advanced workflow automation
- Real-time collaboration features
- Enhanced photo management
- Document management system
- Project timeline tracking
- Budget management
- Inventory forecasting

### Technical Improvements
- Enhanced offline capabilities
- Better mobile responsiveness
- Performance optimizations
- Advanced caching strategies
- Real-time notifications
- Enhanced security features