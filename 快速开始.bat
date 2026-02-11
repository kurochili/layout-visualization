@echo off
chcp 65001 >nul
echo ========================================
echo 机位图可视化系统 - 快速启动
echo ========================================
echo.

echo [1/3] 检查 Node.js 安装...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未检测到 Node.js！
    echo.
    echo 请先安装 Node.js：
    echo 1. 访问 https://nodejs.org/
    echo 2. 下载并安装 LTS 版本
    echo 3. 重启电脑后再次运行此脚本
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js 已安装
node --version
npm --version
echo.

echo [2/3] 检查依赖安装...
if not exist "node_modules" (
    echo ⚠️  依赖未安装，正在安装...
    echo 这可能需要几分钟，请耐心等待...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败！
        echo.
        echo 建议使用国内镜像源：
        echo npm config set registry https://registry.npmmirror.com
        echo npm install
        echo.
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
) else (
    echo ✅ 依赖已安装
)
echo.

echo [3/3] 启动开发服务器...
echo.
echo ========================================
echo 服务器启动后，浏览器会自动打开
echo 如果没有自动打开，请访问：
echo http://localhost:3000
echo ========================================
echo.
echo 按 Ctrl+C 停止服务器
echo.

npm run dev

pause






