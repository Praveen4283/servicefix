# ServiceFix - Service Desk & Support Ticket System

*Last Updated: July 16, 2024*

A comprehensive service desk and ticket management system built with React, Node.js, and PostgreSQL.

## Recent Improvements

- 🤖 **Enterprise-Ready Chatbot**: Enhanced chatbot implementation with numbered list options for selections, support for both numeric and name-based selection, improved tag input with skip option, and clearer UI prompts
- 🔄 **Form Submission Fix**: Fixed continuous loading icon issue in CreateTicketPage by implementing proper local submitting state and reliable form validation
- 🏢 **Organization ID Fix**: Replaced hardcoded organization ID (1001) in SettingsPage with authenticated user's organization ID, including proper null checks and TypeScript error fixes
- 🗑️ **Notification Soft Delete**: Implemented soft deletion for notifications with an is_deleted flag, allowing notifications to be removed from view while preserving them in the database
- 📋 **Default Notification Preferences**: Added database trigger to automatically create default notification preferences when new users are created
- 🔔 **Independent Notification Settings**: Added separate "Edit Notifications" button in profile page for modifying notification settings independently
- 🔄 **Dynamic Rate Limiting**: Implemented database-driven API rate limiting with configurable limits and window times that can be managed through the admin Settings page
- 🌐 **API Management**: Enhanced API settings tab in admin interface with functional controls for rate limiting and API access
- 🚀 **Rate Limiting Performance**: Optimized rate limiting implementation with proper database initialization timing
- 🔐 **Authentication Persistence**: Fixed session persistence issues that previously caused users to be redirected to login after page refreshes
- 🔄 **Token Refresh**: Implemented robust token refresh mechanism to maintain authenticated state across browser sessions
- ⚡ **Login Performance**: Optimized authentication flows for faster login and page transitions with reduced delays
- 🛡️ **State Synchronization**: Enhanced localStorage synchronization with React state to prevent authentication state mismatches
- 🔒 **User Session Management**: Improved session tracking with detailed logging and proper error recovery
- 🚀 **Authentication Flow**: Enhanced authentication with improved public route detection and CSRF token handling after login
- 🔄 **Session Management**: Added robust session monitoring, local user data persistence, and automatic token refresh
- 🔐 **CSRF Protection**: Added CSRF token endpoint to secure API requests against cross-site request forgery
- 📨 **Notification Service**: Improved notification service initialization with lazy loading and database connection resilience
- 🔒 **Authentication Flow**: Enhanced logout functionality to handle edge cases and ensure secure session termination
- 🚀 **Route Consistency**: Fixed logout redirect paths to use correct login URL across frontend components
- 🚨 **Error Handling**: Improved error handling for database connection issues during application startup
- 🧹 **Type Safety**: Removed excessive use of `any` types and improved TypeScript typing throughout the codebase
- 🔄 **Naming Conventions**: Added utilities to standardize conversion between snake_case (database) and camelCase (TypeScript) naming
- 🏗️ **React Patterns**: Updated components to use modern React patterns with functional components and hooks
- 🧩 **Code Organization**: Improved code organization with better separation of concerns and more consistent patterns
- 🛠️ **Dependency Cleanup**: Removed unused dependencies (chart.js, react-chartjs-2, notistack, react-icons) to improve build time and reduce bundle size
- 🔄 **UI Library Standardization**: Consolidated UI components to use Material-UI instead of mixing with Ant Design
- 🖥️ **Knowledge Base Article Detail**: Implemented complete article detail page with rich content display
- 📱 **Chatbot Enhancement**: Improved chatbot implementation with ticket creation and article navigation features
- 🔔 **Notification System**: Created standardized notification utilities for consistent messaging
- 🚀 **Build Process**: Enhanced backend build process with production-optimized scripts
- 🗃️ **Storage Integration**: Consolidated Supabase client initialization for more reliable file operations
- 🔄 **Settings Page**: Fixed all functionality in the Settings page with proper API integration and consistent notification handling
- 🗄️ **Database Schema**: Added default entries for all settings categories in the Supabase database to ensure proper data persistence
- 🔄 **API Integration**: Replaced mock data with real API service calls throughout the frontend for settings management
- 🔔 **Notification System**: Improved notification consistency by using the global notification manager across all settings components
- 💾 **Settings State**: Enhanced change detection across all settings tabs to properly enable save buttons when values are modified
- 🔔 **Notification System Fixes**: Enhanced notification system with proper localStorage cleanup on logout, improved data synchronization between backend and frontend, and multi-stage retry logic for pagination discrepancies
- 🧠 **Smart Notification Fetching**: Added intelligent retry logic when backend pagination data indicates more notifications exist than are initially returned
- 🗄️ **Local Storage Management**: Improved localStorage synchronization with React state to prevent notification state mismatches

## Features

- 🎫 **Ticket Management**: Create, assign, track, and manage service tickets with customizable workflows and SLAs
- 🤖 **AI-Powered Automation**: Automatic ticket classification, priority assignment, and sentiment analysis using advanced NLP
- 💬 **Live Chat Support**: Real-time customer assistance with AI chatbot integration that can handle common inquiries
- 📚 **Knowledge Base**: Self-service portal with searchable documentation, categorized articles, and media attachments
- 📊 **Analytics & Reporting**: Comprehensive reporting and performance metrics to track KPIs and agent productivity
- 🔔 **Notification System**: Email, SMS, and in-app alerts for important ticket updates and SLA breaches
- 👥 **User Management**: Role-based access control for agents and administrators with custom permission sets
- 🔄 **Workflow Automation**: Custom SLAs, escalation rules, and automation triggers for efficient ticket handling
- 🔌 **Integrations**: APIs for connecting with other business tools like CRM, billing, and communication systems
- 🎨 **Modern UI/UX**: Intuitive interface with light/dark mode and responsive design optimized for all device sizes
- 🔒 **Privacy Compliance**: GDPR-compliant cookie consent management, data handling, and user privacy controls

## Technical Architecture

### Overview

ServiceFix uses a modern architecture with a clear separation between frontend and backend:

- **Frontend**: Single-page application (SPA) built with React and TypeScript
- **Backend**: RESTful API service built with Node.js, Express, and TypeScript
- **Database**: PostgreSQL for data storage with TypeORM as the ORM
- **Authentication**: JWT-based authentication with refresh token rotation
- **Real-time**: WebSocket integration via Socket.io for live updates and notifications
- **File Storage**: Supabase Storage for file handling and media uploads
- **Caching**: Local caching with React Query for API data

### Backend Architecture

The backend follows a modular, TypeScript-based architecture with several key features:

#### Error Handling
- Centralized error handling with the `AppError` class
- Different error types with appropriate HTTP status codes
- Structured error responses for API clients
- Async error handling with the `asyncHandler` utility

#### Authentication System
- JWT-based authentication with access and refresh tokens
- Centralized authentication service (`authService`)
- CSRF protection for non-GET requests
- Secure password reset and token management

#### Dependency Injection
- Custom dependency injection container for managing services
- Registration of services with singleton/non-singleton support
- Clear dependency management without circular dependencies

#### Database Management
- TypeORM integration with PostgreSQL
- Database migrations for schema changes
- Schema version tracking table for migration history
- Database connection pool with retry logic

#### API Versioning
- Versioned API routes (/api/v1/...)
- Backward compatibility support
- Standardized API responses

