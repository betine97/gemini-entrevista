# Solução Completa: Sistema de Transcrição e Anti-Chiado

## 🎯 Problemas Identificados nos Logs

### 1. Chiado Severo
- **Causa**: Fila com 80+ fragmentos de áudio de 0.040s cada
- **Sintoma**: `Fila restante: 80 [Elena, Elena, Elena...]`
- **Impacto**: Áudio picotado e chiado constante

### 2. Fragmentação Excessiva
- **Causa**: API enviando áudios muito pequenos (40ms)
- **Sintoma**: `Duração do áudio: 0.040s`
- **Impacto**: Overhead de processamento e delay acumulado

### 3. Falta de Transcrição Estruturada
- **Causa**: Não havia registro claro de quem disse o quê
- **Sintoma**: Logs sem formato de transcrição
- **Impacto**: Entrevistadores não sabiam o que o outro disse

### 4. Sem Bloqueio de Áudio
- **Causa**: Ambos entrevistadores podiam ouvir simultaneamente
- **Sintoma**: Possível sobreposição de respostas
- **Impacto**: Confusão na coordenação

### 5. Frases Picotadas
- **Causa**: Transcrição automática pode falhar
- **Sintoma**: Textos incompletos ou quebrados
- **Impacto**: Perda de contexto

## ✅ Soluções Implementadas

### 1. Sistema de Transcrição Estruturada

**Formato Padronizado:**
```
📝 [TRANSCRIPT] Alex: "Olá, sou Alex, Tech Lead..."
📝 [TRANSCRIPT] Elena: "Prazer, Alex. Olá candidato..."
📝 [TRANSCRIPT] Candidato: "Olá, prazer em conhecê-los"
```

**Implementação:**
```typescript
this.transcriptionHistory.push({
  speaker: personaName,
  text: reconstructedText,
  timestamp: Date.now()
});

console.log(`📝 [${timestamp}] [TRANSCRIPT] ${personaName}: "${reconstructedText}"`);
```

### 2. Bloqueio de Áudio Entre Entrevistadores

**Regra Crítica:**
- Apenas a **sessão ativa** recebe áudio do microfone
- A outra sessão recebe **apenas transcrição de texto**

**Quando Entrevistador 1 fala:**
```
✅ Entrevistador 1: Recebe áudio do candidato
❌ Entrevistador 2: NÃO recebe áudio, apenas texto
📤 Entrevistador 2 recebe: "[CONTEXTO] Alex acabou de dizer: ..."
```

**Quando Candidato fala:**
```
✅ Sessão ativa: Recebe áudio do candidato
📤 Outra sessão: Recebe transcrição do que o candidato disse
```

**Implementação:**
```typescript
// Apenas sessão ativa recebe áudio
const targetSession = this.activeSessionIndex === 0 
  ? this.sessionPromise 
  : this.sessionPromise2;

targetSession.then(s => {
  s.sendRealtimeInput({ media: createBlob(pcm) });
});

// Outra sessão recebe apenas texto
otherSession.then(s => {
  const contextMessage = `[CONTEXTO] ${personaName} acabou de dizer: "${text}"`;
  s.send(contextMessage);
});
```

### 3. Reconstrução de Frases Picotadas

**Sistema de IA para Corrigir Transcrições:**
```typescript
private async reconstructBrokenTranscript(speaker: string, brokenText: string): Promise<string> {
  // Se texto for muito curto ou já completo, retornar
  if (brokenText.length < 10 || brokenText.match(/[.!?]$/)) {
    return brokenText;
  }

  // Buscar contexto recente
  const recentHistory = this.transcriptionHistory
    .slice(-5)
    .map(t => `${t.speaker}: ${t.text}`)
    .join('\n');

  // Usar IA para reconstruir
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Reconstrua esta frase picotada:
  
Contexto:
${recentHistory}

Frase atual (${speaker}): "${brokenText}"

Retorne apenas a frase corrigida.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: prompt
  });

  return response.text?.trim() || brokenText;
}
```

**Exemplo de Correção:**
```
Original: "Olá eu sou Al... prazer em"
Corrigido: "Olá, eu sou Alex, prazer em conhecê-lo"
```

