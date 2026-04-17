' Mugiwara Dashboard - Silent Launcher
' Starts the Django dashboard without a visible console window
' and opens the browser after a short delay.

Set WshShell = CreateObject("WScript.Shell")

' Get the directory where this script lives
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Launch the batch file silently (0 = hidden window, False = don't wait)
WshShell.Run """" & scriptDir & "\start-dashboard.bat""", 0, False

' Wait 3 seconds for the server to start, then open browser
WScript.Sleep 3000
WshShell.Run "http://127.0.0.1:8000", 1, False
