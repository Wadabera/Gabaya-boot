# Gebeya Boot - Production Deployment Guide

This guide covers deploying the Gebeya Boot platform to production for real-world use.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Database Setup](#database-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Telegram Bot Configuration](#telegram-bot-configuration)
7. [Environment Variables](#environment-variables)
8. [Security Hardening](#security-hardening)
9. [Monitoring & Logging](#monitoring--logging)
10. [Backup Strategy](#backup-strategy)
11. [Performance Optimization](#performance-optimization)

## Prerequisites

- Domain name (e.g., `gebeya-boot.et`)
- SSL certificate (Let's Encrypt recommended)
- Cloud server (AWS, DigitalOcean, Hetzner, etc.)
- PostgreSQL database (managed or self-hosted)
- Redis instance (for caching and queues)
- Telegram bot token (see [TELEGRAM_BOT_SETUP.md](./TELEGRAM_BOT_SETUP.md))
- SMS provider account (optional, for Ethiopian phone verification)

## Infrastructure Setup

### Recommended Server Specifications

**Minimum (for pilot with 10-50 shops):**
- 2 CPU cores
- 4 GB RAM
- 40 GB SSD storage
- Ubuntu 22.04 LTS

**Production (for 100+ shops):**
- 4 CPU cores
- 8 GB RAM
- 100 GB SSD storage
- Ubuntu 22.04 LTS

### Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Certbot (for SSL)
sudo apt install -y certbot python3-certbot-nginx
```

## Database Setup

### Option 1: Self-Hosted PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE gebeya_boot;
CREATE USER gebeya_user WITH PASSWORD 'strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE gebeya_boot TO gebeya_user;
\q
```

### Option 2: Managed Database (Recommended)

Use services like:
- **Neon.tech** (PostgreSQL serverless)
- **Supabase** (PostgreSQL with auth)
- **AWS RDS** (Managed PostgreSQL)
- **DigitalOcean Managed Database**

### Run Migrations

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

## Backend Deployment

### 1. Clone Repository

```bash
cd /var/www
git clone <your-repo-url> gebeya-boot
cd gebeya-boot/backend
```

### 2. Install Dependencies

```bash
npm install --production
```

### 3. Configure Environment Variables

Create `.env` file:

```env
NODE_ENV=production
PORT=3000
API_PREFIX=api

# Database
DATABASE_URL=postgresql://gebeya_user:password@localhost:5432/gebeya_boot?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Secrets (Generate strong random strings)
JWT_SECRET=generate-strong-random-string-32-chars
JWT_EXPIRATION=7d
ADMIN_JWT_SECRET=generate-another-strong-random-string
ADMIN_JWT_EXPIRATION=1d

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=random-32-char-secret
TELEGRAM_POLLING=false

# AI Service
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
AI_MODEL_NAME=gemini-1.5-flash

# SMS Provider (Optional)
SMS_PROVIDER=afromessage
AFROMESSAGE_API_KEY=your_api_key
AFROMESSAGE_SENDER_ID=GebeyaBoot

# File Storage
STORAGE_ADAPTER=s3
# Configure AWS S3 or similar
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=gebeya-boot-uploads
STORAGE_PUBLIC_URL=https://your-bucket.s3.amazonaws.com

# Admin Initial Account
ADMIN_INITIAL_EMAIL=admin@your-domain.com
ADMIN_INITIAL_PASSWORD=StrongPassword123!
ADMIN_INITIAL_PHONE=+251911000000
```

### 4. Build Application

```bash
npm run build
```

### 5. Start with PM2

```bash
pm2 start dist/src/main.js --name gebeya-backend
pm2 save
pm2 startup
```

## Frontend Deployment

### 1. Build Frontend

```bash
cd ../frontend
npm install
npm run build
```

### 2. Configure Environment Variables

Create `.env.production`:

```env
NEXT_PUBLIC_API_URL=https://your-domain.com/api
NEXT_PUBLIC_BOT_USERNAME=your_bot_username
```

### 3. Start with PM2

```bash
pm2 start npm --name gebeya-frontend -- start
pm2 save
```

## Nginx Configuration

Create `/etc/nginx/sites-available/gebeya-boot`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # File Uploads (increase limit)
    client_max_body_size 10M;

    # Static files (uploads)
    location /uploads {
        alias /var/www/gebeya-boot/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/gebeya-boot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL Certificate Setup

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Follow the prompts and choose to redirect HTTP to HTTPS.

## Telegram Bot Configuration

Follow the detailed guide in [TELEGRAM_BOT_SETUP.md](./TELEGRAM_BOT_SETUP.md).

Key steps:
1. Create bot via @BotFather
2. Set bot description and commands
3. Configure webhook URL
4. Test with shop deep links

## Security Hardening

### 1. Firewall Configuration

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. Disable Root SSH Login

Edit `/etc/ssh/sshd_config`:
```
PermitRootLogin no
PasswordAuthentication no
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

### 3. Database Security

- Use strong passwords
- Restrict PostgreSQL to localhost
- Enable SSL for database connections
- Regular security updates

### 4. API Security

- Rate limiting (already implemented)
- Input validation (already implemented)
- SQL injection prevention (Prisma handles this)
- XSS protection (Next.js handles this)
- CSRF protection (Next.js handles this)

## Monitoring & Logging

### 1. Application Logs

PM2 logs:
```bash
pm2 logs gebeya-backend
pm2 logs gebeya-frontend
```

Log rotation:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 2. System Monitoring

Install monitoring tools:
```bash
sudo apt install -y htop iotop
```

### 3. Error Tracking (Optional)

Integrate with Sentry for error tracking:

```bash
npm install @sentry/node
```

Configure in `backend/src/main.ts`:
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

## Backup Strategy

### Database Backups

Create backup script `/var/backups/gebeya-backup.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/gebeya"
mkdir -p $BACKUP_DIR

# PostgreSQL backup
pg_dump -U gebeya_user gebeya_boot > $BACKUP_DIR/gebeya_$DATE.sql

# Compress
gzip $BACKUP_DIR/gebeya_$DATE.sql

# Keep last 7 days
find $BACKUP_DIR -name "gebeya_*.sql.gz" -mtime +7 -delete
```

Make executable and add to cron:
```bash
chmod +x /var/backups/gebeya-backup.sh
crontab -e
```

Add:
```
0 2 * * * /var/backups/gebeya-backup.sh
```

### File Backups

Backup uploaded files:
```bash
rsync -avz /var/www/gebeya-boot/backend/uploads /var/backups/uploads
```

## Performance Optimization

### 1. Enable Redis Caching

Already implemented in the codebase. Ensure Redis is running:

```bash
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 2. Nginx Caching

Add to Nginx config:
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=60m;

location /api {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_key "$scheme$request_method$host$request_uri";
    # ... rest of config
}
```

### 3. Database Indexing

Prisma handles basic indexing. Add custom indexes in `schema.prisma` if needed for slow queries.

### 4. CDN for Static Assets

Use Cloudflare or AWS CloudFront for:
- Frontend static files
- Product images
- QR codes

## Post-Deployment Checklist

- [ ] Database migrations run successfully
- [ ] Seed data loaded (plans, admin account)
- [ ] Backend server running on PM2
- [ ] Frontend server running on PM2
- [ ] Nginx configured and SSL active
- [ ] Telegram bot webhook set correctly
- [ ] SMS provider configured (if using)
- [ ] File storage working (S3 or local)
- [ ] AI service configured (Gemini or OpenAI)
- [ ] Monitoring and logging set up
- [ ] Backup script configured
- [ ] Firewall configured
- [ ] SSL certificate auto-renewal enabled
- [ ] Test all user flows end-to-end
- [ ] Load test with simulated traffic

## Scaling Considerations

### Horizontal Scaling

When you need to scale:

1. **Load Balancer**: Use Nginx or HAProxy
2. **Multiple Backend Instances**: Run backend on multiple servers
3. **Database Read Replicas**: For read-heavy workloads
4. **Redis Cluster**: For distributed caching
5. **CDN**: For static assets globally

### Vertical Scaling

- Increase server CPU/RAM
- Optimize database queries
- Add database indexes
- Implement connection pooling

## Troubleshooting

### Backend not starting
```bash
pm2 logs gebeya-backend --lines 100
```

### Database connection errors
- Check DATABASE_URL
- Verify PostgreSQL is running
- Check firewall rules

### Telegram bot not responding
- Verify webhook URL is HTTPS
- Check bot token is correct
- Review backend logs for errors

### File upload failing
- Check storage permissions
- Verify S3 credentials (if using)
- Check Nginx client_max_body_size

## Maintenance

### Regular Tasks

**Daily:**
- Check error logs
- Monitor server resources

**Weekly:**
- Review backup integrity
- Check disk space
- Review user feedback

**Monthly:**
- Update dependencies
- Review security patches
- Database maintenance (VACUUM, ANALYZE)

### Updates

```bash
# Pull latest code
cd /var/www/gebeya-boot
git pull

# Update backend
cd backend
npm install
npm run build
pm2 restart gebeya-backend

# Update frontend
cd ../frontend
npm install
npm run build
pm2 restart gebeya-frontend
```

## Support

For issues or questions:
- Check logs: `pm2 logs`
- Review documentation in `/docs`
- Check GitHub issues
- Contact support team

---

**Last Updated**: October 2026
**Version**: 1.0.0