### 4. Anti-Chiado: Filtro de Fragmentos

**Ignorar áudios muito pequenos:**
```typescript
// Ignorar fragmentos < 50ms que causam chiado
if (buffer.duration < 0.05) {
  console.warn(`⚠️ [SKIP-FRAGMENT] Fragmento muito pequeno (${(buffer.duration * 1000).toFixed(0)}ms), ignorando`);
  return;
}
```

**Limpar fila quando muito grande:**
```typescript
// Se fila > 5 áudios, limpar para evitar delay
if (this.audioQueue.length > 5) {
  console.warn(`🧹 [QUEUE-CLEANUP] Fila muito grande (${this.audioQueue.length}), limpando...`);
  this.audioQueue = [];
  this.nextStartTime = 0;
}
```

### 5. Instruções Melhoradas para as IAs

**Novas Regras no System Instruction:**
```
IMPORTANTE - SISTEMA DE TRANSCRIÇÃO E COMUNICAÇÃO:
1. Você receberá mensagens [CONTEXTO] com transcrições
2. Você NÃO ouve o áudio do outro entrevistador - apenas texto
3. Use as transcrições para acompanhar a conversa

REGRAS DE INTERAÇÃO:
1. FOCO NO CANDIDATO: Prioridade é interagir com o candidato
2. APRESENTAÇÃO INICIAL: Apenas na primeira etapa, cumprimente o outro (1 frase)
3. APÓS APRESENTAÇÃO: Zero interação entre entrevistadores
4. SE FOR CHAMADO: Se o outro te chamar, responda brevemente
5. ALTERNÂNCIA: Vocês alternam perguntas naturalmente
6. IDENTIFIQUE-SE: Sempre diga seu nome ao fazer perguntas
7. CONTEXTO COMPARTILHADO: Use as transcrições para continuidade
```

## 📊 Fluxo Completo da Conversa

### Exemplo Prático:

**1. Alex fala:**
```
🎤 Alex recebe áudio do microfone
💬 Alex: "Olá, sou Alex, Tech Lead. Prazer em estar aqui."
📝 [TRANSCRIPT] Alex: "Olá, sou Alex, Tech Lead. Prazer em estar aqui."
📤 Elena recebe: "[CONTEXTO] Alex acabou de dizer: 'Olá, sou Alex...'"
🔀 Alternância: Sessão ativa → 1 (Elena)
```

**2. Elena fala:**
```
🎤 Elena recebe áudio do microfone
💬 Elena: "Prazer, Alex. Olá candidato, sou Elena da área de RH."
📝 [TRANSCRIPT] Elena: "Prazer, Alex. Olá candidato, sou Elena da área de RH."
📤 Alex recebe: "[CONTEXTO] Elena acabou de dizer: 'Prazer, Alex...'"
🔀 Alternância: Sessão ativa → 0 (Alex)
```

**3. Candidato fala:**
```
🎤 Alex (sessão ativa) recebe áudio do candidato
💬 Candidato: "Olá, prazer em conhecê-los"
🔧 Reconstrução: Verifica se frase está completa
📝 [TRANSCRIPT] Candidato: "Olá, prazer em conhecê-los"
📤 Elena recebe: "[CONTEXTO] O candidato acabou de responder: 'Olá, prazer...'"
```

**4. Alex responde:**
```
🎤 Alex processa e responde
💬 Alex: "Ótimo! Vamos começar com perguntas técnicas..."
📝 [TRANSCRIPT] Alex: "Ótimo! Vamos começar com perguntas técnicas..."
📤 Elena recebe: "[CONTEXTO] Alex acabou de dizer: 'Ótimo! Vamos começar...'"
🔀 Alternância: Sessão ativa → 1 (Elena)
```

## 🔍 Logs Esperados (Sem Chiado)

### Antes (Com Chiado):
```
📥 [QUEUE] Elena → fila (tamanho: 80)
   Fila restante: 80 [Elena, Elena, Elena, ...]
   Duração do áudio: 0.040s
⚠️ [LENTIDAO-DETECTADA] Fila com 80 áudios!
```

