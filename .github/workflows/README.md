# GitHub Actions Workflows for ChefSpAIce

This directory contains the CI/CD pipeline and automation workflows for the ChefSpAIce project.

## 📋 Overview

The GitHub Actions setup provides comprehensive automation for:
- Continuous Integration (CI)
- Deployment (CD)
- Security scanning
- Performance monitoring
- Database backups
- Dependency management
- Release automation

## 🚀 Workflows

### 1. CI Pipeline (`ci.yml`)
**Triggers:** Pull requests, pushes to main/develop
**Purpose:** Ensures code quality and tests pass before merging

**Jobs:**
- **Code Quality:** ESLint, TypeScript type checking
- **Build Verification:** Builds the application
- **E2E Tests:** Runs Playwright tests with PostgreSQL (parallelized across 3 shards)
- **Security Scan:** Basic npm audit

### 2. Deployment (`deploy.yml`)
**Triggers:** Pushes to main, manual dispatch
**Purpose:** Deploys application to production

**Features:**
- Supports multiple platforms (Vercel, Railway, Render, Fly.io, Netlify)
- Database migrations with Drizzle
- Post-deployment health checks
- Smoke tests after deployment
- Automatic rollback on failure

### 3. Database Backup (`backup.yml`)
**Triggers:** Daily at 2 AM UTC, manual dispatch
**Purpose:** Automated PostgreSQL backups

**Features:**
- Full, incremental, or schema-only backups
- Cloud storage support (S3, Google Cloud Storage)
- 30-day retention policy
- Weekly restoration tests
- Backup integrity verification

### 4. Performance Monitoring (`performance.yml`)
**Triggers:** Daily at 6 AM UTC, PRs affecting frontend
**Purpose:** Track performance metrics

**Metrics:**
- Lighthouse scores (Performance, Accessibility, SEO)
- Web Vitals (LCP, FID, CLS, FCP, TTFB)
- Bundle size analysis
- Performance regression detection

### 5. Release Management (`release.yml`)
**Triggers:** Manual dispatch, version tags
**Purpose:** Create releases with semantic versioning

**Features:**
- Automatic version bumping (major/minor/patch)
- Changelog generation from commits
- Release artifacts creation
- GitHub Release creation

### 6. Security Scanning (`codeql.yml`)
**Triggers:** Push to main/develop, PRs, weekly scan
**Purpose:** Detect security vulnerabilities

**Tools:**
- CodeQL analysis
- Dependency review
- Secret scanning (TruffleHog, Gitleaks)
- Snyk vulnerability scan (optional)
- OWASP dependency check

### 7. Stale Management (`stale.yml`)
**Triggers:** Daily at 1 AM UTC
**Purpose:** Manage inactive issues and PRs

**Actions:**
- Mark stale items after 30 days (issues) / 14 days (PRs)
- Auto-close after warning period
- Close abandoned draft PRs
- Label issues needing response

### 8. Dependency Updates (`dependabot.yml`)
**Frequency:** Weekly on Mondays
**Purpose:** Automated dependency updates

**Groups:**
- React & UI libraries
- Database dependencies
- Testing tools
- Build tools
- Backend dependencies
- External services

## 🔑 Required Secrets

Configure these in Settings → Secrets → Actions:

### Essential Secrets
```yaml
# Database
DATABASE_URL           # PostgreSQL connection string

# APIs
USDA_FDC_API_KEY      # USDA Food API key
AI_INTEGRATIONS_OPENAI_API_KEY    # OpenAI API key
AI_INTEGRATIONS_OPENAI_BASE_URL   # OpenAI base URL
STRIPE_SECRET_KEY     # Stripe secret key
VITE_STRIPE_PUBLIC_KEY # Stripe publishable key

# Deployment
APP_URL               # Production application URL
API_URL               # Production API URL
```

### Platform-Specific Deployment Secrets

#### For Vercel:
```yaml
VERCEL_TOKEN          # Vercel API token
VERCEL_ORG_ID        # Vercel organization ID
VERCEL_PROJECT_ID    # Vercel project ID
```

