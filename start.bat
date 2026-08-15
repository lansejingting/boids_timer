@echo off
chcp 65001 >nul 2>&1
title 深海专注计时器

echo ====================================
echo    深海专注计时器 - 本地启动
echo ====================================
echo.

REM 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装：
    echo    https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [OK] Node.js %NODE_VER%

REM 检查 pnpm
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo [提示] 正在安装 pnpm...
    call npm install -g pnpm
    if %errorlevel% neq 0 (
        echo [错误] pnpm 安装失败
        pause
        exit /b 1
    )
)

for /f "tokens=*" %%i in ('pnpm -v') do set PNPM_VER=%%i
echo [OK] pnpm %PNPM_VER%

REM 安装依赖
echo.
echo [步骤] 检查并安装依赖...
call pnpm install
if %errorlevel% neq 0 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)

echo.
echo ====================================
echo    启动中...
echo    浏览器访问: http://localhost:3000
echo    按 Ctrl+C 停止服务
echo ====================================
echo.

REM 自动打开浏览器（延迟 3 秒）
start /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

REM 启动开发服务器（使用 tsx 直接运行自定义服务器）
set PORT=3000
call pnpm tsx watch src/server.ts

pause
