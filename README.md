# Full-Stack JavaScript Application

A modern full-stack application built with React, Express, TypeScript, and PostgreSQL on Replit.

## 🚀 Quick Start

This application is designed to run on Replit with zero configuration. Simply run the project and everything will be set up automatically!

### How to Run

1. **Start the application**
   - Click the "Run" button in Replit
   - Or use the command: `npm run dev`
   
2. **Access the application**
   - The application will be available at the Replit-provided URL
   - Development server runs on port 5000

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
└── .env.example         # Environment variables template
```

### Available Commands

```bash
# Development
npm run dev          # Start development server (frontend + backend)
npm run build        # Build for production
npm run start        # Start production server

# Database management
npm run db:push      # Apply schema changes to database
npm run db:studio    # Open Drizzle Studio for database management

# Testing & Quality
npm test             # Run tests
npm run type-check   # TypeScript type checking
npm run lint         # Run ESLint
```

### Database Management

The application uses PostgreSQL, which is automatically provisioned on Replit.

#### Direct Database Access

```bash
# The DATABASE_URL environment variable is automatically configured
# Use Drizzle Studio for visual database management:
npm run db:studio

# Apply schema changes:
npm run db:push
```

## 🛠️ Configuration

### Environment Variables

Replit automatically manages most environment variables. Key variables include:

- `NODE_ENV` - Environment mode (development/production)
- `PORT` - Application port (default: 5000)
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `SESSION_SECRET` - Secret for session encryption
- `VITE_API_URL` - Frontend API endpoint

### Secrets Management

Use Replit's Secrets tab to manage sensitive environment variables like:
- API keys (OpenAI, Stripe, etc.)
- OAuth credentials
- Custom secrets

## 🚀 Publishing Your App

When you're ready to make your app publicly available:

1. Ensure your application is working correctly in development
2. Click the "Publish" button in Replit
3. Configure your custom domain (optional)
4. Your app will be deployed with automatic SSL and scaling

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# The workflow will automatically restart
# Or manually restart with:
npm run dev
```

**Database connection issues:**
```bash
# Check if PostgreSQL is configured
echo $DATABASE_URL
# Re-apply schema
npm run db:push
```

**Module not found errors:**
```bash
# Reinstall dependencies
npm install
```

**Environment variable issues:**
- Check the Secrets tab in Replit
- Ensure variables are properly configured
- Restart the application after adding secrets

## 🚀 Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Express, Node.js, TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Environment:** Replit with Nix package management
- **State Management:** TanStack Query (React Query)
- **Forms:** React Hook Form with Zod validation
- **Authentication:** Passport.js / Replit Auth (optional)
- **Payments:** Stripe integration (optional)

## 📦 Integrations

This project includes several optional integrations that can be configured:

- **Replit Auth** - User authentication with social logins
- **OpenAI** - AI/LLM capabilities
- **Stripe** - Payment processing
- **Object Storage** - File uploads and storage
- **Push Notifications** - Web push notifications

Use the integrations tools in Replit to set up any of these features.

## 📝 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

Built with ❤️ on Replit for modern web development