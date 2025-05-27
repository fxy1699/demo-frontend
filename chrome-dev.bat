@echo off
echo Starting Chrome with certificate validation disabled...
echo NOTE: This is for development purposes only!
echo.

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --ignore-certificate-errors --user-data-dir="%TEMP%\chrome-dev-session" http://localhost:3000

echo.
echo Chrome started with certificate validation disabled.
echo IMPORTANT: Do not use this browser for regular browsing! 
echo            Only use it for local development testing.
echo. 