# Deployment Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- PM2 (`npm install -g pm2`)
- (Optional) Nginx for reverse proxy + SSL

---

## 1. Environment Variables

Copy the example and fill in all values:

```bash
cp .env.production.example .env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Set to `production` |
| `PORT` | Backend port (default 5000) |
| `JWT_SECRET` | Min 32-char random string |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port (default 5432) |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `FRONTEND_URL` | Frontend origin for CORS (e.g. `https://yourdomain.com`) |

Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 2. Database Setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE elearning;"

# Run schema
psql -U postgres -d elearning -f schema.sql

# (Optional) Seed test data
psql -U postgres -d elearning -f seed_data.sql
```

---

## 3. Install Dependencies

```bash
npm install --production
```

---

## 4. Start with PM2

```bash
# Start in production mode
pm2 start ecosystem.config.js --env production

# Save process list (auto-restart on reboot)
pm2 save
pm2 startup
```

Useful PM2 commands:
```bash
pm2 status          # Check process status
pm2 logs            # View logs
pm2 restart all     # Restart all processes
pm2 reload all      # Zero-downtime reload
pm2 stop all        # Stop all processes
```

---

## 5. Frontend Build & Deploy

```bash
# In the frontend directory
npm install
npm run build

# Start Next.js production server
npm start
```

Or serve the `frontend/.next` output via Nginx.

---

## 6. Nginx Configuration (Recommended)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:5000;
    }

    # Uploaded files
    location /uploads/ {
        proxy_pass http://localhost:5000;
    }
}
```

---

## 7. SSL Certificate (Let's Encrypt)

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
```

---

## 8. Log Files

Logs are written to `backend/logs/`:
- `combined-YYYY-MM-DD.log` — all requests and info
- `error-YYYY-MM-DD.log` — errors only
- PM2 logs: `pm2-out.log`, `pm2-error.log`

Logs rotate daily and are kept for 14 days.

---

## 9. Database Backups

Set up a daily cron job:

```bash
# /etc/cron.d/elearning-backup
0 2 * * * postgres pg_dump elearning | gzip > /backups/elearning-$(date +\%Y\%m\%d).sql.gz
# Keep 30 days
0 3 * * * find /backups -name "elearning-*.sql.gz" -mtime +30 -delete
```

---

## 10. Health Monitoring

Check health endpoint:
```bash
curl https://yourdomain.com/health
```

Expected response:
```json
{ "status": "healthy", "uptime": 3600, "version": "1.0.0", "timestamp": "..." }
```

---

## Troubleshooting

**Backend won't start**
- Check `pm2 logs elearning-api` for errors
- Verify all env vars are set: `node -e "require('dotenv').config(); console.log(process.env.DB_HOST)"`
- Test DB connection: `psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1"`

**CORS errors in browser**
- Ensure `FRONTEND_URL` in `.env` exactly matches the frontend origin (no trailing slash)
- Verify `credentials: true` in CORS config

**Cookie not being sent**
- Ensure frontend uses `credentials: 'include'` on all fetch calls
- In production, cookie requires `secure: true` — must use HTTPS
- Check `sameSite` setting matches your deployment (use `'none'` for cross-origin with HTTPS)

**Rate limit 429 errors**
- Login: 5 attempts per 15 minutes per IP
- API: 100 requests per 15 minutes per IP
- Wait for the window to reset or adjust limits in `server.js`

**File uploads failing**
- Check `backend/uploads/videos/` directory exists and is writable
- Default limit is 500MB per video — adjust in `lessons.js` if needed
