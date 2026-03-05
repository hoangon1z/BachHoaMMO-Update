#!/bin/bash

# =============================================================================
# Google Indexing API Setup Script
# Tự động setup Google Service Account cho BachHoaMMO
# =============================================================================

set -e  # Exit on error

echo "🚀 BachHoaMMO - Google Indexing API Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running from correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the backend directory${NC}"
    echo "   cd /var/BachHoaMMO/BachHoaMMO/backend"
    exit 1
fi

echo "Step 1: Checking prerequisites..."
echo "-----------------------------------"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating...${NC}"
    touch .env
fi

# Create config directory if not exists
if [ ! -d "config" ]; then
    echo -e "${YELLOW}📁 Creating config directory...${NC}"
    mkdir -p config
fi

echo ""
echo "Step 2: Google Service Account JSON"
echo "-----------------------------------"
echo -e "${YELLOW}📝 Please download the Service Account JSON from Google Cloud Console${NC}"
echo ""
echo "Instructions:"
echo "1. Go to: https://console.cloud.google.com"
echo "2. Navigate to: APIs & Services → Credentials"
echo "3. Create Service Account (if not exists)"
echo "4. Download JSON key"
echo ""
read -p "Have you downloaded the JSON file? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Please download the JSON file first${NC}"
    exit 1
fi

echo ""
read -p "Enter path to downloaded JSON file: " JSON_PATH

# Validate JSON file exists
if [ ! -f "$JSON_PATH" ]; then
    echo -e "${RED}❌ File not found: $JSON_PATH${NC}"
    exit 1
fi

# Copy JSON to config directory
echo -e "${GREEN}✅ Copying JSON to config directory...${NC}"
cp "$JSON_PATH" config/google-service-account.json

# Set permissions (read-only for owner)
chmod 600 config/google-service-account.json
echo -e "${GREEN}✅ Permissions set (600)${NC}"

# Extract client_email from JSON
CLIENT_EMAIL=$(grep -o '"client_email"[[:space:]]*:[[:space:]]*"[^"]*"' config/google-service-account.json | sed 's/"client_email"[[:space:]]*:[[:space:]]*"\([^"]*\)"/\1/')

echo ""
echo "Step 3: Updating .env file"
echo "-----------------------------------"

# Check if GOOGLE_SERVICE_ACCOUNT_PATH already exists in .env
if grep -q "GOOGLE_SERVICE_ACCOUNT_PATH" .env; then
    echo -e "${YELLOW}⚠️  GOOGLE_SERVICE_ACCOUNT_PATH already exists in .env${NC}"
    read -p "Overwrite? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sed -i '/GOOGLE_SERVICE_ACCOUNT_PATH/d' .env
    fi
fi

# Add to .env
echo "" >> .env
echo "# Google Indexing API" >> .env
echo "GOOGLE_SERVICE_ACCOUNT_PATH=./config/google-service-account.json" >> .env

# Check if NEXT_PUBLIC_SITE_URL exists
if ! grep -q "NEXT_PUBLIC_SITE_URL" .env; then
    echo "NEXT_PUBLIC_SITE_URL=https://bachhoammo.store" >> .env
fi

echo -e "${GREEN}✅ .env updated${NC}"

echo ""
echo "Step 4: Verify Google Search Console Access"
echo "-----------------------------------"
echo -e "${YELLOW}📝 IMPORTANT: Add Service Account to Google Search Console${NC}"
echo ""
echo "Service Account Email:"
echo -e "${GREEN}$CLIENT_EMAIL${NC}"
echo ""
echo "Instructions:"
echo "1. Go to: https://search.google.com/search-console"
echo "2. Select property: https://bachhoammo.store"
echo "3. Settings → Users and permissions"
echo "4. Add user: $CLIENT_EMAIL"
echo "5. Permission: Owner"
echo ""
read -p "Press Enter when done..." -r

echo ""
echo "Step 5: Installing dependencies"
echo "-----------------------------------"

# Check if googleapis is installed
if ! npm list googleapis &>/dev/null; then
    echo -e "${YELLOW}📦 Installing googleapis...${NC}"
    npm install googleapis
else
    echo -e "${GREEN}✅ googleapis already installed${NC}"
fi

echo ""
echo "Step 6: Summary"
echo "-----------------------------------"
echo -e "${GREEN}✅ Setup completed successfully!${NC}"
echo ""
echo "Configuration:"
echo "  - JSON file: ./config/google-service-account.json"
echo "  - Service Account: $CLIENT_EMAIL"
echo "  - .env configured"
echo ""
echo "Next steps:"
echo "1. Restart backend: pm2 restart backend"
echo "2. Check logs: pm2 logs backend --lines 20"
echo "3. Look for: ✅ Google Indexing API initialized successfully"
echo ""
echo "Test with:"
echo "  - Create a new product"
echo "  - Check logs for: 🔔 Notifying Google about new product"
echo ""
echo -e "${GREEN}🎉 All done!${NC}"
