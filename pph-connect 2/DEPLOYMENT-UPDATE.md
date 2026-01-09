# Deployment Strategy Update: AWS Amplify

## Changes Made

All references to **AWS S3 + CloudFront** deployment have been updated to **AWS Amplify Hosting** across all documentation.

---

## Updated Documents

### 1. **TODOS.md**
- ✅ Updated DevOps & Infrastructure section
- ✅ Replaced S3 bucket setup tasks with Amplify hosting setup
- ✅ Replaced CloudFront distribution tasks with Amplify configuration
- ✅ Updated CI/CD pipeline tasks (now built-in with Amplify)
- ✅ Updated monitoring tasks to track Amplify metrics

### 2. **ROADMAP.md**
- ✅ Updated infrastructure cost estimates
  - Phase 1-2: $5-15/month for Amplify (vs. $5-10 for S3+CloudFront)
  - Phase 3-4: $20-50/month for Amplify
- ✅ Updated total costs: $30-65/month (Phase 1-2) and $420-1050/month (Phase 3-4)

### 3. **ANALYSIS-SUMMARY.md**
- ✅ Updated infrastructure cost breakdown
- ✅ Updated technical questions section (removed S3 vs. Vercel comparison)
- ✅ Added Amplify-specific considerations

### 4. **pph-connect-spec-sheet-v-1-0.md**
- ✅ Updated deployment mention in Executive Summary
- ✅ Updated Deployment section with Amplify details
- ✅ Updated detailed deployment strategy (Section 4.4) with:
  - Amplify setup instructions
  - amplify.yml configuration example
  - Branch-based deployment strategy
  - Cost estimates and CI/CD benefits

---

## AWS Amplify Benefits

### Simplified Deployment
- **No manual uploads**: Push to GitHub → automatic deployment
- **No cache invalidation**: Handled automatically by Amplify
- **Built-in CI/CD**: No need for separate GitHub Actions initially
- **Preview environments**: Automatic preview URLs for pull requests

### Enhanced Developer Experience
- **Branch deployments**:
  - `main` → Production
  - `develop` → Staging
  - `feature/*` → Preview branches
- **Instant rollbacks**: One-click rollback to previous deployments
- **Build logs**: Full transparency into build process
- **Environment variables**: Managed in Amplify console (secure)

### Cost Comparison

| Service | S3 + CloudFront | AWS Amplify |
|---------|----------------|-------------|
| **Setup** | Manual (S3 bucket, CloudFront distribution, policies) | Automatic (connect GitHub repo) |
| **Deployment** | Manual upload + cache invalidation | Automatic on git push |
| **HTTPS** | Manual certificate setup | Automatic |
| **CI/CD** | Requires GitHub Actions | Built-in |
| **Cost (low traffic)** | ~$5-10/month | ~$5-15/month |
| **Cost (high traffic)** | ~$20-50/month | ~$20-50/month |
| **Build minutes** | N/A (manual) | $0.01/minute (~$0.05/deploy) |

---

## Implementation Steps

### Phase 1: Initial Setup (Week 1)

1. **Connect Repository to Amplify**
   ```bash
   # In AWS Console:
   # 1. Navigate to AWS Amplify
   # 2. Click "New app" → "Host web app"
   # 3. Connect GitHub repository
   # 4. Select "pph-connect" repository
   # 5. Select "main" branch for production
   ```

2. **Configure Build Settings**
   - Amplify auto-detects Vite configuration
   - Verify build command: `npm run build`
   - Verify output directory: `dist`
   - Set Node version: 18 or 20 (LTS)

3. **Set Environment Variables**
   ```
   VITE_SUPABASE_URL=https://cntkpxsjvnuubrbzzeqk.supabase.co
   VITE_SUPABASE_ANON_KEY=[your-anon-key]
   ```

4. **Deploy**
   - Save and deploy
   - Amplify builds and deploys automatically
   - Test deployment URL (provided by Amplify)

