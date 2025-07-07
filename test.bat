@echo off
setlocal EnableDelayedExpansion

set "startDir=%cd%"

rem 모든 하위 디렉토리 중 node_modules/.git 제외하고 탐색
for /f "delims=" %%D in ('dir /ad /b /s "%startDir%" ^| findstr /V /I "\\node_modules\\ \\.\git\\"') do (
    set "folder=%%~fD"
    echo Folder: !folder!
    for %%F in ("!folder!\*") do (
        if exist "%%F" (
            echo     File: %%~nxF
        )
    )
)
