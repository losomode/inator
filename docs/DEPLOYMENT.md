# External Domain Deployment Guide

This guide explains how to deploy the Inator Platform to an external domain (e.g., `www.inatorapp.com`).

## Overview

The platform is designed to work on `localhost` by default, but can be deployed to any external domain by configuring a few environment variables. All hardcoded `localhost` references have been replaced with configurable settings that automatically adapt based on the `DEPLOY_DOMAIN` environment variable.

## Quick Start

### 1. Set Environment Variables

Add these variables to each backend's `.env` file:

```bash
# All four backends (Authinator, USERinator, RMAinator, Fulfilinator)
DEPLOY_DOMAIN=www.yourdomain.com
DEPLOY_SCHEME=https
```

For Authinator only (handles SSO redirects):
```bash
FRONTEND_URL=https://www.yourdomain.com
```

For the unified frontend:
```bash
# frontend/.env
VITE_DEPLOY_DOMAIN=www.yourdomain.com
```

### 2. Update OAuth Providers

Update redirect URIs in your OAuth provider dashboards:

**Google Cloud Console:**
- Authorized redirect URIs: `https://www.yourdomain.com/accounts/google/login/callback/`

**Microsoft Azure AD:**
- Redirect URIs: `https://www.yourdomain.com/accounts/microsoft/login/callback/`

### 3. Configure Django Sites

Run this command in Authinator to update the Site domain:

```bash
cd Authinator
task backend:manage -- setup_sso
```

This automatically sets the Django Site domain from `DEPLOY_DOMAIN`.

### 4. Configure Caddy Gateway

For production deployment, create a `Caddyfile` (or update `Caddyfile.dev`):

```caddy
# Redirect bare domain to www subdomain
yourdomain.com {
    redir https://www.yourdomain.com{uri} permanent
}

# Main site configuration
www.yourdomain.com {
    # Authinator backend
    handle /api/auth/* {
        reverse_proxy localhost:8001
    }
    handle /api/services/* {
        reverse_proxy localhost:8001
    }
    handle /accounts/* {
        reverse_proxy localhost:8001
    }
    handle /admin/* {
        reverse_proxy localhost:8001
    }
    
    # USERinator backend
    handle /api/users/* {
        reverse_proxy localhost:8004
    }
    handle /api/companies/* {
        reverse_proxy localhost:8004
    }
    handle /api/roles/* {
        reverse_proxy localhost:8004
    }
    handle /api/invitations/* {
        reverse_proxy localhost:8004
    }
    
    # RMAinator backend
    handle /api/rma/* {
        reverse_proxy localhost:8002
    }
    
    # Fulfilinator backend
    handle /api/fulfil/* {
        reverse_proxy localhost:8003
    }
    
    # Frontend (serve production build or proxy to Vite)
    handle {
        # Production: serve static files
        root * /path/to/frontend/dist
        try_files {path} /index.html
        file_server
        
        # Or development: proxy to Vite
        # reverse_proxy localhost:5173
    }
}
```

## Cloudflare Tunnel Deployment

Cloudflare Tunnel provides a secure way to expose your local server without opening ports.

### Installation

```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### Configuration

1. **Authenticate with Cloudflare:**
```bash
cloudflared tunnel login
```

2. **Create a tunnel:**
```bash
cloudflared tunnel create inator-tunnel
```

3. **Create configuration file** (`~/.cloudflared/config.yml`):
```yaml
tunnel: <TUNNEL_ID>
credentials-file: /Users/you/.cloudflared/<TUNNEL_ID>.json

ingress:
  # Route www subdomain
  - hostname: www.yourdomain.com
    service: http://localhost:8080
  
  # Route bare domain
  - hostname: yourdomain.com
    service: http://localhost:8080
  
  # Catch-all rule (required)
  - service: http_status:404
```

4. **Create DNS records:**
```bash
cloudflared tunnel route dns inator-tunnel www.yourdomain.com
cloudflared tunnel route dns inator-tunnel yourdomain.com
```

5. **Start the tunnel:**
```bash
cloudflared tunnel run inator-tunnel
```

### Running as a Service

**macOS (launchd):**
```bash
cloudflared service install
```

**Linux (systemd):**
```bash
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

## Environment Variable Reference

### Backend Variables (All Services)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEPLOY_DOMAIN` | No | (empty) | Deployment domain (e.g., `www.inatorapp.com`) |
| `DEPLOY_SCHEME` | No | `http` (or `https` if DEPLOY_DOMAIN set) | Protocol for OAuth callbacks |
| `ALLOWED_HOSTS` | No | `localhost,127.0.0.1` | Comma-separated hostnames (automatically includes DEPLOY_DOMAIN) |
| `CORS_ALLOWED_ORIGINS` | No | `http://localhost:8080` | Comma-separated origins (automatically includes DEPLOY_DOMAIN) |