### Phase 2: Branch Configuration (Optional)

1. **Add Staging Environment**
   - In Amplify console, go to "Branch settings"
   - Connect "develop" branch
   - Assign subdomain: `staging.yourdomain.com`

2. **Enable PR Previews**
   - Enable "Preview for pull requests"
   - Every PR gets a unique preview URL
   - Automatic cleanup when PR is closed

### Phase 3: Custom Domain (Optional)

1. **Add Domain**
   - In Amplify console, go to "Domain management"
   - Add custom domain (e.g., `app.pph-connect.com`)
   - Amplify provides DNS records (CNAME/A)
   - Update DNS provider (Route 53, CloudFlare, etc.)

2. **HTTPS**
   - Automatically provisioned by Amplify
   - Free SSL certificate via AWS Certificate Manager
   - Auto-renewal

---

## Migration Checklist

If migrating from existing S3 + CloudFront setup:

- [ ] Export current S3 bucket contents (if any)
- [ ] Note down current environment variables
- [ ] Set up Amplify hosting (follow steps above)
- [ ] Configure custom domain in Amplify (if applicable)
- [ ] Test deployment thoroughly
- [ ] Update DNS to point to Amplify (if custom domain)
- [ ] Monitor first few deployments
- [ ] Delete S3 bucket and CloudFront distribution (after confirming Amplify works)

---

## Amplify Configuration File (amplify.yml)

For custom build configurations, create `amplify.yml` in repository root:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

**Note:** Amplify auto-detects Vite projects, so this file is optional unless you need custom build steps.

---

## Troubleshooting

### Build Fails
- Check build logs in Amplify console
- Verify environment variables are set correctly
- Ensure Node version is compatible (18 or 20)
- Check that `npm run build` works locally

### Routing Issues (404 on refresh)
- Amplify should auto-configure SPA rewrites
- If not, add rewrite rule in Amplify console:
  - Source: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>`
  - Target: `/index.html`
  - Type: `200 (Rewrite)`

### Environment Variables Not Working
- Ensure variables are prefixed with `VITE_`
- Verify variables are set in Amplify console (not .env files)
- Rebuild app after adding/changing variables

---

## Cost Monitoring

**Set up AWS Budget Alerts:**
1. Go to AWS Billing console
2. Create budget for Amplify
3. Set alert threshold (e.g., $20/month)
4. Get email notifications when approaching limit

**Typical Usage:**
- **Phase 1-2:** 20-30 builds/month = $1-2 in build costs + $5-10 hosting = ~$6-12/month
- **Phase 3-4:** 50-100 builds/month + higher traffic = ~$20-50/month

---

## Advantages Over S3 + CloudFront

✅ **Simpler setup**: Connect GitHub, done
✅ **Automatic deployments**: No manual steps
✅ **Preview environments**: Test PRs before merging
✅ **Instant rollbacks**: Undo bad deployments in seconds
✅ **Built-in CI/CD**: No need for GitHub Actions initially
✅ **Automatic HTTPS**: Free SSL certificates
✅ **Better DX**: Optimized for modern frontend frameworks

**Trade-offs:**
- Slightly higher cost for very high traffic (but negligible for most cases)
- Less granular control over CDN settings (but rarely needed)
- Tied to AWS ecosystem (but already using Supabase + AWS)

---

## Conclusion

AWS Amplify provides a **simpler, more automated deployment experience** compared to manual S3 + CloudFront setup, with built-in CI/CD and preview environments that accelerate development velocity.

**Cost impact:** Minimal increase ($5-15 vs. $5-10/month), offset by developer time savings.

**Recommendation:** Start with Amplify. If you hit scale limits or need granular CDN control, you can always migrate to S3 + CloudFront later (but unlikely to be necessary).

---

**Updated by:** Claude (Anthropic)
**Date:** November 2025
**Status:** All documentation updated and verified
