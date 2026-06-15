#!/bin/bash
# RedSkill Factory — Public Server with Tunnel
# Usage: bash scripts/start-public.sh
# This creates a public URL for your local server (no credit card needed)

echo "🏭 RedSkill Factory — Public Mode"
echo ""

# Build
echo "📦 Building..."
npm run build:all 2>/dev/null

# Kill existing processes on port 3001
PID=$(netstat -ano 2>/dev/null | grep ":3001 " | grep LISTENING | awk '{print $NF}' | head -1)
if [ -n "$PID" ]; then
  taskkill //F //PID $PID 2>/dev/null
  sleep 1
fi

# Start server
echo "🚀 Starting server..."
node dist/server/index.js &
SERVER_PID=$!
sleep 2

# Start tunnel
echo "🌐 Creating public URL..."
echo ""
npx localtunnel --port 3001 2>&1 | while read line; do
  echo "$line"
  if echo "$line" | grep -q "your url is:"; then
    URL=$(echo "$line" | sed 's/your url is: //')
    echo ""
    echo "============================================"
    echo "  🎉 你的公网商店已上线！"
    echo ""
    echo "  🛍️  商店:   $URL/store"
    echo "  💰 卖家:   $URL/seller"
    echo "  📱 英语外教: $URL/skill/english-tutor?ref=@redskill"
    echo "  📱 运营增长: $URL/skill/xhs-growth?ref=@redskill"
    echo ""
    echo "  按 Ctrl+C 停止"
    echo "============================================"
  fi
done

# Cleanup on exit
trap "kill $SERVER_PID 2>/dev/null; echo '👋 Server stopped'" EXIT
wait $SERVER_PID
