# Arquitetura de Duas Sessões - Análise de Engenharia

## 🔍 Problema Raiz Identificado

### Causa do Áudio Sobreposto
**ANTES**: Ambas as sessões recebiam áudio do microfone simultaneamente
```typescript
// ❌ PROBLEMA: Envio para ambas as sessões
this.sessionPromise?.then(s => s.sendRealtimeInput({ media: createBlob(pcm) }));
this.sessionPromise2?.then(s => s.sendRealtimeInput({ media: createBlob(pcm) }));
```

**Resultado**: As duas IAs processavam o áudio ao mesmo tempo e respondiam simultaneamente, causando:
- Áudio sobreposto (falam um por cima do outro)
- Chiado (múltiplos buffers sendo reproduzidos)
- Perda de coordenação (não há controle de turno)

## ✅ Solução Arquitetural

### 1. Sistema de Coordenação de Turno

Implementado um **índice de sessão ativa** que controla qual IA deve receber e processar o áudio:

```typescript
private activeSessionIndex = 0; // 0 = primeira sessão, 1 = segunda sessão
```

### 2. Envio Seletivo de Áudio

**AGORA**: Apenas a sessão ativa recebe áudio do microfone

```typescript
// ✅ SOLUÇÃO: Envio apenas para sessão ativa
if (this.selectedPersonas.size === 2) {
  const targetSession = this.activeSessionIndex === 0 
    ? this.sessionPromise 
    : this.sessionPromise2;
  
  targetSession.then(s => s.sendRealtimeInput({ media: createBlob(pcm) }));
}
```

### 3. Alternância Automática de Turno

Quando uma sessão completa seu turno (`turnComplete`), alternamos automaticamente:

```typescript
if (msg.serverContent?.turnComplete) {
  this.turnCount++;
  const previousSession = this.activeSessionIndex;
  this.activeSessionIndex = (this.activeSessionIndex + 1) % 2;
  console.log(`🔀 [COORD] Alternando: ${previousSession} → ${this.activeSessionIndex}`);
}
```

### 4. Fila de Áudio com Prioridade

Todos os áudios recebidos são enfileirados e reproduzidos sequencialmente:

```typescript
this.audioQueue.push({ buffer, personaName });
if (!this.isPlayingAudio) {
  this.playNextInQueue(); // Processa fila
}
```

## 📊 Sistema de Logs Detalhados

### Logs com Timestamp

Todos os logs agora incluem timestamp preciso:
```typescript
const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
console.log(`📨 [${timestamp}] [MSG-${sessionIndex}:${personaName}] ...`);
```

### Categorias de Logs

#### 1. **Coordenação de Sessão**
```
🔀 [14:23:45.123] [COORD] Alternando sessão ativa: 0 → 1
   Turno #3: Próximo a responder será sessão 1
```

#### 2. **Envio de Áudio**
```
📤 [14:23:45.234] [SEND-SESSION-1] Áudio enviado (sessão ativa: 0)
🎵 [14:23:45.345] [AUDIO-IN] Chunk #150, Vol: 12.34%, Silent: 45/150
   🎯 [COORD] Sessão ativa: 0, Turno: 3
```

#### 3. **Recebimento de Áudio**
```
🔊 [14:23:46.123] [AUDIO-OUT-0:Alex] Recebido 45678 bytes
💬 [14:23:46.124] [TEXT-0:Alex] Excelente resposta! Vamos aprofundar...
🎵 [14:23:46.234] [DECODE-0:Alex] 3.45s em 12.34ms
📥 [14:23:46.235] [QUEUE] Alex → fila (tamanho: 1)
   Fila atual: [Alex]
```

#### 4. **Reprodução de Áudio**
```
▶️ [14:23:46.300] [PLAY] Reproduzindo Alex
   Fila restante: 0 []
   Duração do áudio: 3.450s
   🎵 Timing: now=12.345s, start=12.355s, end=15.855s
   🎚️ Fade in: 50ms, Fade out: 50ms, Gap: 50ms
   👤 Speaker visual atualizado: Alex (tech_lead)
   ✓ Source adicionado ao set (total: 1)
```

#### 5. **Finalização**
```
✅ [14:23:49.800] [ENDED] Alex finalizado
   ⏳ Aguardando 50ms antes do próximo...
✅ [14:23:49.850] [QUEUE] Fila vazia - parando reprodução
```

