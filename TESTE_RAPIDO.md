# 🚀 Teste Rápido - Logs no Terminal

## ⚡ Passos para Testar

### 1. Parar o servidor (se estiver rodando)
```bash
Ctrl + C
```

### 2. Iniciar o servidor
```bash
npm run dev
```

**Você deve ver:**
```
✅ [CONSOLE-BRIDGE] WebSocket server rodando na porta 3001

  VITE v6.2.0  ready in XXX ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.x.x:3000/
```

### 3. Abrir o navegador
```
http://localhost:3000
```

**No terminal, você deve ver:**
```
🔌 [CONSOLE-BRIDGE] Cliente conectado
```

### 4. Selecionar 2 entrevistadores
- Clique em "Alex" e "Elena" (ou qualquer combinação)

### 5. Clicar em "Iniciar"

**No terminal, você deve ver logs como:**
```
📝 [14:23:45.123] [BROWSER] 🔵 [INIT] Iniciando sessão com a IA...
📝 [14:23:45.234] [BROWSER] 🎭 [PERSONAS] 2 entrevistador(es) selecionado(s):
📝 [14:23:45.345] [BROWSER]    - Alex (male) - Voz: Puck
📝 [14:23:45.456] [BROWSER]    - Elena (female) - Voz: Aoede
📝 [14:23:45.567] [BROWSER] 📋 [SCRIPT] Gerando roteiro da entrevista...
📝 [14:23:46.123] [BROWSER] 🤖 [AI] Chamando Gemini para gerar roteiro...
📝 [14:23:47.234] [BROWSER] ✅ [SCRIPT] Roteiro gerado com sucesso: 5 etapas
📝 [14:23:47.345] [BROWSER] 📝 [STAGES] Apresentação → Técnico → ...
📝 [14:23:47.456] [BROWSER] 🔌 [CONNECT-1] Conectando Alex (Puck)...
📝 [14:23:47.567] [BROWSER] 🔌 [CONNECT-2] Conectando Elena (Aoede)...
📝 [14:23:48.123] [BROWSER] ✅ [SESSION] Duas sessões criadas!
📝 [14:23:48.234] [BROWSER] 🎤 [MIC] Solicitando permissão do microfone...
📝 [14:23:49.345] [BROWSER] ✅ [MIC] Microfone autorizado!
📝 [14:23:49.456] [BROWSER] 🔊 [PIPELINE] Pipeline de áudio configurado
📝 [14:23:49.567] [BROWSER] ✅ [READY] Sistema pronto! Pode começar a falar.
```

### 6. Falar "Oi"

**No terminal, você deve ver:**
```
📝 [14:23:50.123] [BROWSER] 🎵 [AUDIO-IN] Chunk #1, Vol: 12.34%
📝 [14:23:50.234] [BROWSER] 🎵 [AUDIO-IN] Chunk #2, Vol: 15.67%
📝 [14:23:50.345] [BROWSER] 🎤 [SPEECH] Usuário começou a falar
📝 [14:23:50.456] [BROWSER] 📤 [SEND-SESSION-1] Áudio enviado (sessão ativa: 0)
📝 [14:23:51.123] [BROWSER] 🔇 [SPEECH] Usuário parou de falar
📝 [14:23:52.234] [BROWSER] 🔊 [AUDIO-OUT-0:Alex] Recebido 45678 bytes
📝 [14:23:52.345] [BROWSER] 💬 [TEXT-0:Alex] Olá! Prazer em conhecê-lo...
📝 [14:23:52.456] [BROWSER] 🎵 [DECODE-0:Alex] 3.45s em 12.34ms
📝 [14:23:52.567] [BROWSER] 📥 [QUEUE] Alex → fila (tamanho: 1)
📝 [14:23:52.678] [BROWSER] ▶️ [PLAY] Reproduzindo Alex
📝 [14:23:52.789] [BROWSER]    Duração do áudio: 3.450s
📝 [14:23:52.890] [BROWSER]    🎵 Timing: now=12.345s, start=12.355s
📝 [14:23:56.123] [BROWSER] ✅ [ENDED] Alex finalizado
📝 [14:23:56.234] [BROWSER] 🔀 [COORD] Alternando sessão ativa: 0 → 1
```

## ✅ Sucesso!

Se você viu logs similares aos acima, o sistema está funcionando perfeitamente! 🎉

## 🔍 O que Observar

### Logs de Coordenação
```
🔀 [COORD] Alternando sessão ativa: 0 → 1
```
- Deve alternar entre 0 e 1 após cada turno

### Logs de Áudio
```
🔊 [AUDIO-OUT-0:Alex] Recebido X bytes
▶️ [PLAY] Reproduzindo Alex
✅ [ENDED] Alex finalizado
```
- Deve mostrar recebimento, reprodução e finalização

### Logs de Transcrição
```
📤 [TRANSCRIPTION] Enviado para sessão 1: ...
```
- Deve enviar transcrições entre as sessões

### Logs de Problemas

#### Chiado
```
❌ [CHIADO-DETECTADO] X sources ativos simultaneamente!
```
- Se aparecer, há múltiplos áudios tocando ao mesmo tempo

#### Lentidão
```
⚠️ [LENTIDAO-DETECTADA] Fila com X áudios!
```
- Se aparecer, há acúmulo de áudios na fila

#### Delay
```
⚠️ DELAY DETECTADO: X.XXXs até começar a tocar
```
- Se aparecer, há delay antes de tocar o áudio

## 🐛 Problemas Comuns

### Logs não aparecem no terminal

1. **Recarregue a página** (F5)
2. **Verifique se apareceu**: `🔌 [CONSOLE-BRIDGE] Cliente conectado`
3. **Abra F12** e veja se há erros no console

### "Cliente conectado" não aparece

1. **Pare o servidor** (Ctrl+C)
2. **Inicie novamente**: `npm run dev`
3. **Abra o navegador** novamente

### Porta 3001 em uso

1. **Mude a porta** em `vite-plugin-console-log.ts`:
   ```typescript
   wss = new WebSocketServer({ port: 3002 }); // Mude para 3002
   ```
2. **Mude também no script injetado**:
   ```javascript
   ws = new WebSocket('ws://localhost:3002'); // Mude para 3002
   ```

## 💡 Dicas

### Filtrar logs específicos

```bash
# Ver apenas logs de AUDIO
npm run dev | Select-String "AUDIO"

# Ver apenas logs de COORD
npm run dev | Select-String "COORD"

# Ver apenas logs de TRANSCRIPTION
npm run dev | Select-String "TRANSCRIPTION"
```

### Salvar logs em arquivo

```bash
npm run dev > logs.txt 2>&1
```

### Ver logs em tempo real E salvar

```bash
npm run dev | Tee-Object -FilePath logs.txt
```

## 🎯 Próximos Passos

Agora que os logs estão funcionando:

1. ✅ **Teste com 2 entrevistadores**
2. ✅ **Observe os logs de coordenação**
3. ✅ **Identifique problemas** (chiado, lentidão, delay)
4. ✅ **Copie logs** para análise
5. ✅ **Compartilhe** se precisar de ajuda

## 📞 Suporte

Se encontrar problemas:

1. **Copie os logs** do terminal
2. **Descreva o problema** (chiado, lentidão, etc)
3. **Compartilhe** os logs relevantes

Boa sorte! 🚀