#### Security Features
- CSRF protection middleware
- Rate limiting for API endpoints
- Helmet for HTTP security headers
- Content Security Policy (CSP) implementation

### Architectural Patterns

- **Clean Architecture**: Separation of concerns with layers (controllers, services, repositories)
- **Repository Pattern**: Data access abstraction through TypeORM repositories
- **MVC Pattern**: Model-View-Controller pattern for API endpoints
- **Context API**: React Context API for global state management
- **Middleware Pattern**: Express middleware for cross-cutting concerns

### Logging & Monitoring

- **Centralized Logging**: Winston logger with log rotation and formatted output
- **Supabase Integration**: Remote log storage and buffering using Supabase
- **Graceful Shutdown**: Proper log flushing during application shutdown
- **Error Tracking**: Comprehensive error capture and structured logging
- **Database Diagnostics**: Automatic database connection testing and diagnostics

### Scheduled Jobs & Automation

The system includes several automated background processes:

- **SLA Monitoring**: Regular checks (every 5 minutes) for SLA compliance
- **Breach Detection**: Automatic detection and notification of SLA breaches
- **Auto-close**: Automatic closing of resolved tickets after a configured period
- **Response Reset**: Reset of SLA timers when customers respond to tickets
- **Graceful Shutdown**: Proper cleanup of scheduled jobs during application termination

### Real-time Communication

- **WebSocket Integration**: Socket.io for bidirectional real-time communication
- **Notification Delivery**: Instant notification delivery to connected clients
- **Connection Management**: Proper authentication and connection lifecycle handling
- **Room-based Messaging**: Targeted messaging to specific users and groups
- **Connection Resilience**: Automatic reconnection and error handling

### Error Handling

- **Global Error Handler**: Centralized error handling middleware
- **Structured Response Format**: Consistent error response structure
- **Error Boundary**: React error boundaries for frontend error containment
- **Process-level Handling**: Capture of unhandled rejections and exceptions
- **Graceful Degradation**: Fallback behavior for critical system components

## Installation & Setup

### Prerequisites
- Node.js (v20 or higher)
- PostgreSQL (v12 or higher)
- npm

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/servicefix.git
   cd servicefix
   ```

2. **Set up the backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Set up the frontend**
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env
   # Edit .env with your backend API URL
   ```

4. **Start the application**
   ```bash
   # Start the backend (from the backend directory)
   npm run dev
   
   # Start the frontend (from the frontend directory)
   npm start
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Backend Architecture

The backend follows a modular, TypeScript-based architecture:

### Entry Point

`src/index.ts` is the main application file that initializes the Express server, middleware, database connections, and all routes.

### Key Directories

- `src/config/` - Configuration files for the database, etc.
- `src/controllers/` - Request handlers for each route
- `src/middleware/` - Express middleware functions
- `src/models/` - Database entity definitions
- `src/routes/` - API route definitions
- `src/services/` - Business logic and data access
- `src/utils/` - Utility functions and helpers

### Development

To run the backend in development mode:

```bash
cd backend
npm run dev
```

This will start the server with hot reloading using nodemon and ts-node.

### Production

To build and run the backend for production:

```bash
cd backend
npm run build
npm start
```

The build process will compile TypeScript to JavaScript in the `dist/` directory.

### Database

The application uses TypeORM with PostgreSQL. Run migrations with:

```bash
npm run migration:run
```

### Environment Variables for Backend

Create a `.env` file in the backend directory with the following variables:

```
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=yourpassword
DB_DATABASE=servicefix

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d
REFRESH_TOKEN_EXPIRES_IN=7d

