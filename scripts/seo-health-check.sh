#!/bin/bash

# =============================================================================
# SEO Health Check Script
# Kiểm tra tình trạng SEO của website BachHoaMMO
# =============================================================================

SITE_URL="${1:-https://bachhoammo.store}"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔍 BachHoaMMO SEO Health Check"
echo "================================"
echo "Site: $SITE_URL"
echo ""

# 1. Check Sitemap
echo "1️⃣ Checking Sitemap..."
echo "-----------------------------------"
SITEMAP_STATUS=$(curl -o /dev/null -s -w "%{http_code}" "$SITE_URL/sitemap.xml")
if [ "$SITEMAP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Sitemap accessible${NC} (HTTP $SITEMAP_STATUS)"
    
    # Count URLs in sitemap
    URL_COUNT=$(curl -s "$SITE_URL/sitemap.xml" | grep -o "<loc>" | wc -l)
    echo "   📊 Total URLs in sitemap: $URL_COUNT"
else
    echo -e "${RED}❌ Sitemap error${NC} (HTTP $SITEMAP_STATUS)"
fi
echo ""

# 2. Check Robots.txt
echo "2️⃣ Checking robots.txt..."
echo "-----------------------------------"
ROBOTS_STATUS=$(curl -o /dev/null -s -w "%{http_code}" "$SITE_URL/robots.txt")
if [ "$ROBOTS_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ robots.txt accessible${NC} (HTTP $ROBOTS_STATUS)"
    
    # Check if sitemap is referenced
    if curl -s "$SITE_URL/robots.txt" | grep -q "Sitemap:"; then
        echo -e "${GREEN}   ✅ Sitemap URL present in robots.txt${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Sitemap URL missing in robots.txt${NC}"
    fi
else
    echo -e "${RED}❌ robots.txt error${NC} (HTTP $ROBOTS_STATUS)"
fi
echo ""

# 3. Check Sample Product Page
echo "3️⃣ Checking Sample Product Page..."
echo "-----------------------------------"
# Get first product URL from sitemap
SAMPLE_PRODUCT=$(curl -s "$SITE_URL/sitemap.xml" | grep -o "https://[^<]*products/[^<]*" | head -1)

if [ -n "$SAMPLE_PRODUCT" ]; then
    echo "   Testing: $SAMPLE_PRODUCT"
    
    # Check HTTP status
    PRODUCT_STATUS=$(curl -o /dev/null -s -w "%{http_code}" "$SAMPLE_PRODUCT")
    if [ "$PRODUCT_STATUS" = "200" ]; then
        echo -e "${GREEN}   ✅ Product page accessible${NC} (HTTP $PRODUCT_STATUS)"
        
        # Check for meta tags
        PAGE_CONTENT=$(curl -s "$SAMPLE_PRODUCT")
        
        if echo "$PAGE_content" | grep -q "<meta property=\"og:"; then
            echo -e "${GREEN}   ✅ Open Graph tags present${NC}"
        else
            echo -e "${YELLOW}   ⚠️  Open Graph tags missing${NC}"
        fi
        
        if echo "$PAGE_CONTENT" | grep -q "application/ld+json"; then
            echo -e "${GREEN}   ✅ JSON-LD Schema present${NC}"
        else
            echo -e "${YELLOW}   ⚠️  JSON-LD Schema missing${NC}"
        fi
        
        if echo "$PAGE_CONTENT" | grep -q "canonical"; then
            echo -e "${GREEN}   ✅ Canonical tag present${NC}"
        else
            echo -e "${YELLOW}   ⚠️  Canonical tag missing${NC}"
        fi
    else
        echo -e "${RED}   ❌ Product page error${NC} (HTTP $PRODUCT_STATUS)"
    fi
else
    echo -e "${YELLOW}   ⚠️  No product URLs found in sitemap${NC}"
fi
echo ""

# 4. Check Backend API
echo "4️⃣ Checking Backend API..."
echo "-----------------------------------"
API_HEALTH="${SITE_URL}/api/health"
API_STATUS=$(curl -o /dev/null -s -w "%{http_code}" "$API_HEALTH")
if [ "$API_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Backend API healthy${NC} (HTTP $API_STATUS)"
else
    echo -e "${YELLOW}⚠️  Backend API status${NC} (HTTP $API_STATUS)"
fi
echo ""

# 5. Page Speed Check (using curl timing)
echo "5️⃣ Checking Page Load Speed..."
echo "-----------------------------------"
LOAD_TIME=$(curl -o /dev/null -s -w "%{time_total}" "$SITE_URL")
echo "   Homepage load time: ${LOAD_TIME}s"

if (( $(echo "$LOAD_TIME < 2.0" | bc -l) )); then
    echo -e "${GREEN}   ✅ Good performance (<2s)${NC}"
elif (( $(echo "$LOAD_TIME < 4.0" | bc -l) )); then
    echo -e "${YELLOW}   ⚠️  Moderate performance (2-4s)${NC}"
else
    echo -e "${RED}   ❌ Slow performance (>4s)${NC}"
fi
echo ""

# 6. SSL Certificate
echo "6️⃣ Checking SSL Certificate..."
echo "-----------------------------------"
if curl -s "$SITE_URL" | grep -q "https://"; then
    echo -e "${GREEN}✅ HTTPS enabled${NC}"
else
    echo -e "${RED}❌ HTTPS not enabled${NC}"
fi
echo ""

# Summary
echo "================================"
echo "📊 Summary"
echo "================================"
echo ""
echo "Quick fixes:"
echo "  - Sitemap: $SITE_URL/sitemap.xml"
echo "  - Robots: $SITE_URL/robots.txt"
echo "  - Test with Google: https://search.google.com/test/rich-results"
echo ""
echo "Google Search Console:"
echo "  - https://search.google.com/search-console"
echo ""
echo -e "${GREEN}✅ SEO Health Check Complete!${NC}"
