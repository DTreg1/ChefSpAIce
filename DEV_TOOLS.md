# Development Tools Guide

This project includes several development tools to help with code quality, bundle analysis, and performance monitoring.

## ESLint - Code Quality

ESLint is configured with TypeScript and React support to catch code quality issues and enforce consistent patterns.

### Running ESLint

```bash
# Check for linting errors
npx eslint . --ext .ts,.tsx,.js,.jsx

# Fix auto-fixable issues
npx eslint . --ext .ts,.tsx,.js,.jsx --fix
```

### Configuration

- **Config file**: `.eslintrc.json`
- **Ignore file**: `.eslintignore`
- **Rules**: Includes TypeScript, React, and React Hooks best practices

## Bundle Analyzer - Bundle Size Analysis

The bundle analyzer helps you visualize and understand your bundle size to identify optimization opportunities.

### Generating Bundle Analysis

```bash
# Build with bundle analysis
vite build --config vite.analyze.config.ts
```

This will:
- Build your application
- Generate a `bundle-stats.html` file with interactive visualization
- Automatically open the report in your browser
- Show both gzip and brotli compressed sizes

### What to Look For

- Large dependencies that could be replaced or lazy-loaded
- Duplicate code that could be deduplicated
- Unused code that could be removed
- Opportunities for code splitting

## Web Vitals - Performance Monitoring

Web Vitals are automatically tracked to monitor real user performance.

### Core Web Vitals Tracked

- **LCP** (Largest Contentful Paint): Loading performance
- **INP** (Interaction to Next Paint): Interactivity and responsiveness
- **CLS** (Cumulative Layout Shift): Visual stability
- **FCP** (First Contentful Paint): Initial render
- **TTFB** (Time to First Byte): Server response time

### Development

In development mode, Web Vitals are logged to the browser console with detailed information:

```
Web Vital: LCP
  Value: 1234.5
  Rating: good
  Delta: 100
  ID: v3-1234567890
```

### Production

In production, metrics are automatically sent to `/api/analytics` endpoint using:
- `navigator.sendBeacon()` when available (preferred)
- `fetch()` with `keepalive` as fallback

### Ratings

- **good**: Green - Meets recommended thresholds
- **needs-improvement**: Orange - Could be better
- **poor**: Red - Below recommended thresholds

### Custom Analytics Integration

To send metrics to a custom analytics service, modify `client/src/utils/reportWebVitals.ts`:

```typescript
function sendToAnalytics(metric: Metric) {
  // Send to your analytics service
  gtag('event', metric.name, {
    value: Math.round(metric.value),
    event_category: 'Web Vitals',
    event_label: metric.id,
    non_interaction: true,
  });
}
```

## Pre-commit Workflow

Recommended pre-commit checks:

```bash
# 1. TypeScript type checking
npm run check

# 2. Lint checking
npx eslint . --ext .ts,.tsx,.js,.jsx

# 3. Fix linting issues
npx eslint . --ext .ts,.tsx,.js,.jsx --fix
```

## Pre-deploy Workflow

Before deploying:

```bash
# 1. Run TypeScript checks
npm run check

# 2. Run linting
npx eslint . --ext .ts,.tsx,.js,.jsx

# 3. Analyze bundle size
vite build --config vite.analyze.config.ts
```

Review the bundle stats to ensure no unexpected size increases.

## Continuous Integration

Consider adding these checks to your CI pipeline:

```yaml
# Example GitHub Actions
- name: TypeScript Check
  run: npm run check

- name: ESLint
  run: npx eslint . --ext .ts,.tsx,.js,.jsx

- name: Build
  run: npm run build
```

## Monitoring in Production

Web Vitals are automatically collected in production. To view them:

1. Implement the `/api/analytics` endpoint to receive metrics
2. Store metrics in your analytics database
3. Create dashboards to track trends over time
4. Set up alerts for performance degradation

### Example Backend Handler

```typescript
app.post('/api/analytics', (req, res) => {
  const { name, value, rating, delta, id } = req.body;
  
  // Log to analytics service
  analytics.track({
    event: 'web_vital',
    metric: name,
    value,
    rating,
    delta,
    id,
  });
  
  res.sendStatus(200);
});
```
