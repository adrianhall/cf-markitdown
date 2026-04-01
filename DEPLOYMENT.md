# Deployment Guide

Step-by-step instructions for deploying cf-markitdown to CloudFlare Workers.

## Prerequisites

Before you begin, ensure you have:

- [x] CloudFlare account with Workers enabled
- [x] Node.js 18+ installed locally
- [x] pnpm installed (`pnpm install -g pnpm`)
- [x] Wrangler CLI (`pnpm install -g wrangler`)
- [x] Git repository cloned locally
- [x] Pull request approved (80% test coverage enforced)

```bash
git clone https://github.com/adrianhall/cf-markitdown.git
cd cf-markitdown
pnpm install
```

## Step 1: Authenticate with CloudFlare

### Option A: Using Wrangler Login

```bash
wrangler login
```

This opens a browser window to authorize Wrangler with your CloudFlare account.

### Option B: Using API Token

```bash
export CLOUDFLARE_API_TOKEN="your-api-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"

# Verify authentication
wrangler whoami
```

To create an API token:

1. Go to CloudFlare Dashboard → My Profile → API Tokens
2. Click "Create Token"
3. Select "Edit CloudFlare Workers" template
4. Add permissions:
   - Workers Scripts: Edit
   - Workers KV Storage: Edit
   - Workers AI: Read
5. Set zone and account resources
6. Click "Continue to summary" and "Create Token"

## Step 2: Create Workers AI Binding

### Enable Workers AI

```bash
# Verify AI is enabled in your account
wrangler ai list
```

If AI is not enabled, enable it in your CloudFlare Dashboard:

1. Go to Workers & Pages → AI
2. Click "Enable Workers AI"

### Configure wrangler.toml

Make sure your `wrangler.toml` includes:

```toml
[ai]
binding = "AI"
```

This binding is already configured in the provided `wrangler.toml`.

## Step 3: Create KV Namespace for API Keys

### Create the namespace

```bash
# Create production namespace
wrangler kv:namespace create "API_KEYS_KV"

# Create staging namespace
wrangler kv:namespace create "API_KEYS_KV" --env staging
```

Example output:

```text
✨ Success!
Add the following to your project `wrangler.toml`:

[[kv_namespaces]]
binding = "API_KEYS_KV"
id = "5f3a4e7b8c9d..."
```

### Update wrangler.toml

Copy the IDs from the output and update your `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "API_KEYS_KV"
id = "your-production-kv-id"

[[env.staging.kv_namespaces]]
binding = "API_KEYS_KV"
id = "your-staging-kv-id"

[[env.production.kv_namespaces]]
binding = "API_KEYS_KV"
id = "your-production-kv-id"
```

## Step 4: Configure Secrets

### Set JWT Signing Key (optional)

If using JWT authentication:

```bash
# Generate a strong key (32+ characters)
openssl rand -base64 32

# Set as secret
wrangler secret put JWT_SIGNING_KEY
# Enter the key when prompted
```

For staging/production:

```bash
wrangler secret put JWT_SIGNING_KEY --env staging
wrangler secret put JWT_SIGNING_KEY --env production
```

### Set Log Level

```bash
# Options: debug, info, warn, error
wrangler secret put LOG_LEVEL
# Enter: info

# For other environments
wrangler secret put LOG_LEVEL --env staging
wrangler secret put LOG_LEVEL --env production
```

## Step 5: Deploy to Staging

### 1. Build the project

```bash
pnpm run build
# or
wrangler build
```

Expected output:

```text
✨ Built successfully, built project size is 1.2 MB.
```

### 2. Run tests locally

```bash
npm test
```

Ensure all tests pass with minimum 80% coverage.

### 3. Deploy to staging

```bash
wrangler deploy --env staging
```

Expected output:

```text
Total Upload: 1.2 MB / gzip: 450 KB
Uploaded cf-markitdown-staging (time taken: 8.00 s)
Published cf-markitdown-staging (time taken: 2.00 s)
https://cf-markitdown-staging.your-account.workers.dev
```

### 4. Verify staging deployment

```bash
# Test health endpoint
curl https://cf-markitdown-staging.your-account.workers.dev/health

# Should return:
{"status":"healthy","timestamp":"2024-01-01T12:00:00.000Z"}

# Test conversion with a small PDF
curl -X POST \
  https://cf-markitdown-staging.your-account.workers.dev/api/v1/convert \
  -H "Content-Type: application/pdf" \
  -H "Content-Length: 1024" \
  -H "Authorization: Bearer YOUR_TEST_JWT" \
  --data-binary @sample.pdf
```

