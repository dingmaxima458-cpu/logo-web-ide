#!/bin/bash
# Get EC2 Public Address for VITE_API_URL configuration

echo "🔍 Detecting server address..."
echo ""

# Try to get EC2 metadata (works on EC2 instances)
PUBLIC_DNS=$(curl -s --connect-timeout 2 http://169.254.169.254/latest/meta-data/public-hostname 2>/dev/null)
PUBLIC_IP=$(curl -s --connect-timeout 2 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null)

if [ -n "$PUBLIC_DNS" ]; then
    echo "✅ EC2 Instance Detected"
    echo ""
    echo "📍 Public DNS:  $PUBLIC_DNS"
    echo "📍 Public IP:   $PUBLIC_IP"
    echo ""
    echo "🔧 Update your .env file with:"
    echo ""
    echo "   VITE_API_URL=http://$PUBLIC_DNS:3001"
    echo ""
    echo "   Or use IP:"
    echo "   VITE_API_URL=http://$PUBLIC_IP:3001"
    echo ""
else
    # Not on EC2, try to get public IP
    PUBLIC_IP=$(curl -s --connect-timeout 2 http://checkip.amazonaws.com 2>/dev/null)
    
    if [ -n "$PUBLIC_IP" ]; then
        echo "🌐 Server detected (non-EC2)"
        echo ""
        echo "📍 Public IP: $PUBLIC_IP"
        echo ""
        echo "🔧 Update your .env file with:"
        echo ""
        echo "   VITE_API_URL=http://$PUBLIC_IP:3001"
        echo ""
    else
        echo "💻 Local development detected"
        echo ""
        echo "🔧 For local development, use:"
        echo ""
        echo "   VITE_API_URL=http://localhost:3001"
        echo ""
    fi
fi

echo "📝 To update .env:"
echo "   nano .env"
echo ""
echo "   Then find VITE_API_URL and update it with the URL above"
echo ""
echo "🔄 After updating, restart the frontend:"
echo "   lsof -ti:3000 | xargs kill -9 2>/dev/null"
echo "   npm start"
echo ""

