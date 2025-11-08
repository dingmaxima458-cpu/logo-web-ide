# Deployment Guide

## EC2 Deployment

### Prerequisites
- EC2 instance with Node.js 16+ installed
- Security groups configured to allow:
  - Port 3000 (frontend)
  - Port 8000 (backend)
  - Or use a reverse proxy (nginx) on port 80/443

### Configuration

#### 1. Environment Variables

Create `.env` files for configuration:

**Backend `.env`:**
```bash
NODE_ENV=production
PORT=8000
```

**Frontend `.env`:**
```bash
VITE_API_URL=http://localhost:8000
VITE_ALLOWED_HOST=ec2-18-217-144-130.us-east-2.compute.amazonaws.com
```

#### 2. Update Vite Config (if needed)

The `vite.config.ts` already includes EC2 host support. If you need to add a specific host:

```typescript
allowedHosts: [
  'your-ec2-host.compute.amazonaws.com'
]
```

#### 3. Build and Deploy

```bash
# Install dependencies
npm run install:all

# Build frontend
cd frontend
npm run build

# Start backend (production)
cd ../backend
NODE_ENV=production npm start

# Or use PM2 for process management
npm install -g pm2
pm2 start backend/server.js --name logo-backend
pm2 start "npm start" --name logo-frontend --cwd frontend
```

### Using Nginx as Reverse Proxy (Recommended)

This allows you to serve on port 80/443 and handle both frontend and backend:

**Nginx configuration (`/etc/nginx/sites-available/logo-web-ide`):**
```nginx
server {
    listen 80;
    server_name your-ec2-host.compute.amazonaws.com;

    # Frontend
    location / {
        root /path/to/logoWeb/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/logo-web-ide /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Security Considerations

1. **CORS**: Backend CORS is configured to allow EC2 hosts. In production, you may want to restrict to specific domains.

2. **Firewall**: Ensure EC2 security groups only allow necessary ports.

3. **HTTPS**: Use Let's Encrypt with Certbot for SSL certificates:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

4. **Process Management**: Use PM2 or systemd to keep services running:
```bash
# PM2
pm2 startup
pm2 save

# Or systemd
sudo systemctl enable logo-backend
sudo systemctl enable logo-frontend
```

### Troubleshooting

**Vite host blocked error:**
- Check `vite.config.ts` has your EC2 host in `allowedHosts`
- Ensure `server.host` is set to `'0.0.0.0'`

**CORS errors:**
- Verify backend CORS allows your EC2 origin
- Check browser console for specific CORS error

**Port not accessible:**
- Check EC2 security group rules
- Verify firewall settings (`sudo ufw status`)

