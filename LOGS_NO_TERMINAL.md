# 📊 Logs no Terminal - Implementado!

## ✅ O que foi feito

Implementado um sistema de **Console Bridge** que captura todos os `console.log`, `console.error` e `console.warn` do navegador e os exibe no terminal onde o Vite está rodando.

## 🔧 Como funciona

### Arquitetura

```
Browser (index.tsx)
    ↓ console.log()
WebSocket Client (injected script)
    ↓ ws://localhost:3001
WebSocket Server (Vite Plugin)
    ↓
Terminal (stdout)
```

### Componentes

1. **vite-plugin-console-log.ts**: Plugin Vite customizado que:
   - Cria um WebSocket server na porta 3001
   - Injeta um script no HTML que intercepta console.log/error/warn
   - Recebe mensagens do navegador e as exibe no terminal

2. **vite.config.ts**: Configurado para usar o plugin

3. **Script injetado**: Captura automaticamente todos os logs do navegador

## 🚀 Como usar

### 1. Parar o servidor se estiver rodando

```bash
Ctrl + C
```

### 2. Iniciar o servidor novamente

```bash
npm run dev
```

### 3. Abrir o navegador

```
http://localhost:3000
```

### 4. Observar os logs

Agora **TODOS** os logs que aparecem no console do navegador (F12) também aparecerão no terminal!

## 📝 Exemplo de saída no terminal

```
✅ [CONSOLE-BRIDGE] WebSocket server rodando na porta 3001
🔌 [CONSOLE-BRIDGE] Cliente conectado

📝 [14:23:45.123] [BROWSER] 🔵 [INIT] Iniciando sessão com a IA...
📝 [14:23:45.234] [BROWSER] 🎭 [PERSONAS] 2 entrevistador(es) selecionado(s):
📝 [14:23:45.345] [BROWSER]    - Alex (male) - Voz: Puck
📝 [14:23:45.456] [BROWSER]    - Elena (female) - Voz: Aoede
📝 [14:23:46.123] [BROWSER] 🎵 [14:23:46.123] [AUDIO-IN] Chunk #1, Vol: 12.34%
📝 [14:23:47.234] [BROWSER] 🔊 [14:23:47.234] [AUDIO-OUT-0:Alex] Recebido 45678 bytes
📝 [14:23:47.345] [BROWSER] 💬 [14:23:47.345] [TEXT-0:Alex] Olá! Sou Alex...
📝 [14:23:47.456] [BROWSER] ▶️ [14:23:47.456] [PLAY] Reproduzindo Alex
```

## 🎯 Benefícios

1. **Não precisa abrir o DevTools (F12)** para ver os logs
2. **Logs aparecem em tempo real** no terminal
3. **Fácil de copiar/colar** logs do terminal
4. **Melhor para debugging** - pode ver logs enquanto interage com a aplicação
5. **Histórico completo** - pode rolar o terminal para ver logs antigos

## 🔍 Tipos de logs

- 📝 **LOG**: console.log() - Logs normais
- ❌ **ERROR**: console.error() - Erros
- ⚠️ **WARN**: console.warn() - Avisos
- ℹ️ **INFO**: console.info() - Informações

## 🐛 Troubleshooting

### Logs não aparecem no terminal

1. **Verificar se o WebSocket conectou**:
   - Deve aparecer: `🔌 [CONSOLE-BRIDGE] Cliente conectado`
   - Se não aparecer, recarregue a página (F5)

2. **Verificar porta 3001**:
   - Certifique-se que a porta 3001 não está em uso
   - Se estiver, mude a porta no plugin

3. **Verificar console do navegador**:
   - Abra F12 e veja se aparece: `🔌 Console bridge conectado ao terminal`
   - Se não aparecer, há um erro no WebSocket

### Logs duplicados

- Isso é normal! Os logs aparecem:
  1. No console do navegador (F12)
  2. No terminal (via WebSocket)

### Reconexão automática

- Se o servidor Vite reiniciar, o cliente tenta reconectar automaticamente a cada 2 segundos

## 📊 Logs importantes para diagnóstico

### Chiado

Procure por:
```
❌ [CHIADO-DETECTADO] X sources ativos simultaneamente!
```

### Lentidão

Procure por:
```
⚠️ [LENTIDAO-DETECTADA] Fila com X áudios!
```

### Delay

Procure por:
```
⚠️ DELAY DETECTADO: X.XXXs até começar a tocar
```

### Coordenação de sessões

Procure por:
```
🔀 [COORD] Alternando sessão ativa: 0 → 1
```

### Transcrições

Procure por:
```
📤 [TRANSCRIPTION] Enviado para sessão X: ...
```

## 🎓 Próximos passos

Agora que os logs aparecem no terminal, você pode:

1. **Testar a aplicação** e observar os logs em tempo real
2. **Identificar problemas** (chiado, lentidão, delay)
3. **Copiar logs** para análise ou compartilhamento
4. **Debugar** mais facilmente sem precisar do DevTools

## 💡 Dica

Para ver apenas logs específicos, você pode usar `grep` (ou `Select-String` no PowerShell):

```bash
# Linux/Mac
npm run dev | grep AUDIO

# Windows PowerShell
npm run dev | Select-String "AUDIO"
```

Isso filtra apenas logs que contêm "AUDIO".