# Cors
FRONTEND_URL=http://localhost:3000
```

## API Documentation

The ServiceFix backend provides a comprehensive RESTful API with robust versioning support. The API is accessible via both versioned (`/api/v1/`) and legacy (`/api/`) endpoints for backward compatibility.

### API Versioning and Structure

- **Current Version**: v1
- **Base URL**: `/api/v1` (recommended) or `/api` (legacy)
- **Authentication**: JWT Bearer token required for most endpoints
- **Response Format**: JSON with consistent structure (`{ status: 'success|error', data|message: {...} }`)
- **Rate Limiting**: Configurable rate limiting to protect against abuse
- **Error Handling**: Structured error responses with appropriate HTTP status codes

### Authentication Endpoints

- **POST /api/v1/auth/register** - Register a new user
  - Required fields: `email`, `password`, `firstName`, `lastName`, `organizationId`
  - Optional fields: `role`, `avatar`, `phone`, `timezone`, `language`

- **POST /api/v1/auth/login** - User login
  - Required fields: `email`, `password`
  - Returns: Access token, refresh token, and user profile

- **POST /api/v1/auth/refresh-token** - Refresh access token
  - Required fields: `refreshToken`
  - Returns: New access token and refresh token

- **POST /api/v1/auth/logout** - Logout user
  - Requires authentication
  - Required fields: `refreshToken`

- **POST /api/v1/auth/forgot-password** - Request password reset
  - Required fields: `email`
  - Sends reset email with token

- **POST /api/v1/auth/reset-password** - Reset password with token
  - Required fields: `token`, `password`

- **POST /api/v1/auth/change-password** - Change password (authenticated)
  - Requires authentication
  - Required fields: `currentPassword`, `newPassword`

- **GET /api/v1/csrf-token** - Get CSRF token for form submissions
  - Returns: CSRF token to be included in subsequent requests

### Ticket Endpoints

- **GET /api/v1/tickets** - List tickets with pagination and filtering
  - Query parameters: `page`, `limit`, `sortBy`, `sortOrder`, and various filters
  - Requires authentication

- **GET /api/v1/tickets/:id** - Get ticket details
  - Requires authentication
  - Returns: Complete ticket details with related entities

- **POST /api/v1/tickets** - Create new ticket
  - Requires authentication
  - Required fields: `subject`, `description`, `requesterId`, `priorityId`
  - Optional fields: `assigneeId`, `departmentId`, `typeId`, `dueDate`, `tags`
  - Supports file uploads via `multipart/form-data`

- **PUT /api/v1/tickets/:id** - Update ticket
  - Requires authentication
  - Updateable fields: `subject`, `description`, `assigneeId`, `departmentId`, `priorityId`, `statusId`, `typeId`, `dueDate`, `tags`

- **DELETE /api/v1/tickets/:id** - Delete ticket
  - Requires authentication with appropriate permissions

- **POST /api/v1/tickets/:id/comments** - Add comment to ticket
  - Requires authentication
  - Required fields: `content`
  - Optional fields: `isInternal`

- **GET /api/v1/tickets/:id/history** - Get ticket history
  - Requires authentication
  - Returns: Timeline of ticket changes with user information

- **POST /api/v1/tickets/:id/attachments** - Upload attachments to ticket
  - Requires authentication
  - Supports multiple file uploads (max 10 files)
  - Files sent via `multipart/form-data`

- **GET /api/v1/tickets/attachments/download/:attachmentId** - Download attachment
  - Requires authentication
  - Returns: File download stream

- **POST /api/v1/tickets/:id/update-sla** - Update ticket SLA
  - Requires authentication
  - Updates SLA based on current ticket priority

### Ticket Reference Data Endpoints

- **GET /api/v1/tickets/departments** - List all departments
- **GET /api/v1/tickets/priorities** - List all ticket priorities
- **GET /api/v1/tickets/types** - List all ticket types
- **GET /api/v1/tickets/statuses** - List all ticket statuses

### User Endpoints

- **GET /api/v1/users** - List users with pagination and filtering
  - Requires authentication with appropriate permissions
  - Query parameters: `page`, `limit`, `search`, `role`, `isActive`

- **GET /api/v1/users/:id** - Get user details
  - Requires authentication

- **PUT /api/v1/users/:id** - Update user
  - Requires authentication with appropriate permissions
  - Updateable fields: `firstName`, `lastName`, `email`, `role`, `isActive`, etc.

- **DELETE /api/v1/users/:id** - Delete user
  - Requires authentication with admin permissions

- **GET /api/v1/users/me** - Get current user profile
  - Requires authentication
  - Returns: Complete user profile with permissions

- **PUT /api/v1/users/me** - Update current user profile
  - Requires authentication
  - Updateable fields: `firstName`, `lastName`, `avatar`, `phone`, `timezone`, `language`

- **PUT /api/v1/users/me/preferences** - Update user preferences
  - Requires authentication
  - Updateable fields: Various user preferences (theme, notifications, etc.)

### Knowledge Base Endpoints

- **GET /api/v1/knowledge** - List knowledge base articles
  - Query parameters: `page`, `limit`, `search`, `categoryId`, `status`

- **GET /api/v1/knowledge/:id** - Get article details
  - Returns: Complete article with related data

- **POST /api/v1/knowledge** - Create new article
  - Requires authentication with appropriate permissions
  - Required fields: `title`, `content`, `categoryId`
  - Optional fields: `status`, `tags`, `excerpt`, `metaTitle`, `metaDescription`

- **PUT /api/v1/knowledge/:id** - Update article
  - Requires authentication with appropriate permissions
  - Updateable fields: All article fields

- **DELETE /api/v1/knowledge/:id** - Delete article
  - Requires authentication with appropriate permissions

- **GET /api/v1/knowledge/categories** - List article categories
  - Returns: Hierarchical category structure

- **POST /api/v1/knowledge/categories** - Create new category
  - Requires authentication with appropriate permissions
  - Required fields: `name`, `slug`
  - Optional fields: `description`, `parentId`, `icon`, `isPrivate`

### Notification Endpoints

- **GET /api/v1/notifications** - Get user notifications with pagination
  - Requires authentication
  - Query parameters: `page`, `limit`, `read` (true/false)

- **POST /api/v1/notifications/:id/read** - Mark specific notification as read
  - Requires authentication

- **POST /api/v1/notifications/read-all** - Mark all notifications as read
  - Requires authentication

- **DELETE /api/v1/notifications/:id** - Delete a specific notification
  - Requires authentication

- **DELETE /api/v1/notifications** - Delete all notifications for the current user
  - Requires authentication

- **GET /api/v1/notifications/preferences** - Get notification preferences
  - Requires authentication
  - Returns: User's notification preferences for different channels and event types

- **PUT /api/v1/notifications/preferences** - Update notification preferences
  - Requires authentication
  - Updateable fields: Channel preferences (email, push, in-app) for different event types

- **POST /api/v1/notifications/test** - Send a test notification (development only)
  - Requires authentication

### SLA Endpoints

- **GET /api/v1/sla** - Get SLA policies
  - Requires authentication
  - Query parameters: `organizationId`

- **POST /api/v1/sla** - Create new SLA policy
  - Requires authentication with appropriate permissions
  - Required fields: `name`, `organizationId`, `ticketPriorityId`, `resolutionHours`
  - Optional fields: `description`, `firstResponseHours`, `nextResponseHours`, `businessHoursOnly`

- **GET /api/v1/sla/:id** - Get SLA policy details
  - Requires authentication

- **PUT /api/v1/sla/:id** - Update SLA policy
  - Requires authentication with appropriate permissions
  - Updateable fields: All SLA policy fields

- **DELETE /api/v1/sla/:id** - Delete SLA policy
  - Requires authentication with appropriate permissions

### Business Hours Endpoints

- **GET /api/v1/business-hours** - Get business hours configurations
  - Requires authentication
  - Query parameters: `organizationId`

- **POST /api/v1/business-hours** - Create business hours configuration
  - Requires authentication with appropriate permissions
  - Required fields: `name`, `organizationId`
  - Optional fields: Day-specific start/end times, `timezone`, `isDefault`

- **GET /api/v1/business-hours/:id** - Get specific business hours configuration
  - Requires authentication

- **PUT /api/v1/business-hours/:id** - Update business hours configuration
  - Requires authentication with appropriate permissions
  - Updateable fields: All business hours fields

- **DELETE /api/v1/business-hours/:id** - Delete business hours configuration
  - Requires authentication with appropriate permissions

### Chatbot Endpoints

- **GET /api/v1/chat/conversations** - List chat conversations
  - Requires authentication

- **POST /api/v1/chat/conversations** - Create new conversation
  - Requires authentication
  - Optional fields: `visitorId`

- **GET /api/v1/chat/conversations/:id** - Get conversation details
  - Requires authentication

- **POST /api/v1/chat/conversations/:id/messages** - Add message to conversation
  - Requires authentication
  - Required fields: `content`
  - Optional fields: `metadata`

- **GET /api/v1/chat/conversations/:id/messages** - Get conversation messages
  - Requires authentication
  - Query parameters: `page`, `limit`

- **POST /api/v1/chat/conversations/:id/end** - End conversation
  - Requires authentication

### Report Endpoints

- **GET /api/v1/reports/tickets/summary** - Get ticket summary statistics
  - Requires authentication
  - Query parameters: `startDate`, `endDate`, `departmentId`

- **GET /api/v1/reports/tickets/by-status** - Get tickets grouped by status
  - Requires authentication
  - Query parameters: `startDate`, `endDate`, `departmentId`

- **GET /api/v1/reports/tickets/by-priority** - Get tickets grouped by priority
  - Requires authentication
  - Query parameters: `startDate`, `endDate`, `departmentId`

- **GET /api/v1/reports/tickets/by-agent** - Get tickets grouped by agent
  - Requires authentication
  - Query parameters: `startDate`, `endDate`, `departmentId`

- **GET /api/v1/reports/sla/compliance** - Get SLA compliance reports
  - Requires authentication
  - Query parameters: `startDate`, `endDate`, `departmentId`

- **GET /api/v1/reports/agent/performance** - Get agent performance metrics
  - Requires authentication
  - Query parameters: `startDate`, `endDate`, `agentId`

### Settings Endpoints

- **GET /api/v1/settings** - Get all settings
  - Requires authentication with appropriate permissions

- **GET /api/v1/settings/:category** - Get settings by category
  - Requires authentication with appropriate permissions
  - Available categories: `email`, `general`, `ticket`, `sla`

- **PUT /api/v1/settings/:category** - Update settings for category
  - Requires authentication with appropriate permissions
  - Request body: JSON object with settings for the specified category

- **GET /api/v1/settings/email** - Get email configuration settings
  - Requires authentication with appropriate permissions
  - Returns: SMTP configuration and notification settings

- **PUT /api/v1/settings/email** - Update email configuration settings
  - Requires authentication with admin permissions
  - Updateable fields: `smtpServer`, `smtpPort`, `smtpUsername`, `smtpPassword`, `emailFromName`, `emailReplyTo`, `enableEmailNotifications`

- **POST /api/v1/settings/email/test** - Test email configuration
  - Requires authentication with admin permissions
  - Sends a test email to the authenticated user

### AI Integration Endpoints

- **POST /api/v1/ai/analyze-sentiment** - Analyze text sentiment
  - Requires authentication
  - Required fields: `text`
  - Returns: Sentiment score and analysis

- **POST /api/v1/ai/generate-summary** - Generate AI summary for text
  - Requires authentication
  - Required fields: `text`
  - Returns: Concise summary of provided text

- **POST /api/v1/ai/suggest-category** - Suggest ticket category based on text
  - Requires authentication
  - Required fields: `text`
  - Returns: Suggested categories and confidence scores

- **POST /api/v1/ai/suggest-priority** - Suggest ticket priority based on text
  - Requires authentication
  - Required fields: `text`
  - Returns: Suggested priority and confidence score

- **POST /api/v1/ai/suggest-response** - Generate suggested response
  - Requires authentication
  - Required fields: `ticketId` or `text`
  - Optional fields: `maxLength`
  - Returns: AI-generated response suggestion

For detailed API documentation including request/response formats and example usage, refer to the [API Documentation](https://example.com/api-docs) when running the application with the `ENABLE_DOCS=true` environment variable.

## Quick Installation Guide

Follow these steps to get the application up and running:

### Prerequisites
- Node.js (v20 or higher)
- PostgreSQL (v12 or higher)
- npm

### Installation Steps

#### Linux/Mac
1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/servicefix.git
   cd servicefix
   ```

