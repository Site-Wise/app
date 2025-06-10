# ConstructTrack - Construction Site Management App

A comprehensive construction site management application built with Vue 3, TypeScript, TailwindCSS, and PocketBase.

## Features

- **Item Management**: Track construction items with quantities and categories
- **Vendor Management**: Manage vendor contacts and specialties
- **Quotation System**: Store and manage price quotes from vendors
- **Delivery Tracking**: Record incoming items with photos and pricing
- **Payment Management**: Track payments with automatic status updates
- **Dashboard**: Overview of all activities and outstanding amounts

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **Styling**: TailwindCSS
- **Backend**: PocketBase
- **Icons**: Lucide Vue Next

## Setup

### Prerequisites

- Node.js (v18 or higher)
- PocketBase server

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set your PocketBase URL:
   ```env
   VITE_POCKETBASE_URL=http://127.0.0.1:8090
   ```

4. Start PocketBase server (make sure it's running on the configured URL)

5. Start the development server:
   ```bash
   npm run dev
   ```

### Environment Variables

- `VITE_POCKETBASE_URL`: URL of your PocketBase server (default: http://127.0.0.1:8090)
- `VITE_APP_NAME`: Application name (default: ConstructTrack)
- `VITE_APP_ENV`: Environment (development/production)

### PocketBase Setup

Make sure your PocketBase server has the following collections configured:

- `users` - User authentication
- `items` - Construction items
- `vendors` - Vendor information
- `quotations` - Price quotations
- `incoming_items` - Delivery records
- `payments` - Payment tracking

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/          # Reusable Vue components
├── composables/         # Vue composables
├── router/             # Vue Router configuration
├── services/           # API services and PocketBase integration
├── views/              # Page components
└── style.css           # Global styles
```

## License

This project is licensed under the MIT License.