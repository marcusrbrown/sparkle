---
title: GitHub Pages Configuration
description: Configure GitHub repository settings for automated documentation deployment
sidebar:
  label: GitHub Pages Setup
  order: 2
---

This guide explains how to configure GitHub Pages in the Sparkle repository for automated documentation deployment.

## Prerequisites

- Repository administrator access
- GitHub Actions workflow configured (`.github/workflows/deploy-docs.yaml`)
- CNAME file created (`docs/public/CNAME`)

## Enable GitHub Pages

### Step 1: Access Repository Settings

1. Navigate to repository: <https://github.com/marcusrbrown/sparkle>
2. Click **Settings** tab
3. Scroll to **Pages** section in left sidebar

### Step 2: Configure Build Source

In the **Build and deployment** section:

1. **Source**: Select **GitHub Actions**
   - This enables deployment from GitHub Actions workflows
   - Replaces the legacy branch-based deployment
2. Click **Save** (if prompted)

**Why GitHub Actions?**

- Automated builds on code changes
- Full control over build process
- Supports complex build pipelines with monorepo structure
- Integrates with Turborepo for optimized builds

### Step 3: Configure Custom Domain

In the **Custom domain** section:

1. Enter domain: `sparkle.mrbro.dev`
2. Click **Save**
3. Wait for DNS check (may take a few minutes)
4. GitHub will automatically create/update CNAME file in repository

**DNS Check Status:**

- ✅ **Success**: "Your site is published at `https://sparkle.mrbro.dev`"
- ⏳ **In Progress**: "DNS check in progress"
- ❌ **Failed**: "DNS check failed" - Review DNS configuration

### Step 4: Enforce HTTPS

**Critical Security Step:**

1. Enable **Enforce HTTPS** checkbox
2. Wait for SSL certificate provisioning (up to 24 hours, typically 5-10 minutes)
3. GitHub automatically provisions Let's Encrypt SSL certificate

**Important:** Do not disable HTTPS enforcement - it's essential for:

- Secure content delivery
- SEO rankings
- Browser security warnings prevention
- User trust and privacy

## Deployment Workflow

### Automatic Deployment

The GitHub Actions workflow (`.github/workflows/deploy-docs.yaml`) automatically deploys when:

1. **Push to main branch** with changes to:
   - `docs/**` - Documentation content changes
   - `packages/**` - Package updates that affect documentation
   - `.github/workflows/deploy-docs.yaml` - Workflow changes
2. **Manual workflow dispatch** via GitHub Actions UI

### Manual Deployment

To manually trigger deployment:

1. Navigate to **Actions** tab
2. Select **Deploy Documentation** workflow
3. Click **Run workflow**
4. Select branch: `main`
5. Optional: Enable **Force rebuild documentation** for full regeneration
6. Click **Run workflow**

### Deployment Stages

**Build Stage:**

1. Checkout repository
2. Setup Node.js and pnpm
3. Install dependencies
4. Generate documentation from source packages
5. Build Astro site
6. Upload build artifacts

**Deploy Stage:**

1. Download build artifacts
2. Deploy to GitHub Pages environment
3. Update custom domain configuration
4. Provision SSL certificate (if needed)

## Verify Deployment

### Check Deployment Status

1. Navigate to **Actions** tab
2. Find latest **Deploy Documentation** workflow run
3. Verify all jobs completed successfully:
   - ✅ **Build Documentation** - Build completed
   - ✅ **Deploy to GitHub Pages** - Deployment completed

### Verify Site Accessibility

**Production URL:**

- Primary: <https://sparkle.mrbro.dev>
- GitHub Pages: <https://marcusrbrown.github.io/sparkle> (redirects to custom domain)

**Test checklist:**

- [ ] Homepage loads correctly
- [ ] Navigation works
- [ ] Internal links work
- [ ] Search functionality works
- [ ] HTTPS is enforced (🔒 in browser)
- [ ] No mixed content warnings
- [ ] Mobile responsive design works

## Environments

### GitHub Pages Environment

GitHub automatically creates a **github-pages** environment:

**View environment:**

1. Navigate to repository main page
2. Click **Environments** in right sidebar
3. Select **github-pages**

**Environment details:**

- **URL**: `https://sparkle.mrbro.dev`
- **Deployment history**: View all deployments
- **Protection rules**: Optional branch protections

### Environment Protection (Optional)

To add deployment approval:

1. Navigate to **Settings** > **Environments** > **github-pages**
2. Enable **Required reviewers**
3. Add reviewers who must approve deployments
4. Set **Wait timer** for delayed deployments (optional)

## Permissions and Security

### Required Permissions

The deployment workflow requires these permissions:

**Build job:**

```yaml
permissions:
  contents: read  # Read repository contents
```

