# EC2 Port Management Guide

## 🔍 Check What's Using Ports

### Check specific port (e.g., 3001)
```bash
# Linux/Mac
lsof -i :3001

# Or using netstat
netstat -tulpn | grep 3001

# Or using ss (modern alternative)
ss -tulpn | grep 3001
```

### Check multiple ports at once
```bash
lsof -i :3000 -i :3001 -i :3002 -i :5173
```

### See all Node.js processes
```bash
ps aux | grep node
```

## 🛑 Kill Processes Properly

### Kill process by port
```bash
# Kill whatever is using port 3001
lsof -ti:3001 | xargs kill -9

# Kill multiple ports
lsof -ti:3000,3001,3002 | xargs kill -9
```

### Kill by process ID (PID)
```bash
# If lsof shows PID 12345
kill -9 12345
```

### Kill all Node processes (nuclear option)
```bash
pkill -9 node
```

## 🔄 Restart Application Properly

### Stop everything first
```bash
# From your project directory
# Press Ctrl+C to stop npm start

# Then make sure everything is killed
lsof -ti:3000,3001,3002,5173 | xargs kill -9 2>/dev/null
pkill -9 node 2>/dev/null
```

### Restart cleanly
```bash
npm start
```

## 📊 Monitor Running Processes

### Watch processes in real-time
```bash
# See all node processes
watch -n 1 'ps aux | grep node'

# See port usage
watch -n 1 'lsof -i :3001'
```

### Check logs
```bash
# If running with nohup
tail -f nohup.out

# If using pm2 (recommended for production)
pm2 logs
```

---

## 🚨 The Real Problem: localhost vs EC2 Public Address

Your error is happening because:

```
Frontend Config: VITE_API_URL=http://localhost:3001
User's Browser: http://ec2-x-x-x.amazonaws.com:3002
Browser tries:   http://localhost:3001 ❌ (user's computer, not EC2!)
```

**The frontend is trying to connect to the user's local machine, not your EC2 server!**

---

## ✅ Fix for EC2 Deployment

### Option 1: Use Relative URLs (Recommended)

**Update `.env` on EC2:**
```env
# Backend
PORT=3001
HOST=0.0.0.0

# Frontend - REMOVE VITE_API_URL or set to empty
VITE_API_URL=

# This makes frontend use relative URLs like /api/v1/projects
# Which will automatically go to the same domain:port as the frontend
```

### Option 2: Use EC2 Public DNS/IP

**Get your EC2 public address:**
```bash
# Get public IP
curl http://checkip.amazonaws.com

# Or get public DNS
ec2-metadata --public-hostname
```

**Update `.env` with your EC2 address:**
```env
# Use your actual EC2 public DNS or IP
VITE_API_URL=http://ec2-18-217-144-130.us-east-2.compute.amazonaws.com:3001
# Or
VITE_API_URL=http://YOUR_EC2_PUBLIC_IP:3001
```

### Option 3: Use Nginx Reverse Proxy (Production Best Practice)

Serve both frontend and backend through Nginx on port 80/443:
- `http://your-ec2.com/` → Frontend (port 5173 internally)
- `http://your-ec2.com/api/` → Backend (port 3001 internally)

---

## 🔧 Quick Fix Commands

### 1. Stop everything
```bash
cd /path/to/your/logoWeb
# Press Ctrl+C if npm start is running

# Kill any remaining processes
lsof -ti:3000,3001,3002,5173 | xargs kill -9 2>/dev/null
```

### 2. Update .env
```bash
nano .env

# Change this line:
# FROM: VITE_API_URL=http://localhost:3001
# TO:   VITE_API_URL=http://YOUR_EC2_PUBLIC_DNS:3001
# OR:   VITE_API_URL=
```

### 3. Restart
```bash
npm start
```

---

## 🎯 For Production EC2 Setup

### Use PM2 (Process Manager)
```bash
# Install PM2
npm install -g pm2

# Start backend
cd backend
pm2 start server.js --name logo-backend

# Start frontend
cd ../frontend
pm2 start "npm run dev" --name logo-frontend

# View logs
pm2 logs

# Restart
pm2 restart all

# Stop
pm2 stop all

# Auto-restart on reboot
pm2 startup
pm2 save
```

### Configure Security Groups
Make sure your EC2 Security Group allows:
- Inbound TCP port 3001 (backend)
- Inbound TCP port 5173 or 3002 (frontend)
- Or port 80/443 if using Nginx

### Check with curl
```bash
# Test backend from EC2
curl http://localhost:3001/api/health

# Test backend from outside (use public IP)
curl http://YOUR_EC2_PUBLIC_IP:3001/api/health
```

---

## 📝 Debugging Checklist

- [ ] Backend is running on 0.0.0.0:3001 (not 127.0.0.1)
- [ ] Frontend is running and accessible
- [ ] EC2 Security Group allows inbound on ports 3001 and 5173/3002
- [ ] `.env` has correct `VITE_API_URL` (EC2 public address, not localhost)
- [ ] Browser can access `http://YOUR_EC2_IP:3001/api/health`
- [ ] No firewall blocking ports
- [ ] Frontend rebuilt after changing `.env` (Vite needs restart)

