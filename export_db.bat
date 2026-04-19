@echo off
setlocal
echo ======================================================
echo   GAHAR Health Map - Database Export Tool
echo ======================================================
echo.

set DB_NAME=gis
set EXPORT_FILE=%USERPROFILE%\Desktop\gahar_database_backup.sql
set MYSQLDUMP_PATH=C:\xampp\mysql\bin\mysqldump.exe

echo Exporting database '%DB_NAME%'...
echo This may take a few seconds...
echo.

if not exist "%MYSQLDUMP_PATH%" (
    echo [ERROR] mysqldump NOT found at %MYSQLDUMP_PATH%
    echo Please check your XAMPP installation path.
    pause
    exit /b
)

"%MYSQLDUMP_PATH%" -u root --default-character-set=utf8mb4 %DB_NAME% > "%EXPORT_FILE%"

if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUCCESS] Database exported successfully!
    echo File: %EXPORT_FILE%
    echo.
    echo Use this file to import your data to PythonAnywhere.
) else (
    echo.
    echo [ERROR] Database export failed.
)

echo.
pause