#### For Railway:
```yaml
RAILWAY_TOKEN        # Railway API token
RAILWAY_SERVICE      # Railway service name
```

#### For Render:
```yaml
RENDER_DEPLOY_HOOK   # Render deploy webhook URL
```

#### For Fly.io:
```yaml
FLY_API_TOKEN       # Fly.io API token
```

#### For Netlify:
```yaml
NETLIFY_AUTH_TOKEN  # Netlify auth token
NETLIFY_SITE_ID    # Netlify site ID
```

### Optional Backup Secrets

#### For AWS S3 backups:
```yaml
AWS_ACCESS_KEY_ID    # AWS access key
AWS_SECRET_ACCESS_KEY # AWS secret key
AWS_REGION          # AWS region (default: us-east-1)
```

#### For Google Cloud Storage backups:
```yaml
GCP_SERVICE_ACCOUNT_KEY # Base64-encoded service account JSON
```

### Optional Security Scanning:
```yaml
SNYK_TOKEN          # Snyk authentication token (optional)
```

## 📝 Configuration Variables

Set these in Settings → Variables → Actions:

```yaml
DEPLOYMENT_PLATFORM  # One of: vercel, railway, render, fly, netlify
```

## 🎯 Usage

### Manual Deployment
1. Go to Actions tab
2. Select "Deploy" workflow
3. Click "Run workflow"
4. Choose environment (production/staging)
5. Click "Run workflow" button

### Manual Backup
1. Go to Actions tab
2. Select "Database Backup" workflow
3. Click "Run workflow"
4. Choose backup type (full/incremental/schema-only)
5. Click "Run workflow" button

### Creating a Release
1. Go to Actions tab
2. Select "Release" workflow
3. Click "Run workflow"
4. Choose release type (major/minor/patch/prerelease)
5. Click "Run workflow" button

## 🏷️ Branch Protection Rules

Recommended settings for the `main` branch:

1. **Require pull request reviews** (1 approval)
2. **Require status checks**:
   - Code Quality
   - Build Application
   - E2E Tests
   - Security Analysis
3. **Require branches to be up to date**
4. **Include administrators** (optional)

## 📊 Status Badges

Add these to your README:

```markdown
![CI](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/CI/badge.svg)
![Deploy](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/Deploy/badge.svg)
![Security](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/CodeQL%20Security%20Analysis/badge.svg)
```

## 🔧 Customization

### Adjusting Test Parallelization
Edit `.github/workflows/ci.yml`:
```yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4, 5]  # Increase for more parallelization
```

### Changing Backup Retention
Edit `.github/workflows/backup.yml`:
```yaml
env:
  RETENTION_DAYS: 60  # Change from 30 to 60 days
```

### Adding New Deployment Platforms
Edit `.github/workflows/deploy.yml` and add a new deployment step:
```yaml
- name: Deploy to Your Platform
  if: vars.DEPLOYMENT_PLATFORM == 'your-platform'
  run: |
    # Your deployment commands here
```

## 🐛 Troubleshooting

### CI Failures
1. Check the workflow logs in the Actions tab
2. Look for specific error messages
3. Common issues:
   - Missing dependencies: Check package.json
   - TypeScript errors: Run `npm run check` locally
   - Test failures: Run `npm test` locally

### Deployment Failures
1. Verify all secrets are set correctly
2. Check deployment platform status
3. Review post-deployment health checks
4. Check rollback logs if automatic rollback triggered

### Backup Failures
1. Verify DATABASE_URL secret is correct
2. Check PostgreSQL connection
3. For cloud backups, verify AWS/GCP credentials

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright Documentation](https://playwright.dev)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [CodeQL Documentation](https://codeql.github.com/docs/)

## 🤝 Contributing

When adding new workflows:
1. Test locally first using [act](https://github.com/nektos/act)
2. Create a PR with the new workflow
3. Test on a feature branch before merging
4. Document any new secrets or configuration needed
5. Update this README with workflow details