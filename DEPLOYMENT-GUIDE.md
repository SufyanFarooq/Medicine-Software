# 🚀 Universal Business Management System - Deployment Guide

**Complete deployment guide for production-ready business management software**

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Production Deployment](#production-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [SSL Configuration](#ssl-configuration)
8. [Monitoring & Logging](#monitoring--logging)
9. [Backup & Recovery](#backup--recovery)
10. [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### **System Requirements**
- **OS**: Ubuntu 20.04+ / CentOS 8+ / macOS 12+ / Windows 10+
- **CPU**: 2+ cores (4+ recommended for production)
- **RAM**: 4GB+ (8GB+ recommended for production)
- **Storage**: 20GB+ available space
- **Network**: Stable internet connection

### **Software Requirements**
- **Node.js**: 18.0.0 or higher
- **MongoDB**: 6.0 or higher
- **npm**: 8.0.0 or higher
- **Git**: Latest version
- **Docker**: 20.10+ (for containerized deployment)
- **Docker Compose**: 2.0+ (for multi-service deployment)

### **Domain & SSL**
- **Domain name** for your business
- **SSL certificate** (Let's Encrypt recommended)
- **DNS access** for configuration

## 🚀 Quick Start

### **1. Clone Repository**
```bash
git clone https://github.com/codebridge/ubms.git
cd ubms
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Environment Setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

### **4. Database Setup**
```bash
# Start MongoDB (if not running)
sudo systemctl start mongod

# Run setup scripts
npm run setup
```

### **5. Start Development Server**
```bash
npm run dev
```

**Visit**: `http://localhost:3000`

## 🏭 Production Deployment

### **Method 1: Traditional Deployment**

#### **Step 1: Server Preparation**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### **Step 2: Application Deployment**
```bash
# Clone application
git clone https://github.com/codebridge/ubms.git
cd ubms

# Install dependencies
npm install

# Build application
npm run build

# Set up environment
cp .env.example .env
nano .env
```

#### **Step 3: Process Management**
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start npm --name "ubms" -- start

# Save PM2 configuration
pm2 save
pm2 startup

# Monitor application
pm2 monit
```

### **Method 2: Docker Deployment (Recommended)**

#### **Step 1: Install Docker**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

#### **Step 2: Deploy with Docker Compose**
```bash
# Clone repository
git clone https://github.com/codebridge/ubms.git
cd ubms

# Create necessary directories
mkdir -p nginx/ssl nginx/logs uploads backups logs

# Generate SSL certificate (Let's Encrypt)
sudo certbot certonly --standalone -d yourdomain.com

# Copy SSL certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# Set permissions
sudo chown -R $USER:$USER nginx/ssl

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

## 🐳 Docker Deployment

### **Single Container Deployment**
```bash
# Build image
docker build -t ubms .

# Run container
docker run -d \
  --name ubms \
  -p 3000:3000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/ubms \
  -e JWT_SECRET=your_secret_key \
  ubms
```

### **Multi-Service Deployment**
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale ubms=3

# Stop services
docker-compose down
```

### **Production Docker Compose**
```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d

# With custom environment
docker-compose --env-file .env.prod up -d
```

## ⚙️ Environment Configuration

### **Environment Variables**
```env
# Application
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# Database
MONGODB_URI=mongodb://username:password@localhost:27017/ubms
DB_NAME=ubms

# Security
JWT_SECRET=your_super_secure_jwt_secret_here
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# Business Configuration
BUSINESS_TYPE=retail-store
DEFAULT_CURRENCY=Rs
TIMEZONE=Asia/Karachi

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Backup
BACKUP_ENABLED=true
BACKUP_FREQUENCY=daily
BACKUP_RETENTION_DAYS=30
```

### **Configuration Files**
```bash
# Copy example configuration
cp .env.example .env

# Edit configuration
nano .env

# Validate configuration
npm run config:validate
```

## 🗄️ Database Setup

### **MongoDB Installation**
```bash
# Ubuntu/Debian
sudo apt install -y mongodb-org

# CentOS/RHEL
sudo yum install -y mongodb-org

# macOS
brew install mongodb-community

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### **Database Initialization**
```bash
# Create database user
mongosh
use ubms
db.createUser({
  user: "ubms_user",
  pwd: "secure_password",
  roles: ["readWrite"]
})

# Run setup scripts
npm run setup
npm run seed-all
```

### **Database Backup**
```bash
# Manual backup
mongodump --db ubms --out ./backups/$(date +%Y%m%d)

# Automated backup
npm run backup:setup
npm run backup:schedule
```

## 🔒 SSL Configuration

### **Let's Encrypt SSL**
```bash
# Install Certbot
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **Nginx SSL Configuration**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 Monitoring & Logging

### **Application Monitoring**
```bash
# PM2 monitoring
pm2 monit
pm2 logs

# Docker monitoring
docker stats
docker logs ubms

# System monitoring
htop
iotop
```

### **Log Management**
```bash
# View application logs
tail -f logs/app.log

# View error logs
tail -f logs/error.log

# Log rotation
sudo logrotate /etc/logrotate.d/ubms
```

### **Health Checks**
```bash
# Application health
curl http://localhost:3000/api/health

# Database health
mongosh --eval "db.adminCommand('ping')"

# Docker health
docker inspect ubms --format='{{.State.Health.Status}}'
```

## 💾 Backup & Recovery

### **Automated Backups**
```bash
# Setup backup cron job
crontab -e

# Daily backup at 2 AM
0 2 * * * /usr/bin/node /path/to/ubms/scripts/backup.js

# Weekly backup on Sunday
0 2 * * 0 /usr/bin/node /path/to/ubms/scripts/backup.js --weekly
```

### **Backup Scripts**
```bash
# Manual backup
npm run backup:manual

# Restore from backup
npm run backup:restore -- --file=backup_20241201.zip

# List available backups
npm run backup:list
```

### **Cloud Backup**
```bash
# AWS S3 backup
npm run backup:cloud -- --provider=aws --bucket=ubms-backups

# Google Cloud backup
npm run backup:cloud -- --provider=gcp --bucket=ubms-backups
```

## 🚨 Troubleshooting

### **Common Issues**

#### **Application Won't Start**
```bash
# Check logs
npm run logs

# Check port availability
sudo netstat -tlnp | grep :3000

# Check dependencies
npm audit fix
```

#### **Database Connection Issues**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check connection string
echo $MONGODB_URI

# Test connection
mongosh $MONGODB_URI
```

#### **Docker Issues**
```bash
# Check container status
docker ps -a

# View container logs
docker logs ubms

# Restart container
docker restart ubms

# Rebuild container
docker-compose down
docker-compose up --build
```

### **Performance Issues**
```bash
# Check system resources
htop
df -h
free -h

# Check application performance
npm run analyze

# Database optimization
npm run db:optimize
```

### **Security Issues**
```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Check SSL certificate
openssl x509 -in nginx/ssl/fullchain.pem -text -noout
```

## 📚 Additional Resources

### **Documentation**
- [User Manual](USER-MANUAL.md)
- [API Reference](API-REFERENCE.md)
- [Configuration Guide](CONFIGURATION.md)

### **Support**
- **Email**: support@codebridge.com
- **Phone**: +92 308 2283845
- **GitHub Issues**: [Report Bugs](https://github.com/codebridge/ubms/issues)

### **Community**
- **Discord**: [Join Community](https://discord.gg/codebridge)
- **Forum**: [Community Forum](https://forum.codebridge.com)

---

**Need Help?** Contact our support team at support@codebridge.com or call +92 308 2283845

**Made with ❤️ by Codebridge Team**
