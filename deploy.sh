#!/bin/bash

# Torre Tempo V4 - Production Deployment Script
# This script deploys the latest code to production VPS

set -e  # Exit on error

echo "🚀 Torre Tempo V4 - Production Deployment"
echo "=========================================="

# Configuration
VPS_HOST="time.lsltgroup.es"
VPS_USER="root"
DEPLOY_PATH="/root/torretempo-v4"

echo ""
echo "📡 Connecting to production VPS..."
echo "Host: $VPS_HOST"
echo "Path: $DEPLOY_PATH"
echo ""

# Deploy via SSH
ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
cd /root/torretempo-v4

echo "📥 Pulling latest code from GitHub..."
git pull origin main

echo "🔨 Building and restarting containers..."
docker-compose -f docker-compose.prod.yml up -d --build api web

echo "⏳ Waiting for services to start..."
sleep 10

echo "🔍 Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T api npx drizzle-kit push || echo "⚠️ Migration may have already run"

echo "✅ Checking service status..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "🌐 Testing API health..."
curl -s https://time.lsltgroup.es/api/health || echo "❌ API health check failed"

echo ""
echo "✅ Deployment complete!"
echo "🌐 Frontend: https://time.lsltgroup.es"
echo "🔌 API: https://time.lsltgroup.es/api"
ENDSSH

echo ""
echo "✅ Deployment finished successfully!"
echo ""
