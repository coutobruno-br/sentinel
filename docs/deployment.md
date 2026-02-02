# Sentinel Engine - Deployment Guide

## Quick Start

### Option 1: Railway (Recommended)

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Connect your GitHub account

2. **Deploy from GitHub**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login
   railway login

   # Create new project
   railway init

   # Deploy
   railway up
   ```

3. **Configure Environment Variables**
   In Railway Dashboard → Variables, add:
   ```
   GITHUB_APP_ID=your_app_id
   GITHUB_PRIVATE_KEY=base64_encoded_key
   GITHUB_WEBHOOK_SECRET=your_webhook_secret
   PADDLE_API_KEY=pdl_...
   PADDLE_CLIENT_TOKEN=test_...
   PADDLE_WEBHOOK_SECRET=pdl_ntfset_...
   PADDLE_PRICE_ID_PRO=pri_...
   PADDLE_PRICE_ID_ENTERPRISE=pri_...
   PADDLE_ENVIRONMENT=sandbox
   SENTINEL_API_KEYS=key1,key2
   ```

4. **Get Your Domain**
   - Railway provides a free `*.up.railway.app` domain
   - Or add a custom domain in Settings

---

### Option 2: Fly.io

1. **Install Fly CLI**
   ```bash
   # macOS
   brew install flyctl

   # Windows
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

   # Linux
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login & Deploy**
   ```bash
   fly auth login
   fly launch  # First time only
   fly deploy
   ```

3. **Set Secrets**
   ```bash
   fly secrets set GITHUB_APP_ID=your_app_id
   fly secrets set GITHUB_PRIVATE_KEY="$(cat private-key.pem | base64)"
   fly secrets set GITHUB_WEBHOOK_SECRET=your_secret
   fly secrets set PADDLE_API_KEY=pdl_...
   # ... add all other secrets
   ```

4. **Create Persistent Volume**
   ```bash
   fly volumes create sentinel_data --size 1 --region iad
   ```

---

### Option 3: Docker (Self-hosted)

1. **Build Image**
   ```bash
   docker build -t sentinel-engine .
   ```

2. **Run with Docker Compose**
   ```bash
   # Create .env file with all variables
   cp env.example .env
   # Edit .env with your values

   docker-compose up -d
   ```

3. **Run Standalone**
   ```bash
   docker run -d \
     --name sentinel \
     -p 3000:3000 \
     -v sentinel-data:/app/data \
     -e GITHUB_APP_ID=xxx \
     -e GITHUB_PRIVATE_KEY=xxx \
     -e GITHUB_WEBHOOK_SECRET=xxx \
     -e PADDLE_API_KEY=xxx \
     sentinel-engine
   ```

---

## SSL/HTTPS Setup

### Railway/Fly.io
- SSL is automatic with provided domains
- Custom domains: Add DNS records as instructed

### Self-hosted (with Nginx)

1. **Get SSL Certificate**
   ```bash
   # Using certbot
   certbot certonly --standalone -d api.sentinel-engine.com
   ```

2. **Create nginx.conf**
   ```nginx
   events { worker_connections 1024; }

   http {
     upstream sentinel {
       server sentinel:3000;
     }

     server {
       listen 80;
       server_name api.sentinel-engine.com;
       return 301 https://$server_name$request_uri;
     }

     server {
       listen 443 ssl;
       server_name api.sentinel-engine.com;

       ssl_certificate /etc/nginx/certs/fullchain.pem;
       ssl_certificate_key /etc/nginx/certs/privkey.pem;

       location / {
         proxy_pass http://sentinel;
         proxy_set_header Host $host;
         proxy_set_header X-Real-IP $remote_addr;
         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
         proxy_set_header X-Forwarded-Proto $scheme;
       }
     }
   }
   ```

3. **Run with Nginx**
   ```bash
   docker-compose --profile with-nginx up -d
   ```

---

## Post-Deployment Checklist

### 1. Update GitHub App Webhook URL
- Go to GitHub App Settings
- Set Webhook URL to: `https://your-domain.com/webhook/github-app`

### 2. Update Paddle Webhook URL
- Go to Paddle Dashboard → Developer Tools → Notifications
- Set webhook URL to: `https://your-domain.com/webhook/paddle`

### 3. Update Landing Page
- Edit `landing/js/app.js`
- Set `window.SENTINEL_API_URL = 'https://your-domain.com'`

### 4. Verify Health
```bash
curl https://your-domain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "sentinel",
  "version": "0.1.0"
}
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (production/development) |
| `DATABASE_PATH` | No | SQLite database path |
| `GITHUB_APP_ID` | Yes | GitHub App ID |
| `GITHUB_PRIVATE_KEY` | Yes | GitHub App private key (base64) |
| `GITHUB_WEBHOOK_SECRET` | Yes | GitHub webhook secret |
| `PADDLE_API_KEY` | Yes | Paddle API key |
| `PADDLE_CLIENT_TOKEN` | Yes | Paddle client-side token |
| `PADDLE_WEBHOOK_SECRET` | Yes | Paddle webhook secret |
| `PADDLE_ENVIRONMENT` | No | sandbox or production |
| `PADDLE_PRICE_ID_PRO` | Yes | Pro plan price ID |
| `PADDLE_PRICE_ID_ENTERPRISE` | Yes | Enterprise plan price ID |
| `SENTINEL_API_KEYS` | Yes | Comma-separated API keys |

---

## Monitoring & Logs

### Railway
```bash
railway logs
```

### Fly.io
```bash
fly logs
```

### Docker
```bash
docker logs sentinel-engine -f
```

---

## Scaling

### Railway
- Auto-scales based on traffic
- Configure in railway.json or dashboard

### Fly.io
```bash
# Scale to 2 machines
fly scale count 2

# Scale memory
fly scale memory 1024
```

### Docker
```bash
# Using Docker Swarm
docker service scale sentinel=3
```
