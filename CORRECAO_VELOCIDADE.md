# Correção de Velocidade da Voz

## 🔍 Problema Identificado

**Sintoma**: Entrevistadores falando muito rápido (voz acelerada)

**Causa**: Uso incorreto de `src.start(0)`

```typescript
src.start(0); // ❌ ERRADO - Inicia no tempo 0 do AudioContext
```

Quando usamos `start(0)`, estamos dizendo para o AudioContext iniciar no tempo absoluto 0, o que faz com que ele tente "alcançar" o tempo atual, resultando em reprodução acelerada.

## ✅ Solução

Usar o **timing correto do AudioContext** para velocidade normal:

```typescript
const now = this.outputAudioContext.currentTime;
const startTime = Math.max(now, this.nextStartTime);
this.nextStartTime = startTime + buffer.duration;

src.start(startTime); // ✅ CORRETO - Inicia no tempo calculado
```

### Como Funciona

1. **`currentTime`**: Tempo atual do AudioContext (em segundos desde que foi criado)
2. **`startTime`**: Quando o áudio deve começar (agora ou após o anterior)
3. **`nextStartTime`**: Quando o próximo áudio pode começar (após este terminar)

### Exemplo de Timing

```
AudioContext.currentTime = 10.5s

Áudio 1:
  now = 10.5s
  startTime = max(10.5s, 0s) = 10.5s
  duration = 3.2s
  nextStartTime = 10.5s + 3.2s = 13.7s
  → Reproduz de 10.5s a 13.7s (velocidade normal)

Áudio 2:
  now = 11.0s (enquanto áudio 1 ainda toca)
  startTime = max(11.0s, 13.7s) = 13.7s
  duration = 2.5s
  nextStartTime = 13.7s + 2.5s = 16.2s
  → Reproduz de 13.7s a 16.2s (velocidade normal, sem sobreposição)
```

## 📊 Comparação

### ANTES (Rápido Demais)
```typescript
src.start(0);
// Tenta iniciar no tempo 0, mas AudioContext já está em 10.5s
// Resultado: Reprodução acelerada para "alcançar" o tempo atual
```

### DEPOIS (Velocidade Normal)
```typescript
src.start(10.5);
// Inicia exatamente no tempo atual do AudioContext
// Resultado: Reprodução em velocidade normal
```

## 🎯 Logs Esperados

```
▶️ [14:23:46.300] [PLAY] Reproduzindo Alex
   Fila restante: 0 []
   Duração do áudio: 3.200s
   🎵 Timing: now=10.500s, start=10.500s, end=13.700s
   ⏱️ Velocidade: NORMAL (usando AudioContext timing)
   👤 Speaker visual: Alex (tech_lead)
   ✓ Source adicionado (total: 1)

✅ [14:23:49.500] [ENDED] Alex finalizado
```

### Verificação de Velocidade

Observe nos logs:
- `Duração do áudio: 3.200s`
- `Timing: now=10.500s, start=10.500s, end=13.700s`
- Diferença: `13.700 - 10.500 = 3.200s` ✅ Correto!

Se a diferença for menor que a duração, está acelerado.
Se a diferença for maior que a duração, está com delay.

## 🔧 Mudanças no Código

### Removido
```typescript
src.start(0); // ❌ Causava velocidade incorreta
```

### Adicionado
```typescript
const now = this.outputAudioContext.currentTime;
const startTime = Math.max(now, this.nextStartTime);
this.nextStartTime = startTime + buffer.duration;
src.start(startTime); // ✅ Velocidade correta
```

### Mantido
- ✅ Parada imediata de áudio anterior
- ✅ Limpeza automática de fila
- ✅ Processamento imediato do próximo
- ✅ Logs detalhados

## 🧪 Como Testar

1. Inicie com 2 entrevistadores
2. Abra console (F12)
3. Fale "Oi"
4. **Observe**:
   - Voz deve estar em velocidade NORMAL
   - Logs devem mostrar: `⏱️ Velocidade: NORMAL`
   - Diferença entre `end` e `start` deve ser igual à duração

### ✅ Velocidade Correta
```
Duração: 3.200s
Timing: start=10.500s, end=13.700s
Diferença: 3.200s ✅ Igual à duração
```

### ❌ Velocidade Incorreta
```
Duração: 3.200s
Timing: start=10.500s, end=11.800s
Diferença: 1.300s ❌ Menor que duração (acelerado)
```

## 📈 Próximo Passo

Agora que a velocidade está correta, vamos resolver o chiado.

O chiado provavelmente é causado por:
1. Múltiplos sources ativos (verificar logs: `Sources: X`)
2. Sample rate incorreto
3. Buffer size inadequado

Os logs de diagnóstico vão nos ajudar a identificar a causa exata.