2. **Set up the backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Set up the database**
   ```bash
   # Create the PostgreSQL database
   createdb -U postgres servicedesk
   
   # Run the schema script
   cd sql
   psql -U postgres -d servicedesk -f schema.sql
   
   # Seed the database with sample data
   node seed_database.js
   ```

4. **Set up the frontend**
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env
   # Edit .env with your backend API URL
   ```

#### Windows (PowerShell)
1. **Clone the repository**
   ```powershell
   git clone https://github.com/yourusername/servicefix.git
   cd servicefix
   ```

2. **Set up the backend**
   ```powershell
   cd backend
   npm install
   Copy-Item .env.example .env
   # Edit .env with your database credentials
   ```

3. **Set up the database**
   ```powershell
   # Create the PostgreSQL database (using psql)
   psql -U postgres -c "CREATE DATABASE servicedesk"
   
   # Run the schema script
   cd sql
   psql -U postgres -d servicedesk -f schema.sql
   
   # Seed the database with sample data
   node seed_database.js
   ```

4. **Set up the frontend**
   ```powershell
   cd ../frontend
   npm install
   Copy-Item .env.example .env
   # Edit .env with your backend API URL
   ```

5. **Start the application**
   ```bash
   # Start the backend (from the backend directory)
   npm run dev
   
   # Start the frontend (from the frontend directory)
   npm start
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Default login: admin@example.com / password123

### Environment Variables

#### Backend (.env)

```
# Server Configuration
PORT=5000
NODE_ENV=production
API_VERSION=v1
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
ENABLE_DOCS=true

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=servicedesk
DB_USER=postgres
DB_PASSWORD=root
DB_SSL=false
DB_ENTITIES=src/models/**/*.ts
DB_MIGRATIONS=src/migrations/**/*.ts
DB_SYNCHRONIZE=false  # Set to false in production

# JWT Authentication
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_REFRESH_EXPIRES_IN=7d
PASSWORD_SALT_ROUNDS=10

# Email Service
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=user@example.com
SMTP_PASS=your_smtp_password
EMAIL_FROM=ServiceFix <support@servicefix.com>

# File Storage
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880  # 5MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf,text/plain,application/msword

# AI Integration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo
AI_FEATURES_ENABLED=true
```

