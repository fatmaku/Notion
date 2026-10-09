@echo off
setlocal EnableExtensions DisableDelayedExpansion
title LiveFX
rem ============================================================================================
rem  LiveFX starten (Windows): einfach doppelklicken.
rem  - prueft Node.js (ab Version 20) und hilft beim Installieren, falls es fehlt
rem  - startet LiveFX mit WLAN-Zugriff (Handy per QR-Code koppeln) und oeffnet das Panel im Browser
rem  - funktioniert auch in Ordnern mit Leerzeichen oder Umlauten
rem  Portables Node (ohne Installation): die offizielle Node-ZIP "Windows Binary (.zip)" entpacken
rem  und den Ordner als "node" in den LiveFX-Ordner legen (LiveFX\node\node.exe).
rem  Weitere Optionen: Start-LiveFX.bat --local (nur dieser PC), --port 8790. Hilfe: docs\START.md
rem ============================================================================================

cd /d "%~dp0.."
if errorlevel 1 goto :nodir
set "APPDIR=%CD%"

rem Aus der ZIP heraus gestartet (Explorer entpackt dann nur in einen Temp-Ordner)?
set "CHECKDIR=%APPDIR%\"
if not "%CHECKDIR:.zip\=%"=="%CHECKDIR%" goto :inzip

set "NODE="
if exist "%APPDIR%\node\node.exe" set "NODE=%APPDIR%\node\node.exe"
if not defined NODE for /d %%D in ("%APPDIR%\node\node-v*") do if exist "%%~fD\node.exe" set "NODE=%%~fD\node.exe"
if not defined NODE if exist "%APPDIR%\..\node\node.exe" set "NODE=%APPDIR%\..\node\node.exe"
if not defined NODE for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined NODE set "NODE=%%N"
if not defined NODE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not defined NODE goto :nonode

"%NODE%" -e "process.exit(Number(process.versions.node.split('.')[0])>=20?0:1)" >nul 2>&1
if errorlevel 1 goto :oldnode

echo.
echo   LiveFX startet ...
echo   Ordner: "%APPDIR%"
echo   Zum Beenden: dieses Fenster schliessen oder Strg+C druecken.
echo   Fragt die Windows-Firewall nach: "Zugriff zulassen" klicken (private Netzwerke) - sonst findet das Handy den PC nicht.
echo.
"%NODE%" "%APPDIR%\server.js" --lan --open %*
set "RC=%ERRORLEVEL%"
echo.
if "%RC%"=="0" goto :done
echo   LiveFX wurde mit Fehler %RC% beendet - bitte die Meldung oben lesen. Hilfe: docs\START.md
pause
exit /b %RC%

:done
echo   LiveFX wurde beendet.
pause
exit /b 0

:nonode
echo.
echo   Node.js fehlt - LiveFX braucht Node.js 20 oder neuer (kostenlos).
echo.
echo   So geht's:
echo     1. Im Browser oeffnet sich gleich https://nodejs.org/de/download
echo     2. Die LTS-Version fuer Windows (.msi) herunterladen und installieren - immer "Weiter"
echo     3. Dieses Fenster schliessen und Start-LiveFX.bat noch einmal doppelklicken
echo.
echo   Schneller in PowerShell:  winget install OpenJS.NodeJS.LTS
echo   Ohne Installation: "Windows Binary (.zip)" entpacken und den Ordner als "node"
echo   in den LiveFX-Ordner legen (LiveFX\node\node.exe).
start "" "https://nodejs.org/de/download"
echo.
pause
exit /b 1

:oldnode
echo.
echo   Node.js ist zu alt:
"%NODE%" -v
echo   "%NODE%"
echo   LiveFX braucht Version 20 oder neuer - bitte die LTS-Version installieren:
echo   https://nodejs.org/de/download   (oder in PowerShell: winget upgrade OpenJS.NodeJS.LTS)
start "" "https://nodejs.org/de/download"
echo.
pause
exit /b 1

:inzip
echo.
echo   LiveFX wurde direkt aus der ZIP-Datei gestartet - so gehen Einstellungen verloren.
echo   Bitte zuerst entpacken: Rechtsklick auf die ZIP-Datei - "Alle extrahieren..." - dann im
echo   entpackten Ordner start\Start-LiveFX.bat doppelklicken.
echo.
pause
exit /b 1

:nodir
echo   LiveFX-Ordner nicht gefunden: "%~dp0.."
pause
exit /b 1