#### 6. **Turnos Completos**
```
🔄 [14:23:50.000] [TURN-0:Alex] Turno completo detectado
📝 [14:23:50.001] [TRANSCRIPT-0] User: Eu implementei usando Python...
```

## 🎯 Fluxo de Execução

### Modo Dual (2 Entrevistadores)

```
1. Usuário fala
   ↓
2. Áudio enviado APENAS para sessão ativa (ex: sessão 0 - Alex)
   ↓
3. Alex processa e responde
   ↓
4. Áudio de Alex adicionado à fila
   ↓
5. Fila reproduz áudio de Alex
   ↓
6. turnComplete detectado
   ↓
7. Alternância: sessão ativa = 1 (Elena)
   ↓
8. Usuário fala novamente
   ↓
9. Áudio enviado APENAS para sessão 1 (Elena)
   ↓
10. Elena processa e responde
    ↓
11. Ciclo continua...
```

## 🔧 Parâmetros de Configuração

### Buffer de Áudio
```typescript
this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(8192, 1, 1);
// 8192 = buffer maior para reduzir chiado
```

### Fade In/Out
```typescript
gainNode.gain.linearRampToValueAtTime(1, this.outputAudioContext.currentTime + 0.05);
// 50ms de fade para transições suaves
```

### Gap Entre Áudios
```typescript
this.nextStartTime = startTime + buffer.duration + 0.05;
// 50ms de gap para evitar sobreposição
```

### Delay Antes do Próximo
```typescript
setTimeout(() => this.playNextInQueue(), 50);
// 50ms de delay para estabilidade
```

## 🧪 Como Diagnosticar Problemas

### 1. Verificar Coordenação
Procure nos logs:
```
🔀 [COORD] Alternando sessão ativa
```
- Deve alternar entre 0 e 1
- Deve acontecer após cada `turnComplete`

### 2. Verificar Envio de Áudio
Procure nos logs:
```
📤 [SEND-SESSION-X] Áudio enviado (sessão ativa: X)
```
- Deve enviar apenas para UMA sessão por vez
- Sessão deve corresponder ao `activeSessionIndex`

### 3. Verificar Fila
Procure nos logs:
```
📥 [QUEUE] Nome → fila (tamanho: X)
   Fila atual: [Nome1, Nome2, ...]
```
- Fila deve processar sequencialmente
- Não deve ter múltiplos áudios do mesmo entrevistador seguidos

### 4. Verificar Reprodução
Procure nos logs:
```
▶️ [PLAY] Reproduzindo Nome
   🎵 Timing: now=X, start=Y, end=Z
```
- `start` deve ser >= `now`
- `end` deve ser `start + duration + gap`
- Não deve haver sobreposição de timing

### 5. Verificar Chiado
Se ainda houver chiado:
- Verificar se múltiplos sources estão ativos
- Verificar timing de reprodução
- Aumentar fade duration (50ms → 100ms)
- Aumentar gap (50ms → 100ms)

## 📈 Métricas de Performance

Os logs agora incluem:
- **Timestamp preciso** (milissegundos)
- **Tempo de decodificação** de áudio
- **Tamanho da fila** em tempo real
- **Timing de reprodução** detalhado
- **Volume do microfone** em %
- **Sessão ativa** atual

## 🎓 Princípios Arquiteturais Aplicados

1. **Single Responsibility**: Cada sessão tem uma responsabilidade clara
2. **Separation of Concerns**: Coordenação separada de reprodução
3. **Queue Pattern**: Fila FIFO para gerenciar áudios
4. **State Machine**: Alternância de estados (sessão ativa)
5. **Observer Pattern**: Callbacks para eventos de áudio
6. **Debouncing**: Delay entre processamentos
7. **Fade In/Out**: Transições suaves para UX
8. **Detailed Logging**: Observabilidade completa

## 🚀 Próximos Passos (se necessário)

Se ainda houver problemas:

1. **Aumentar delays**:
   - Fade: 50ms → 100ms
   - Gap: 50ms → 100ms
   - Delay: 50ms → 100ms

2. **Implementar debounce mais agressivo**:
   ```typescript
   private audioSendDebounce = 500; // 300ms → 500ms
   ```

3. **Adicionar confirmação de turno**:
   - Aguardar confirmação antes de alternar
   - Implementar timeout de segurança

4. **Implementar fila de prioridade**:
   - Priorizar respostas do entrevistador ativo
   - Descartar respostas fora de turno
