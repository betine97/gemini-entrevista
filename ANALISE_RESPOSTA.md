# Sistema de Análise de Resposta em Tempo Real

## Funcionalidade Implementada

O sistema agora analisa suas respostas durante a entrevista e fornece feedback visual instantâneo através da cor da esfera 3D.

### Como Funciona

**Cores da Esfera:**

🟢 **VERDE** - Resposta Excelente
- Resposta técnica e clara
- Demonstra conhecimento sólido
- Confiança adequada
- Comunicação profissional

🔴 **VERMELHO** - Resposta Problemática
- Resposta vaga ou insegura
- Erros técnicos
- Gírias inadequadas
- Muito informal para o contexto

🟣 **ROXO** - Resposta Normal
- Nem boa nem ruim
- Resposta padrão

🔵 **AZUL** - IA Falando
- Quando o entrevistador está respondendo

🔵 **AZUL ESCURO** - Silêncio
- Ninguém está falando

### Detecção Automática

O sistema detecta automaticamente quando você está falando através do volume do microfone e analisa o conteúdo da sua fala usando IA.

### Logs de Diagnóstico

No console você verá:
- `🎤 [SPEECH]` - Quando você começa a falar
- `🔇 [SPEECH]` - Quando você para de falar
- `🔍 [ANALYSIS]` - Análise sendo processada
- `✅ [ANALYSIS]` - Resultado da análise (GOOD/BAD/NEUTRAL)
- `🔄 [ANALYSIS]` - Reset para neutral após 3 segundos

### Tecnologia

- **Detecção de fala**: Análise de volume do microfone
- **Análise de conteúdo**: Gemini 2.0 Flash
- **Feedback visual**: Three.js com mudança de cor em tempo real
- **Reset automático**: Volta ao normal após 3 segundos

### Nota Importante

A análise é baseada na transcrição capturada pela API do Gemini Live. O sistema funciona melhor quando você fala de forma clara e pausada.
