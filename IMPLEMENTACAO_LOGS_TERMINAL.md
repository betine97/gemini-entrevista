# ✅ Implementação: Logs no Terminal

## 🎯 Objetivo

Fazer com que todos os `console.log()` do código apareçam no terminal onde o `npm run dev` está rodando, ao invés de apenas no console do navegador (F12).

## 🔧 Solução Implementada

### Console Bridge via WebSocket

Criado um sistema de ponte entre o navegador e o terminal usando WebSockets:

1. **Plugin Vite customizado** (`vite-plugin-console-log.ts`):
   - Cria um WebSocket server na porta 3001
   - Injeta automaticamente um script no HTML
   - Recebe logs do navegador e os exibe no terminal

2. **Script injetado no navegador**:
   - Intercepta `console.log()`, `console.error()`, `console.warn()`
   - Envia para o WebSocket server
   - Mantém funcionamento normal do console do navegador

3. **Configuração do Vite** (`vite.config.ts`):
   - Plugin adicionado à configuração
   - Funciona automaticamente ao rodar `npm run dev`

## 📦 Arquivos Criados/Modificados

### Criados
- ✅ `vite-plugin-console-log.ts` - Plugin Vite com WebSocket server
- ✅ `LOGS_NO_TERMINAL.md` - Documentação completa
- ✅ `IMPLEMENTACAO_LOGS_TERMINAL.md` - Este arquivo

### Modificados
- ✅ `vite.config.ts` - Adicionado plugin
- ✅ `package.json` - Adicionadas dependências `ws` e `@types/ws`

## 🚀 Como Usar

### 1. Parar o servidor (se estiver rodando)
```bash
Ctrl + C
```

### 2. Iniciar o servidor
```bash
npm run dev
```

### 3. Abrir o navegador
```
http://localhost:3000
```

### 4. Observar os logs no terminal!

Agora **TODOS** os logs aparecem no terminal em tempo real:

```
✅ [CONSOLE-BRIDGE] WebSocket server rodando na porta 3001
🔌 [CONSOLE-BRIDGE] Cliente conectado

📝 [14:23:45.123] [BROWSER] 🔵 [INIT] Iniciando sessão com a IA...
📝 [14:23:45.234] [BROWSER] 🎭 [PERSONAS] 2 entrevistador(es) selecionado(s):
📝 [14:23:45.345] [BROWSER]    - Alex (male) - Voz: Puck
📝 [14:23:45.456] [BROWSER]    - Elena (female) - Voz: Aoede
📝 [14:23:46.123] [BROWSER] 🎵 [AUDIO-IN] Chunk #1, Vol: 12.34%
📝 [14:23:47.234] [BROWSER] 🔊 [AUDIO-OUT-0:Alex] Recebido 45678 bytes
📝 [14:23:47.345] [BROWSER] 💬 [TEXT-0:Alex] Olá! Sou Alex...
📝 [14:23:47.456] [BROWSER] ▶️ [PLAY] Reproduzindo Alex
📝 [14:23:47.567] [BROWSER]    Duração do áudio: 3.450s
📝 [14:23:47.678] [BROWSER]    🎵 Timing: now=12.345s, start=12.355s
📝 [14:23:50.123] [BROWSER] ✅ [ENDED] Alex finalizado
📝 [14:23:50.234] [BROWSER] 🔀 [COORD] Alternando sessão ativa: 0 → 1
```

## 🎯 Benefícios

1. ✅ **Não precisa abrir F12** para ver logs
2. ✅ **Logs em tempo real** no terminal
3. ✅ **Fácil de copiar/colar** para análise
4. ✅ **Melhor para debugging** - vê logs enquanto interage
5. ✅ **Histórico completo** - pode rolar o terminal
6. ✅ **Funciona automaticamente** - sem configuração adicional

## 📊 Logs Importantes para Diagnóstico

### 🔍 Chiado
```
❌ [CHIADO-DETECTADO] X sources ativos simultaneamente!
```

### 🐌 Lentidão
```
⚠️ [LENTIDAO-DETECTADA] Fila com X áudios!
```

