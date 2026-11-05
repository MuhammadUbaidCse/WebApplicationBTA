@echo off
setlocal enabledelayedexpansion

REM Ensure portable Node.js is on PATH if it exists, otherwise use system Node.js
if exist "C:\nodejs-portable\node-v20.18.0-win-x64" (
    set "PATH=C:\nodejs-portable\node-v20.18.0-win-x64;%PATH%"
)

where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo ========================================================
    echo  [ERROR] Node.js was not found on your system PATH!
    echo  Please install Node.js from: https://nodejs.org
    echo ========================================================
    echo.
    pause
    exit /b 1
)

echo ========================================================
echo  University Certificate Verification System (CS-491)
echo  CS-491 BTA PBL — Full Automated Startup
echo ========================================================
echo.
echo [1/3] Starting Hardhat Local Blockchain in background window...
start "Hardhat Blockchain Node" cmd /k "cd /d %~dp0blockchain && npx hardhat node"

echo Waiting for Hardhat JSON-RPC node to be ready on port 8545...
powershell -NoProfile -Command "$ready = $false; for ($i=0; $i -lt 30; $i++) { try { $tcp = New-Object Net.Sockets.TcpClient; $tcp.Connect('127.0.0.1', 8545); $tcp.Close(); $ready = $true; break } catch { Start-Sleep -Milliseconds 600 } }; if (-not $ready) { exit 1 } else { exit 0 }"

if errorlevel 1 (
    echo [WARNING] Port 8545 check timed out. Waiting an additional 3 seconds...
    timeout /t 3 /nobreak > nul
) else (
    echo [OK] Hardhat node is running and listening on port 8545.
)

echo.
echo [2/3] Deploying smart contract to localhost...
cd /d "%~dp0blockchain"
call npx hardhat run scripts/deploy.js --network localhost
if errorlevel 1 (
    echo.
    echo [ERROR] Smart contract deployment failed.
    echo Please inspect the Hardhat Blockchain Node window for error logs.
    pause
    exit /b 1
)

echo.
echo [3/3] Starting Vite React frontend server...
start "Frontend Dev Server" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Waiting 3 seconds for Vite server to initialize...
timeout /t 3 /nobreak > nul

echo Launching application in default browser...
start http://localhost:3000

echo.
echo ========================================================
echo  SYSTEM STARTED SUCCESSFULLY!
echo ========================================================
echo  Web Application: http://localhost:3000
echo.
echo  MetaMask Network Settings:
echo    - Network Name:   Hardhat Local
echo    - RPC URL:        http://127.0.0.1:8545
echo    - Chain ID:       31337
echo    - Currency:       ETH
echo.
echo  Importable Local Test Accounts:
echo    - Administrator (Account #0):
echo      Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
echo      Key:     0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
echo.
echo    - University Issuer (Account #1):
echo      Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
echo      Key:     0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
echo.
echo    - Student / Unauthorized (Account #2):
echo      Address: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
echo      Key:     0x5de4111afa1a4b94908f83103eb2f954b14e26845bfa32999797379895a8244c
echo.
echo  Demo PDFs are located in: demo/
echo    - DEMO_CERTIFICATE.pdf          (Original valid document)
echo    - DEMO_CERTIFICATE_MODIFIED.pdf (Tampered document for integrity check)
echo ========================================================
echo.
pause
