# Solução: Sistema de Contexto Compartilhado

## Problema Identificado

Quando usamos 2 entrevistadores, a IA tinha os seguintes problemas:
1. **Confusão de vozes**: Um entrevistador respondia como se fosse o outro
2. **Demora nas respostas**: Parecia não saber o que tinha sido dito antes
3. **Falta de contexto**: Cada "entrevistador" não sabia o que o outro havia falado

**Causa raiz**: A API Gemini Live usa uma única sessão de áudio. A IA não consegue "ouvir" o que ela mesma disse como outro entrevistador, pois o áudio não passa pelo microfone do usuário.

## Solução Implementada

### 1. Histórico de Conversa
Criamos um array que armazena todas as mensagens:
```typescript
conversationHistory: Array<{speaker: string, text: string}>
```

### 2. Captura Automática
- Quando a IA fala: Capturamos o texto e salvamos com o nome do entrevistador
- Quando você fala: Capturamos sua transcrição e salvamos como "Candidato"

### 3. Envio de Contexto
Antes de cada resposta da IA, enviamos as últimas 6 mensagens como contexto:
```
[CONTEXTO DA CONVERSA]:
Alex: Olá, sou Alex, Tech Lead...
Elena: E eu sou Elena, da área de RH...
Candidato: Olá, prazer em conhecê-los...
Alex: Ótimo! Vamos começar...
Candidato: Sim, estou pronto...

[Agora é sua vez de falar. Lembre-se: você é Elena]
```

### 4. Identificação Clara
A cada turno, lembramos a IA de qual entrevistador ela está simulando no momento.

## Como Funciona

**Fluxo da Conversa:**

1. **Alex fala**: "Olá, sou Alex..."
   - Sistema salva: `{speaker: "Alex", text: "Olá, sou Alex..."}`

2. **Elena fala**: "E eu sou Elena..."
   - Sistema salva: `{speaker: "Elena", text: "E eu sou Elena..."}`

3. **Você fala**: "Prazer em conhecê-los"
   - Sistema salva: `{speaker: "Candidato", text: "Prazer em conhecê-los"}`
   - Sistema envia contexto completo para a IA
   - Sistema avisa: "Agora é sua vez, você é Alex"

4. **Alex responde**: Ele sabe o que Elena disse e o que você disse

## Benefícios

✅ **Continuidade**: Cada entrevistador sabe o que foi dito antes
✅ **Identidade clara**: A IA é lembrada constantemente de quem ela está simulando
✅ **Sem confusão**: O contexto explícito evita mistura de identidades
✅ **Respostas rápidas**: A IA não precisa "adivinhar" o contexto

## Logs de Debug

No console você verá:
- `💬 [HISTORY] Alex: ...` - Mensagem salva no histórico
- `💬 [HISTORY] Candidato: ...` - Sua resposta salva
- `📤 [CONTEXT] Enviando histórico para IA: 6 mensagens` - Contexto sendo enviado
- `🎤 [SPEAKER] Próximo entrevistador: Elena` - Alternância de speaker

## Limitações

- Mantemos apenas as últimas 6 mensagens para não sobrecarregar
- O contexto é enviado via texto, não áudio
- A IA ainda usa uma única voz (do primeiro entrevistador selecionado)

## Melhorias Futuras

- [ ] Usar múltiplas sessões de áudio (uma por entrevistador)
- [ ] Alternar vozes dinamicamente
- [ ] Aumentar histórico para conversas mais longas
- [ ] Adicionar resumo automático do contexto
