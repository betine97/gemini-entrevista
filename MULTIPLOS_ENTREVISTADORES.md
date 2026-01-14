# Sistema de Múltiplos Entrevistadores

## Funcionalidade Implementada

Agora você pode selecionar até **2 entrevistadores simultâneos** que conduzirão a entrevista juntos, com duas esferas 3D lado a lado.

## Como Usar

### Seleção de Entrevistadores

1. Na sidebar esquerda, clique nos entrevistadores que deseja
2. Você pode selecionar **1 ou 2 entrevistadores**
3. Um ícone de check (✓) aparece nos selecionados
4. A borda fica azul quando selecionado

### Limitações

- **Mínimo**: 1 entrevistador (não pode desmarcar todos)
- **Máximo**: 2 entrevistadores
- Não é possível alterar durante a entrevista

## Dinâmica da Entrevista

### Com 1 Entrevistador (Modo Tradicional)
- Esfera central única
- Entrevista normal, um-para-um
- O entrevistador faz perguntas e avalia suas respostas

### Com 2 Entrevistadores (Modo Dual)
Duas esferas 3D lado a lado com comportamento inteligente:

**Layout Visual:**
- ✅ Esfera esquerda: Primeiro entrevistador
- ✅ Esfera direita: Segundo entrevistador
- ✅ Esfera ativa: 100% opacidade, tamanho normal
- ✅ Esfera inativa: 40% opacidade, 85% do tamanho
- ✅ Labels com nome e cargo abaixo de cada esfera

**Fases da Entrevista:**

**FASE 1 - Apresentação Inicial:**
- Os entrevistadores se apresentam
- Podem interagir brevemente entre si (máximo 2 frases)
- Exemplo: "Prazer em estar aqui com você, Elena"

**FASE 2 - Entrevista Técnica:**
- A partir da segunda etapa do roteiro
- Entrevistadores falam APENAS com você
- ZERO interação entre eles
- Alternam perguntas de acordo com o roteiro
- Cada um mantém sua identidade separada

**Comportamentos:**
- ✅ Cada entrevistador se identifica pelo nome
- ✅ Alternam entre si para fazer perguntas
- ✅ Não perguntam ao outro se ele quer fazer perguntas
- ✅ Não respondem no lugar do outro
- ✅ Se você chamar "Alex", apenas Alex responde
- ✅ Se você chamar "Elena", apenas Elena responde
- ✅ Vozes diferentes (masculina/feminina) conforme o gênero

## Combinações Recomendadas

### 🎯 Entrevista Técnica Completa
**Tech Lead (Alex) + Senior Dev (Marco)**
- Foco total em habilidades técnicas
- Discussões profundas sobre arquitetura e código

### 💼 Entrevista Balanceada
**Tech Lead (Alex) + RH (Elena)**
- Avaliação técnica + comportamental
- Equilíbrio entre hard e soft skills

### 🗄️ Foco em Dados
**DBA (Roberto) + Senior Dev (Marco)**
- Especialização em bancos de dados
- Performance e otimização

### 🌱 Desenvolvimento de Carreira
**RH (Elena) + Dev Pleno (Julia)**
- Foco em crescimento profissional
- Mentoria e desenvolvimento

## Vozes

A IA usa a voz do **primeiro entrevistador selecionado** como voz principal, mas simula diferentes personalidades e estilos de fala para cada entrevistador.

## Logs

No console você verá:
- `🎭 [PERSONAS]` - Lista de entrevistadores selecionados
- `🎤 [VOICE]` - Voz principal sendo usada
- `🎤 [SPEAKER]` - Qual entrevistador está falando
- Instruções específicas para modo painel

## Dicas

1. **Escolha estratégica**: Combine entrevistadores com expertises complementares
2. **Atenção aos nomes**: Os entrevistadores se identificam, preste atenção em quem está falando
3. **Interação natural**: Responda naturalmente, eles vão alternar automaticamente
4. **Chame pelo nome**: Se quiser que um específico responda, chame-o pelo nome
5. **Avaliação conjunta**: Ambos avaliam você, o nível de confiança reflete a opinião do painel

## Solução de Problemas

**Problema**: Um entrevistador responde no lugar do outro
**Solução**: Isso só deve acontecer na apresentação inicial. Se persistir, reporte como bug.

**Problema**: Entrevistadores conversando entre si durante perguntas
**Solução**: Isso não deve acontecer após a apresentação. A IA foi instruída a evitar isso.

