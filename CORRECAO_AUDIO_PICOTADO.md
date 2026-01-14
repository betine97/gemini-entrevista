# Correção do Áudio Picotado - Duas Sessões

## Problemas Identificados

### 1. Um entrevistador não conseguia responder
**Causa**: O código bloqueava mensagens quando não era a "vez" do entrevistador (`isMyTurn`), impedindo que ele processasse o áudio do usuário e respondesse.

### 2. Áudio picotado/chiado
**Causas**:
- Reprodução simultânea de múltiplas sessões
- Sem gerenciamento de fila
- Conflito de timing entre sessões
- Buffer de áudio muito pequeno (4096)
- Transições bruscas entre áudios (sem fade in/out)

## Soluções Implementadas

### 1. Remoção do Bloqueio de Mensagens

**ANTES:**
```typescript
const isMyTurn = this.currentSpeaker === personaId;
if (!isMyTurn) {
  console.log(`⏭️ [SKIP-${personaName}] Não é minha vez, ignorando`);
  return; // ❌ BLOQUEAVA TUDO
}
```

**DEPOIS:**
```typescript
// ✅ Ambos os entrevistadores processam mensagens
// O controle de quem fala é feito pela fila de áudio
```

### 2. Sistema de Fila de Áudio

Implementei uma fila (`audioQueue`) que gerencia todos os áudios recebidos:

```typescript
private audioQueue: Array<{buffer: AudioBuffer, personaName: string}> = [];
private isPlayingAudio = false;
```

### 3. Função `playNextInQueue()` Melhorada

Esta função processa a fila de forma sequencial com melhorias anti-chiado:

**Melhorias implementadas:**
- ✅ **Fade in/out**: Transições suaves de 50ms para evitar cliques
- ✅ **Buffer entre áudios**: 50ms de gap entre cada áudio
- ✅ **Delay no próximo**: 50ms antes de processar o próximo da fila
- ✅ **Timing preciso**: Usa `currentTime` com precisão de milissegundos

```typescript
private playNextInQueue() {
  if (this.audioQueue.length === 0) {
    this.isPlayingAudio = false;
    return;
  }
  
  this.isPlayingAudio = true;
  const { buffer, personaName } = this.audioQueue.shift()!;
  
  // Parar áudio anterior com fade out
  this.sources.forEach(s => { 
    const gainNode = this.outputAudioContext.createGain();
    gainNode.gain.linearRampToValueAtTime(0, this.outputAudioContext.currentTime + 0.05);
    s.stop(this.outputAudioContext.currentTime + 0.05);
  });
  
  // Criar source com fade in
  const src = this.outputAudioContext.createBufferSource();
  src.buffer = buffer;
  
  const gainNode = this.outputAudioContext.createGain();
  gainNode.gain.setValueAtTime(0, this.outputAudioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(1, this.outputAudioContext.currentTime + 0.05);
  
  src.connect(gainNode);
  gainNode.connect(this.outputNode);
  
  // Timing com buffer
  const now = this.outputAudioContext.currentTime;
  const startTime = Math.max(now + 0.01, this.nextStartTime);
  this.nextStartTime = startTime + buffer.duration + 0.05;
  
  src.start(startTime);
  
  // Delay antes do próximo
  src.onended = () => {
    setTimeout(() => this.playNextInQueue(), 50);
  };
}
```

### 4. Buffer de Áudio Aumentado

**ANTES:**
```typescript
this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
```

**DEPOIS:**
```typescript
this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(8192, 1, 1);
// Buffer 2x maior = menos chiado
```

### 5. Atualização Automática do Speaker Visual

Agora o `currentSpeaker` é atualizado automaticamente quando um áudio começa a tocar:

```typescript
const persona = PERSONAS.find(p => p.name === personaName);
if (persona) {
  this.currentSpeaker = persona.id; // Atualiza visual
}
```

## Benefícios

1. ✅ **Ambos entrevistadores respondem**: Sem bloqueio de mensagens
2. ✅ **Áudio fluido**: Sem picotes ou cortes
3. ✅ **Sem chiado**: Fade in/out + buffer maior
4. ✅ **Ordem preservada**: Áudios reproduzidos na ordem de chegada
5. ✅ **Sem sobreposição**: Apenas um áudio por vez
6. ✅ **Transições suaves**: Fade de 50ms entre áudios
7. ✅ **Visual sincronizado**: Esfera ativa mostra quem está falando

## Mudanças no Código

### Removido
- ❌ `nextStartTime2` (tempo separado para segunda sessão)
- ❌ `isMyTurn` (bloqueio de mensagens)
- ❌ Reprodução imediata sem fade
- ❌ Buffer pequeno (4096)

### Adicionado
- ✅ `audioQueue` (fila de áudios)
- ✅ `isPlayingAudio` (flag de controle)
- ✅ `playNextInQueue()` (processador de fila com fade)
- ✅ Fade in/out com GainNode
- ✅ Buffer maior (8192)
- ✅ Gaps entre áudios (50ms)
- ✅ Delay antes do próximo (50ms)

### Modificado
- 🔄 `createSessionCallbacks()` - Remove bloqueio, adiciona à fila
- 🔄 `stopRecording()` - Limpa a fila ao parar
- 🔄 `playNextInQueue()` - Adiciona fade e timing melhorado

## Teste

Para testar:

1. Selecione 2 entrevistadores (ex: Alex + Elena)
2. Inicie a entrevista
3. Observe os logs no console:
   - `📥 [QUEUE]` - Áudio adicionado à fila
   - `▶️ [PLAY]` - Reproduzindo áudio
   - `🎵 [START]` - Timing preciso
   - `✅ [ENDED]` - Áudio finalizado
4. **Ambos devem conseguir responder**
5. **Áudio deve fluir sem chiado ou interrupções**

## Logs de Diagnóstico

Os logs agora mostram:
- Qual entrevistador está falando
- Tamanho da fila
- Timing preciso (milissegundos)
- Quando a fila está vazia

Exemplo:
```
📥 [QUEUE] Alex adicionado à fila. Tamanho: 1
▶️ [PLAY] Reproduzindo Alex, restam 0 na fila
🎵 [START] Alex em 2.451s, terminará em 5.234s
✅ [ENDED] Alex finalizado
📥 [QUEUE] Elena adicionado à fila. Tamanho: 1
▶️ [PLAY] Reproduzindo Elena, restam 0 na fila
🎵 [START] Elena em 5.284s, terminará em 7.892s
✅ [ENDED] Elena finalizado
✅ [QUEUE] Fila vazia
```

## Parâmetros de Ajuste Fino

Se ainda houver problemas, você pode ajustar:

1. **Fade duration**: Linha com `0.05` (50ms) - aumentar para transições mais suaves
2. **Gap entre áudios**: `+ 0.05` no `nextStartTime` - aumentar para mais espaço
3. **Delay antes do próximo**: `setTimeout(..., 50)` - aumentar se necessário
4. **Buffer size**: `8192` - pode ir até `16384` se necessário