#### Frontend (.env)

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WEBSOCKET_URL=http://localhost:5000
REACT_APP_VERSION=0.1.0
REACT_APP_GOOGLE_ANALYTICS=G-XXXXXXXXXX
REACT_APP_DEFAULT_THEME=light
REACT_APP_ENABLE_MOCK_API=false
```

## Project Structure

```
├── frontend/                # React TypeScript frontend
│   ├── public/              # Static assets
│   ├── build/               # Production build output
│   ├── src/                 # Source code
│   │   ├── components/      # UI components
│   │   │   ├── common/      # Shared UI components
│   │   │   ├── dashboard/   # Dashboard-specific components
│   │   │   ├── layout/      # Layout components
│   │   │   ├── tickets/     # Ticket-related components
│   │   │   └── ...          # Other component categories
│   │   ├── context/         # Global state and providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Page components
│   │   │   ├── auth/        # Authentication pages
│   │   │   ├── dashboard/   # Dashboard pages
│   │   │   ├── tickets/     # Ticket management pages
│   │   │   ├── admin/       # Admin pages
│   │   │   └── ...          # Other page categories
│   │   ├── services/        # API client and services
│   │   ├── styles/          # Global styles
│   │   ├── theme/           # Styling and theme configuration
│   │   ├── utils/           # Utility functions
│   │   ├── App.tsx          # Main application component
│   │   └── index.tsx        # Entry point
│   ├── .env                 # Environment variables
│   └── tsconfig.json        # TypeScript configuration
├── backend/                 # Node.js Express backend
│   ├── src/                 # Source code
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Express middleware
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic and services
│   │   ├── utils/           # Utility functions
│   │   └── index.ts         # Application entry point
│   ├── sql/                 # SQL scripts and migrations
│   ├── dist/                # Compiled TypeScript output
│   ├── logs/                # Application logs
│   ├── uploads/             # Uploaded files storage
│   ├── setup_database.ps1   # PowerShell script for database setup
│   ├── check-db.js          # Database connection checker
│   ├── .env                 # Environment variables
│   └── tsconfig.json        # TypeScript configuration
```

## Database Schema

The database uses PostgreSQL with the following schema structure:

### Core Tables

1. **users**
   - id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY
   - email VARCHAR(255) NOT NULL UNIQUE
   - password VARCHAR(255) NOT NULL
   - first_name VARCHAR(100) NOT NULL
   - last_name VARCHAR(100) NOT NULL
   - organization_id BIGINT (FK -> organizations.id)
   - role VARCHAR(50) DEFAULT 'customer'
   - avatar_url TEXT
   - phone VARCHAR(50)
   - is_active BOOLEAN DEFAULT TRUE
   - created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   - updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

2. **organizations**
   - id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY
   - name VARCHAR(255) NOT NULL
   - domain VARCHAR(255) NOT NULL
   - logo_url VARCHAR(255)
   - created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   - updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

3. **departments**
   - id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY
   - name VARCHAR(255) NOT NULL
   - description TEXT
   - organization_id BIGINT (FK -> organizations.id)
   - created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   - updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

4. **tickets**
   - id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY
   - subject VARCHAR(255) NOT NULL
   - description TEXT NOT NULL
   - requester_id BIGINT (FK -> users.id)
   - assignee_id BIGINT (FK -> users.id)
   - department_id BIGINT (FK -> departments.id)
   - priority_id BIGINT (FK -> ticket_priorities.id)
   - status_id BIGINT (FK -> ticket_statuses.id)
   - type_id BIGINT (FK -> ticket_types.id)
   - organization_id BIGINT (FK -> organizations.id)
   - source VARCHAR(50) DEFAULT 'web'
   - due_date TIMESTAMP WITH TIME ZONE
   - sentiment_score DECIMAL(3,2)
   - ai_summary TEXT
   - sla_status VARCHAR(50)
   - first_response_sla_breached BOOLEAN DEFAULT FALSE
   - resolution_sla_breached BOOLEAN DEFAULT FALSE
   - created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   - updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   - resolved_at TIMESTAMP WITH TIME ZONE
   - closed_at TIMESTAMP WITH TIME ZONE

5. **ticket_comments**
   - id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY
   - ticket_id BIGINT (FK -> tickets.id)
   - user_id BIGINT (FK -> users.id)
   - content TEXT NOT NULL
   - is_internal BOOLEAN DEFAULT FALSE
   - is_system BOOLEAN DEFAULT FALSE
   - sentiment_score DECIMAL(3,2)
   - parent_comment_id BIGINT (FK -> ticket_comments.id)
   - created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   - updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

### Reference Tables

6. **ticket_statuses**
   - id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY
   - organization_id BIGINT (FK -> organizations.id)
   - name VARCHAR(255) NOT NULL
   - color VARCHAR(7) NOT NULL
   - is_default BOOLEAN DEFAULT FALSE
   - is_resolved BOOLEAN DEFAULT FALSE
   - created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   - updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

7. **ticket_priorities**
   - id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY
   - name VARCHAR(255) NOT NULL
   - color VARCHAR(7) NOT NULL
   - sla_hours INTEGER NOT NULL
   - organization_id BIGINT (FK -> organizations.id)
   - created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   - updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

8. **ticket_types**
   - id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY
   - name VARCHAR(255) NOT NULL
   - description TEXT
   - organization_id BIGINT (FK -> organizations.id)
   - created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   - updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

### SLA Tables

9. **sla_policies**
   - id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY
   - name VARCHAR(255) NOT NULL
   - description TEXT
   - organization_id BIGINT (FK -> organizations.id)
   - ticket_priority_id BIGINT (FK -> ticket_priorities.id)
   - first_response_hours INT
   - next_response_hours INT
   - resolution_hours INT
   - business_hours_only BOOLEAN DEFAULT TRUE
   - created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   - updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

10. **sla_policy_tickets**
    - id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY
    - ticket_id BIGINT (FK -> tickets.id)
    - sla_policy_id BIGINT (FK -> sla_policies.id)
    - first_response_due_at TIMESTAMP WITH TIME ZONE
    - next_response_due_at TIMESTAMP WITH TIME ZONE
    - resolution_due_at TIMESTAMP WITH TIME ZONE
    - first_response_met BOOLEAN
    - next_response_met BOOLEAN
    - resolution_met BOOLEAN
    - metadata JSONB
    - created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    - updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

11. **business_hours**
    - id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY
    - name VARCHAR(255) NOT NULL
    - description TEXT
    - organization_id BIGINT (FK -> organizations.id)
    - mondayStart VARCHAR(5)
    - mondayEnd VARCHAR(5)
    - tuesdayStart VARCHAR(5)
    - tuesdayEnd VARCHAR(5)
    - wednesdayStart VARCHAR(5)
    - wednesdayEnd VARCHAR(5)
    - thursdayStart VARCHAR(5)
    - thursdayEnd VARCHAR(5)
    - fridayStart VARCHAR(5)
    - fridayEnd VARCHAR(5)
    - saturdayStart VARCHAR(5)
    - saturdayEnd VARCHAR(5)
    - sundayStart VARCHAR(5)
    - sundayEnd VARCHAR(5)
    - isDefault BOOLEAN DEFAULT FALSE
    - timezone VARCHAR(50) DEFAULT 'UTC'
    - created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    - updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

12. **holidays**
    - id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY
    - name VARCHAR(255) NOT NULL
    - date DATE NOT NULL
    - recurring BOOLEAN DEFAULT FALSE
    - business_hours_id BIGINT (FK -> business_hours.id)
    - created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    - updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

### Knowledge Base Tables

13. **kb_categories**
    - id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY
    - name VARCHAR(255) NOT NULL
    - description TEXT
    - slug VARCHAR(255) NOT NULL
    - parent_id BIGINT (FK -> kb_categories.id)
    - icon VARCHAR(50)
    - organization_id BIGINT (FK -> organizations.id)
    - is_private BOOLEAN DEFAULT FALSE
    - created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    - updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

14. **kb_articles**
    - id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY
    - title VARCHAR(255) NOT NULL
    - slug VARCHAR(255) NOT NULL
    - content TEXT NOT NULL
    - category_id BIGINT (FK -> kb_categories.id)
    - author_id BIGINT (FK -> users.id)
    - status VARCHAR(20) DEFAULT 'draft'
    - view_count INTEGER DEFAULT 0
    - helpful_count INTEGER DEFAULT 0
    - not_helpful_count INTEGER DEFAULT 0
    - organization_id BIGINT (FK -> organizations.id)
    - created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    - updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

15. **kb_article_tags**
    - id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY
    - article_id BIGINT (FK -> kb_articles.id)
    - tag_id BIGINT (FK -> tags.id)
    - created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

### Additional Tables

16. **notifications**
    - id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY
    - user_id BIGINT (FK -> users.id)
    - title VARCHAR(255) NOT NULL
    - message TEXT NOT NULL
    - type VARCHAR(50) DEFAULT 'general'
    - link VARCHAR(255)
    - is_read BOOLEAN DEFAULT FALSE
    - metadata JSONB
    - created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

17. **notification_preferences**
    - id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY
    - user_id BIGINT (FK -> users.id)
    - email_enabled BOOLEAN DEFAULT TRUE
    - push_enabled BOOLEAN DEFAULT TRUE
    - in_app_enabled BOOLEAN DEFAULT TRUE
    - ticket_updates BOOLEAN DEFAULT TRUE
    - ticket_comments BOOLEAN DEFAULT TRUE
    - ticket_assignments BOOLEAN DEFAULT TRUE
    - system_updates BOOLEAN DEFAULT TRUE
    - created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    - updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

18. **settings**
    - id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY
    - category VARCHAR(50) NOT NULL
    - settings_data JSONB NOT NULL
    - created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    - updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

### Database Setup Process

The ServiceFix application uses a structured approach to database management:

1. **Schema Definition**: Database structure is defined in `schema.sql` rather than using migrations
2. **Initialization**: Database setup is handled by `initialize_database.js` in the backend/sql directory
3. **Entity Mapping**: Database entities are mapped to TypeORM in `src/config/database.ts`
4. **Schema Validation**: Comprehensive validation is performed at runtime via `src/utils/schemaValidator.ts`

### Schema Validation

During application startup, a validation process:
- Verifies all required tables exist
- Checks for critical functions, triggers, and indexes
- Ensures settings table and default email configuration exist
- Logs warnings if schema appears incomplete

### Initializing or Resetting the Database

To initialize or reset the database, run:

```bash
cd backend
node sql/initialize_database.js
```

This will:
1. Drop the existing database if it exists
2. Create a fresh database
3. Apply the schema
4. Initialize minimal required data

### Making Schema Changes

When making schema changes:

1. Update the appropriate entities in `src/models/`
2. Update the `schema.sql` file with corresponding changes
3. Consider updating the required schema elements in `src/utils/schemaValidator.ts`
4. Test with a fresh database by running the initialization script

### Database Connection Configuration

Database connection parameters are configured through environment variables:

- `DATABASE_URL` - Full connection string (if provided, other parameters are ignored)
- `DB_HOST` - Database host (default: 'localhost')
- `DB_PORT` - Database port (default: '5432')
- `DB_USERNAME` - Database username (default: 'postgres')
- `DB_PASSWORD` - Database password (default: 'postgres')
- `DB_DATABASE` - Database name (default: 'servicedesk')
- `DB_LOGGING` - Enable SQL query logging (default: 'false')
- `DB_SSL` - Enable SSL for database connection (default: 'false')

## Key Components

### Frontend Components

#### Pages
- **DashboardPage**: Shows key metrics, recent tickets, and activity
- **TicketListPage**: Displays all tickets with filtering and sorting
- **TicketDetailPage**: Shows detailed ticket information and timeline
- **CreateTicketPage**: Form for creating new support tickets
- **KnowledgeBasePage**: Displays knowledge base articles and categories
- **ReportsPage**: Comprehensive reports and analytics dashboard
- **UsersPage**: Admin interface for user management
- **SettingsPage**: System configuration and preferences

#### Reusable Components
- **StatsWidget**: Displays key statistics with visual indicators
- **TicketChart**: Visualizes ticket data with various chart types
- **EnhancedCard**: Animated card component with consistent styling
- **StatusBadge**: Visual indicator for ticket status
- **PriorityBadge**: Visual indicator for ticket priority
- **UserAvatar**: Displays user avatar with online status indicator
- **FormBuilder**: Dynamic form generation based on configuration
- **MarkdownEditor**: Rich text editor with markdown support
- **DataTable**: Advanced table with sorting, filtering, and pagination
- **FileUploader**: Drag-and-drop file upload component

### Backend Components

#### Controllers
- **AuthController**: Handles user authentication and registration
- **TicketController**: Manages ticket CRUD operations
- **UserController**: Handles user management
- **KnowledgeBaseController**: Manages knowledge base articles and categories
- **ReportController**: Generates reports and analytics data
- **OrganizationController**: Manages organization settings
- **SettingsController**: Handles system-wide configuration
- **SLAController**: Manages SLA policies and compliance
- **BusinessHoursController**: Configures business hours and holidays

#### Services
- **AuthService**: Business logic for authentication
- **TicketService**: Business logic for ticket operations
- **UserService**: Business logic for user operations
- **EmailService**: Sends notifications and alerts
- **AIService**: Interfaces with OpenAI for automated features
- **WorkflowService**: Handles automation rules and SLAs
- **SearchService**: Provides full-text search functionality
- **AuditService**: Tracks system changes for compliance
- **CacheService**: Manages data caching for performance
- **DatabaseService**: Manages PostgreSQL database interactions with TypeORM
- **NotificationService**: Handles delivering notifications via multiple channels

## SLA System

The ServiceFix application includes an advanced Service Level Agreement (SLA) system with the following capabilities:

### SLA Pause/Resume

The SLA system automatically manages SLA timing based on ticket status:
- **Pause Mechanism**: When a ticket status changes to a "pending customer" or similar waiting state, the SLA timer automatically pauses
- **Resume Mechanism**: When the ticket returns to an active status, the SLA timer automatically resumes
- **Pause Tracking**: The system stores pause periods in the `metadata` JSONB column of the `sla_policy_tickets` table
- **Pause Period Format**: `{pausePeriods: [{startedAt: Date, endedAt: Date}, ...], totalPausedTime: number}`

### Business Hours Calculation

The system includes robust business hours handling:
- **Day-specific Hours**: Configurable business hours for each day of the week (mondayStart/mondayEnd, etc.)
- **Holiday Management**: Support for fixed and recurring holidays that are excluded from SLA calculations
- **Organization-specific Settings**: Each organization can define its own business hours schedule
- **Timezone Support**: Business hours calculations respect organization-defined timezones
- **24/7 Option**: When `business_hours_only` is set to false, calculations use regular calendar hours

### SLA Calculation Process

For tickets with SLA tracking:
1. SLA policy is assigned based on ticket priority (automatic or manual)
2. First response, next response, and resolution deadlines are calculated
3. SLA deadlines are adjusted based on business hours and any pause periods
4. SLA breach status is continuously monitored and updated
5. Breached SLAs trigger notifications and potential escalation actions

### Escalation Levels

The system supports multi-level escalation based on SLA breach status:
- **Level 1 (75% of SLA time)**: Agent notification
- **Level 2 (90% of SLA time)**: Agent and manager notification
- **Level 3 (100% of SLA time - breach)**: Agent and manager notification with reassignment option
- **Level 4 (120% of SLA time)**: Full escalation including priority increase

## Notification System

### Notification Types

The notification system supports four types of notifications:

1. **Success** - Green notifications for successful operations
2. **Error** - Red notifications for errors and failures
3. **Warning** - Orange/amber notifications for cautionary information
4. **Info** - Blue notifications for general information

### Email Notification System

The system includes a robust email notification service with:

- **Dynamic Configuration**: Email settings loaded from database with fallback to environment variables
- **Configuration Reloading**: Email transporter automatically refreshes to use latest settings
- **Error Handling**: Comprehensive error handling with graceful fallbacks for SMTP connection issues
- **Template Support**: Predefined email templates for common notifications like ticket creation and updates
- **Rich HTML Content**: Support for both plain text and HTML email formats
- **Configurable From Address**: Customizable sender name and email address
- **Disabling Option**: System-wide ability to enable/disable email notifications

### In-App Notification System

All notifications are tracked in the database with:

- **User-specific Storage**: Each notification is associated with a specific user
- **Metadata Support**: JSONB field for storing additional notification context
- **Read/Unread Status**: Tracking of notification read status
- **Notification Links**: Support for clickable links in notifications
- **Categorization**: Notifications categorized by type (ticket, comment, system, etc.)
- **Real-time Delivery**: Notifications delivered in real-time via WebSockets
- **Bulk Operations**: Support for marking all notifications as read or deleting all notifications

### Notification Preferences

Users can customize their notification experience with:

- **Channel-specific Preferences**: Separate toggles for email, push, and in-app notifications
- **Event-specific Preferences**: Control notifications for ticket updates, comments, assignments, etc.
- **Default Values**: Sensible defaults with all notifications enabled
- **Immediate Application**: Preference changes apply immediately to all notification channels
- **Per-Organization Settings**: Organization-level notification settings for system administrators

### Usage Guidelines

#### Toast Notifications (Transient)

For temporary notifications that appear briefly and disappear automatically:

```tsx
import { showSuccess, showError, showWarning, showInfo } from '../utils/notificationUtils';

