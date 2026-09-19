@echo off
chcp 65001 > nul
title FitStats - 운동통계 대시보드
cd /d "%~dp0"

echo ======================================================
echo    FitStats - 스마트 운동 통계 ^& SNS 공유 스튜디오
echo ======================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 goto :NO_NODE

if not exist node_modules (
    echo [알림] 필수 패키지를 설치하는 중입니다... 잠시만 기다려주세요.
    call npm.cmd install
    if %errorlevel% neq 0 goto :INSTALL_ERROR
)

echo [알림] 웹 애플리케이션 개발 서버를 시작합니다...
call npm.cmd run dev
goto :END

:NO_NODE
echo [오류] Node.js가 설치되어 있지 않습니다.
echo https://nodejs.org 에서 Node.js를 설치해주세요.
pause
exit /b 1

:INSTALL_ERROR
echo [오류] 패키지 설치 중 문제가 발생했습니다.
pause
exit /b 1

:END
pause