## Step 6: Set Up API Keys

### Option A: Pre-generate API Keys

```bash
# Generate a key
openssl rand -hex 16
# Output: 2f3d8a1b...

# Store in KV with prefix
wrangler kv:key put "apikey:2f3d8a1b..." "active" --binding API_KEYS_KV

# For staging
wrangler kv:key put "apikey:2f3d8a1b..." "active" --binding API_KEYS_KV --env staging
```

### Option B: User Registration System

Create a separate API endpoint or admin interface to generate and store keys. Users receive base64-encoded keys for use in Authorization header.

### Test API Key

```bash
# Base64 encode one of your keys
echo -n "2f3d8a1b..." | base64
# Output: MmYzZDhhMWIuLi4=

# Test the key
curl -X POST \
  https://cf-markitdown-staging.your-account.workers.dev/api/v1/convert \
  -H "Content-Type: application/pdf" \
  -H "Content-Length: 1024" \
  -H "Authorization: ApiKey MmYzZDhhMWIuLi4=" \
  --data-binary @sample.pdf
```

## Step 7: Deploy to Production

### 1. Verify all configurations

```bash
# Check wrangler.toml has production values
# Verify secrets are set
wrangler secret list --env production

# Verify KV namespace
wrangler kv:namespace list | grep prod
```

### 2. Deploy production

```bash
wrangler deploy --env production
```

Expected output:

```text
Total Upload: 1.2 MB / gzip: 450 KB
Uploaded cf-markitdown-prod (time taken: 8.00 s)
Published cf-markitdown-prod (time taken: 2.00 s)
https://cf-markitdown.your-account.workers.dev
```

### 3. Verify production deployment

```bash
# Test health endpoint
curl https://cf-markitdown-prod.your-account.workers.dev/health

# Test conversion
curl -X POST \
  https://cf-markitdown-prod.your-account.workers.dev/api/v1/convert \
  -H "Content-Type: application/pdf" \
  -H "Content-Length: 1024" \
  -H "Authorization: Bearer YOUR_PRODUCTION_JWT" \
  --data-binary @document.pdf
```

### 4. Set up production monitoring

Check Workers Logs in CloudFlare Dashboard:

1. Go to Workers & Pages → your worker
2. Click "Logs" tab
3. Monitor for errors and performance

Enable observability in `wrangler.toml`:

```toml
[observability]
enabled = true
head_sampling_rate = 1
```

### 5. Configure custom domain (optional)

```bash
wrangler publish --env production --custom-domain api.yourdomain.com
```

Or configure in CloudFlare Dashboard:

1. Workers & Pages → your worker
2. Settings → Triggers → Custom Domains
3. Add your domain

## Troubleshooting

### Common Issues

**Authentication Failed**

```bash
# Check JWT token
wrangler secret get JWT_SIGNING_KEY --env production
# Check API key exists
wrangler kv:key get --binding API_KEYS_KV "apikey:your-key"
```

**KV Not Found**

```bash
# Verify namespace binding
wrangler kv:namespace list
# Check binding in wrangler.toml
```

**Workers AI Not Available**

```bash
# Verify AI is enabled
wrangler ai list
# Check binding in wrangler.toml
```

**Large File Errors**

```bash
# Remember: 48MB limit enforced in code
# Check memory and CPU limits in CloudFlare metrics
```

**Deploy Failed**

```bash
# Check wrangler.toml config
# Verify secrets are set
# Check file size < 10MB (Worker bundle limit)
wrangler build --env production
```

## Verification Checklist

- [ ] Staging deployment successful
- [ ] Health endpoint responds
- [ ] Conversion works with test file
- [ ] JWT authentication works
- [ ] API key authentication works
- [ ] Monitoring/logs visible in dashboard
- [ ] Error handling tested
- [ ] Production deployment successful
- [ ] Custom domain configured (optional)
- [ ] Documentation updated
- [ ] Team notified of deployment

## Rollback Plan

If issues occur after deployment:

1. **Immediate**: CloudFlare retains previous version for 7 days
2. **Rollback using Wrangler**:

   ```bash
   wrangler rollback --env production --yes
   ```

3. **Version tags**: Use git tags to redeploy known good version

   ```bash
   git checkout v1.0.0
   wrangler deploy --env production
   ```

## Cost Considerations

- Workers: Bill by requests and CPU time
- KV: Free tier 1GB, then bill by reads/writes
- Workers AI: Bill by requests
- Logs: Workers Logs require Logpush (separate billing)

Monitor usage in CloudFlare Dashboard → Billing.