// Examples
showSuccess('Operation completed successfully');
showError('An error occurred while saving the form');
showWarning('You are about to delete this item', { duration: 8000 });
showInfo('New updates are available', { title: 'Updates' });
```

#### Inline Alerts

For persistent alerts that remain in the UI:

```tsx
import { SystemAlert } from '../context/NotificationContext';

// Example
<SystemAlert 
  message="This action cannot be undone" 
  type="warning"
  title="Caution"
  onClose={() => setShowWarning(false)}
/>
```

### Best Practices

1. Keep notification messages concise and clear
2. Use the appropriate notification type for the situation
3. For critical errors, use persistent notifications (SystemAlert) rather than toasts
4. Group related notifications to prevent overwhelming the user
5. Provide actionable information when possible

## Performance Optimizations

### Frontend Optimizations
- **Code Splitting**: Lazy loading of routes and components
- **Bundle Size Optimization**: Tree-shaking and dead code elimination
- **Image Optimization**: Responsive images and WebP format
- **Caching Strategies**: Service worker, browser caching, React Query for API caching
- **Virtualization**: Virtual scrolling for large data lists

### Backend Optimizations
- **Database Indexing**: Optimized indexes for common queries
- **Query Optimization**: Efficient query patterns and eager loading
- **Connection Pooling**: Database connection reuse
- **Response Compression**: gzip/brotli compression
- **Caching Layer**: Redis for frequent data access

### Performance Metrics
- **First Contentful Paint**: < 1.2s
- **Time to Interactive**: < 2.5s
- **API Response Time**: < 200ms for 95% of requests
- **Lighthouse Score**: 90+ for Performance, Accessibility, Best Practices, SEO

## User Roles & Permissions

- **Administrator**: Full system access, user management, configuration, reporting
- **Agent**: Ticket management, knowledge base editing, customer communication
- **Team Lead**: Team monitoring, ticket assignment, SLA management, department reporting
- **Customer**: Ticket creation/tracking, knowledge base access, profile management

## Troubleshooting

### Common Issues and Solutions

#### Backend Connection Issues
- **Problem**: Frontend can't connect to backend API
- **Solution**: Check that backend is running and CORS is properly configured
- **Check**: Run `curl http://localhost:5000/health` to verify backend is running

