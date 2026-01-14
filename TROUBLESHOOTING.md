# Guia de Troubleshooting - Áudio Dual

## 🚨 Problema: Ainda falam um por cima do outro

### Diagnóstico
Abra o console (F12) e procure:
```
📤 [SEND-SESSION-1] Áudio enviado (sessão ativa: 0)
📤 [SEND-SESSION-2] Áudio enviado (sessão ativa: 0)
```

Se aparecer **DOIS** `SEND` no mesmo momento:
- ❌ **Problema**: Ambas sessões estão recebendo áudio
- ✅ **Solução**: Verificar linha ~1070 em `index.tsx`

### Deve aparecer apenas:
```
📤 [SEND-SESSION-1] Áudio enviado (sessão ativa: 0)
```
OU
```
📤 [SEND-SESSION-2] Áudio enviado (sessão ativa: 1)
```

## 🚨 Problema: Não alterna entre entrevistadores

### Diagnóstico
Procure no console:
```
🔀 [COORD] Alternando sessão ativa: 0 → 1
```

Se **NÃO** aparecer:
- ❌ **Problema**: Alternância não está funcionando
- ✅ **Solução**: Verificar callback `turnComplete` (linha ~850)

### Deve aparecer após cada resposta:
```
🔄 [TURN-0:Alex] Turno completo detectado
🔀 [COORD] Alternando: 0 → 1
   Turno #3: Próximo a responder será sessão 1
```

## 🚨 Problema: Áudio com chiado

### Diagnóstico 1: Múltiplos sources
Procure:
```
▶️ [PLAY] Reproduzindo Alex
   ⏹️ Parando 2 source(s) anterior(es)  ← ❌ NÃO DEVE TER MAIS DE 1
```

Se tiver mais de 1 source:
- ❌ **Problema**: Áudios não estão sendo parados corretamente
- ✅ **Solução**: Verificar `playNextInQueue()` linha ~935

### Diagnóstico 2: Timing sobreposto
Procure:
```
🎵 Timing: now=12.345s, start=12.340s, end=15.840s  ← ❌ start < now
```

Se `start < now`:
- ❌ **Problema**: Tentando reproduzir no passado
- ✅ **Solução**: Aumentar buffer inicial (linha ~965)

### Diagnóstico 3: Fila muito grande
Procure:
```
📥 [QUEUE] Alex → fila (tamanho: 5)  ← ❌ Fila muito grande
   Fila atual: [Alex, Elena, Alex, Elena, Alex]
```

Se fila > 3:
- ❌ **Problema**: Respostas acumulando
- ✅ **Solução**: Limpar fila ao alternar turno

## 🚨 Problema: Um entrevistador não responde

### Diagnóstico
Procure:
```
📤 [SEND-SESSION-1] Áudio enviado (sessão ativa: 0)
```
Sempre na mesma sessão (0 ou 1)?

Se sempre a mesma:
- ❌ **Problema**: Não está alternando
- ✅ **Solução**: Verificar `activeSessionIndex` (linha ~850)

### Deve alternar:
```
📤 [SEND-SESSION-1] (sessão ativa: 0)  ← Alex
🔀 [COORD] Alternando: 0 → 1
📤 [SEND-SESSION-2] (sessão ativa: 1)  ← Elena
🔀 [COORD] Alternando: 1 → 0
📤 [SEND-SESSION-1] (sessão ativa: 0)  ← Alex
```

## 🚨 Problema: Delay muito grande entre falas

### Diagnóstico
Procure:
```
✅ [14:23:49.800] [ENDED] Alex finalizado
   ⏳ Aguardando 50ms antes do próximo...
✅ [14:23:51.000] [QUEUE] Fila vazia  ← ❌ 1200ms de delay!
```

Se delay > 200ms:
- ❌ **Problema**: Delay muito grande
- ✅ **Solução**: Reduzir timeout (linha ~980)

### Ajuste:
```typescript
setTimeout(() => this.playNextInQueue(), 20); // 50ms → 20ms
```

## 🚨 Problema: Áudio cortado/picotado

### Diagnóstico
Procure:
```
🎵 [DECODE-0:Alex] 3.45s em 234.56ms  ← ❌ Decodificação muito lenta
```

Se tempo de decodificação > 100ms:
- ❌ **Problema**: CPU sobrecarregada
- ✅ **Solução**: Aumentar buffer (linha ~1040)

### Ajuste:
```typescript
this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(16384, 1, 1);
// 8192 → 16384
```

## 🔧 Checklist de Verificação

Execute este checklist no console:

### 1. Verificar sessões conectadas
```
✅ [OPEN-0:Alex] Conexão estabelecida!
✅ [OPEN-1:Elena] Conexão estabelecida!
```
- [ ] Ambas sessões conectadas?

### 2. Verificar envio de áudio
```
📤 [SEND-SESSION-X] Áudio enviado
```
- [ ] Apenas UMA sessão por vez?
- [ ] Sessão corresponde ao `activeSessionIndex`?

### 3. Verificar alternância
```
🔀 [COORD] Alternando: 0 → 1
```
- [ ] Alterna após cada turno?
- [ ] Alterna entre 0 e 1?

### 4. Verificar fila
```
📥 [QUEUE] Nome → fila (tamanho: X)
```
- [ ] Fila processa sequencialmente?
- [ ] Tamanho da fila < 3?

### 5. Verificar reprodução
```
▶️ [PLAY] Reproduzindo Nome
   🎵 Timing: now=X, start=Y, end=Z
```
- [ ] start >= now?
- [ ] Apenas 1 source ativo?
- [ ] Fade in/out presente?

## 📞 Suporte

Se todos os checks passarem mas ainda houver problemas:

1. **Copie os logs** do console (últimos 100 linhas)
2. **Descreva o comportamento** observado
3. **Informe qual entrevistador** está com problema
4. **Informe se é consistente** ou intermitente

## 🎯 Logs Esperados (Fluxo Normal)

```
🎬 [START] Iniciando gravação...
✅ [OPEN-0:Alex] Conexão estabelecida!
✅ [OPEN-1:Elena] Conexão estabelecida!

🎵 [AUDIO-IN] Chunk #1, Vol: 15.23%
   🎯 [COORD] Sessão ativa: 0, Turno: 0
📤 [SEND-SESSION-1] Áudio enviado (sessão ativa: 0)

🔊 [AUDIO-OUT-0:Alex] Recebido 45678 bytes
💬 [TEXT-0:Alex] Olá! Sou Alex, Tech Lead...
📥 [QUEUE] Alex → fila (tamanho: 1)

▶️ [PLAY] Reproduzindo Alex
   Fila restante: 0 []
   🎵 Timing: now=2.345s, start=2.355s, end=5.805s
   👤 Speaker visual: Alex (tech_lead)

✅ [ENDED] Alex finalizado
🔀 [COORD] Alternando: 0 → 1

📤 [SEND-SESSION-2] Áudio enviado (sessão ativa: 1)

🔊 [AUDIO-OUT-1:Elena] Recebido 38912 bytes
💬 [TEXT-1:Elena] E eu sou Elena, especialista em RH...
📥 [QUEUE] Elena → fila (tamanho: 1)

▶️ [PLAY] Reproduzindo Elena
   Fila restante: 0 []
   🎵 Timing: now=5.855s, start=5.865s, end=8.915s
   👤 Speaker visual: Elena (hr)

✅ [ENDED] Elena finalizado
🔀 [COORD] Alternando: 1 → 0
```

Este é o fluxo esperado! Se seus logs se parecem com isso, está funcionando corretamente.
