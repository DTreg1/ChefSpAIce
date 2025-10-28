# Full-Stack JavaScript Application

A modern full-stack application built with React, Express, TypeScript, and PostgreSQL.

## 🚀 Quick Start with Docker

This project is Docker-ready for easy local development with VS Code. Get up and running with just a few commands!

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed on your machine
- [VS Code](https://code.visualstudio.com/) (recommended)
- Git

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd <project-directory>
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` file with your configuration (the defaults work for local development)

3. **Start the application with Docker Compose**
   ```bash
   # Start all services (app + database)
   docker-compose up
   
   # Or run in background
   docker-compose up -d
   ```

4. **Access the application**
   - Application: http://localhost:5000
   - pgAdmin (database UI): http://localhost:5050 (optional, see below)

5. **Stop the application**
   ```bash
   docker-compose down
   
   # To also remove volumes (database data)
   docker-compose down -v
   ```

## 📚 Development Guide

### Project Structure

```
.
├── client/              # React frontend application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   └── lib/         # Utilities and helpers
├── server/              # Express backend server
│   ├── routes.ts        # API routes
│   ├── storage.ts       # Database abstraction layer
│   └── index.ts         # Server entry point
├── shared/              # Shared types and schemas
│   └── schema.ts        # Database schemas (Drizzle ORM)
├── docker-compose.yml   # Docker orchestration
├── Dockerfile           # Multi-stage Docker build
└── .env.example         # Environment variables template
```

### Available Commands

```bash
# Development with Docker
docker-compose up            # Start all services
docker-compose logs -f app   # View application logs
docker-compose exec app sh   # Access app container shell

# Database management
docker-compose exec postgres psql -U postgres -d myapp  # Access PostgreSQL
docker-compose run app npm run db:push                  # Apply schema changes

# Running without Docker (requires local Node.js and PostgreSQL)
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Testing
npm test             # Run tests
npm run type-check   # TypeScript type checking
```

### VS Code Setup

#### Recommended Extensions

Install these VS Code extensions for the best development experience:

- **Docker** - Manage containers and images
- **Dev Containers** - Develop inside a container
- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **Tailwind CSS IntelliSense** - Tailwind autocomplete
- **Thunder Client** or **REST Client** - API testing
- **GitLens** - Git supercharged
- **PostgreSQL** - Database management

#### Developing Inside a Container (Optional)

VS Code can run your development environment inside the Docker container:

1. Install the "Dev Containers" extension
2. Open Command Palette (Cmd/Ctrl + Shift + P)
3. Select "Dev Containers: Reopen in Container"
4. VS Code will rebuild and connect to the container

### Database Management

#### Using pgAdmin (Web UI)

pgAdmin is included for visual database management:

1. Start with the tools profile:
   ```bash
   docker-compose --profile tools up -d
   ```

2. Access pgAdmin at http://localhost:5050
   - Email: `admin@admin.com` (or value from .env)
   - Password: `admin` (or value from .env)

3. Add a new server:
   - Name: `Local Database`
   - Host: `postgres` (Docker service name)
   - Port: `5432`
   - Username: `postgres` (or value from .env)
   - Password: `postgres` (or value from .env)

#### Direct Database Access

```bash
# Connect to PostgreSQL directly
docker-compose exec postgres psql -U postgres -d myapp

# Run SQL commands
\dt                  # List all tables
\d table_name        # Describe table structure
SELECT * FROM users; # Query data
\q                   # Exit
```

## 🛠️ Configuration

### Environment Variables

Key environment variables (see `.env.example` for full list):

- `NODE_ENV` - Environment mode (development/production)
- `PORT` - Application port (default: 5000)
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret for session encryption
- `VITE_API_URL` - Frontend API endpoint

### Docker Configuration

The project includes:

- **Dockerfile** - Multi-stage build for optimized images
- **docker-compose.yml** - Service orchestration
- **.dockerignore** - Excludes unnecessary files from build

### Production Deployment

For production deployment:

1. Build the production image:
   ```bash
   docker build --target production -t myapp:latest .
   ```

2. Run with production environment:
   ```bash
   docker run -p 5000:5000 --env-file .env.production myapp:latest
   ```

Or use Docker Compose with production override:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find process using port 5000
lsof -i :5000
# Kill the process or change PORT in .env
```

**Database connection issues:**
```bash
# Ensure PostgreSQL is running
docker-compose ps
# Check logs
docker-compose logs postgres
# Rebuild database
docker-compose down -v && docker-compose up
```

**Permission issues on Linux:**
```bash
# Add your user to docker group
sudo usermod -aG docker $USER
# Logout and login again
```

**Module not found errors:**
```bash
# Rebuild without cache
docker-compose build --no-cache
# Or remove node_modules volume
docker volume rm <project>_node_modules
```

## 🚀 Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Express, Node.js, TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Container:** Docker & Docker Compose
- **State Management:** TanStack Query (React Query)
- **Forms:** React Hook Form with Zod validation
- **Authentication:** Passport.js (optional)
- **Payments:** Stripe integration (optional)

## 📝 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

Built with ❤️ for modern web development