#### Database Connection Failures
- **Problem**: Backend can't connect to PostgreSQL
- **Solution**: Verify database credentials and connectivity
- **Check**: Run `node check-db.js` to diagnose database connection issues

#### Authentication Problems
- **Problem**: "Invalid token" or "Unauthorized" errors
- **Solution**: Check JWT configuration and token expiration
- **Check**: Verify JWT_SECRET matches between .env and actual usage

#### Performance Issues
- **Problem**: Slow loading times or unresponsive UI
- **Solution**: Check for unoptimized queries or component re-renders
- **Check**: Use React DevTools and Chrome Performance tab to identify bottlenecks

## Implementation Status

The ServiceFix application is under active development with most core features implemented. However, some features are still in progress or planned for future releases:

### Complete Features

- ✅ User authentication and registration
- ✅ Ticket management (creation, assignment, updating)
- ✅ SLA monitoring and management
- ✅ Business hours configuration
- ✅ Email notification system (with SMTP integration and template support)
- ✅ Real-time updates via WebSockets (connected to notification system)
- ✅ User profile management
- ✅ Database schema and entity models
- ✅ Multi-channel notification delivery (email, in-app, real-time)

### In-Progress Features

- 🚧 Knowledge Base: The core structure is in place, but the article detail view is currently a placeholder (see `ArticleDetailPage` component in App.tsx)
- 🚧 Workflow Automation: Basic workflow functionality is implemented with a complete UI and mock data, but integration with backend actions is still in progress
- 🚧 Testing: No unit or integration tests have been implemented yet, despite Jest configuration being in place

### Implementation Notes

- 📌 **Mock Data**: Several components (especially in the Workflow Automation, Analytics, and Reports pages) currently use mock data instead of live API connections
- 📌 **TypeScript Version**: The project uses TypeScript 5.5.2 for the backend and TypeScript 4.9.5 for the frontend
- 📌 **Component Refactoring**: Large components like HeroSection (784 lines) and TestimonialsSection (547 lines) are scheduled for refactoring as mentioned in VERSION_HISTORY.md

### Planned Features

- 📅 Test Suite: Comprehensive test suite using Jest and React Testing Library
- 📅 Advanced AI Features: Enhanced AI-powered automation beyond the current implementation
- 📅 Mobile Applications: Native mobile apps for iOS and Android
- 📅 Storybook Component Library: Visual documentation of all UI components

### Known Placeholder Components

The following components in the codebase are currently placeholders or use mock data:

- `ArticleDetailPage`: Knowledge base article detail view (placeholder with minimal UI)
- `PlaceholderComponent`: Generic placeholder used in several locations for upcoming features
- `WorkflowAutomationPage`: Uses a complete UI with mock data but lacks backend integration
- `AnalyticsDashboardPage`: Uses mock data for charts and metrics
- `ReportsPage`: Uses mock data for reporting functionality

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Version History

ServiceFix maintains detailed version history to enable rollback to previous versions if needed.

### Git-Based Version Control

All code is tracked in Git, allowing for easy restoration to any previous commit:

```bash
# View commit history with details
git log --pretty=format:"%h %ad | %s%d [%an]" --graph --date=short

# Restore a specific file to a previous version
git checkout [commit-hash] -- path/to/file

# Restore the entire codebase to a previous state
git checkout [commit-hash]
```

### Component Version History

Key frontend components and their latest significant changes:

| Component | Latest Version | Last Updated | File Path |
|-----------|---------------|-------------|-----------|
| LandingPage | 2.5.0 | May 22, 2024 | frontend/src/pages/LandingPage.tsx |
| HeroSection | 3.2.0 | May 22, 2024 | frontend/src/components/landing/HeroSection.tsx |
| FeaturesSection | 2.9.0 | May 22, 2024 | frontend/src/components/landing/FeaturesSection.tsx |
| TestimonialsSection | 2.6.0 | May 22, 2024 | frontend/src/components/landing/TestimonialsSection.tsx |
| PricingSection | 2.5.0 | May 22, 2024 | frontend/src/components/landing/PricingSection.tsx |
| ContactSection | 2.3.0 | May 22, 2024 | frontend/src/components/landing/ContactSection.tsx |
| FooterSection | 2.0.0 | May 22, 2024 | frontend/src/components/landing/FooterSection.tsx |
| ChatbotWidget | 2.7.0 | May 22, 2024 | frontend/src/components/ChatbotWidget.tsx |
| ReportsPage | 3.1.0 | May 22, 2024 | frontend/src/pages/ReportsPage.tsx |
| KnowledgeBasePage | 2.8.0 | May 22, 2024 | frontend/src/pages/KnowledgeBasePage.tsx |
| AnalyticsDashboardPage | 3.0.0 | May 22, 2024 | frontend/src/pages/AnalyticsDashboardPage.tsx |
| CookiesPage | 1.0.0 | May 22, 2024 | frontend/src/pages/CookiesPage.tsx |
| ProfilePage | 2.2.0 | May 26, 2024 | frontend/src/pages/ProfilePage.tsx |
| TicketContext | 3.3.0 | May 22, 2024 | frontend/src/context/TicketContext.tsx |
| AuthContext | 2.7.0 | May 26, 2024 | frontend/src/context/AuthContext.tsx |
| NotificationContext | 2.4.0 | June 27, 2024 | frontend/src/context/NotificationContext.tsx |
| NotificationPreferencesContext | 1.3.0 | May 27, 2024 | frontend/src/context/NotificationPreferencesContext.tsx |
| ThemeContext | 1.5.0 | May 22, 2024 | frontend/src/context/ThemeContext.tsx |
| CookieConsentContext | 1.2.0 | May 22, 2024 | frontend/src/context/CookieConsentContext.tsx |

For a complete and detailed version history of all components, including changelogs and optimization plans, please refer to the [VERSION_HISTORY.md](./VERSION_HISTORY.md) file in the project root. This file contains:

- Detailed changelogs for all major components
- Component size metrics
- Optimization plans and strategies
- Recent fixes and updates
- Known stable versions for rollback purposes

