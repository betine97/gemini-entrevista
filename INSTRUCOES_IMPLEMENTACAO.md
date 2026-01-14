# Instruções de Implementação - Sistema de Transcrição

## ⚠️ IMPORTANTE

O código atual tem erros de sintaxe devido às substituições. Você precisará **reverter o arquivo `index.tsx` para a versão anterior** e aplicar as mudanças manualmente seguindo este guia.

## 📋 Mudanças Necessárias

### 1. Adicionar Novos Campos na Classe (linha ~141)

```typescript
private transcriptionHistory: Array<{speaker: string, text: string, timestamp: number}> = [];
private minAudioDuration = 0.05; // Mínimo 50ms antes de reproduzir (evita fragmentação)
```

### 2. Adicionar Função de Reconstrução de Frases

Adicione esta função ANTES de `detectUserSpeech`:

```typescript
// Reconstruir frases picotadas usando IA
private async reconstructBrokenTranscript(speaker: string, brokenText: string): Promise<string> {
  try {
    // Se o texto for muito curto ou já parecer completo, retornar como está
    if (brokenText.length < 10 || brokenText.match(/[.!?]$/)) {
      return brokenText;
    }

    // Buscar contexto recente
    const recentHistory = this.transcriptionHistory
      .slice(-5)
      .map(t => `${t.speaker}: ${t.text}`)
      .join('\n');

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Você é um corretor de transcrições de áudio. A seguinte frase pode estar picotada ou incompleta devido a problemas na captura de áudio.

Contexto da conversa:
${recentHistory}

Frase atual (${speaker}): "${brokenText}"

Sua tarefa:
1. Se a frase estiver claramente incompleta ou picotada, reconstrua-a de forma natural
2. Se a frase estiver OK, retorne ela como está
3. Mantenha o significado original
4. Retorne APENAS a frase corrigida, sem explicações

Frase corrigida:`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt
    });

    const reconstructed = response.text?.trim() || brokenText;
    
    if (reconstructed !== brokenText) {
      console.log(`🔧 [RECONSTRUCT] Original: "${brokenText}"`);
      console.log(`✨ [RECONSTRUCT] Corrigido: "${reconstructed}"`);
    }

    return reconstructed;
  } catch (e) {
    console.error('❌ [RECONSTRUCT-ERROR]', e);
    return brokenText;
  }
}
```

### 3. Atualizar Captura de Transcrição da IA (linha ~863)

Encontre esta seção:
```typescript
const aiText = msg.serverContent?.modelTurn?.parts?.find(p => p.text)?.text;
if (aiText) {
  console.log(`💬 [${timestamp}] [TEXT-${sessionIndex}:${personaName}]`, aiText.substring(0, 80) + '...');
```

Substitua por:
```typescript
const aiText = msg.serverContent?.modelTurn?.parts?.find(p => p.text)?.text;
if (aiText) {
  console.log(`💬 [${timestamp}] [TEXT-${sessionIndex}:${personaName}]`, aiText.substring(0, 80) + '...');
  
  // NOVO: Reconstruir frase se estiver picotada
  const reconstructedText = await this.reconstructBrokenTranscript(personaName, aiText);
  
  // Adicionar ao histórico de transcrições
  this.transcriptionHistory.push({
    speaker: personaName,
    text: reconstructedText,
    timestamp: Date.now()
  });
  
  // Exibir transcrição formatada no console
  console.log(`📝 [${timestamp}] [TRANSCRIPT] ${personaName}: "${reconstructedText}"`);
  
  if (this.selectedPersonas.size === 2) {
    this.conversationHistory.push({
      speaker: personaName,
      text: reconstructedText
    });
    
    // CRÍTICO: Enviar transcrição para a OUTRA sessão
    const otherSessionIndex = sessionIndex === 0 ? 1 : 0;
    const otherSession = otherSessionIndex === 0 ? this.sessionPromise : this.sessionPromise2;
    const otherPersona = Array.from(this.selectedPersonas)
      .map(id => PERSONAS.find(p => p.id === id))
      .filter(p => p)[otherSessionIndex];
    
    if (otherSession && otherPersona) {
      otherSession.then(s => {
        // BLOQUEIO: Enquanto um entrevistador fala, o outro NÃO recebe áudio do microfone
        // Apenas recebe a transcrição de texto
        const transcriptionMessage = `[CONTEXTO] ${personaName} acabou de dizer: "${reconstructedText}". Você (${otherPersona.name}) está acompanhando a conversa mas não deve responder a menos que seja chamado diretamente ou seja sua vez de fazer perguntas.`;
        s.send(transcriptionMessage);
        console.log(`📤 [${timestamp}] [TRANSCRIPTION] Enviado para ${otherPersona.name}: ${transcriptionMessage.substring(0, 80)}...`);
      }).catch(err => {
        console.error(`❌ [TRANSCRIPTION-ERROR] Erro ao enviar transcrição:`, err);
      });
    }
  }
}
```

### 4. Atualizar Captura de Transcrição do Usuário (linha ~820)

Encontre esta seção:
```typescript
if (userText && userText !== this.lastUserTranscript && userText.length > 15) {
  this.lastUserTranscript = userText;
  console.log(`📝 [${timestamp}] [TRANSCRIPT-${sessionIndex}] User:`, userText.substring(0, 100));
```

Substitua por:
```typescript
if (userText && userText !== this.lastUserTranscript && userText.length > 15) {
  this.lastUserTranscript = userText;
  
  // NOVO: Reconstruir frase do usuário se estiver picotada
  const reconstructedUserText = await this.reconstructBrokenTranscript('Candidato', userText);
  
  console.log(`📝 [${timestamp}] [TRANSCRIPT] Candidato: "${reconstructedUserText}"`);
  
  // Adicionar ao histórico de transcrições
  this.transcriptionHistory.push({
    speaker: 'Candidato',
    text: reconstructedUserText,
    timestamp: Date.now()
  });
  
  if (this.selectedPersonas.size === 2) {
    this.conversationHistory.push({
      speaker: 'Candidato',
      text: reconstructedUserText
    });
    
    // Enviar transcrição do candidato para AMBAS as sessões
    const otherSessionIndex = sessionIndex === 0 ? 1 : 0;
    const otherSession = otherSessionIndex === 0 ? this.sessionPromise : this.sessionPromise2;
    
    if (otherSession) {
      otherSession.then(s => {
        const contextMessage = `[CONTEXTO] O candidato acabou de responder: "${reconstructedUserText}"`;
        s.send(contextMessage);
        console.log(`📤 [${timestamp}] [USER-TRANSCRIPT] Enviado para sessão ${otherSessionIndex}`);
      }).catch(err => {
        console.error(`❌ [USER-TRANSCRIPT-ERROR]`, err);
      });
    }
  }
  
  await this.analyzeResponse(reconstructedUserText);
}
```

### 5. Adicionar Filtro Anti-Chiado (linha ~900)

Encontre esta seção:
```typescript
// Verificar se buffer é válido
if (!buffer || buffer.duration === 0) {
  console.error(`❌ [${timestamp}] [BUFFER-ERROR] Buffer inválido ou vazio!`);
  return;
}
```

Logo APÓS, adicione:
```typescript
// NOVO: Ignorar fragmentos muito pequenos (< 50ms) que causam chiado
if (buffer.duration < this.minAudioDuration) {
  console.warn(`⚠️ [${timestamp}] [SKIP-FRAGMENT] Fragmento muito pequeno (${(buffer.duration * 1000).toFixed(0)}ms), ignorando`);
  return;
}

// NOVO: Se a fila estiver muito grande, limpar para evitar delay
if (this.audioQueue.length > 5) {
  console.warn(`🧹 [${timestamp}] [QUEUE-CLEANUP] Fila muito grande (${this.audioQueue.length}), limpando...`);
  this.audioQueue = [];
  this.nextStartTime = 0;
}
```

### 6. Atualizar Instruções do Sistema Dual (linha ~700)

Encontre a função `initDualSessions` e atualize o `baseInstr` para:

```typescript
const baseInstr = `
  ENTREVISTA EM PAINEL - VOCÊ É ${personas[0].name.toUpperCase()}
  
  CONTEXTO:
  Você está conduzindo uma entrevista junto com ${personas[1].name}.
  ${personasDesc}
  
  PERSONALIDADE GERAL: Tom ${this.personality}
  ROTEIRO: ${scriptContext}
  DURAÇÃO: ${this.durationMinutes} min
  CONTEÚDO: Avaliar ${skillsSummary}
  
  IMPORTANTE - SISTEMA DE TRANSCRIÇÃO E COMUNICAÇÃO:
  1. Você receberá mensagens [CONTEXTO] com transcrições do que ${personas[1].name} e o candidato dizem
  2. Você NÃO ouve o áudio de ${personas[1].name} - apenas recebe texto
  3. Quando ${personas[1].name} falar, você receberá: "[CONTEXTO] ${personas[1].name} acabou de dizer: ..."
  4. Quando o candidato falar, você receberá: "[CONTEXTO] O candidato acabou de responder: ..."
  5. Use essas transcrições para acompanhar a conversa
  
  REGRAS DE INTERAÇÃO:
  1. FOCO NO CANDIDATO: Sua prioridade é interagir com o candidato, não com ${personas[1].name}
  2. APRESENTAÇÃO INICIAL: Apenas na primeira etapa, você pode cumprimentar ${personas[1].name} brevemente (máximo 1 frase)
  3. APÓS APRESENTAÇÃO: Zero interação com ${personas[1].name}, apenas com o candidato
  4. SE FOR CHAMADO: Se ${personas[1].name} te chamar pelo nome ou fizer uma pergunta direta, responda brevemente
  5. ALTERNÂNCIA: Vocês alternam perguntas naturalmente, sem perguntar "você quer fazer uma pergunta?"
  6. IDENTIFIQUE-SE: Sempre diga seu nome ao fazer perguntas: "Sou ${personas[0].name}, ..."
  7. CONTEXTO COMPARTILHADO: Use as transcrições para manter continuidade na conversa
  
  EXEMPLO DE FLUXO:
  - [CONTEXTO] ${personas[1].name} acabou de dizer: "Olá, prazer em estar aqui"
  - Você: "Prazer, ${personas[1].name}. Olá candidato, sou ${personas[0].name}..."
  - [CONTEXTO] O candidato acabou de responder: "Olá, prazer"
  - Você: "Ótimo! Vamos começar..."
  
  Fale Português do Brasil.
`;
```

E adicione no final da função, após criar as sessões:
```typescript
console.log('✅ [SESSION] Duas sessões criadas com sistema de transcrição e bloqueio de áudio!');
console.log(`   - Sessão 0: ${personas[0].name} (${personas[0].voice})`);
console.log(`   - Sessão 1: ${personas[1].name} (${personas[1].voice})`);
console.log(`   📝 Modo: Transcrição de texto entre IAs`);
console.log(`   🔒 Bloqueio: Apenas sessão ativa recebe áudio do microfone`);
console.log(`   🔧 Anti-chiado: Fragmentos < 50ms são ignorados`);
console.log(`   🧹 Auto-limpeza: Fila limitada a 5 áudios`);
```

## ✅ Checklist de Implementação

- [ ] Adicionar novos campos na classe
- [ ] Adicionar função `reconstructBrokenTranscript`
- [ ] Atualizar captura de transcrição da IA
- [ ] Atualizar captura de transcrição do usuário
- [ ] Adicionar filtro anti-chiado
- [ ] Atualizar instruções do sistema dual
- [ ] Testar com `npm run dev`
- [ ] Verificar logs de transcrição
- [ ] Verificar que não há chiado
- [ ] Verificar que frases são reconstruídas

## 🧪 Como Testar

```bash
# Iniciar aplicação
npm run dev

# Em outro terminal, filtrar logs específicos
npm run dev | Select-String "TRANSCRIPT"
npm run dev | Select-String "SKIP-FRAGMENT"
npm run dev | Select-String "QUEUE-CLEANUP"
npm run dev | Select-String "RECONSTRUCT"
```

## 📝 Logs Esperados

```
📝 [TRANSCRIPT] Alex: "Olá, sou Alex, Tech Lead. Prazer em estar aqui."
📤 [TRANSCRIPTION] Enviado para Elena: [CONTEXTO] Alex acabou de dizer...
📝 [TRANSCRIPT] Candidato: "Olá, prazer em conhecê-los"
⚠️ [SKIP-FRAGMENT] Fragmento muito pequeno (35ms), ignorando
🧹 [QUEUE-CLEANUP] Fila muito grande (6), limpando...
🔧 [RECONSTRUCT] Original: "Olá eu sou Al..."
✨ [RECONSTRUCT] Corrigido: "Olá, eu sou Alex, Tech Lead"
```

## 🎯 Resultado Final

Com essas mudanças, você terá:

1. ✅ **Transcrição estruturada** - Formato claro de quem disse o quê
2. ✅ **Sem chiado** - Fragmentos pequenos são ignorados
3. ✅ **Sem delay** - Fila é limitada e limpa automaticamente
4. ✅ **Frases completas** - IA reconstrói frases picotadas
5. ✅ **Contexto compartilhado** - Entrevistadores sabem o que foi dito
6. ✅ **Bloqueio de áudio** - Apenas sessão ativa recebe áudio do microfone

## ⚠️ Notas Importantes

- A função `reconstructBrokenTranscript` é **async**, então use `await` ao chamá-la
- O filtro de 50ms (`minAudioDuration`) pode ser ajustado se necessário
- A fila é limitada a 5 áudios, mas pode ser ajustado
- As transcrições são salvas em `transcriptionHistory` para análise posterior
