@echo off
TITLE PENG-PTT-Core-SRV(🏗️)
SET PATH_DIR=C:\Users\55341\Desktop\PENG-PTT-Core

echo --------------------------------------------------
echo 🚪 PORT: 시스템 진입 및 서비스 포트 개방 준비
echo 🏗️ SRV: 백엔드 인프라 및 핵심 로직 기동
echo ⚡ EXP: Express 고속 데이터 처리 엔진 연결
echo --------------------------------------------------

cd /d %PATH_DIR%

:: ⚡ EXP & 🏗️ SRV 실행
node index.js

pause