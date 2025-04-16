# ServiceFix - Service Desk & Support Ticket System

A comprehensive service desk and ticket management system built with React, Node.js, and MongoDB.

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

## Technical Architecture

### Overview

ServiceFix uses a modern architecture with a clear separation between frontend and backend:

- **Frontend**: Single-page application (SPA) built with React and TypeScript
- **Backend**: RESTful API service built with Node.js, Express, and TypeScript
- **Database**: MongoDB for data storage with Mongoose as the ODM
- **Authentication**: JWT-based authentication with refresh token rotation
- **Real-time**: WebSocket integration for live updates using Socket.io
- **File Storage**: Local file system for development, AWS S3 for production
- **Caching**: Redis for API response caching and session management

### Architectural Patterns

- **Clean Architecture**: Separation of concerns with layers (controllers, services, repositories)
- **Repository Pattern**: Data access abstraction through repository interfaces
- **MVC Pattern**: Model-View-Controller pattern for API endpoints
- **State Management**: React Context API and React Query for frontend state
- **Middleware Pattern**: Express middleware for cross-cutting concerns

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
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

## Quick Installation Guide

Follow these steps to get the application up and running:

### Prerequisites
- Node.js (v14 or higher)
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
   - id (UUID, PK)
   - email (VARCHAR, UNIQUE)
   - password_hash (VARCHAR)
   - name (VARCHAR)
   - role (ENUM: 'admin', 'agent', 'team_lead', 'customer')
   - organization_id (FK -> organizations.id)
   - department_id (FK -> departments.id, NULL for customers)
   - is_active (BOOLEAN)
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)

2. **organizations**
   - id (UUID, PK)
   - name (VARCHAR)
   - domain (VARCHAR)
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)

3. **departments**
   - id (UUID, PK)
   - name (VARCHAR)
   - organization_id (FK -> organizations.id)
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)

4. **tickets**
   - id (UUID, PK)
   - subject (VARCHAR)
   - description (TEXT)
   - status_id (FK -> ticket_statuses.id)
   - priority_id (FK -> ticket_priorities.id)
   - type_id (FK -> ticket_types.id)
   - created_by (FK -> users.id)
   - assigned_to (FK -> users.id, NULL)
   - department_id (FK -> departments.id)
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)
   - due_at (TIMESTAMP, NULL)
   - resolved_at (TIMESTAMP, NULL)

5. **ticket_comments**
   - id (UUID, PK)
   - ticket_id (FK -> tickets.id)
   - user_id (FK -> users.id)
   - content (TEXT)
   - is_internal (BOOLEAN)
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)

### Reference Tables

6. **ticket_statuses**
   - id (UUID, PK)
   - name (VARCHAR, e.g., 'New', 'In Progress', 'Pending', 'Resolved', 'Closed')
   - description (TEXT)
   - color (VARCHAR)
   - is_default (BOOLEAN)
   - order (INTEGER)

7. **ticket_priorities**
   - id (UUID, PK)
   - name (VARCHAR, e.g., 'Low', 'Medium', 'High', 'Critical')
   - description (TEXT)
   - color (VARCHAR)
   - sla_hours (INTEGER)
   - is_default (BOOLEAN)
   - order (INTEGER)

8. **ticket_types**
   - id (UUID, PK)
   - name (VARCHAR, e.g., 'Question', 'Problem', 'Feature Request', 'Bug')
   - description (TEXT)
   - icon (VARCHAR)
   - is_default (BOOLEAN)
   - order (INTEGER)

### Knowledge Base Tables

9. **kb_categories**
   - id (UUID, PK)
   - name (VARCHAR)
   - description (TEXT)
   - parent_id (FK -> kb_categories.id, NULL for top-level)
   - order (INTEGER)
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)

10. **kb_articles**
    - id (UUID, PK)
    - title (VARCHAR)
    - content (TEXT)
    - category_id (FK -> kb_categories.id)
    - created_by (FK -> users.id)
    - updated_by (FK -> users.id)
    - is_published (BOOLEAN)
    - view_count (INTEGER)
    - helpful_count (INTEGER)
    - unhelpful_count (INTEGER)
    - created_at (TIMESTAMP)
    - updated_at (TIMESTAMP)

