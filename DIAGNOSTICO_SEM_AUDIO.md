# Diagnóstico - Sem Áudio

## 🔍 Problema

Entrevistadores **não falam nada** (te ouvem mas não respondem)

## 📊 Logs para Verificar

Abra o console (F12) e procure por:

### 1. Áudio está sendo recebido?

Procure:
```
🔊 [AUDIO-OUT-0:Alex] Recebido 45678 bytes
```

**Se NÃO aparecer**:
- ❌ IA não está gerando áudio
- Problema: Configuração da API ou sessão

**Se aparecer**:
- ✅ IA está gerando áudio
- Continue verificando...

### 2. Áudio está sendo decodificado?

Procure:
```
🎵 [DECODE-0:Alex] 3.45s em 12.34ms
```

**Se NÃO aparecer**:
- ❌ Erro na decodificação
- Procure: `[BUFFER-ERROR]`

**Se aparecer**:
- ✅ Áudio decodificado com sucesso
- Continue verificando...

### 3. Áudio está sendo adicionado à fila?

Procure:
```
📥 [QUEUE] Alex → fila (tamanho: 1)
   Fila atual: [Alex]
```

**Se NÃO aparecer**:
- ❌ Áudio não está sendo enfileirado
- Problema no código

**Se aparecer**:
- ✅ Áudio na fila
- Continue verificando...

### 4. Fila está sendo processada?

Procure:
```
▶️ [QUEUE] Iniciando processamento da fila
▶️ [PLAY] Reproduzindo Alex
```

**Se NÃO aparecer**:
- ❌ Fila não está sendo processada
- Problema: `isPlayingAudio` travado

**Se aparecer**:
- ✅ Fila sendo processada
- Continue verificando...

### 5. Timing está correto?

Procure:
```
🎵 Timing: now=10.500s, start=10.500s, end=13.700s
✅ Reprodução imediata (delay: 0.000s)
```

**Se aparecer**:
```
⚠️ DELAY DETECTADO: 5.234s até começar a tocar
```
- ❌ Áudio agendado para o futuro
- Problema: `nextStartTime` incorreto

### 6. Source está sendo criado?

Procure:
```
✓ Source adicionado (total: 1)
```

**Se NÃO aparecer**:
- ❌ Source não foi criado
- Problema no código

## 🎯 Cenários Comuns

### Cenário 1: Nenhum log de áudio
```
📤 [SEND-SESSION-1] Áudio enviado
(nada mais aparece)
```
**Problema**: IA não está respondendo
**Solução**: Verificar API key, modelo, instruções

### Cenário 2: Áudio recebido mas não toca
```
🔊 [AUDIO-OUT-0:Alex] Recebido 45678 bytes
🎵 [DECODE-0:Alex] 3.45s em 12.34ms
📥 [QUEUE] Alex → fila (tamanho: 1)
(para aqui)
```
**Problema**: Fila não está sendo processada
**Solução**: Verificar `isPlayingAudio` flag

### Cenário 3: Toca mas com delay grande
```
▶️ [PLAY] Reproduzindo Alex
⚠️ DELAY DETECTADO: 10.234s até começar a tocar
```
**Problema**: `nextStartTime` muito no futuro
**Solução**: Resetar `nextStartTime = 0` ao iniciar

### Cenário 4: Buffer inválido
```
🔊 [AUDIO-OUT-0:Alex] Recebido 45678 bytes
❌ [BUFFER-ERROR] Buffer inválido ou vazio!
```
**Problema**: Decodificação falhou
**Solução**: Verificar sample rate (24000)

## 🔧 Correções Aplicadas

### 1. Verificação de Buffer
```typescript
if (!buffer || buffer.duration === 0) {
  console.error(`❌ [BUFFER-ERROR] Buffer inválido ou vazio!`);
  return;
}
```

### 2. Timing Corrigido
```typescript
// Se nextStartTime for 0 ou menor que now, começar agora
const startTime = this.nextStartTime > now ? this.nextStartTime : now;
```

### 3. Log de Delay
```typescript
const delay = startTime - now;
if (delay > 0.1) {
  console.warn(`⚠️ DELAY DETECTADO: ${delay.toFixed(3)}s`);
}
```

### 4. Log de Mensagem Sem Áudio
```typescript
else {
  console.log(`📭 [NO-AUDIO] Mensagem sem áudio`);
}
```

## 🧪 Teste Agora

1. Recarregue a página (F5)
2. Selecione 2 entrevistadores
3. Inicie a entrevista
4. Abra console (F12)
5. Fale "Oi"
6. **Copie TODOS os logs** e me envie

## 📋 Checklist de Logs Esperados

Sequência completa esperada:
```
✅ [OPEN-0:Alex] Conexão estabelecida!
✅ [OPEN-1:Elena] Conexão estabelecida!
🎵 [AUDIO-IN] Chunk #1, Vol: 15.23%
📤 [SEND-SESSION-1] Áudio enviado
🔊 [AUDIO-OUT-0:Alex] Recebido 45678 bytes
💬 [TEXT-0:Alex] Olá! Sou Alex...
🎵 [DECODE-0:Alex] 3.45s em 12.34ms
📥 [QUEUE] Alex → fila (tamanho: 1)
▶️ [QUEUE] Iniciando processamento da fila
▶️ [PLAY] Reproduzindo Alex
   🎵 Timing: now=2.345s, start=2.345s, end=5.795s
   ✅ Reprodução imediata (delay: 0.000s)
   ✓ Source adicionado (total: 1)
✅ [ENDED] Alex finalizado
```

Se algum desses logs estiver faltando, me avise qual!
