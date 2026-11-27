@echo off
rem Deletes the seminar-only Chrome profile (C:\seminar-chrome) so presets apply again. Close all seminar Chrome windows first (your normal Chrome is not touched).
echo Close all seminar Chrome windows, then press any key.
pause >nul
rmdir /s /q "C:\seminar-chrome"
echo done
pause