11. **kb_article_tags**
    - article_id (FK -> kb_articles.id)
    - tag (VARCHAR)
    - PRIMARY KEY (article_id, tag)

### Additional Tables

12. **attachments**
    - id (UUID, PK)
    - filename (VARCHAR)
    - original_filename (VARCHAR)
    - mime_type (VARCHAR)
    - size (INTEGER)
    - path (VARCHAR)
    - entity_type (VARCHAR, e.g., 'ticket', 'comment', 'article')
    - entity_id (UUID)
    - created_by (FK -> users.id)
    - created_at (TIMESTAMP)

13. **audit_logs**
    - id (UUID, PK)
    - user_id (FK -> users.id)
    - action (VARCHAR)
    - entity_type (VARCHAR)
    - entity_id (UUID)
    - old_values (JSONB)
    - new_values (JSONB)
    - ip_address (VARCHAR)
    - created_at (TIMESTAMP)

### Constraints and Indexes

- Foreign key constraints on all relational fields
- Unique constraints on email fields
- B-tree indexes on frequently queried fields
- Trigger functions for audit logging and updated_at timestamps

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

## Development Workflow

### Getting Started with Development

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/servicefix.git
   cd servicefix
   ```

2. **Install Dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Set Up Environment**
   - Copy `.env.example` to `.env` in both frontend and backend directories
   - Configure database connection and other settings
   - Create a PostgreSQL database named 'servicedesk'

4. **Run Database Migrations**
   ```bash
   cd backend
   npm run db:migrate
   ```

5. **Seed Data (Optional)**
   ```bash
   npm run db:seed
   ```

6. **Start Development Servers**
   ```bash
   # Terminal 1 - Start backend
   cd backend
   npm run dev

   # Terminal 2 - Start frontend
   cd frontend
   npm start
   ```

7. **Access Development Environment**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Documentation: http://localhost:5000/api-docs

### Code Style and Linting

The project enforces consistent code style using:

1. **ESLint**: JavaScript/TypeScript linting
   ```bash
   # Check linting issues
   npm run lint

   # Fix auto-fixable issues
   npm run lint:fix
   ```

2. **Prettier**: Code formatting
   ```bash
   # Format code
   npm run format
   ```

3. **TypeScript**: Static type checking
   ```bash
   # Type check
   npm run type-check
   ```

### Branch Strategy

- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/[feature-name]**: Feature development
- **bugfix/[bug-name]**: Bug fixes
- **hotfix/[hotfix-name]**: Emergency fixes for production

### Commit Message Format

We follow the Conventional Commits specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- feat: A new feature
- fix: A bug fix
- docs: Documentation changes
- style: Code style changes (formatting, etc.)
- refactor: Code changes that neither fix bugs nor add features
- perf: Performance improvements
- test: Adding or fixing tests
- chore: Changes to the build process or tools

Example:
```
feat(ticket): add file attachment support to tickets

Implements the ability to attach multiple files to tickets.
Files are stored in the uploads directory and referenced in the database.

Closes #123
```

## Testing Strategy

The project uses a comprehensive testing approach:

### Frontend Testing

- **Unit Tests**: Using Jest and React Testing Library for component testing
   ```bash
   cd frontend
  npm test
   ```

- **Component Tests**: Using Storybook for visual component testing
   ```bash
  cd frontend
  npm run storybook
  ```

- **End-to-End Tests**: Using Cypress for UI workflow testing
  ```bash
  cd frontend
  npm run cypress:open
  ```

### Backend Testing

- **Unit Tests**: Using Jest for service and utility testing
  ```bash
  cd backend
  npm test
  ```

- **Integration Tests**: Using Supertest for API endpoint testing
   ```bash
  cd backend
  npm run test:integration
  ```

- **Load Tests**: Using k6 for performance testing
  ```bash
  cd backend
  npm run test:load
  ```

### Test Coverage

Generate test coverage reports:

```bash
# Frontend coverage
cd frontend
npm run test:coverage

