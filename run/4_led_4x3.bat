@echo off
setlocal
rem ===== Seminar screen launcher (Chrome optimized) =====
rem Side LED 4:3. Add ^&fit=fill to the URL if the device stretches.
set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
set "BASE=https://nane9141-prog.github.io/seminar-screen"
set "PROFILE=C:\seminar-chrome"
rem ---- first run: preset profile (notifications/translate/password/default-browser OFF) ----
if not exist "%PROFILE%\Default\Preferences" (
  mkdir "%PROFILE%\Default" 2>nul
  > "%PROFILE%\Default\Preferences" echo {"profile":{"default_content_setting_values":{"notifications":2,"geolocation":2,"sound":1},"password_manager_enabled":false,"exit_type":"Normal","exited_cleanly":true},"credentials_enable_service":false,"translate":{"enabled":false},"browser":{"check_default_browser":false,"show_home_button":false},"autofill":{"profile_enabled":false,"credit_card_enabled":false},"search":{"suggest_enabled":false},"download":{"prompt_for_download":false}}
  > "%PROFILE%\First Run" echo.
)
set FLAGS=--user-data-dir="%PROFILE%" --autoplay-policy=no-user-gesture-required --no-first-run --no-default-browser-check --disable-features=Translate,MediaRouter,GlobalMediaControls --disable-session-crashed-bubble --hide-crash-restore-bubble --noerrdialogs --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --disable-component-update --overscroll-history-navigation=0 --disable-pinch --ignore-gpu-blocklist --enable-gpu-rasterization
set "X=0"
start "" "%CHROME%" %FLAGS% --window-position=%X%,0 --start-fullscreen --app="%BASE%/led.html"
endlocal
