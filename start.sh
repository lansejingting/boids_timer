#!/bin/bash
# 深海专注计时器 - 本地启动脚本 (macOS/Linux)

echo "===================================="
echo "   深海专注计时器 - 本地启动"
echo "===================================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js，请先安装："
    echo "   https://nodejs.org/"
    echo ""
    read -p "按回车键退出..."
    exit 1
fi

echo "[OK] Node.js $(node -v)"

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
    echo "[提示] 正在安装 pnpm..."
    npm install -g pnpm
fi

echo "[OK] pnpm $(pnpm -v)"

# 安装依赖
echo ""
echo "[步骤] 检查并安装依赖..."
pnpm install

echo ""
echo "===================================="
echo "   启动中..."
echo "   浏览器访问: http://localhost:3000"
echo "   按 Ctrl+C 停止服务"
echo "===================================="
echo ""

# 自动打开浏览器
(sleep 3 && open "http://localhost:3000" 2>/dev/null || xdg-open "http://localhost:3000" 2>/dev/null) &

# 启动开发服务器
PORT=3000 pnpm tsx watch src/server.ts
