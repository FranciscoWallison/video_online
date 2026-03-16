# ScreenRec — Free Online Screen Recorder | Gravador de Tela Online Grátis

**[Usar Agora / Use Now](https://franciscowallison.github.io/video_online/)**

ScreenRec é um **gravador de tela online grátis** que roda direto no navegador. Sem download, sem cadastro, sem marca d'água. Grave sua tela, janela ou região específica com webcam e áudio — tudo 100% no browser.

ScreenRec is a **free online screen recorder** that runs entirely in your browser. No download, no signup, no watermark. Record your full screen, a window, or a custom region with webcam overlay and audio — all 100% client-side.

---

## Funcionalidades / Features

### Gravação de Tela / Screen Recording
- **Tela inteira** — grave todo o monitor com um clique
- **Janela específica** — escolha apenas uma janela ou aba do navegador
- **Região personalizada** — selecione um retângulo na tela para gravar

### Webcam / Camera Overlay
- **Overlay de webcam** — mostre seu rosto em um círculo sobre a gravação
- **Posição ajustável** — arraste a webcam para qualquer canto da tela
- **Preview ao vivo** — veja a webcam antes de começar a gravar

### Áudio / Audio Recording
- **Áudio do sistema** — capture o som do computador (Chrome/Edge)
- **Microfone** — grave sua voz junto com a tela
- **Mix de áudio** — combine áudio do sistema e microfone simultaneamente

### Download Instantâneo / Instant Download
- **Download imediato** — baixe o vídeo em WebM assim que parar de gravar
- **Sem processamento** — o arquivo é gerado em tempo real, sem espera
- **Preview opcional** — assista o vídeo antes de baixar, se quiser

---

## Por que usar o ScreenRec? / Why use ScreenRec?

| Característica | ScreenRec | Outros gravadores |
|---|---|---|
| Preço | **100% grátis** | Freemium / pago |
| Download necessário | **Não** | Sim (maioria) |
| Cadastro / login | **Não** | Sim (maioria) |
| Marca d'água | **Não** | Sim (versões grátis) |
| Funciona no navegador | **Sim** | Nem todos |
| Código aberto | **Sim** | Raramente |
| Privacidade | **Tudo local** | Upload para servidores |

---

## Como usar / How to Use

### Português
1. Acesse **[franciscowallison.github.io/video_online](https://franciscowallison.github.io/video_online/)**
2. Escolha o modo: **Tela Inteira**, **Janela** ou **Selecionar Região**
3. Ative a **webcam** e o **áudio** se quiser
4. Clique em **"Iniciar Gravação"**
5. Quando terminar, clique em **"Parar"**
6. Clique em **"Baixar Vídeo"** — pronto!

### English
1. Go to **[franciscowallison.github.io/video_online](https://franciscowallison.github.io/video_online/)**
2. Choose mode: **Full Screen**, **Window**, or **Select Region**
3. Enable **webcam** and **audio** if needed
4. Click **"Start Recording"**
5. When done, click **"Stop"**
6. Click **"Download Video"** — done!

---

## Casos de Uso / Use Cases

### Para criadores de conteúdo / For Content Creators
- **Gravar tutoriais** — mostre passo a passo como usar um software
- **Vídeos para YouTube** — grave a tela com sua webcam para criar conteúdo
- **Demonstrações de produto** — apresente funcionalidades de apps e sites

### Para profissionais / For Professionals
- **Gravar reuniões** — salve apresentações e videochamadas
- **Documentar bugs** — grave o problema para enviar ao time de desenvolvimento
- **Treinamentos** — crie vídeos de onboarding para novos funcionários

### Para estudantes / For Students
- **Gravar aulas online** — salve aulas para estudar depois
- **Apresentações** — grave a tela enquanto apresenta slides
- **Projetos acadêmicos** — documente seu processo de trabalho

### Para desenvolvedores / For Developers
- **Gravar demos** — mostre o que você construiu
- **Code reviews** — grave a revisão de código com narração
- **Bug reports** — capture o bug em ação com áudio explicando

---

## Perguntas Frequentes / FAQ

### O ScreenRec é realmente grátis?
**Sim, 100% grátis.** Sem período de teste, sem versão premium, sem funcionalidades bloqueadas. Tudo é gratuito para sempre.

### Preciso instalar alguma coisa?
**Não.** O ScreenRec roda direto no seu navegador. Basta abrir o link e começar a gravar. Funciona no Chrome, Edge, Firefox e outros navegadores modernos.

### Meus vídeos são enviados para algum servidor?
**Não.** Tudo acontece localmente no seu computador. Nenhum dado é enviado para servidores externos. Sua privacidade é total.

### Qual o formato do vídeo?
O vídeo é salvo em **WebM**, um formato aberto e compatível com a maioria dos players e editores de vídeo. Funciona no VLC, Premiere, DaVinci Resolve, e pode ser convertido para MP4 se necessário.

### Tem limite de tempo de gravação?
**Não.** Grave o quanto quiser. O único limite é o espaço disponível no seu computador.

### Funciona no celular?
O ScreenRec foi projetado para **desktop/notebook**. A API de captura de tela (`getDisplayMedia`) tem suporte limitado em dispositivos móveis.

### Is ScreenRec really free?
**Yes, 100% free.** No trial, no premium, no locked features. Everything is free forever.

### Do I need to install anything?
**No.** ScreenRec runs directly in your browser. Just open the link and start recording. Works on Chrome, Edge, Firefox, and other modern browsers.

### Are my videos uploaded to any server?
**No.** Everything happens locally on your computer. No data is sent to external servers. Your privacy is complete.

---

## Tecnologia / Technology

ScreenRec é construído com tecnologias web modernas:

- **[getDisplayMedia API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia)** — captura de tela nativa do navegador
- **[getUserMedia API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)** — acesso à webcam e microfone
- **[MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)** — gravação de vídeo em tempo real
- **[Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)** — composição de webcam overlay
- **[Vite](https://vitejs.dev/)** — bundler moderno e rápido
- **Vanilla JavaScript** — sem frameworks pesados, app leve (~29KB)

### Compatibilidade / Browser Support

| Navegador | Tela | Webcam | Áudio Sistema | Microfone |
|---|---|---|---|---|
| Chrome 72+ | ✅ | ✅ | ✅ | ✅ |
| Edge 79+ | ✅ | ✅ | ✅ | ✅ |
| Firefox 66+ | ✅ | ✅ | ❌ | ✅ |
| Safari 13+ | ✅ | ✅ | ❌ | ✅ |

---

## Desenvolvimento / Development

```bash
# Clone o repositório
git clone https://github.com/FranciscoWallison/video_online.git
cd video_online

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev

# Build para produção
npm run build
```

---

## Palavras-chave / Keywords

screen recorder, free screen recorder, online screen recorder, screen recorder no download, screen recorder no watermark, screen recorder free no limit, record screen online free, browser screen recorder, screen recorder with webcam, screen recorder with audio, screen capture online, screen recording tool, gravador de tela, gravador de tela online, gravador de tela grátis, gravador de tela gratuito, gravar tela do computador, gravar tela online, gravar tela sem instalar, captura de tela em vídeo, gravação de tela com webcam, gravação de tela com áudio, ferramenta de gravação de tela, screen recorder no signup, web based screen recorder, record screen chrome, capture screen video online

---

## Licença / License

MIT — livre para usar, modificar e distribuir.

---

**[Acesse agora / Try it now](https://franciscowallison.github.io/video_online/)** — Grave sua tela online, grátis, sem instalar nada.