# Backend coverage
cd backend
npm run test:coverage
```

Coverage targets:
- Unit tests: 80% minimum coverage
- Integration tests: 70% minimum coverage
- Critical paths: 95% minimum coverage

## Available Scripts

### Frontend
- `npm start`: Runs the app in development mode
- `npm test`: Launches the test runner
- `npm run build`: Builds the app for production
- `npm run lint`: Runs ESLint to check for code issues
- `npm run format`: Formats code using Prettier
- `npm run storybook`: Starts Storybook for component development
- `npm run analyze`: Analyzes bundle size
- `npm run cypress:open`: Opens Cypress for E2E testing
- `npm run i18n:extract`: Extracts i18n strings for translation

### Backend
- `npm run dev`: Starts the development server with hot reload
- `npm test`: Runs the test suite
- `npm run build`: Compiles TypeScript to JavaScript
- `npm start`: Starts the production server
- `npm run lint`: Runs ESLint to check for code issues
- `npm run format`: Formats code using Prettier
- `npm run db:migrate`: Runs database migrations
- `npm run db:rollback`: Rolls back the last migration
- `npm run db:seed`: Seeds the database with sample data
- `npm run docs:generate`: Generates API documentation

## Deployment Guide

### Production Readiness Checklist

- [ ] Update all environment variables for production
- [ ] Set NODE_ENV=production
- [ ] Configure proper database connection pool size
- [ ] Set up proper CORS settings for production domains
- [ ] Configure rate limiting for API protection
- [ ] Set up SSL certificates
- [ ] Implement database backups
- [ ] Configure proper logging and monitoring
- [ ] Set up error tracking with Sentry or similar
- [ ] Configure proper caching headers for static assets

### Deployment Options

#### Docker Deployment

1. **Build Docker Images**
   ```bash
   # Build backend image
   cd backend
   docker build -t servicefix-backend .

   # Build frontend image
   cd ../frontend
   docker build -t servicefix-frontend .
   ```

2. **Run with Docker Compose**
   Create a `docker-compose.yml` file:
   ```yaml
   version: '3.8'
   services:
     frontend:
       image: servicefix-frontend
       ports:
         - "80:80"
       depends_on:
         - backend
       environment:
         - REACT_APP_API_URL=http://api.example.com/api

     backend:
       image: servicefix-backend
       ports:
         - "5000:5000"
       depends_on:
         - postgres
       environment:
         - NODE_ENV=production
         - DB_HOST=postgres
         - DB_USER=postgres
         - DB_PASSWORD=postgres
         - DB_NAME=servicedesk
         - JWT_SECRET=your_secure_jwt_secret
         # Add other environment variables

     postgres:
       image: postgres:13
       ports:
         - "5432:5432"
       environment:
         - POSTGRES_USER=postgres
         - POSTGRES_PASSWORD=postgres
         - POSTGRES_DB=servicedesk
       volumes:
         - postgres_data:/var/lib/postgresql/data

   volumes:
     postgres_data:
   ```

3. **Start the Services**
   ```bash
   docker-compose up -d
   ```

#### Traditional Deployment

1. **Prepare the Backend**
   ```bash
   cd backend
   npm ci --production
   npm run build
   ```

2. **Prepare the Frontend**
   ```bash
   cd frontend
   npm ci --production
   npm run build
   ```

3. **Deploy Backend**
   - Copy the `dist` folder, `package.json`, and `package-lock.json` to the server
   - Install production dependencies on the server
   - Set up environment variables
   - Use a process manager like PM2 to run the application

4. **Deploy Frontend**
   - Copy the `build` folder to a web server
   - Configure the web server (Nginx, Apache) to serve the static files
   - Set up caching headers, compression, and SSL

#### Nginx Configuration Example

```nginx
# Frontend configuration
server {
    listen 80;
    server_name app.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.example.com;

    ssl_certificate /etc/letsencrypt/live/app.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;

    root /var/www/servicefix/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}

