@echo off
echo Fixing IIS permissions for CutList save system...
echo.

REM Navigate to the cutlist directory
cd /d "C:\inetpub\wwwroot\cutlist"

REM Create data directory if it doesn't exist
if not exist "data" mkdir data

REM Grant IIS_IUSRS write permissions to the cutlist directory
echo Granting write permissions to IIS_IUSRS for cutlist directory...
icacls . /grant IIS_IUSRS:(OI)(CI)F /T

REM Grant DefaultAppPool user write permissions
echo Granting write permissions to DefaultAppPool user...
icacls . /grant "IIS AppPool\DefaultAppPool":(OI)(CI)F /T

REM Set specific permissions on data directory
echo Setting permissions on data directory...
icacls data /grant IIS_IUSRS:(OI)(CI)F /T
icacls data /grant "IIS AppPool\DefaultAppPool":(OI)(CI)F /T

REM Set permissions on JSON files
echo Setting permissions on JSON database files...
if exist "users-database.json" icacls users-database.json /grant IIS_IUSRS:F
if exist "users.json" icacls users.json /grant IIS_IUSRS:F
if exist "data\users-database.json" icacls data\users-database.json /grant IIS_IUSRS:F

echo.
echo Permissions have been set. Testing write access...

REM Test write access
echo Test file > test-write.txt
if exist test-write.txt (
    echo SUCCESS: Write access is working!
    del test-write.txt
) else (
    echo ERROR: Write access still not working
)

echo.
echo Permission fix complete. You can now test the save system.
pause