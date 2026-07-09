Set WshShell = CreateObject("WScript.Shell")
Dim projectPath
projectPath = "C:\Users\Davi Ramos\Documents\PRO FINANCES"

' 1. Inicia o servidor Node/Vite de forma invisível (0 = Oculto, False = não aguarda concluir)
WshShell.Run "cmd.exe /c cd /d """ & projectPath & """ && npm run dev", 0, False

' Aguarda 5 segundos para garantir que o Vite e o Express subiram
WScript.Sleep 5000

' 2. Abre o Chrome como App (sem barra de navegação) com um perfil isolado.
' O parâmetro start /wait obriga o CMD a esperar o usuário fechar a janela do Chrome.
Dim profileDir, chromeCmd
profileDir = projectPath & "\.chrome_profile"
chromeCmd = "cmd.exe /c start /wait """" ""chrome.exe"" --app=http://localhost:4005 --start-fullscreen --user-data-dir=""" & profileDir & """"

' Executa e AGUARDA o fechamento (True)
WshShell.Run chromeCmd, 0, True

' 3. Quando a janela fechar, derruba qualquer processo que esteja usando as portas do sistema
Dim killCmd4005, killCmd4006
' Mata a porta do Vite (4005)
killCmd4005 = "cmd.exe /c for /f ""tokens=5"" %a in ('netstat -aon ^| findstr "":4005 ""') do taskkill /F /PID %a"
WshShell.Run killCmd4005, 0, True

' Mata a porta do Servidor Backend (4006)
killCmd4006 = "cmd.exe /c for /f ""tokens=5"" %a in ('netstat -aon ^| findstr "":4006 ""') do taskkill /F /PID %a"
WshShell.Run killCmd4006, 0, True

' Script finalizado limpo!
