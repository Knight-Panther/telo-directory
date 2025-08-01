# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Root Level Commands
- `npm run dev` - Start both client and server concurrently (client on port 3001, server on port 3000)
- `npm run server` - Start only the server with nodemon

### Client Commands (run from client/ directory)
- `npm start` - Start React development server on port 3001
- `npm run build` - Build production React app
- `npm test` - Run React tests with Jest
- `npm run eject` - Eject from create-react-app

### Server Commands (run from server/ directory)
- `npm run dev` - Start server with nodemon
- `npm run server` - Start server with nodemon (alias)
- `npm run seed` - Seed database with initial data

## Architecture Overview

### Full-Stack Structure
This is a MERN stack application (MongoDB, Express, React, Node.js) with a business directory focus.

**Root Structure:**
- `/client` - React frontend application
- `/server` - Express.js backend API
- `/docs` - Documentation files

### Frontend (React)
- **Framework:** React 19.1.0 with React Router DOM for routing
- **State Management:** @tanstack/react-query for server state management
- **UI Components:** Custom components organized in `/src/components/`
  - `admin/` - Admin dashboard components
  - `business/` - Business listing and detail components  
  - `common/` - Shared UI components (Header, Footer, SearchBar)
  - `modals/` - Modal components
- **Pages:** `/src/pages/` contains main page components (HomePage, BusinessDetailPage, AdminPage)
- **Services:** `/src/services/` contains API service layers
- **Styling:** CSS files organized in `/src/styles/`

### Backend (Express.js)
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT-based auth with bcryptjs
- **File Uploads:** Multer + Sharp for image processing
- **API Structure:**
  - `/routes/public/` - Public business directory routes
  - `/routes/admin/` - Protected admin routes (auth, businesses, categories, dashboard, reports)
  - `/routes/` - General routes (health checks, reports)
- **Models:** Business, BusinessReport, Category
- **Middleware:** Auth, error handling, validation, file upload
- **Config:** Database connection with health monitoring and reconnection logic

### Key Features
1. **Business Directory** - Public business listings with search/filter
2. **Admin Dashboard** - Business management, categories, reports, analytics
3. **Report System** - User reporting and admin moderation
4. **Image Management** - File upload and processing for business images
5. **Health Monitoring** - Database health checks and server monitoring

### Database Connection
The app uses a sophisticated DatabaseManager class in `/server/config/database.js` that handles:
- Connection retries with exponential backoff
- Environment-specific connection pooling
- Health checks and monitoring
- Graceful shutdown handling

### Environment Setup
- Client runs on port 3001
- Server runs on port 3000
- Requires MONGODB_URI environment variable
- Uses concurrently to run both services in development