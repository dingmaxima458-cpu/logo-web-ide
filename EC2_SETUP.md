# EC2 Setup Guide

## Quick Fix for Network Errors

### Problem
Frontend can't connect to backend on EC2 - "Network Error"

### Solution

#### Option 1: Use Relative URLs (Recommended for Production with Nginx)

The frontend is now configured to use relative URLs by default. This works when:
- Using Vite dev server with proxy (development)
- Using nginx reverse proxy (production)

**No changes needed** - just use nginx as shown in DEPLOYMENT.md

#### Option 2: Direct Access (Frontend and Backend on Different Ports)

If accessing directly via EC2 hostname:port, set environment variable:

**On EC2 server:**
```bash
# Create .env file in frontend directory
cd frontend
echo "VITE_API_URL=http://ec2-18-217-144-130.us-east-2.compute.amazonaws.com:8000" > .env

# Restart frontend
npm start
```

**Or set when starting:**
```bash
VITE_API_URL=http://ec2-18-217-144-130.us-east-2.compute.amazonaws.com:8000 npm start
```

### Backend Configuration

The backend now listens on `0.0.0.0` (all interfaces), so it accepts external connections.

**Verify backend is accessible:**
```bash
# From EC2 server
curl http://localhost:8000/api/health

# From your local machine (replace with your EC2 IP/DNS)
curl http://ec2-18-217-144-130.us-east-2.compute.amazonaws.com:8000/api/health
```

### Security Group Configuration

Ensure your EC2 security group allows:
- **Inbound TCP 3000** (frontend) - Source: 0.0.0.0/0 or your IP
- **Inbound TCP 8000** (backend) - Source: 0.0.0.0/0 or your IP

### Testing

1. **Test backend directly:**
   ```bash
   curl http://ec2-18-217-144-130.us-east-2.compute.amazonaws.com:8000/api/health
   ```
   Should return: `{"status":"healthy",...}`

2. **Test frontend:**
   Open browser: `http://ec2-18-217-144-130.us-east-2.compute.amazonaws.com:3000`

3. **Check browser console:**
   - Open DevTools (F12)
   - Check Network tab for failed requests
   - Look for CORS errors or connection refused

### Common Issues

**Issue: "Network Error" or "Connection Refused"**
- Backend not running: `ps aux | grep node`
- Backend not listening on 0.0.0.0: Check server.js line 392
- Security group blocking port 8000
- Firewall blocking: `sudo ufw status`

**Issue: CORS Error**
- Backend CORS should allow EC2 host (already configured)
- Check browser console for specific CORS error
- Verify backend logs show the request

**Issue: "Failed to fetch"**
- Check if VITE_API_URL is set correctly
- Verify the URL is accessible from browser (try in new tab)
- Check for HTTPS/HTTP mismatch

### Recommended: Use Nginx Reverse Proxy

For production, use nginx to serve both on port 80:

```nginx
server {
    listen 80;
    server_name ec2-18-217-144-130.us-east-2.compute.amazonaws.com;

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

Then access via: `http://ec2-18-217-144-130.us-east-2.compute.amazonaws.com` (no ports needed)