# Backend configuration
server {
    listen 80;
    server_name api.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## User Interface

### Dashboard
The dashboard provides an overview of the system with:
- Key metrics and statistics
- Recent ticket activity
- Performance indicators
- Quick access to common actions

### Ticket Management
The ticket management interface allows:
- Creating new tickets with AI assistance
- Filtering and sorting tickets
- Viewing ticket details and history
- Adding comments and attachments
- Changing status and priority

### Knowledge Base
The knowledge base provides:
- Searchable articles organized by category
- Rich text editing for article creation
- Related article suggestions
- User feedback collection

### Reports & Analytics
The reports page offers:
- Customizable date ranges for data analysis
- Visual charts and graphs for ticket metrics
- Agent performance statistics
- Ticket distribution analysis
- Exportable reports in various formats

## Third-Party Integrations

ServiceFix integrates with various third-party services to enhance functionality:

### Email Services
- **Nodemailer**: Email sending infrastructure
- **SendGrid/Mailgun**: Production email delivery (optional)
- **Email Templates**: Customizable HTML email templates

### File Storage
- **Local Storage**: Default for development
- **AWS S3**: Cloud storage for production
- **Azure Blob Storage**: Alternative cloud storage option

### Authentication Providers
- **JWT**: Default authentication mechanism
- **OAuth2**: Integration with Google, Microsoft, and GitHub (optional)
- **SAML**: Enterprise SSO integration (optional)

### AI Services
- **OpenAI API**: Powers ticket classification and response suggestions
- **HuggingFace**: Alternative AI provider for natural language processing
- **TensorFlow.js**: Client-side AI for immediate user feedback

### Analytics
- **Google Analytics**: User behavior tracking
- **Mixpanel**: User journey analytics
- **Sentry**: Error tracking and performance monitoring

### Payment Processors (Optional)
- **Stripe**: Subscription and payment processing
- **PayPal**: Alternative payment option

## API Endpoints

### Authentication
- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Log in with email and password
- `POST /api/auth/refresh-token`: Refresh the authentication token
- `POST /api/auth/forgot-password`: Request password reset
- `POST /api/auth/reset-password`: Reset password with token

### Users
- `GET /api/users`: List users with pagination and filtering
- `GET /api/users/:id`: Get a single user
- `PUT /api/users/:id`: Update a user
- `DELETE /api/users/:id`: Delete a user

### Tickets
- `GET /api/tickets`: List tickets with filtering and pagination
- `GET /api/tickets/:id`: Get a single ticket with comments and history
- `POST /api/tickets`: Create a new ticket
- `PUT /api/tickets/:id`: Update a ticket
- `POST /api/tickets/:id/comments`: Add a comment to a ticket
- `DELETE /api/tickets/:id`: Delete a ticket

### Knowledge Base
- `GET /api/knowledge`: List knowledge base categories and articles
- `GET /api/knowledge/categories`: Get all categories
- `GET /api/knowledge/categories/:id`: Get a category with articles
- `POST /api/knowledge/categories`: Create a new category
- `PUT /api/knowledge/categories/:id`: Update a category
- `DELETE /api/knowledge/categories/:id`: Delete a category
- `GET /api/knowledge/articles/:id`: Get a single article
- `POST /api/knowledge/articles`: Create a new article
- `PUT /api/knowledge/articles/:id`: Update an article
- `DELETE /api/knowledge/articles/:id`: Delete an article

### Reports
- `GET /api/reports/tickets`: Get ticket statistics
- `GET /api/reports/performance`: Get agent performance metrics
- `GET /api/reports/trends`: Get ticket trends over time
- `GET /api/reports/satisfaction`: Get customer satisfaction metrics

## Security Features

### Authentication & Authorization

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Granular permissions based on user roles
- **API Rate Limiting**: Protection against brute force attacks
- **Password Security**:
  - Bcrypt password hashing
  - Password complexity requirements
  - Account lockout after failed attempts

### Data Protection

- **Input Validation**: Thorough validation of all user inputs
- **SQL Injection Protection**: Parameterized queries and ORM
- **XSS Prevention**: Content Security Policy and output encoding
- **CSRF Protection**: Anti-CSRF tokens for sensitive operations
- **Secure Headers**: HTTP security headers using Helmet.js

### Compliance Features

- **Audit Logging**: Comprehensive logging of all sensitive operations
- **Data Retention Controls**: Configurable data retention policies
- **Privacy Features**:
  - PII data handling controls
  - Data export/deletion capabilities for GDPR compliance
  - Consent management

### Network Security

- **HTTPS Enforcement**: HTTP to HTTPS redirection
- **CORS Configuration**: Strict cross-origin resource sharing policy
- **Firewall Rules**: Recommended server firewall configuration
- **Connection Security**: TLS 1.2+ only, strong ciphers

## Recent Improvements

### Bug Fixes and Optimizations
- **Fixed Profile Page Form**: Corrected initialization logic in the Profile Page form to prevent errors when user data is not immediately available on render.
- **Fixed Customer Dashboard Pagination**: Corrected server-side pagination for the "My Open Tickets" section on the customer dashboard, ensuring all open tickets are displayed correctly across pages.
- **Removed Test Notifications**: Fixed an issue where test notifications would appear when opening or refreshing login and register pages
- **Improved Performance**: Optimized component rendering and reduced unnecessary re-renders
- **Enhanced Error Handling**: Better error recovery and user feedback for failed operations

### Reports Page Implementation
The system now includes a comprehensive Reports page with:
- Interactive data visualization for ticket metrics
- Agent performance tracking
- Customizable date ranges and filters
- Tabbed interface for different report types
- Export capabilities for report data
- Real-time data updates

### Layout Improvements
- **Enhanced MainLayout**: 
  - Streamlined sidebar with better spacing and visual hierarchy
  - Improved AppBar with consistent styling
  - Direct theme toggle button in the header
  - Better active state highlighting for navigation items
- **Responsive Design**: Improved responsiveness across all device sizes
- **Visual Consistency**: Maintained consistent styling patterns throughout the application

### Ticket Creation Page
- **Step-by-step Wizard Interface**: Implemented a 3-step process for creating tickets
- **AI-Powered Field Suggestions**: Added intelligent field suggestions based on ticket description
- **Enhanced Form Validation**: Added more robust validation with clear error messages
- **Improved File Attachment**: Better file type validation and handling

### Dashboard Page
- **Interactive Dashboard**: Added collapsible sections for better organization
- **Enhanced Statistics**: Improved visual representation of key metrics
- **Recent Tickets Table**: Added compact, informative ticket list
- **Improved Charts**: Added better visualizations for ticket distribution
- **Loading States**: Added skeleton loaders for better UX during data fetching

### Knowledge Base Enhancements
- Dynamic article categorization
- Improved search functionality
- Enhanced article editor
- Better navigation between related articles

## Performance Optimizations

### Frontend Optimizations

- **Code Splitting**: Lazy loading of routes and components
- **Bundle Size Optimization**: Tree-shaking and dead code elimination
- **Image Optimization**: Responsive images and WebP format
- **Caching Strategies**:
  - Service worker for offline capability
  - Browser caching headers for static assets
  - React Query for API response caching
- **Virtualization**: Virtual scrolling for large data lists

### Backend Optimizations

- **Database Indexing**: Optimized indexes for common queries
- **Query Optimization**: Efficient query patterns and eager loading
- **Connection Pooling**: Database connection reuse
- **Response Compression**: gzip/brotli compression
- **Caching Layer**: Redis for frequent data access

### Measured Performance Metrics

- **First Contentful Paint**: < 1.2s
- **Time to Interactive**: < 2.5s
- **API Response Time**: < 200ms for 95% of requests
- **Lighthouse Score**: 90+ for Performance, Accessibility, Best Practices, SEO

## User Roles & Permissions

### Administrator
- Full system access
- User management
- Department configuration
- Report generation
- System settings

### Agent
- Ticket management
- Knowledge base editing
- Limited reporting access
- Customer communication

### Team Lead
- Team performance monitoring
- Ticket assignment
- SLA management
- Department-level reporting

### Customer
- Ticket creation and tracking
- Knowledge base access
- Profile management
- Communication with support agents

## Development Notes

### Coding Standards

- Follow TypeScript best practices
- Use functional components with React hooks
- Follow Material-UI design patterns
- Add proper JSDoc comments for components and functions

#### TypeScript Guidelines

- Use explicit types over `any`
- Use interfaces for object shapes
- Use type unions for variables with multiple types
- Use generics for reusable components and functions
- Follow naming conventions:
  - PascalCase for components, interfaces, and types
  - camelCase for variables, functions, and properties
  - UPPER_SNAKE_CASE for constants

#### React Guidelines

- Use functional components with hooks
- Keep components focused on a single responsibility
- Use memoization for expensive computations
- Follow the container/presentational pattern
- Handle errors gracefully with error boundaries

#### CSS Guidelines

- Use Material-UI's styling system (sx prop, styled components)
- Follow consistent naming for custom classes
- Use theme variables instead of hardcoded values
- Ensure responsive design for all components

### Pending Implementations

The following components need further development:

1. **ArticleDetailPage**: Currently uses a placeholder implementation that needs to be replaced with a full featured article detail view.

### Contributing

Please follow these steps when contributing:

1. Create a new branch for your feature or fix
2. Write tests for your changes
3. Follow the coding standards
4. Submit a PR with a clear description of the changes

#### Pull Request Process

1. Ensure your code adheres to the project's coding standards
2. Update documentation to reflect any changes
3. Add or update tests as necessary
4. Get at least one code review before merging
5. Squash commits before merging to maintain a clean history

#### Code Review Guidelines

- Verify that code meets project standards
- Check for potential security issues
- Ensure adequate test coverage
- Review for performance considerations
- Validate UI changes across different devices

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

#### Build Failures
- **Problem**: npm build command fails
- **Solution**: Check for dependency issues or TypeScript errors
- **Check**: Run `npm run lint` and `npm run type-check` to identify problems

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
| LandingPage | 2.3.0 | Mar 14, 2024 | frontend/src/pages/LandingPage.tsx |
| HeroSection | 3.1.2 | Mar 14, 2024 | frontend/src/components/landing/HeroSection.tsx |
| FeaturesSection | 2.8.0 | Mar 14, 2024 | frontend/src/components/landing/FeaturesSection.tsx |
| TestimonialsSection | 2.5.1 | Mar 14, 2024 | frontend/src/components/landing/TestimonialsSection.tsx |
| PricingSection | 2.4.0 | Mar 14, 2024 | frontend/src/components/landing/PricingSection.tsx |
| ContactSection | 2.2.0 | Mar 14, 2024 | frontend/src/components/landing/ContactSection.tsx |
| FooterSection | 1.9.0 | Mar 14, 2024 | frontend/src/components/landing/FooterSection.tsx |
| ChatbotWidget | 2.6.0 | Mar 09, 2024 | frontend/src/components/ChatbotWidget.tsx |
| ReportsPage | 3.0.0 | Mar 17, 2024 | frontend/src/pages/ReportsPage.tsx |
| KnowledgeBasePage | 2.7.0 | Mar 17, 2024 | frontend/src/pages/KnowledgeBasePage.tsx |
| AnalyticsDashboardPage | 2.9.0 | Mar 16, 2024 | frontend/src/pages/AnalyticsDashboardPage.tsx |
| TicketContext | 3.2.0 | Mar 14, 2024 | frontend/src/context/TicketContext.tsx |
| AuthContext | 2.5.0 | Mar 12, 2024 | frontend/src/context/AuthContext.tsx |
| ThemeContext | 1.4.0 | Mar 18, 2024 | frontend/src/context/ThemeContext.tsx |

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
- **Landing Page Components**: Identified large components (HeroSection: 784 lines, TestimonialsSection: 547 lines) that require refactoring for maintainability
- **Bundle Size Optimization**: Implemented code splitting and lazy loading for main routes
- **Performance Monitoring**: Added Lighthouse performance tracking with baseline metrics

Ongoing optimization efforts:
- Component structure refactoring to reduce size and improve maintainability
- Centralized styling system implementation to reduce duplication
- Icon import optimization to reduce bundle size 