**Deploy job:**

```yaml
permissions:
  pages: write     # Deploy to GitHub Pages
  id-token: write  # OIDC token for authentication
```

### OIDC Authentication

GitHub Pages uses OpenID Connect (OIDC) for secure authentication:

- **id-token: write** - Allows workflow to request OIDC token
- Token is automatically issued by GitHub
- Token is valid only for the deployment duration
- No long-lived credentials stored

### Branch Protection

Recommended branch protection rules for `main`:

1. Navigate to **Settings** > **Branches**
2. Add branch protection rule for `main`:
   - ✅ Require pull request reviews (1+ approvals)
   - ✅ Require status checks to pass (CI tests)
   - ✅ Require branches to be up to date
   - ✅ Include administrators

## Troubleshooting

### Issue: Deployment Fails

**Check workflow logs:**

1. Navigate to **Actions** tab
2. Click failed workflow run
3. Expand failed job steps
4. Review error messages

**Common causes:**

- Build errors in documentation
- Missing dependencies
- Incorrect workflow configuration
- Permission issues

### Issue: Custom Domain Not Working

**Verify configuration:**

1. Check **Settings** > **Pages** shows correct domain
2. Verify `docs/public/CNAME` contains `sparkle.mrbro.dev`
3. Check DNS records are configured correctly
4. Wait for DNS propagation (up to 48 hours)

**Reset custom domain:**

1. Remove custom domain from **Settings** > **Pages**
2. Wait 5 minutes
3. Re-add custom domain
4. Save and wait for DNS check

### Issue: HTTPS Certificate Not Provisioning

**Solutions:**

1. Verify custom domain DNS is correctly configured
2. Remove and re-add custom domain to trigger certificate regeneration
3. Check **Enforce HTTPS** is enabled
4. Wait up to 24 hours for certificate provisioning
5. Contact GitHub Support if issue persists

### Issue: Deployment Succeeds But Site Not Updated

**Check deployment:**

1. Verify workflow completed successfully
2. Check deployment timestamp in **Environments** > **github-pages**
3. Hard refresh browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
4. Wait 5-10 minutes for CDN cache to clear

## Monitoring and Maintenance

### Regular Checks

**Monthly:**

- Verify site is accessible
- Check SSL certificate is valid
- Review deployment logs for errors
- Test critical documentation paths

**After Major Updates:**

- Test documentation build locally first
- Review deployment logs
- Verify all content renders correctly
- Check for broken links

### Analytics (Optional)

Add analytics to track documentation usage:

**Google Analytics:**

Edit `docs/astro.config.mjs`:

```javascript
head: [
  {
    tag: 'script',
    attrs: {
      async: true,
      src: 'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID',
    },
  },
  {
    tag: 'script',
    content: `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'GA_MEASUREMENT_ID');
    `,
  },
]
```

**Plausible Analytics (Privacy-Friendly):**

```javascript
head: [
  {
    tag: 'script',
    attrs: {
      defer: true,
      'data-domain': 'sparkle.mrbro.dev',
      src: 'https://plausible.io/js/script.js',
    },
  },
]
```

## Advanced Configuration

### Custom 404 Page

Create custom 404 page at `docs/src/pages/404.astro`:

```jsx
// docs/src/pages/404.astro
import { Layout } from '../layouts/Layout.astro';

<Layout title="Page Not Found">
  <div class="not-found">
    <h1>404: Page Not Found</h1>
    <p>The page you're looking for doesn't exist.</p>
    <a href="/">Return to homepage</a>
  </div>
</Layout>
```

### Deployment Notifications

Add Slack or Discord notifications for deployment status:

**Slack:**

Add to `.github/workflows/deploy-docs.yaml`:

```yaml
- name: Notify Slack on success
  if: success()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "Documentation deployed successfully to https://sparkle.mrbro.dev"
      }
```

**Discord:**

```yaml
- name: Notify Discord on failure
  if: failure()
  uses: sarisia/actions-status-discord@v1
  with:
    webhook: ${{ secrets.DISCORD_WEBHOOK }}
    title: Documentation Deployment Failed
    description: Check workflow logs for details
```

## Resources

- [GitHub Pages Documentation](https://docs.github.com/pages)
- [GitHub Actions Permissions](https://docs.github.com/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token)
- [GitHub Pages Custom Domain](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [GitHub OIDC Authentication](https://docs.github.com/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [Astro Deployment Guide](https://docs.astro.build/en/guides/deploy/github/)

## Next Steps

After configuring GitHub Pages:

1. [Configure custom domain DNS](./custom-domain-setup) - Set up DNS records
2. Test automated deployment - Push changes and verify deployment
3. Monitor deployment status - Check Actions tab regularly
4. Set up analytics - Track documentation usage (optional)
