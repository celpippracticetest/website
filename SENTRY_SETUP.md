# Environment Variables Configuration

## Sentry Configuration

Add these environment variables to your `.env.local` file:

```env
# Sentry DSN - Get this from your Sentry project settings
# Format: https://<key>@<organization>.ingest.sentry.io/<project-id>
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn-here

# Sentry Organization Slug (from Sentry dashboard)
SENTRY_ORG=your-organization-slug

# Sentry Project Name (from Sentry dashboard)
SENTRY_PROJECT=your-project-name

# Sentry Auth Token (for uploading source maps during build)
# Create at: https://sentry.io/settings/account/api/auth-tokens/
# Required scopes: project:releases, project:read, org:read
SENTRY_AUTH_TOKEN=your-auth-token

# Environment name for Sentry (development, staging, production)
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
```

## Getting Your Sentry Credentials

1. **Create a Sentry Account**: Go to [sentry.io](https://sentry.io) and sign up (free tier available)

2. **Create a Project**: 
   - Click "Create Project"
   - Select "Next.js" as the platform
   - Name your project
   - Click "Create Project"

3. **Get Your DSN**:
   - After creating the project, you'll see your DSN
   - It looks like: `https://abc123@o123456.ingest.sentry.io/456789`
   - Copy this to `NEXT_PUBLIC_SENTRY_DSN`

4. **Get Organization Slug**:
   - Go to Settings → General
   - Find "Organization Slug" (e.g., "my-company")
   - Copy this to `SENTRY_ORG`

5. **Get Project Name**:
   - This is the name you gave your project
   - Copy this to `SENTRY_PROJECT`

6. **Create Auth Token**:
   - Go to Settings → Account → API → Auth Tokens
   - Click "Create New Token"
   - Name it something like "nextjs-build"
   - Select scopes: `project:releases`, `project:read`, `org:read`
   - Copy the generated token to `SENTRY_AUTH_TOKEN`

## Example `.env.local` File

```env
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://abc123def456@o123456.ingest.sentry.io/789012
SENTRY_ORG=my-company
SENTRY_PROJECT=website
SENTRY_AUTH_TOKEN=sntrys_abc123...
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
```

## Notes

- The `NEXT_PUBLIC_` prefix makes variables available in the browser
- Never commit `.env.local` to version control
- Use different environments (development, staging, production) to separate logs
- The auth token is only needed for builds that upload source maps (production builds)