### Authinator-Specific Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTEND_URL` | No | `http://localhost:8080` (or `https://DEPLOY_DOMAIN`) | Frontend URL for SSO redirects |

### Frontend Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_DEPLOY_DOMAIN` | No | (empty) | Deployment domain for Vite allowedHosts |

## What Gets Configured Automatically

When you set `DEPLOY_DOMAIN`, the platform automatically:

1. **Adds to ALLOWED_HOSTS:** Both `www.domain.com` and `domain.com`
2. **Adds to CORS_ALLOWED_ORIGINS:** Both variants with the correct scheme
3. **Adds to CSRF_TRUSTED_ORIGINS:** Both variants with the correct scheme
4. **Sets OAuth protocol:** Uses `DEPLOY_SCHEME` for callback URLs
5. **Configures SSO redirects:** Points to `FRONTEND_URL` or deployment domain
6. **Updates Django Site:** Sets Site.domain for OAuth providers
7. **Allows Vite hosts:** Accepts requests from deployment domain

## Troubleshooting

### SSO Redirect URI Mismatch

**Problem:** OAuth provider shows "redirect_uri_mismatch" error

**Solution:**
1. Verify `DEPLOY_DOMAIN` and `DEPLOY_SCHEME` are set correctly in Authinator `.env`
2. Run `task backend:manage -- setup_sso` to update Site domain
3. Check that OAuth provider redirect URIs match exactly (including trailing slash)
4. Ensure `ACCOUNT_DEFAULT_HTTP_PROTOCOL` matches your deployment (http/https)

### CORS Errors

**Problem:** Browser blocks requests with CORS errors

**Solution:**
1. Verify `DEPLOY_DOMAIN` is set in backend `.env` files
2. Check that `CORS_ALLOWED_ORIGINS` includes your domain
3. Restart backends after changing `.env`

### Vite HMR Not Working

**Problem:** Vite hot module replacement doesn't work behind tunnel

**Solution:**
1. Set `VITE_DEPLOY_DOMAIN` in `frontend/.env`
2. Restart the frontend dev server
3. For Cloudflare Tunnel, HMR may require WebSocket support (usually works by default)

### 403 Forbidden / CSRF Errors

**Problem:** POST requests fail with 403 CSRF verification failed

**Solution:**
1. Verify `DEPLOY_DOMAIN` is in `CSRF_TRUSTED_ORIGINS` (should be automatic)
2. Check that requests include `https://` scheme if using HTTPS
3. Ensure cookies are being set correctly (check `SESSION_COOKIE_SECURE` in production)

## Production Checklist

Before deploying to production:

- [ ] Set `DEBUG=False` in all backend `.env` files
- [ ] Generate strong `SECRET_KEY` for each backend (50+ characters)
- [ ] Set `DEPLOY_DOMAIN` and `DEPLOY_SCHEME=https` in all backends
- [ ] Set `FRONTEND_URL` in Authinator
- [ ] Set `VITE_DEPLOY_DOMAIN` in frontend
- [ ] Update OAuth provider redirect URIs to production domain
- [ ] Run `setup_sso` command to configure Django Site
- [ ] Configure production Caddyfile with your domain
- [ ] Set `SESSION_COOKIE_SECURE=True` for HTTPS
- [ ] Set `CSRF_COOKIE_SECURE=True` for HTTPS
- [ ] Use PostgreSQL instead of SQLite for databases
- [ ] Configure proper email backend (SMTP)
- [ ] Set up SSL/TLS certificates (Caddy handles this automatically)
- [ ] Configure backup strategy
- [ ] Set up monitoring and logging

## Architecture Changes Summary

The following changes were made to support external domain deployment:

1. **SSO Token Capture** - Frontend now reads `?token=` from URL after OAuth redirect
2. **Configurable Hosts** - Replaced hardcoded `localhost` with env vars
3. **Dynamic CORS** - Automatically includes deployment domain in CORS origins
4. **SSO Callbacks** - Uses `FRONTEND_URL` instead of hardcoded URLs
5. **Django Sites** - Automatically configures Site domain from `DEPLOY_DOMAIN`
6. **OAuth Protocol** - Uses `DEPLOY_SCHEME` for http/https in callbacks
7. **Vite Hosts** - Accepts requests from deployment domain
8. **Bare Domain Redirect** - Documented in Caddyfile for www redirects

## Support

For issues or questions:
- Check logs in `logs/` directory
- Review environment variables in `.env` files
- Verify OAuth provider configurations
- Check Caddy logs: `journalctl -u caddy -f` (systemd) or `tail -f logs/gateway.log`
