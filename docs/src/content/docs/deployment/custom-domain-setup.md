---
title: Custom Domain Setup
description: Configure DNS settings and GitHub Pages for the custom domain sparkle.mrbro.dev
sidebar:
  label: Custom Domain Setup
  order: 1
---

This guide explains how to configure the custom domain `sparkle.mrbro.dev` for the Sparkle Design System documentation site hosted on GitHub Pages.

## Overview

The documentation site is deployed to GitHub Pages and accessible via the custom domain `https://sparkle.mrbro.dev`. This requires:

1. DNS configuration at your domain registrar
2. GitHub Pages repository settings
3. CNAME file in the deployment artifacts

## Prerequisites

- Access to DNS management for `mrbro.dev` domain
- Repository administrator access to configure GitHub Pages settings
- Understanding of DNS record types (A, AAAA, CNAME)

## DNS Configuration: CNAME Record (Recommended for Subdomains)

For the subdomain `sparkle.mrbro.dev`, configure a **CNAME record**:

| Type  | Host/Name | Value/Points To        | TTL  |
| ----- | --------- | ---------------------- | ---- |
| CNAME | sparkle   | marcusrbrown.github.io | 3600 |

**Advantages:**

- Automatically follows GitHub's IP address changes
- Simpler configuration
- Best practice for subdomains

**Steps:**

1. Log into your DNS provider (e.g., Cloudflare, Route53, Namecheap)
2. Navigate to DNS management for `mrbro.dev`
3. Add a new CNAME record:
   - **Name/Host**: `sparkle`
   - **Value/Points To**: `marcusrbrown.github.io`
   - **TTL**: `3600` (or auto)
4. Save the DNS record

## GitHub Pages Configuration

### Repository Settings

1. Navigate to repository settings: `https://github.com/marcusrbrown/sparkle/settings/pages`
2. Under **Build and deployment**:
   - **Source**: GitHub Actions (already configured)
3. Under **Custom domain**:
   - Enter: `sparkle.mrbro.dev`
   - Click **Save**
4. **Enforce HTTPS**: Enable this option (recommended)
   - GitHub automatically provisions an SSL certificate via Let's Encrypt

### CNAME File in Public Directory

The repository includes a `CNAME` file at `docs/public/CNAME` containing:

```text
sparkle.mrbro.dev
```

This file is automatically copied to the deployment output (`docs/dist/CNAME`) during the Astro build process and tells GitHub Pages which custom domain to use.

**Important:** Do not delete this file - it's required for custom domain functionality.

## Verification Process

### DNS Propagation

After configuring DNS records:

1. **Check DNS propagation** (can take 5 minutes to 48 hours):

   ```bash
   # Check CNAME record
   dig sparkle.mrbro.dev CNAME +short

   # Expected output: marcusrbrown.github.io
   ```

2. **Use online DNS checker**: <https://dnschecker.org/>

### GitHub Pages Status

1. Visit repository settings: `https://github.com/marcusrbrown/sparkle/settings/pages`
2. Check status message:
   - ✅ **"Your site is published at `https://sparkle.mrbro.dev`"** - Success!
   - ⚠️ **"DNS check in progress"** - Wait for propagation
   - ❌ **"DNS check failed"** - Review DNS configuration

### Site Accessibility

1. **Direct access**: Visit `https://sparkle.mrbro.dev`
2. **GitHub Pages URL**: Visit `https://marcusrbrown.github.io/sparkle` (should redirect to custom domain)
3. **HTTPS verification**: Ensure SSL certificate is valid (🔒 in browser)

## Troubleshooting

### Issue: DNS Check Fails

**Symptoms:**

- GitHub Pages shows "DNS check failed"
- Site not accessible at custom domain

**Solutions:**

1. Verify DNS records are correctly configured (check spelling, values)
2. Wait for DNS propagation (up to 48 hours, typically 5-30 minutes)
3. Clear browser DNS cache:

   ```bash
   # macOS
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

   # Linux
   sudo systemd-resolve --flush-caches

   # Windows (PowerShell as Administrator)
   ipconfig /flushdns
   ```

4. Try accessing from different network or using mobile data

### Issue: HTTPS Not Working

**Symptoms:**

- Browser shows "Not Secure" warning
- Certificate errors

**Solutions:**

1. Ensure "Enforce HTTPS" is enabled in GitHub Pages settings
2. Wait for GitHub to provision SSL certificate (can take up to 24 hours)
3. Verify DNS records point to GitHub Pages correctly
4. Remove and re-add custom domain in GitHub Pages settings to trigger certificate regeneration

### Issue: 404 Errors on Custom Domain

**Symptoms:**

- Homepage loads but internal links return 404
- Direct URLs work on GitHub Pages URL but not custom domain

**Solutions:**

1. Verify `docs/public/CNAME` file exists and contains correct domain
2. Check `docs/astro.config.mjs` has correct `site` configuration:

   ```javascript
   export default defineConfig({
     site: 'https://sparkle.mrbro.dev',
     // ...
   })
   ```

3. Rebuild and redeploy documentation
4. Clear browser cache and try again

### Issue: Old Content Cached

**Symptoms:**

- Updates not appearing on live site
- Stale documentation content

**Solutions:**

1. Hard refresh browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
2. Check deployment succeeded: `https://github.com/marcusrbrown/sparkle/actions`
3. Verify GitHub Pages shows latest deployment timestamp
4. Wait 5-10 minutes for CDN cache to clear

## Automated Deployment Integration

The GitHub Actions workflow (`.github/workflows/deploy-docs.yaml`) automatically handles the CNAME file:

1. **Build step**: Astro copies `docs/public/CNAME` to `docs/dist/CNAME`
2. **Upload step**: Actions uploads entire `docs/dist` directory including CNAME
3. **Deploy step**: GitHub Pages reads CNAME file and configures custom domain

**No manual intervention required** - the deployment pipeline handles everything automatically.

## Maintenance

### Monitoring

- **GitHub Pages status**: Check repository settings periodically
- **SSL certificate expiration**: GitHub auto-renews Let's Encrypt certificates
- **DNS health**: Monitor DNS records haven't changed unexpectedly

## Security Considerations

### HTTPS Enforcement

- ✅ Always enable "Enforce HTTPS" in GitHub Pages settings
- ✅ Never serve documentation over plain HTTP
- ✅ GitHub provides free SSL certificates via Let's Encrypt

### DNS Security

- ✅ Use DNS provider with DNSSEC support
- ✅ Enable two-factor authentication on DNS provider account
- ✅ Monitor DNS changes for unauthorized modifications
- ✅ Use DNS provider audit logs to track changes

### Domain Verification

- ✅ Verify domain ownership in GitHub organization settings
- ✅ Add TXT record for domain verification (if required)
- ✅ Restrict repository access to authorized personnel

## Resources

- [GitHub Pages Documentation](https://docs.github.com/pages)
- [Configuring Custom Domain for GitHub Pages](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [DNS Propagation Checker](https://dnschecker.org/)
- [Astro Deployment Guide](https://docs.astro.build/en/guides/deploy/github/)

## Support

For issues with custom domain configuration:

1. Check troubleshooting section above
2. Review GitHub Pages deployment logs
3. Verify DNS configuration with provider
4. Open issue in repository: `https://github.com/marcusrbrown/sparkle/issues`
