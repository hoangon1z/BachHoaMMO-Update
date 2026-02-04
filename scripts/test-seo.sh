#!/bin/bash

# Script kiểm tra SEO cho BachHoaMMO
# Usage: bash scripts/test-seo.sh [product-id]

SITE_URL="https://bachhoammo.store"
PRODUCT_ID=${1:-"7f272d2d-3106-4512-94aa-de8352b8fd1a"}
PRODUCT_URL="${SITE_URL}/products/${PRODUCT_ID}"

echo "🔍 Kiểm tra SEO cho: $PRODUCT_URL"
echo "=========================================="
echo ""

# 1. Kiểm tra sitemap
echo "1️⃣  Kiểm tra Sitemap..."
curl -s "${SITE_URL}/sitemap.xml" | grep -q "<url>" && echo "✅ Sitemap OK" || echo "❌ Sitemap không tìm thấy"
echo ""

# 2. Kiểm tra robots.txt
echo "2️⃣  Kiểm tra robots.txt..."
curl -s "${SITE_URL}/robots.txt" | grep -q "Sitemap:" && echo "✅ robots.txt OK" || echo "❌ robots.txt không đúng"
echo ""

# 3. Kiểm tra Meta Tags
echo "3️⃣  Kiểm tra Meta Tags..."
RESPONSE=$(curl -s "$PRODUCT_URL")

echo "$RESPONSE" | grep -q "<title>" && echo "✅ Title tag có" || echo "❌ Thiếu title tag"
echo "$RESPONSE" | grep -q 'name="description"' && echo "✅ Description có" || echo "❌ Thiếu description"
echo "$RESPONSE" | grep -q 'name="keywords"' && echo "✅ Keywords có" || echo "❌ Thiếu keywords"
echo "$RESPONSE" | grep -q 'property="og:title"' && echo "✅ Open Graph có" || echo "❌ Thiếu Open Graph"
echo "$RESPONSE" | grep -q 'name="twitter:card"' && echo "✅ Twitter Card có" || echo "❌ Thiếu Twitter Card"
echo ""

# 4. Kiểm tra JSON-LD
echo "4️⃣  Kiểm tra Structured Data (JSON-LD)..."
echo "$RESPONSE" | grep -q '"@type":"Product"' && echo "✅ Product schema có" || echo "❌ Thiếu Product schema"
echo "$RESPONSE" | grep -q '"@type":"BreadcrumbList"' && echo "✅ Breadcrumb schema có" || echo "❌ Thiếu Breadcrumb schema"
echo "$RESPONSE" | grep -q '"@type":"Offer"' && echo "✅ Offer schema có" || echo "❌ Thiếu Offer schema"
echo ""

# 5. Kiểm tra canonical
echo "5️⃣  Kiểm tra Canonical URL..."
echo "$RESPONSE" | grep -q 'rel="canonical"' && echo "✅ Canonical URL có" || echo "❌ Thiếu canonical URL"
echo ""

# 6. Hiển thị title và description
echo "6️⃣  Nội dung SEO:"
echo "----------------------------------------"
echo "Title:"
echo "$RESPONSE" | grep -oP '<title>\K[^<]+' | head -1
echo ""
echo "Description:"
echo "$RESPONSE" | grep -oP 'name="description" content="\K[^"]+' | head -1
echo ""

echo "=========================================="
echo "🎯 Bước tiếp theo:"
echo "1. Đăng ký Google Search Console: https://search.google.com/search-console"
echo "2. Submit sitemap: ${SITE_URL}/sitemap.xml"
echo "3. Request indexing cho URL: $PRODUCT_URL"
echo "4. Kiểm tra Rich Results: https://search.google.com/test/rich-results"
echo ""
echo "📖 Xem hướng dẫn chi tiết: HUONG-DAN-SEO-GOOGLE.md"
