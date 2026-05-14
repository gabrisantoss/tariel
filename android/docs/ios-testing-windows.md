# Teste iOS usando Windows

Este projeto mobile e React Native + Expo. A mesma base gera Android e iOS, mas o simulador oficial de iPhone depende do Xcode/macOS. No Windows, o caminho suportado e testar em iPhone fisico com Expo/EAS.

## Preflight local

```powershell
cd android
npm ci
npm run typecheck
npm test -- --runInBand
```

## API local acessivel pelo iPhone

Na raiz do repositorio:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start_local_mobile_api_background.ps1
```

Descubra o IP da maquina na rede Wi-Fi:

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
  Select-Object IPAddress, InterfaceAlias
```

No app mobile:

```powershell
cd android
Copy-Item env.ios-device.example .env
```

Troque `SEU_IP_DA_REDE` no `.env` pelo IP descoberto, por exemplo `192.168.0.50`. O iPhone precisa estar na mesma rede. Se o Windows Firewall bloquear, libere conexoes de entrada para a porta `8000`.

Valide no navegador do iPhone:

```text
http://SEU_IP_DA_REDE:8000/ready
```

No primeiro boot do SQLite temporario, o endpoint pode responder `starting` por alguns segundos enquanto as migracoes terminam. Aguarde e recarregue ate aparecer `status: ok`.

## Opcoes de teste

### Expo Go

Use para uma primeira leitura de layout, navegacao e chamadas basicas:

```powershell
cd android
npm run start:tunnel
```

Abra o QR Code no app Expo Go do iPhone. Este modo e bom para iterar rapido, mas nao substitui o teste com build real quando houver modulo nativo, push, permissoes ou comportamento de release.

### EAS Development Build

Use para testar o app como app nativo de desenvolvimento:

```powershell
cd android
npx eas login
npx eas device:create
npm run eas:build:ios:development
```

Depois de instalar o build no iPhone:

```powershell
cd android
npm run start:dev-client -- --tunnel
```

### EAS Preview

Use para um build interno mais parecido com distribuicao:

```powershell
cd android
npm run eas:build:ios:preview
```

Esse caminho exige conta Apple Developer e credenciais iOS configuradas no EAS. Para TestFlight, use o build de producao e o submit:

```powershell
cd android
npm run eas:build:ios:production
npm run eas:submit:ios:production
```

## Checklist minimo no iPhone

- Login do inspetor.
- Bootstrap da sessao e carregamento da home.
- Abertura de laudo recente.
- Envio de mensagem no chat.
- Alternancia `Chat | Mesa`.
- Captura de foto pela camera.
- Anexo por galeria.
- Anexo por documento.
- Abertura/compartilhamento de anexo baixado.
- Fila offline com rede desligada e reenfileiramento apos reconectar.
- Notificacoes/permissoes quando o build usado tiver push configurado.