### ⏱️ Delay
```
⚠️ DELAY DETECTADO: X.XXXs até começar a tocar
```

### 🔀 Coordenação
```
🔀 [COORD] Alternando sessão ativa: 0 → 1
```

### 📝 Transcrições
```
📤 [TRANSCRIPTION] Enviado para sessão X: ...
```

### 🎵 Áudio
```
🔊 [AUDIO-OUT-0:Alex] Recebido 45678 bytes
🎵 [DECODE-0:Alex] 3.45s em 12.34ms
📥 [QUEUE] Alex → fila (tamanho: 1)
▶️ [PLAY] Reproduzindo Alex
✅ [ENDED] Alex finalizado
```

## 🔧 Arquitetura Técnica

```
┌─────────────────────────────────────────────────────────────┐
│                        NAVEGADOR                             │
│                                                              │
│  index.tsx                                                   │
│    ↓ console.log("🔵 [INIT] ...")                          │
│                                                              │
│  Script Injetado (interceptor)                              │
│    ↓ Captura console.log/error/warn                        │
│    ↓ Serializa argumentos                                   │
│    ↓ ws.send(JSON.stringify({type, args}))                 │
│                                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ WebSocket
                       │ ws://localhost:3001
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    VITE SERVER                               │
│                                                              │
│  vite-plugin-console-log.ts                                 │
│    ↓ WebSocket Server (porta 3001)                         │
│    ↓ wss.on('message', ...)                                │
│    ↓ Parse JSON                                             │
│    ↓ console.log(`📝 [timestamp] [BROWSER] ...`)           │
│                                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
                   TERMINAL
                   (stdout)
```

## 🧪 Teste Rápido

1. Inicie o servidor: `npm run dev`
2. Abra o navegador: `http://localhost:3000`
3. Selecione 2 entrevistadores
4. Clique em "Iniciar"
5. Observe o terminal - deve aparecer:
   ```
   📝 [BROWSER] 🔵 [INIT] Iniciando sessão com a IA...
   📝 [BROWSER] 🎭 [PERSONAS] 2 entrevistador(es) selecionado(s):
   ```

## 🐛 Troubleshooting

### Logs não aparecem

1. **Verificar conexão WebSocket**:
   - Deve aparecer: `🔌 [CONSOLE-BRIDGE] Cliente conectado`
   - Se não, recarregue a página (F5)

2. **Verificar console do navegador (F12)**:
   - Deve aparecer: `🔌 Console bridge conectado ao terminal`
   - Se não, há erro no WebSocket

3. **Verificar porta 3001**:
   - Certifique-se que não está em uso
   - Mude no plugin se necessário

### Logs duplicados

- **Normal!** Logs aparecem em:
  1. Console do navegador (F12)
  2. Terminal (via WebSocket)

### Reconexão

- Se o Vite reiniciar, o cliente reconecta automaticamente a cada 2s

## 📈 Próximos Passos

Agora você pode:

1. ✅ **Testar a aplicação** e ver logs em tempo real
2. ✅ **Identificar problemas** (chiado, lentidão, delay)
3. ✅ **Copiar logs** para análise
4. ✅ **Debugar** sem precisar do DevTools
5. ✅ **Compartilhar logs** facilmente

## 💡 Dica: Filtrar Logs

Para ver apenas logs específicos:

```bash
# Windows PowerShell
npm run dev | Select-String "AUDIO"
npm run dev | Select-String "COORD"
npm run dev | Select-String "TRANSCRIPTION"
```

## ✅ Status

- ✅ Plugin criado e testado
- ✅ Configuração do Vite atualizada
- ✅ Dependências instaladas (`ws`, `@types/ws`)
- ✅ Sem erros de compilação
- ✅ Documentação completa
- ✅ Pronto para uso!

## 🎓 Conclusão

O sistema de logs no terminal está **100% funcional** e pronto para uso. Basta rodar `npm run dev` e todos os logs do navegador aparecerão automaticamente no terminal, facilitando muito o debugging e análise de problemas como chiado, lentidão e delay.