The VERSION_HISTORY.md file is regularly updated with each release and serves as the definitive record of changes to the application.

### How to Restore Previous Versions

#### Using Git

```bash
# For example, to restore HeroSection.tsx to its state on March 10, 2024:
git log --before="2024-03-10" --after="2024-03-09" -- frontend/src/components/landing/HeroSection.tsx
# Find the commit hash from the output
git checkout [commit-hash] -- frontend/src/components/landing/HeroSection.tsx
```

#### Using Storybook (for UI Components)

The Storybook instance contains versioned UI components that can be visually inspected:

```bash
# Start Storybook to view component versions
cd frontend
npm run storybook
```

## Code Optimization Status

Recent code optimizations completed:
- **NotificationContext Refactoring**: Successfully reduced from 1256 lines to 400 lines by splitting into modular components
- **Landing Page Components**: Identified large components (HeroSection: 784 lines, TestimonialsSection: 547 lines) that require refactoring for maintainability
- **Bundle Size Optimization**: Implemented code splitting and lazy loading for main routes
- **Performance Monitoring**: Added Lighthouse performance tracking with baseline metrics

Ongoing optimization efforts:
- Component structure refactoring to reduce size and improve maintainability
- Centralized styling system implementation to reduce duplication
- Icon import optimization to reduce bundle size 

## Recent Development Updates

### Component Refactoring Progress (May-June 2024)
- **NotificationContext**: Successfully reduced from 1256 lines to 400 lines by implementing modular architecture
- **HeroSection**: Refactoring in progress, targeting reduction from 784 lines to less than 300 lines
- **ProfilePage**: Scheduled for refactoring by June 7, 2024
- **TestimonialsSection** and **FeaturesSection**: Scheduled for refactoring by June 21, 2024

### Recent Infrastructure Updates
- **TypeScript Updates**: Backend now uses TypeScript 5.5.2 with performance improvements
- **Socket.io**: Updated to v4.8.1 for both client and server with enhanced authentication
- **UI Libraries**: Added Chakra UI 3.17.0 alongside Material UI for enhanced components
- **Data Fetching**: Integrated React Query for improved data fetching and state management
- **Email System**: Enhanced email handling with better error recovery and configuration

### Critical Fixes (May 2024)
- Fixed issues with double notifications in the notification system
- Improved handling of notification preferences across different formats
- Enhanced SMTP error handling with automatic retry mechanisms
- Fixed various UI issues with notification components in mobile view
- Resolved issues with settings data handling and validation

### Latest Component Versions
| Component | Current Version | Last Updated |
|-----------|----------------|-------------|
| NotificationContext | 2.4.0 | June 27, 2024 |
| AuthContext | 2.7.0 | May 26, 2024 |
| ProfilePage | 2.2.0 | May 26, 2024 |
| LandingPage | 2.5.0 | May 22, 2024 |
| HeroSection | 3.2.0 | May 22, 2024 |
| TicketContext | 3.3.0 | May 22, 2024 |

## Version History

ServiceFix maintains detailed version history to enable rollback to previous versions if needed.

### Git-Based Version Control

All code is tracked in Git, allowing for easy restoration to any previous commit:

```bash
# View commit history with details
git log --pretty=format:"%h %ad | %s%d [%an]" --graph --date=short

# Restore a specific file to a previous version
git checkout [commit-hash] -- path/to/file

# Restore the entire codebase to a previous state
git checkout [commit-hash]
```

### Component Version History

Key frontend components and their latest significant changes:

| Component | Latest Version | Last Updated | File Path |
|-----------|---------------|-------------|-----------|
| LandingPage | 2.5.0 | May 22, 2024 | frontend/src/pages/LandingPage.tsx |
| HeroSection | 3.2.0 | May 22, 2024 | frontend/src/components/landing/HeroSection.tsx |
| FeaturesSection | 2.9.0 | May 22, 2024 | frontend/src/components/landing/FeaturesSection.tsx |
| TestimonialsSection | 2.6.0 | May 22, 2024 | frontend/src/components/landing/TestimonialsSection.tsx |
| PricingSection | 2.5.0 | May 22, 2024 | frontend/src/components/landing/PricingSection.tsx |
| ContactSection | 2.3.0 | May 22, 2024 | frontend/src/components/landing/ContactSection.tsx |
| FooterSection | 2.0.0 | May 22, 2024 | frontend/src/components/landing/FooterSection.tsx |
| ChatbotWidget | 2.7.0 | May 22, 2024 | frontend/src/components/ChatbotWidget.tsx |
| ReportsPage | 3.1.0 | May 22, 2024 | frontend/src/pages/ReportsPage.tsx |
| KnowledgeBasePage | 2.8.0 | May 22, 2024 | frontend/src/pages/KnowledgeBasePage.tsx |
| AnalyticsDashboardPage | 3.0.0 | May 22, 2024 | frontend/src/pages/AnalyticsDashboardPage.tsx |
| CookiesPage | 1.0.0 | May 22, 2024 | frontend/src/pages/CookiesPage.tsx |
| ProfilePage | 2.2.0 | May 26, 2024 | frontend/src/pages/ProfilePage.tsx |
| TicketContext | 3.3.0 | May 22, 2024 | frontend/src/context/TicketContext.tsx |
| AuthContext | 2.7.0 | May 26, 2024 | frontend/src/context/AuthContext.tsx |
| NotificationContext | 2.4.0 | June 27, 2024 | frontend/src/context/NotificationContext.tsx |
| NotificationPreferencesContext | 1.3.0 | May 27, 2024 | frontend/src/context/NotificationPreferencesContext.tsx |
| ThemeContext | 1.5.0 | May 22, 2024 | frontend/src/context/ThemeContext.tsx |
| CookieConsentContext | 1.2.0 | May 22, 2024 | frontend/src/context/CookieConsentContext.tsx |

For a complete and detailed version history of all components, including changelogs and optimization plans, please refer to the [VERSION_HISTORY.md](./VERSION_HISTORY.md) file in the project root. This file contains:

- Detailed changelogs for all major components
- Component size metrics
- Optimization plans and strategies
- Recent fixes and updates
- Known stable versions for rollback purposes

The VERSION_HISTORY.md file is regularly updated with each release and serves as the definitive record of changes to the application.

### How to Restore Previous Versions

#### Using Git

```bash
# For example, to restore HeroSection.tsx to its state on March 10, 2024:
git log --before="2024-03-10" --after="2024-03-09" -- frontend/src/components/landing/HeroSection.tsx
# Find the commit hash from the output
git checkout [commit-hash] -- frontend/src/components/landing/HeroSection.tsx
```

#### Using Storybook (for UI Components)

The Storybook instance contains versioned UI components that can be visually inspected:

```bash
# Start Storybook to view component versions
cd frontend
npm run storybook
```

## Code Optimization Status

Recent code optimizations completed:
- **NotificationContext Refactoring**: Successfully reduced from 1256 lines to 400 lines by splitting into modular components
- **Landing Page Components**: Identified large components (HeroSection: 784 lines, TestimonialsSection: 547 lines) that require refactoring for maintainability
- **Bundle Size Optimization**: Implemented code splitting and lazy loading for main routes
- **Performance Monitoring**: Added Lighthouse performance tracking with baseline metrics

Ongoing optimization efforts:
- Component structure refactoring to reduce size and improve maintainability
- Centralized styling system implementation to reduce duplication
- Icon import optimization to reduce bundle size 