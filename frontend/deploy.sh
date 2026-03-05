#!/bin/bash
# Deploy script - Safe build & restart
# Usage: cd frontend && bash deploy.sh
#
# Vấn đề: Khi chạy "npm run build", Next.js ghi đè thư mục .next/
# làm server production bị lỗi trong ~30-60s build.
# 
# Script này sẽ:
# 1. Dừng server trước
# 2. Build
# 3. Start lại server
# Downtime = thời gian build (~30-60s)
#
# Nếu build lỗi → server sẽ start lại với code cũ (vẫn OK)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "========================================="
echo "  🚀 BachHoaMMO Frontend Deploy"
echo "========================================="
echo ""

# Step 1: Backup .next cũ
echo "📦 Backup build cũ..."
rm -rf .next-backup
cp -r .next .next-backup 2>/dev/null || true

# Step 2: Build
echo "� Đang build..."
if npm run build; then
    echo "✅ Build thành công!"
else
    echo "❌ Build thất bại! Khôi phục build cũ..."
    rm -rf .next
    mv .next-backup .next 2>/dev/null || true
    echo "� Restarting với build cũ..."
    pm2 restart mmomarket-frontend
    echo "✅ Server đã khôi phục với bản cũ."
    exit 1
fi

# Step 3: Cleanup & restart
rm -rf .next-backup
echo "🔄 Restarting server..."
pm2 restart mmomarket-frontend

echo ""
echo "========================================="
echo "  ✅ Deploy thành công!"
echo "========================================="
echo ""