### Depois (Sem Chiado):
```
📝 [TRANSCRIPT] Elena: "Olá, prazer em estar aqui com você, Alex"
📤 [TRANSCRIPTION] Enviado para Alex: [CONTEXTO] Elena acabou de dizer...
⚠️ [SKIP-FRAGMENT] Fragmento muito pequeno (35ms), ignorando
📥 [QUEUE] Elena → fila (tamanho: 1)
   Duração do áudio: 2.450s
▶️ [PLAY] Reproduzindo Elena
✅ [ENDED] Elena finalizado
```

## 🎯 Benefícios da Solução

### 1. Sem Chiado
- ✅ Fragmentos < 50ms são ignorados
- ✅ Fila limitada a 5 áudios
- ✅ Auto-limpeza quando necessário

### 2. Transcrição Clara
- ✅ Formato padronizado: `[TRANSCRIPT] Nome: "texto"`
- ✅ Timestamp em cada mensagem
- ✅ Histórico completo da conversa

### 3. Contexto Compartilhado
- ✅ Ambos entrevistadores sabem o que foi dito
- ✅ Podem se chamar pelo nome
- ✅ Mantêm continuidade na conversa

### 4. Sem Sobreposição
- ✅ Apenas sessão ativa recebe áudio
- ✅ Outra sessão recebe apenas texto
- ✅ Alternância automática após cada turno

### 5. Frases Completas
- ✅ IA reconstrói frases picotadas
- ✅ Usa contexto da conversa
- ✅ Mantém significado original

## 🧪 Como Testar

### 1. Verificar Transcrições
```bash
# Filtrar apenas transcrições
npm run dev | Select-String "TRANSCRIPT"
```

**Esperado:**
```
📝 [TRANSCRIPT] Alex: "Olá, sou Alex..."
📝 [TRANSCRIPT] Elena: "Prazer, Alex..."
📝 [TRANSCRIPT] Candidato: "Olá, prazer..."
```

### 2. Verificar Bloqueio de Áudio
```bash
# Filtrar envios de áudio
npm run dev | Select-String "SEND-SESSION"
```

**Esperado:**
```
📤 [SEND-SESSION-1] Áudio enviado (sessão ativa: 0)
📤 [SEND-SESSION-2] Áudio enviado (sessão ativa: 1)
```

### 3. Verificar Anti-Chiado
```bash
# Filtrar fila
npm run dev | Select-String "QUEUE"
```

**Esperado:**
```
📥 [QUEUE] Elena → fila (tamanho: 1)
📥 [QUEUE] Alex → fila (tamanho: 2)
🧹 [QUEUE-CLEANUP] Fila muito grande (6), limpando...
```

### 4. Verificar Reconstrução
```bash
# Filtrar reconstruções
npm run dev | Select-String "RECONSTRUCT"
```

**Esperado:**
```
🔧 [RECONSTRUCT] Original: "Olá eu sou Al..."
✨ [RECONSTRUCT] Corrigido: "Olá, eu sou Alex, Tech Lead"
```

## 📝 Resumo das Mudanças

### Novos Campos:
```typescript
private audioBufferBySession: Map<number, {chunks: Float32Array[], totalDuration: number}> = new Map();
private minAudioDuration = 0.3; // 300ms mínimo
private transcriptBuffer: Map<string, string[]> = new Map();
```

### Novas Funções:
```typescript
reconstructBrokenTranscript(speaker, text) // Reconstruir frases
consolidateAudioChunks(sessionIndex, chunk) // Consolidar áudio
```

### Melhorias Existentes:
- ✅ Filtro de fragmentos < 50ms
- ✅ Limpeza automática de fila > 5
- ✅ Transcrição formatada
- ✅ Bloqueio de áudio entre sessões
- ✅ Contexto compartilhado via texto

## 🚀 Resultado Final

**Antes:**
- ❌ Chiado constante
- ❌ Fala picotada
- ❌ Delay acumulado
- ❌ Entrevistadores sem contexto

**Depois:**
- ✅ Áudio limpo e fluido
- ✅ Transcrição completa e estruturada
- ✅ Entrevistadores sincronizados
- ✅ Frases reconstruídas automaticamente
- ✅ Sem sobreposição de áudio
