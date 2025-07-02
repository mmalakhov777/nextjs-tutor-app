#!/bin/bash

# Script to convert all slide images in the database to WebP format

echo "🎨 WebP Image Conversion Script"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: This script must be run from the project root directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found. Installing dependencies..."
    npm install
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Please create one with CHAT_DATABASE_URL"
    exit 1
fi

# Check if CHAT_DATABASE_URL is set
if ! grep -q "CHAT_DATABASE_URL" .env; then
    echo "❌ Error: CHAT_DATABASE_URL not found in .env file"
    exit 1
fi

echo "✅ Environment check passed"
echo ""

# Run the conversion script
echo "🚀 Starting WebP conversion..."
echo ""

node scripts/convert-images-to-webp.js

echo ""
echo "✅ Script completed!" 