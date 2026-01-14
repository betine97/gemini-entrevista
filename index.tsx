import {GoogleGenAI, LiveServerMessage, Modality, Type} from '@google/genai';
import {LitElement, css, html} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {createBlob, decode, decodeAudioData} from './utils';
import './visual-3d';

interface Persona {
  id: string;
  name: string;
  title: string;
  instruction: string;
  svg: any;
  voice: string;
  gender: 'male' | 'female';
}

interface Skill {
  id: string;
  label: string;
  category: 'hard' | 'soft';
  subTopics: string[];
}

interface InterviewStage {
  title: string;
  description: string;
}

const PERSONAS: Persona[] = [
  {
    id: 'tech_lead',
    name: 'Alex',
    title: 'Tech Lead',
    svg: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>`,
    instruction: 'Você é Alex, um Tech Lead pragmático brasileiro. Sua voz é calma e autoritária. FALE SEMPRE EM PORTUGUÊS DO BRASIL.',
    voice: 'Puck',
    gender: 'male'
  },
  {
    id: 'senior_dev',
    name: 'Marco',
    title: 'Senior Dev',
    svg: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`,
    instruction: 'Você é Marco, um desenvolvedor sênior detalhista brasileiro. FALE SEMPRE EM PORTUGUÊS DO BRASIL.',
    voice: 'Charon',
    gender: 'male'
  },
  {
    id: 'hr',
    name: 'Elena',
    title: 'RH Especialista',
    svg: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.42 4.58a5 5 0 0 1 0 7.07l-7.07 7.07a1 1 0 0 1-1.42 0L4.86 11.65a5 5 0 0 1 7.07-7.07l.35.35.35-.35a5 5 0 0 1 7.07 0z"></path></svg>`,
    instruction: 'Você é Elena, especialista em Cultura e RH brasileira. FALE SEMPRE EM PORTUGUÊS DO BRASIL.',
    voice: 'Aoede',
    gender: 'female'
  },
  {
    id: 'dba',
    name: 'Roberto',
    title: 'DBA Senior',
    svg: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>`,
    instruction: 'Você é Roberto, um DBA Senior rigoroso brasileiro. Você foca em performance e integridade de dados. FALE SEMPRE EM PORTUGUÊS DO BRASIL.',
    voice: 'Fenrir',
    gender: 'male'
  },
  {
    id: 'pleno_dev',
    name: 'Julia',
    title: 'Dev Pleno',
    svg: html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    instruction: 'Você é Julia, uma Desenvolvedora Pleno curiosa brasileira. FALE SEMPRE EM PORTUGUÊS DO BRASIL.',
    voice: 'Kore',
    gender: 'female'
  }
];

const INITIAL_SKILLS: Skill[] = [
  { id: 'python', label: 'Python', category: 'hard', subTopics: ['Assincronismo (Asyncio)', 'Decoradores', 'Gerenciamento de Memória', 'FastAPI/Django', 'Tipagem Estática'] },
  { id: 'architectures', label: 'Arquitetura', category: 'hard', subTopics: ['Microserviços', 'Serverless', 'Clean Architecture', 'Event Driven', 'Escalabilidade'] },
  { id: 'databases', label: 'Bancos de Dados', category: 'hard', subTopics: ['Otimização de Query', 'NoSQL vs SQL', 'Transações ACID', 'Sharding', 'Caching'] },
  { id: 'leadership', label: 'Liderança', category: 'soft', subTopics: ['Gestão de Conflitos', 'Mentoria', 'Priorização de Backlog', 'Stakeholder Management'] },
  { id: 'teamwork', label: 'Trabalho em Equipe', category: 'soft', subTopics: ['Code Review', 'Pair Programming', 'Comunicação Assíncrona', 'Resolução de Impasses'] }
];

@customElement('gdm-live-audio')
export class GdmLiveAudio extends LitElement {
  @state() isRecording = false;
  @state() status = 'ready';
  @state() error = '';
  @state() selectedPersona: Persona | null = PERSONAS[0];
  @state() selectedPersonas: Set<string> = new Set(['tech_lead']);
  @state() personality: 'equilibrado' | 'tranquilo' | 'tecnico' = 'equilibrado';
  @state() durationMinutes: number = 15;
  @state() skills: Skill[] = [...INITIAL_SKILLS];
  @state() selectedSkills: Set<string> = new Set(['python']);
  @state() selectedSubTopics: Map<string, Set<string>> = new Map();
  @state() startTime: number | null = null;
  @state() duration = '00:00';
  @state() showCustomSkillInput: 'hard' | 'soft' | null = null;
  @state() showCustomSubTopicInput: string | null = null;
  @state() stages: InterviewStage[] = [];
  @state() currentStageIndex = 0;
  @state() generatingScript = false;
  @state() responseQuality: 'neutral' | 'good' | 'bad' = 'neutral';
  @state() isUserSpeaking = false;
  @state() confidenceLevel = 50;
  @state() feedbackMessage = '';
  @state() currentSpeaker: string | null = null;

  private conversationHistory: Array<{speaker: string, text: string}> = [];
  private userSpeechBuffer: string[] = [];
  private analysisTimeout: number | undefined;
  private lastUserTranscript = '';
  private isSpeaking = false;
  private speakingLock = false;
  private session: any;
  private sessionPromise: Promise<any> | null = null;
  private session2: any;
  private sessionPromise2: Promise<any> | null = null;
  private inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
  private outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
  @state() inputNode = this.inputAudioContext.createGain();
  @state() outputNode = this.outputAudioContext.createGain();
  private nextStartTime = 0;
  private mediaStream: MediaStream | null = null;
  private sourceNode: AudioNode | null = null;
  private scriptProcessorNode: ScriptProcessorNode | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private timerInterval: number | undefined;
  private turnCount = 0;
  private audioQueue: Array<{buffer: AudioBuffer, personaName: string}> = [];
  private isPlayingAudio = false;
  private lastAudioSentTime = 0;
  private audioSendDebounce = 300;
  private activeSessionIndex = 0;
  private transcriptionHistory: Array<{speaker: string, text: string, timestamp: number}> = [];
  private minAudioDuration = 0.02; // 20ms mínimo - reduzido para não cortar fala
  
  // Sistema de consolidação de buffers para evitar chiado
  private pendingAudioBuffers: Map<string, {buffers: AudioBuffer[], totalDuration: number}> = new Map();
  private consolidationThreshold = 0.3; // 300ms - acumular antes de reproduzir
  private consolidationTimeout: Map<string, number> = new Map();


  static styles = css`
    :host {
      --primary: #2563eb;
      --bg: #050505;
      --card-bg: #0d0d0d;
      --border: #1a1a1a;
      --text: #ffffff;
      --text-dim: #888888;
      display: block; width: 100vw; height: 100vh;
      background-color: var(--bg); color: var(--text);
      font-family: 'Inter', sans-serif; overflow: hidden;
    }

    .app-container { display: grid; grid-template-columns: 420px 1fr 300px; height: 100vh; }

    .sidebar {
      padding: 2rem; border-right: 1px solid var(--border);
      background: #020202; overflow-y: auto; display: flex; flex-direction: column; gap: 1.5rem;
    }

    .logo { display: flex; align-items: center; gap: 15px; margin-bottom: 0.5rem; }
    .logo-box {
      width: 44px; height: 44px; background: var(--primary); border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 20px rgba(37, 99, 235, 0.4);
    }
    .logo-text { font-weight: 800; font-size: 1.4rem; letter-spacing: 0.05em; color: #fff; }

    .section { display: flex; flex-direction: column; gap: 1rem; }
    .label { font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); letter-spacing: 0.1em; font-weight: 700; margin-bottom: 0.2rem; }

    .persona-list { 
      display: flex; flex-direction: column; gap: 8px; 
      max-height: 250px; overflow-y: auto; padding-right: 10px;
      scrollbar-width: none;
    }
    .persona-list::-webkit-scrollbar { display: none; }

    .persona-card {
      background: #0d0d0d; border: 1.5px solid #1a1a1a;
      padding: 0.8rem 1.25rem; border-radius: 12px; display: flex; align-items: center; gap: 12px;
      cursor: pointer; transition: 0.2s; width: 100%; color: var(--text-dim); position: relative;
    }
    .persona-card.active { border-color: var(--primary); background: rgba(37, 99, 235, 0.05); color: #fff; }
    .persona-info { display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden; white-space: nowrap; }
    .persona-name { font-weight: 600; font-size: 0.95rem; }
    .persona-title { font-size: 0.85rem; opacity: 0.6; }
    .check-mark { position: absolute; right: 12px; color: var(--primary); }
    
    .persona-hint {
      font-size: 0.7rem; color: var(--text-dim); text-align: center; margin-top: 8px;
      font-style: italic;
    }

    .personality-selector { display: flex; gap: 4px; background: #080808; padding: 4px; border-radius: 10px; border: 1px solid var(--border); }
    .personality-btn {
      flex: 1; font-size: 0.75rem; padding: 10px; border: none; background: transparent; color: var(--text-dim);
      border-radius: 8px; cursor: pointer; transition: 0.2s; font-weight: 500;
    }
    .personality-btn.active { background: var(--primary); color: white; }

    .duration-box { display: flex; align-items: center; gap: 15px; }
    .duration-slider { flex: 1; accent-color: var(--primary); cursor: pointer; }

    .skills-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
    .skill-column { display: flex; flex-direction: column; gap: 12px; }
    
    .skill-chip {
      padding: 0.8rem 1rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600;
      background: #0d0d0d; border: 1.5px solid #1a1a1a; cursor: pointer; transition: 0.2s;
      display: flex; align-items: center; justify-content: center; text-align: center;
      color: #666;
    }
    .skill-chip.active { background: rgba(37, 99, 235, 0.08); border-color: var(--primary); color: var(--primary); }

    .sub-topics { 
      margin-top: 5px; display: flex; flex-direction: column; gap: 10px; 
      padding-left: 5px; 
    }
    .sub-topic-item { 
      font-size: 0.82rem; display: flex; align-items: center; gap: 10px; 
      cursor: pointer; color: #666; transition: 0.2s;
    }
    .sub-topic-item.active { color: #3b82f6; font-weight: 600; }
    .check-icon { width: 14px; height: 14px; flex-shrink: 0; opacity: 0.4; }
    .sub-topic-item.active .check-icon { opacity: 1; color: #3b82f6; }

    .add-btn-small {
      background: transparent; border: 1.5px dashed #222; color: #555;
      padding: 0.6rem; border-radius: 10px; font-size: 0.75rem; cursor: pointer;
      text-align: center; margin-top: 5px; width: 100%; transition: 0.2s;
    }
    .add-btn-small:hover { border-color: #444; color: #999; }

    .custom-input { 
      background: #000; border: 1.5px solid #222; color: #fff; padding: 10px 14px; 
      border-radius: 10px; width: 100%; font-size: 0.85rem; margin-top: 10px;
    }

    .main-view { position: relative; background: #000; overflow: hidden; display: flex; }
    .visualizer-container { flex: 1; position: relative; z-index: 5; }
    
    .dual-sphere-container {
      display: grid; grid-template-columns: 1fr 1fr; height: 100%; width: 100%;
      gap: 0; position: relative;
    }
    
    .sphere-wrapper {
      position: relative; width: 100%; height: 100%; display: flex;
      flex-direction: column; align-items: center; justify-content: center;
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    
    .sphere-wrapper:not(.speaking) { opacity: 0.4; transform: scale(0.85); }
    .sphere-wrapper.speaking { opacity: 1; transform: scale(1); z-index: 2; }
    
    .interviewer-label {
      position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);
      text-align: center; z-index: 10; pointer-events: none;
      background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(10px);
      padding: 12px 24px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .interviewer-name { font-size: 1.1rem; font-weight: 600; color: #fff; margin-bottom: 4px; }
    .interviewer-title { font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.1em; }

    .timeline { display: flex; flex-direction: column; position: relative; gap: 1.5rem; margin-top: 1.5rem; }
    .timeline::before {
      content: ''; position: absolute; left: 6px; top: 10px; bottom: 10px;
      width: 2px; background: rgba(255,255,255,0.05);
    }
    .timeline-progress {
      position: absolute; left: 6px; top: 10px; width: 2px;
      background: var(--primary); transition: 0.5s height ease;
      box-shadow: 0 0 10px var(--primary);
    }

    .stage-item {
      display: flex; gap: 15px; position: relative; align-items: flex-start;
      opacity: 0.3; transition: 0.3s;
    }
    .stage-item.active { opacity: 1; }
    .stage-item.completed { opacity: 0.6; }
    
    .stage-dot {
      width: 12px; height: 12px; border-radius: 50%; background: #222;
      border: 2px solid #333; flex-shrink: 0; z-index: 2; transition: 0.3s;
      margin-top: 3px;
    }
    .stage-item.active .stage-dot { background: var(--primary); border-color: #fff; box-shadow: 0 0 12px var(--primary); }
    .stage-item.completed .stage-dot { background: #10b981; border-color: #10b981; }

    .stage-content { display: flex; flex-direction: column; gap: 3px; }
    .stage-title { font-size: 0.8rem; font-weight: 700; color: #fff; }
    .stage-desc { font-size: 0.68rem; color: var(--text-dim); line-height: 1.3; }

    .confidence-meter {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      z-index: 15; pointer-events: none; display: flex; flex-direction: column; align-items: center; gap: 20px;
    }
    
    .confidence-value {
      font-size: 6rem; font-weight: 200; color: #ffffff;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      letter-spacing: -0.05em; line-height: 1;
      text-shadow: 0 0 40px rgba(255, 255, 255, 0.15);
      transition: all 0.5s ease;
    }
    
    .feedback-message {
      font-size: 0.9rem; font-weight: 400; color: rgba(255, 255, 255, 0.7);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      letter-spacing: 0.05em; text-transform: lowercase;
      animation: fadeInUp 0.4s ease; text-align: center;
    }
    
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .feedback-overlay {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      z-index: 15; pointer-events: none;
    }
    
    .feedback-message-center {
      font-size: 1.2rem; font-weight: 400; color: rgba(255, 255, 255, 0.9);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      letter-spacing: 0.05em; text-transform: lowercase;
      animation: fadeInUp 0.4s ease; text-align: center;
      background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(10px);
      padding: 16px 32px; border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .confidence-display { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
    
    .confidence-number {
      font-size: 3rem; font-weight: 200; color: #fff;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      letter-spacing: -0.05em; line-height: 1; transition: all 0.5s ease;
    }
    
    .confidence-bar-container {
      width: 100%; height: 8px; background: rgba(255, 255, 255, 0.05);
      border-radius: 4px; overflow: hidden; position: relative;
    }
    
    .confidence-bar {
      height: 100%; background: linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #10b981 100%);
      border-radius: 4px; transition: width 0.5s ease;
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);
    }
    
    .overlay-ui { 
      position: absolute; inset: 0; z-index: 10; height: 100%; 
      display: flex; flex-direction: column; justify-content: flex-start; 
      padding: 2.5rem; pointer-events: none; gap: 2rem;
    }

    .controls { display: flex; align-items: center; justify-content: center; gap: 3rem; pointer-events: auto; margin-top: auto; margin-bottom: 8rem; }
    .btn-circle { 
      width: 68px; height: 68px; border-radius: 50%; border: 1.5px solid #1a1a1a; 
      cursor: pointer; display: flex; align-items: center; justify-content: center; 
      transition: 0.3s; background: rgba(0,0,0,0.7); color: white;
      backdrop-filter: blur(15px);
    }
    .btn-circle:hover { transform: scale(1.1); background: rgba(255,255,255,0.1); border-color: #333; }
    .btn-start { background: var(--primary); border: none; box-shadow: 0 0 40px rgba(37, 99, 235, 0.4); }
    .btn-start:disabled { opacity: 0.5; cursor: wait; }
    .btn-stop { background: #ef4444; border: none; box-shadow: 0 0 40px rgba(239, 68, 68, 0.4); }

    .info-panel { 
      padding: 2.5rem; border-left: 1px solid var(--border); background: #020202; 
      z-index: 20; display: flex; flex-direction: column; gap: 2rem; 
      width: 340px; overflow-y: auto;
    }
    .timer { font-size: 3.5rem; font-weight: 200; color: #fff; letter-spacing: -0.05em; }

    .status-badge {
      background: rgba(13, 13, 13, 0.9); border: 1px solid #1a1a1a; padding: 12px 24px; 
      border-radius: 100px; display: flex; align-items: center; gap: 10px;
      font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.15em; align-self: center;
      backdrop-filter: blur(10px); margin-top: 1.5rem;
    }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: #22c55e; }
    .dot.live { background: #ef4444; animation: blink 1.5s infinite; }
    @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }

    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 10px; }

    .loader-script { font-size: 0.75rem; color: var(--primary); display: flex; align-items: center; gap: 8px; font-weight: 600; }
    .spinner { width: 16px; height: 16px; border: 2px solid rgba(37,99,235,0.2); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s infinite linear; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;

  constructor() {
    super();
    this.outputNode.connect(this.outputAudioContext.destination);
  }


  private togglePersona(id: string) {
    if (this.isRecording) return;
    const newSelected = new Set(this.selectedPersonas);
    
    if (newSelected.has(id)) {
      if (newSelected.size > 1) {
        newSelected.delete(id);
      }
    } else {
      if (newSelected.size < 2) {
        newSelected.add(id);
      }
    }
    
    this.selectedPersonas = new Set(newSelected);
    this.selectedPersona = PERSONAS.find(p => newSelected.has(p.id)) || PERSONAS[0];
  }

  private toggleSkill(id: string) {
    if (this.isRecording) return;
    const newSelected = new Set(this.selectedSkills);
    if (newSelected.has(id)) {
      newSelected.delete(id);
      this.selectedSubTopics.delete(id);
    } else {
      newSelected.add(id);
      const skill = this.skills.find(s => s.id === id);
      if (skill) {
        this.selectedSubTopics.set(id, new Set(skill.subTopics));
      }
    }
    this.selectedSkills = new Set(newSelected);
  }

  private toggleSubTopic(skillId: string, topic: string) {
    if (this.isRecording) return;
    if (!this.selectedSubTopics.has(skillId)) {
      this.selectedSubTopics.set(skillId, new Set());
    }
    const topics = this.selectedSubTopics.get(skillId)!;
    if (topics.has(topic)) topics.delete(topic);
    else topics.add(topic);
    this.selectedSubTopics = new Map(this.selectedSubTopics);
  }

  private addCustomSkill(category: 'hard' | 'soft', name: string) {
    if (!name.trim()) return;
    const id = `custom_${Date.now()}`;
    const newSkill: Skill = { id, label: name, category, subTopics: ['Conceitos Gerais'] };
    this.skills = [...this.skills, newSkill];
    this.toggleSkill(id);
    this.showCustomSkillInput = null;
  }

  private addCustomSubTopic(skillId: string, topic: string) {
    if (!topic.trim()) return;
    const skill = this.skills.find(s => s.id === skillId);
    if (skill) {
      skill.subTopics = [...skill.subTopics, topic];
      this.toggleSubTopic(skillId, topic);
    }
    this.showCustomSubTopicInput = null;
  }

  private async sendContextUpdate() {
    return;
  }

  private async analyzeResponse(text: string) {
    if (!text || text.trim().length < 10) return;
    
    console.log('🔍 [ANALYSIS] Analisando resposta do usuário:', text.substring(0, 100));
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Você é um avaliador de entrevistas técnicas. Analise a seguinte resposta do candidato.

Resposta do candidato: "${text}"

Retorne APENAS um JSON no formato:
{
  "quality": "good" ou "bad" ou "neutral",
  "confidenceChange": número entre -15 e +15,
  "feedback": "mensagem curta e direta para o candidato (máximo 4 palavras)"
}

Critérios:
- "good" (+5 a +15): Resposta técnica, clara, demonstra conhecimento
- "bad" (-5 a -15): Resposta vaga, erros técnicos, muito informal
- "neutral" (-2 a +2): Resposta normal`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      
      const result = JSON.parse(response.text || '{"quality":"neutral","confidenceChange":0,"feedback":"Ok"}');
      
      if (['good', 'bad', 'neutral'].includes(result.quality)) {
        this.responseQuality = result.quality;
        this.feedbackMessage = result.feedback || '';
        const change = result.confidenceChange || 0;
        this.confidenceLevel = Math.max(0, Math.min(100, this.confidenceLevel + change));
        
        console.log(`✅ [ANALYSIS] Qualidade: ${result.quality.toUpperCase()}, Mudança: ${change > 0 ? '+' : ''}${change}%, Confiança: ${this.confidenceLevel}%`);
        
        setTimeout(() => { this.feedbackMessage = ''; }, 5000);
      }
    } catch (e) {
      console.error('❌ [ANALYSIS-ERROR] Erro ao analisar resposta:', e);
    }
  }

  private detectUserSpeech(volume: number) {
    const isSpeaking = volume > 0.01;
    
    if (isSpeaking && !this.isUserSpeaking) {
      this.isUserSpeaking = true;
      this.userSpeechBuffer = [];
      console.log('🎤 [SPEECH] Usuário começou a falar');
    }
    
    if (!isSpeaking && this.isUserSpeaking) {
      this.isUserSpeaking = false;
      console.log('🔇 [SPEECH] Usuário parou de falar');
      
      if (this.analysisTimeout) clearTimeout(this.analysisTimeout);
      this.analysisTimeout = window.setTimeout(() => {
        console.log('⏳ [ANALYSIS] Preparando análise da fala...');
      }, 1000);
    }
  }

  // NOVO: Reconstruir frases picotadas usando IA
  private async reconstructBrokenTranscript(speaker: string, brokenText: string): Promise<string> {
    try {
      if (brokenText.length < 10 || brokenText.match(/[.!?]$/)) {
        return brokenText;
      }

      const recentHistory = this.transcriptionHistory
        .slice(-5)
        .map(t => `${t.speaker}: ${t.text}`)
        .join('\n');

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Você é um corretor de transcrições de áudio. A seguinte frase pode estar picotada ou incompleta.

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


  private async generateScript() {
    console.log('📋 [SCRIPT] Gerando roteiro da entrevista...');
    this.generatingScript = true;
    const skillsList = Array.from(this.selectedSkills).map(id => this.skills.find(x => x.id === id)?.label).join(', ');
    console.log('🎯 [SKILLS] Skills selecionadas:', skillsList);
    
    const isMultiInterviewer = this.selectedPersonas.size > 1;
    
    const prompt = `Crie um roteiro de entrevista técnica vertical de 4 a 6 etapas.
      ${isMultiInterviewer ? 'A primeira etapa deve ser "Apresentação dos Entrevistadores" (onde eles se apresentam e podem interagir brevemente).' : 'A primeira etapa deve ser "Apresentação do Entrevistador".'}
      As próximas etapas devem focar em: ${skillsList}.
      A última deve ser "Encerramento e Feedback".
      ${isMultiInterviewer ? 'IMPORTANTE: A partir da segunda etapa, os entrevistadores NÃO devem interagir entre si, apenas com o candidato.' : ''}
      Retorne um JSON com array de objetos: { "title": "string", "description": "string" }`;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      console.log('🤖 [AI] Chamando Gemini para gerar roteiro...');
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ['title', 'description']
            }
          }
        }
      });
      
      this.stages = JSON.parse(response.text || '[]');
      console.log('✅ [SCRIPT] Roteiro gerado com sucesso:', this.stages.length, 'etapas');
      this.currentStageIndex = 0;
      this.turnCount = 0;
    } catch (e) {
      console.error('❌ [SCRIPT-ERROR] Erro ao gerar roteiro, usando fallback:', e);
      this.stages = isMultiInterviewer ? [
        { title: 'Apresentação dos Entrevistadores', description: 'Os entrevistadores se apresentam' },
        { title: 'Técnico', description: 'Perguntas sobre suas habilidades' },
        { title: 'Encerramento', description: 'Dúvidas e finalização' }
      ] : [
        { title: 'Apresentação', description: 'O entrevistador se apresenta' },
        { title: 'Técnico', description: 'Perguntas sobre suas habilidades' },
        { title: 'Encerramento', description: 'Dúvidas e finalização' }
      ];
    } finally {
      this.generatingScript = false;
    }
  }

  private async initSession() {
    console.log('🔵 [INIT] Iniciando sessão com a IA...');
    
    const selectedPersonasList = Array.from(this.selectedPersonas)
      .map(id => PERSONAS.find(p => p.id === id))
      .filter(p => p) as Persona[];
    
    console.log(`🎭 [PERSONAS] ${selectedPersonasList.length} entrevistador(es) selecionado(s):`);
    selectedPersonasList.forEach(p => console.log(`   - ${p.name} (${p.gender}) - Voz: ${p.voice}`));
    
    const skillsSummary = Array.from(this.selectedSkills).map(id => {
      const s = this.skills.find(x => x.id === id);
      const subs = Array.from(this.selectedSubTopics.get(id) || []);
      return `${s?.label} [${subs.join(', ')}]`;
    }).join(' | ');

    const scriptContext = this.stages.map(s => s.title).join(' -> ');

    if (selectedPersonasList.length === 1) {
      await this.initSingleSession(selectedPersonasList[0], skillsSummary, scriptContext);
    } else {
      await this.initDualSessions(selectedPersonasList, skillsSummary, scriptContext);
    }
  }

  private async initSingleSession(persona: Persona, skillsSummary: string, scriptContext: string) {
    const sysInstr = `
      ⚠️ IDIOMA OBRIGATÓRIO: PORTUGUÊS DO BRASIL (pt-BR)
      VOCÊ DEVE FALAR EXCLUSIVAMENTE EM PORTUGUÊS BRASILEIRO.
      NUNCA fale em inglês ou outro idioma. SEMPRE português do Brasil.
      
      PERSONA: ${persona.instruction}
      PERSONALIDADE: Aja com tom ${this.personality}.
      ROTEIRO PLANEJADO: ${scriptContext}.
      DURAÇÃO: Entrevista de ${this.durationMinutes} min.
      CONTEÚDO: Avalie ${skillsSummary}.
      REGRAS: 
      1. Inicie APRESENTANDO-SE conforme a primeira etapa do roteiro.
      2. Siga a ordem do roteiro mas mantenha a fluidez natural.
      3. FALE SEMPRE EM PORTUGUÊS DO BRASIL!
    `;

    console.log('📝 [CONFIG] Instruções do sistema:', sysInstr.substring(0, 200) + '...');

    try {
      const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
      console.log('🔌 [CONNECT] Conectando ao Gemini Live...');
      
      this.sessionPromise = client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: this.createSessionCallbacks(persona.id, persona.name, 0),
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: sysInstr,
          speechConfig: { 
            voiceConfig: { 
              prebuiltVoiceConfig: { voiceName: persona.voice } 
            } 
          }
        }
      });
      this.session = await this.sessionPromise;
      
      // Enviar primeira mensagem em português para forçar o contexto de idioma
      this.session.send('Olá! Por favor, fale sempre em português do Brasil durante toda a entrevista. Comece se apresentando.');
      
      console.log('✅ [SESSION] Sessão criada com sucesso!');
    } catch(e) { 
      console.error('❌ [INIT-ERROR] Falha ao conectar:', e);
      this.error = "Conexão falhou"; 
    }
  }


  private async initDualSessions(personas: Persona[], skillsSummary: string, scriptContext: string) {
    const personasDesc = personas.map(p => 
      `${p.name} (${p.title}): ${p.instruction}`
    ).join('\n');
    
    // Instruções melhoradas com PORTUGUÊS-BR ENFATIZADO NO INÍCIO
    const baseInstr = `
      ⚠️ IDIOMA OBRIGATÓRIO: PORTUGUÊS DO BRASIL (pt-BR)
      VOCÊ DEVE FALAR EXCLUSIVAMENTE EM PORTUGUÊS BRASILEIRO.
      NUNCA fale em inglês ou outro idioma. SEMPRE português do Brasil.
      
      ENTREVISTA EM PAINEL - VOCÊ É ${personas[0].name.toUpperCase()}
      
      CONTEXTO:
      Você está conduzindo uma entrevista técnica em PORTUGUÊS DO BRASIL junto com ${personas[1].name}.
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
      
      LEMBRETE FINAL: FALE SEMPRE EM PORTUGUÊS DO BRASIL!
    `;

    // Criar instruções para o segundo entrevistador (invertendo os nomes)
    const baseInstr2 = baseInstr
      .replace(new RegExp(personas[0].name, 'g'), '___TEMP___')
      .replace(new RegExp(personas[1].name, 'g'), personas[0].name)
      .replace(/___TEMP___/g, personas[1].name);

    console.log('📝 [CONFIG] Criando duas sessões com sistema de transcrição e bloqueio de áudio...');

    try {
      const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
      console.log('🔌 [CONNECT] Conectando ao Gemini Live (2 sessões)...');
      
      // Sessão 1
      this.sessionPromise = client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: this.createSessionCallbacks(personas[0].id, personas[0].name, 0),
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: baseInstr,
          speechConfig: { 
            voiceConfig: { 
              prebuiltVoiceConfig: { voiceName: personas[0].voice } 
            } 
          }
        }
      });
      
      // Sessão 2
      this.sessionPromise2 = client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: this.createSessionCallbacks(personas[1].id, personas[1].name, 1),
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: baseInstr2,
          speechConfig: { 
            voiceConfig: { 
              prebuiltVoiceConfig: { voiceName: personas[1].voice } 
            } 
          }
        }
      });
      
      this.session = await this.sessionPromise;
      this.session2 = await this.sessionPromise2;
      
      // IMPORTANTE: Apenas sessão 1 começa falando, sessão 2 aguarda
      this.activeSessionIndex = 0;
      
      // Enviar primeira mensagem APENAS para sessão ativa (sessão 1)
      this.session.send('Olá! Por favor, fale sempre em português do Brasil durante toda a entrevista. Comece se apresentando ao candidato.');
      
      // Sessão 2 recebe instrução para AGUARDAR
      this.session2.send('[INSTRUÇÃO] Aguarde sua vez. O outro entrevistador vai começar. Você será notificado quando for sua vez de falar. NÃO fale agora.');
      
      console.log('✅ [SESSION] Duas sessões criadas com sistema de transcrição e bloqueio de áudio!');
      console.log(`   - Sessão 0: ${personas[0].name} (${personas[0].voice}) - ATIVA`);
      console.log(`   - Sessão 1: ${personas[1].name} (${personas[1].voice}) - AGUARDANDO`);
      console.log(`   📝 Modo: Transcrição de texto entre IAs`);
      console.log(`   🔒 Bloqueio: Apenas sessão ativa recebe áudio do microfone`);
      
      console.log(`🎤 [INIT] Sessão ativa inicial: 0 (${personas[0].name})`);
      
    } catch(e) { 
      console.error('❌ [INIT-ERROR] Falha ao conectar:', e);
      this.error = "Conexão falhou"; 
    }
  }


  private createSessionCallbacks(personaId: string, personaName: string, sessionIndex: number) {
    return {
      onopen: () => {
        console.log(`✅ [OPEN-${sessionIndex}:${personaName}] Conexão estabelecida!`);
        this.status = 'ready';
      },
      onmessage: async (msg: LiveServerMessage) => {
        const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
        console.log(`📨 [${timestamp}] [MSG-${sessionIndex}:${personaName}] Tipo:`, msg.serverContent ? Object.keys(msg.serverContent) : 'unknown');
        
        // Capturar transcrição do usuário para análise
        const turnData = msg.serverContent?.turnComplete;
        if (turnData) {
          console.log(`🔄 [${timestamp}] [TURN-${sessionIndex}:${personaName}] Turno completo detectado`);
          
          const allParts = msg.serverContent?.modelTurn?.parts || [];
          const userText = allParts
            .filter((p: any) => p.text && !p.inlineData)
            .map((p: any) => p.text)
            .join(' ');
          
          if (userText && userText !== this.lastUserTranscript && userText.length > 15) {
            this.lastUserTranscript = userText;
            
            // NOVO: Reconstruir frase do usuário se estiver picotada
            const reconstructedUserText = await this.reconstructBrokenTranscript('Candidato', userText);
            
            console.log(`📝 [${timestamp}] [TRANSCRIPT] Candidato: "${reconstructedUserText}"`);
            
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
              
              // Enviar transcrição do candidato para a OUTRA sessão
              const otherSessionIndex = sessionIndex === 0 ? 1 : 0;
              const otherSession = otherSessionIndex === 0 ? this.sessionPromise : this.sessionPromise2;
              
              if (otherSession) {
                otherSession.then((s: any) => {
                  const contextMessage = `[CONTEXTO] O candidato acabou de responder: "${reconstructedUserText}"`;
                  s.send(contextMessage);
                  console.log(`📤 [${timestamp}] [USER-TRANSCRIPT] Enviado para sessão ${otherSessionIndex}`);
                }).catch((err: any) => {
                  console.error(`❌ [USER-TRANSCRIPT-ERROR]`, err);
                });
              }
            }
            
            await this.analyzeResponse(reconstructedUserText);
          }
          
          // COORDENAÇÃO: Alternar para a próxima sessão APENAS se esta for a sessão ativa
          // Isso evita que ambas as sessões alternem ao mesmo tempo
          if (this.selectedPersonas.size === 2 && sessionIndex === this.activeSessionIndex) {
            this.turnCount++;
            const previousSession = this.activeSessionIndex;
            this.activeSessionIndex = (this.activeSessionIndex + 1) % 2;
            console.log(`🔀 [${timestamp}] [COORD] Alternando sessão ativa: ${previousSession} → ${this.activeSessionIndex}`);
            console.log(`   Turno #${this.turnCount}: Próximo a responder será sessão ${this.activeSessionIndex}`);
          } else if (this.selectedPersonas.size === 2) {
            console.log(`⏸️ [${timestamp}] [COORD] Sessão ${sessionIndex} completou turno, mas não é a ativa (${this.activeSessionIndex}). Ignorando alternância.`);
          }
        }
        
        const audioData = (msg.serverContent?.modelTurn?.parts as any)?.[0]?.inlineData;
        if (audioData) {
          const audioSize = audioData.data.length;
          console.log(`🔊 [${timestamp}] [AUDIO-OUT-${sessionIndex}:${personaName}] Recebido ${audioSize} bytes`);
          
          // Capturar texto para histórico E transcrição
          const aiText = (msg.serverContent?.modelTurn?.parts as any)?.find((p: any) => p.text)?.text;
          if (aiText) {
            console.log(`💬 [${timestamp}] [TEXT-${sessionIndex}:${personaName}]`, aiText.substring(0, 80) + '...');
            
            // NOVO: Reconstruir frase se estiver picotada
            const reconstructedText = await this.reconstructBrokenTranscript(personaName, aiText);
            
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
                otherSession.then((s: any) => {
                  const transcriptionMessage = `[CONTEXTO] ${personaName} acabou de dizer: "${reconstructedText}". Você (${otherPersona.name}) está acompanhando a conversa mas não deve responder a menos que seja chamado diretamente ou seja sua vez de fazer perguntas.`;
                  s.send(transcriptionMessage);
                  console.log(`📤 [${timestamp}] [TRANSCRIPTION] Enviado para ${otherPersona.name}: ${transcriptionMessage.substring(0, 80)}...`);
                }).catch((err: any) => {
                  console.error(`❌ [TRANSCRIPTION-ERROR] Erro ao enviar transcrição:`, err);
                });
              }
            }
          }
          
          // Decodificar áudio APENAS para reprodução ao usuário
          const decodeStart = performance.now();
          const buffer = await decodeAudioData(decode(audioData.data), this.outputAudioContext, 24000, 1);
          const decodeTime = (performance.now() - decodeStart).toFixed(2);
          console.log(`🎵 [${timestamp}] [DECODE-${sessionIndex}:${personaName}] ${buffer.duration.toFixed(2)}s em ${decodeTime}ms`);
          
          // Verificar se buffer é válido
          if (!buffer || buffer.duration === 0) {
            console.error(`❌ [${timestamp}] [BUFFER-ERROR] Buffer inválido ou vazio!`);
            return;
          }
          
          // Ignorar fragmentos extremamente pequenos (< 10ms)
          if (buffer.duration < 0.01) {
            console.warn(`⚠️ [${timestamp}] [SKIP-TINY] Fragmento muito pequeno (${(buffer.duration * 1000).toFixed(0)}ms), ignorando`);
            return;
          }
          
          // Fila grande é OK - não cortar a fala, deixar acumular mais
          if (this.audioQueue.length > 50) {
            console.warn(`🧹 [${timestamp}] [QUEUE-TRIM] Fila muito grande (${this.audioQueue.length}), mantendo últimos 20...`);
            this.audioQueue = this.audioQueue.slice(-20);
          }
          
          // NOVO: Usar sistema de consolidação para fragmentos pequenos
          // Fragmentos < 100ms vão para consolidação, maiores vão direto para fila
          if (buffer.duration < 0.1) {
            // Fragmento pequeno - consolidar
            this.addToConsolidation(buffer, personaName);
          } else {
            // Fragmento grande o suficiente - adicionar direto à fila
            this.audioQueue.push({ buffer, personaName });
            console.log(`📥 [${timestamp}] [QUEUE-DIRECT] ${personaName} → fila (${buffer.duration.toFixed(3)}s, tamanho: ${this.audioQueue.length})`);
            
            // Atualizar speaker atual
            this.currentSpeaker = personaId;
            
            // Processar fila se não estiver tocando
            if (!this.isPlayingAudio) {
              console.log(`▶️ [${timestamp}] [QUEUE] Iniciando processamento da fila`);
              this.playNextInQueue();
            }
          }
        } else {
          console.log(`📭 [${timestamp}] [NO-AUDIO-${sessionIndex}:${personaName}] Mensagem sem áudio`);
        }
        
        if (msg.serverContent?.interrupted) {
          console.log(`⏸️ [${timestamp}] [INTERRUPT-${sessionIndex}:${personaName}] Interrompido!`);
          this.sources.forEach(s => { try { s.stop(); } catch(e) {} });
          this.sources.clear(); 
          this.audioQueue = [];
          // Limpar buffers pendentes de consolidação
          this.pendingAudioBuffers.clear();
          this.consolidationTimeout.forEach(t => clearTimeout(t));
          this.consolidationTimeout.clear();
          this.nextStartTime = 0;
          this.speakingLock = false;
          this.isSpeaking = false;
          this.isPlayingAudio = false;
          console.log(`🧹 [${timestamp}] [CLEANUP] Fila, sources e consolidação limpos`);
        }
        
        if (msg.serverContent?.turnComplete) {
          // Flush qualquer áudio pendente quando o turno completa
          this.pendingAudioBuffers.forEach((_, name) => {
            this.flushConsolidation(name);
          });
          
          const estimatedStage = Math.min(Math.floor(this.turnCount / 3), this.stages.length - 1);
          if (estimatedStage > this.currentStageIndex) {
            this.currentStageIndex = estimatedStage;
            console.log(`📍 [${timestamp}] [STAGE] Avançando: ${this.stages[estimatedStage]?.title}`);
          }
        }
      },
      onerror: (e: any) => {
        const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
        console.error(`❌ [${timestamp}] [ERROR-${sessionIndex}:${personaName}]`, e);
        this.error = e.message || 'Erro na sessão';
        this.speakingLock = false;
      },
      onclose: () => {
        const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
        console.log(`🔴 [${timestamp}] [CLOSE-${sessionIndex}:${personaName}]`);
        this.isRecording = false;
        this.speakingLock = false;
      }
    };
  }

  // Função para consolidar múltiplos AudioBuffers pequenos em um único buffer maior
  private consolidateAudioBuffers(buffers: AudioBuffer[]): AudioBuffer {
    if (buffers.length === 0) {
      throw new Error('No buffers to consolidate');
    }
    
    if (buffers.length === 1) {
      return buffers[0];
    }
    
    // Calcular tamanho total
    const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
    const sampleRate = buffers[0].sampleRate;
    const numberOfChannels = buffers[0].numberOfChannels;
    
    // Criar novo buffer consolidado
    const consolidatedBuffer = this.outputAudioContext.createBuffer(
      numberOfChannels,
      totalLength,
      sampleRate
    );
    
    // Copiar dados de cada buffer
    let offset = 0;
    for (const buffer of buffers) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = consolidatedBuffer.getChannelData(channel);
        const sourceData = buffer.getChannelData(channel);
        channelData.set(sourceData, offset);
      }
      offset += buffer.length;
    }
    
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    console.log(`🔗 [${timestamp}] [CONSOLIDATE] ${buffers.length} buffers → 1 buffer de ${consolidatedBuffer.duration.toFixed(3)}s`);
    
    return consolidatedBuffer;
  }

  // Adiciona buffer ao sistema de consolidação
  private addToConsolidation(buffer: AudioBuffer, personaName: string) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    
    // Inicializar se não existir
    if (!this.pendingAudioBuffers.has(personaName)) {
      this.pendingAudioBuffers.set(personaName, { buffers: [], totalDuration: 0 });
    }
    
    const pending = this.pendingAudioBuffers.get(personaName)!;
    pending.buffers.push(buffer);
    pending.totalDuration += buffer.duration;
    
    console.log(`📦 [${timestamp}] [CONSOLIDATE] ${personaName}: +${(buffer.duration * 1000).toFixed(0)}ms → total ${(pending.totalDuration * 1000).toFixed(0)}ms (${pending.buffers.length} fragmentos)`);
    
    // Limpar timeout anterior
    const existingTimeout = this.consolidationTimeout.get(personaName);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Se atingiu o threshold, consolidar e adicionar à fila
    if (pending.totalDuration >= this.consolidationThreshold) {
      this.flushConsolidation(personaName);
    } else {
      // Timeout de segurança: se não receber mais áudio em 150ms, flush o que tem
      const timeoutId = window.setTimeout(() => {
        if (this.pendingAudioBuffers.has(personaName)) {
          const p = this.pendingAudioBuffers.get(personaName)!;
          if (p.buffers.length > 0) {
            console.log(`⏰ [CONSOLIDATE] Timeout - flush ${personaName} com ${p.buffers.length} fragmentos`);
            this.flushConsolidation(personaName);
          }
        }
      }, 150);
      this.consolidationTimeout.set(personaName, timeoutId);
    }
  }

  // Flush dos buffers pendentes para a fila de reprodução
  private flushConsolidation(personaName: string) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    const pending = this.pendingAudioBuffers.get(personaName);
    
    if (!pending || pending.buffers.length === 0) {
      return;
    }
    
    // Consolidar todos os buffers em um só
    const consolidatedBuffer = this.consolidateAudioBuffers(pending.buffers);
    
    console.log(`✅ [${timestamp}] [FLUSH] ${personaName}: ${pending.buffers.length} fragmentos → ${consolidatedBuffer.duration.toFixed(3)}s`);
    
    // Limpar pendentes
    this.pendingAudioBuffers.set(personaName, { buffers: [], totalDuration: 0 });
    
    // Limpar timeout
    const timeoutId = this.consolidationTimeout.get(personaName);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.consolidationTimeout.delete(personaName);
    }
    
    // Adicionar à fila de reprodução
    this.audioQueue.push({ buffer: consolidatedBuffer, personaName });
    console.log(`📥 [${timestamp}] [QUEUE] ${personaName} → fila (tamanho: ${this.audioQueue.length})`);
    
    // Atualizar speaker atual
    const persona = PERSONAS.find(p => p.name === personaName);
    if (persona) {
      this.currentSpeaker = persona.id;
    }
    
    // Processar fila se não estiver tocando
    if (!this.isPlayingAudio) {
      console.log(`▶️ [${timestamp}] [QUEUE] Iniciando processamento da fila`);
      this.playNextInQueue();
    }
  }


  private playNextInQueue() {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    
    if (this.audioQueue.length === 0) {
      console.log(`✅ [${timestamp}] [QUEUE] Fila vazia - parando reprodução`);
      this.isPlayingAudio = false;
      this.isSpeaking = false;
      this.nextStartTime = 0;
      console.log(`   🔄 nextStartTime resetado para 0`);
      return;
    }
    
    this.isPlayingAudio = true;
    this.isSpeaking = true;
    const { buffer, personaName } = this.audioQueue.shift()!;
    
    console.log(`▶️ [${timestamp}] [PLAY] Reproduzindo ${personaName}`);
    console.log(`   Fila restante: ${this.audioQueue.length} [${this.audioQueue.map(a => a.personaName).join(', ')}]`);
    console.log(`   Duração do áudio: ${buffer.duration.toFixed(3)}s`);
    
    // Parar IMEDIATAMENTE qualquer áudio anterior
    if (this.sources.size > 0) {
      console.log(`   ⏹️ PARANDO ${this.sources.size} source(s) anterior(es)`);
      this.sources.forEach(s => { 
        try { s.stop(0); } catch(e) { console.warn(`   ⚠️ Erro ao parar source:`, e); } 
      });
      this.sources.clear();
    }
    
    const src = this.outputAudioContext.createBufferSource();
    src.buffer = buffer;
    src.connect(this.outputNode);
    
    // CORREÇÃO: Usar timing do AudioContext para velocidade normal
    const now = this.outputAudioContext.currentTime;
    const startTime = this.nextStartTime > now ? this.nextStartTime : now;
    this.nextStartTime = startTime + buffer.duration;
    
    src.start(startTime);
    
    console.log(`   🎵 Timing: now=${now.toFixed(3)}s, start=${startTime.toFixed(3)}s, end=${this.nextStartTime.toFixed(3)}s`);
    console.log(`   ⏱️ Velocidade: NORMAL (usando AudioContext timing)`);
    
    const delay = startTime - now;
    if (delay > 0.1) {
      console.warn(`   ⚠️ DELAY DETECTADO: ${delay.toFixed(3)}s até começar a tocar`);
    } else {
      console.log(`   ✅ Reprodução imediata (delay: ${delay.toFixed(3)}s)`);
    }
    
    // Atualizar qual entrevistador está falando visualmente
    const persona = PERSONAS.find(p => p.name === personaName);
    if (persona) {
      this.currentSpeaker = persona.id;
      console.log(`   👤 Speaker visual: ${personaName} (${persona.id})`);
    }
    
    // Quando terminar, tocar o próximo
    src.onended = () => {
      const endTimestamp = new Date().toISOString().split('T')[1].slice(0, -1);
      console.log(`✅ [${endTimestamp}] [ENDED] ${personaName} finalizado`);
      this.sources.delete(src);
      this.speakingLock = false;
      this.playNextInQueue();
    };
    
    this.sources.add(src);
    console.log(`   ✓ Source adicionado (total: ${this.sources.size})`);
  }

  private async startRecording() {
    if (this.isRecording || this.generatingScript) return;
    
    console.log('🎬 [START] Iniciando gravação...');
    
    if (this.selectedPersonas.size === 2) {
      this.currentSpeaker = Array.from(this.selectedPersonas)[0];
      console.log(`🎤 [INIT-SPEAKER] Primeiro entrevistador: ${this.currentSpeaker}`);
    }
    
    await this.generateScript();
    
    this.status = 'connecting';
    console.log('🔗 [STATUS] Status: connecting');
    
    await this.initSession();
    
    console.log('🎤 [MIC] Solicitando permissão do microfone...');
    
    try {
      if (this.inputAudioContext.state === 'suspended') {
        console.log('⚠️ [AUDIO-CTX] Contexto de áudio suspenso, tentando retomar...');
        await this.inputAudioContext.resume();
        console.log('✅ [AUDIO-CTX] Contexto retomado, estado:', this.inputAudioContext.state);
      }
      
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      };
      
      console.log('🎙️ [MIC-REQUEST] Solicitando com constraints:', constraints);
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ [MIC] Microfone autorizado!');
      
      const tracks = this.mediaStream.getAudioTracks();
      console.log('🎙️ [MIC-INFO] Tracks:', tracks.map(t => ({
        label: t.label,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState
      })));
      
      if (tracks.length === 0) {
        console.error('❌ [MIC-ERROR] Nenhuma track de áudio encontrada!');
        this.error = 'Nenhuma track de áudio';
        return;
      }
      
    } catch(e) {
      console.error('❌ [MIC-ERROR] Erro ao acessar microfone:', e);
      this.error = 'Erro ao acessar microfone: ' + (e as any).message;
      return;
    }
    
    this.sourceNode = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
    this.sourceNode.connect(this.inputNode);
    console.log('🔌 [AUDIO] Microfone conectado ao inputNode');
    
    this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    let audioChunkCount = 0;
    let totalSilentChunks = 0;
    
    this.scriptProcessorNode.onaudioprocess = (e) => {
      const pcm = e.inputBuffer.getChannelData(0);
      const volume = Math.max(...Array.from(pcm).map(Math.abs));
      
      audioChunkCount++;
      
      if (volume < 0.001) {
        totalSilentChunks++;
      }
      
      this.detectUserSpeech(volume);
      
      // Log mais frequente no início para diagnóstico
      if (audioChunkCount <= 10 || audioChunkCount % 50 === 0) {
        const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
        console.log(`🎵 [${timestamp}] [AUDIO-IN] Chunk #${audioChunkCount}, Vol: ${(volume * 100).toFixed(2)}%, Silent: ${totalSilentChunks}/${audioChunkCount}, Speaking: ${this.isUserSpeaking}`);
        
        if (this.selectedPersonas.size === 2) {
          console.log(`   🎯 [COORD] Sessão ativa: ${this.activeSessionIndex}, Turno: ${this.turnCount}`);
          console.log(`   📊 [STATUS] Fila: ${this.audioQueue.length}, Tocando: ${this.isPlayingAudio}, Sources: ${this.sources.size}`);
        }
        
        if (this.sources.size > 1) {
          console.error(`❌ [CHIADO-DETECTADO] ${this.sources.size} sources ativos simultaneamente!`);
        }
        
        if (this.audioQueue.length > 20) {
          console.warn(`⚠️ [FILA-GRANDE] Fila com ${this.audioQueue.length} áudios - normal durante fala longa`);
        }
      }
      
      if (audioChunkCount === 100 && totalSilentChunks === 100) {
        console.error('❌ [MIC-ERROR] 100 chunks silenciosos! Microfone pode não estar funcionando.');
      }
      
      // BLOQUEIO: Não enviar áudio enquanto a IA está falando (evita eco e interferência)
      if (this.isPlayingAudio || this.isSpeaking) {
        if (audioChunkCount % 200 === 0) {
          const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
          console.log(`🔇 [${timestamp}] [MUTED] Áudio do mic bloqueado (IA falando)`);
        }
        return; // Não envia áudio enquanto IA fala
      }
      
      // ARQUITETURA CRÍTICA: Enviar áudio apenas para a sessão ativa
      if (this.selectedPersonas.size === 2) {
        // MODO DUAL: Apenas sessão ativa recebe áudio
        const targetSession = this.activeSessionIndex === 0 ? this.sessionPromise : this.sessionPromise2;
        const sessionName = this.activeSessionIndex === 0 ? 'SESSION-1' : 'SESSION-2';
        
        if (targetSession) {
          targetSession.then((s: any) => {
            s.sendRealtimeInput({ media: createBlob(pcm) });
            if (audioChunkCount % 100 === 0) {
              const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
              console.log(`📤 [${timestamp}] [SEND-${sessionName}] Áudio enviado (sessão ativa: ${this.activeSessionIndex})`);
            }
          }).catch((err: any) => {
            console.error(`❌ [SEND-ERROR-${sessionName}]`, err);
          });
        }
        
      } else {
        // MODO SINGLE: Enviar para única sessão
        this.sessionPromise?.then((s: any) => {
          s.sendRealtimeInput({ media: createBlob(pcm) });
          if (audioChunkCount % 100 === 0) {
            const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
            console.log(`📤 [${timestamp}] [SEND] Áudio enviado`);
          }
        }).catch((err: any) => {
          console.error('❌ [SEND-ERROR]', err);
        });
      }
    };
    
    this.inputNode.connect(this.scriptProcessorNode);
    this.scriptProcessorNode.connect(this.inputAudioContext.destination);
    
    this.isRecording = true;
    this.status = 'recording';
    this.startTime = Date.now();
    
    this.timerInterval = window.setInterval(() => {
      if (this.startTime) {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const secs = (elapsed % 60).toString().padStart(2, '0');
        this.duration = `${mins}:${secs}`;
      }
    }, 1000);
    
    console.log('✅ [START] Gravação iniciada com sucesso!');
  }


  private stopRecording() {
    console.log('🛑 [STOP] Parando gravação...');
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        console.log(`🔇 [MIC] Parando track: ${track.label}`);
        track.stop();
      });
    }
    
    if (this.sessionPromise) {
      console.log('🔌 [SESSION-1] Fechando sessão...');
      this.sessionPromise.then((s: any) => s.close()).catch(() => {});
    }
    
    if (this.sessionPromise2) {
      console.log('🔌 [SESSION-2] Fechando sessão...');
      this.sessionPromise2.then((s: any) => s.close()).catch(() => {});
    }
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    this.sources.forEach(s => { try { s.stop(); } catch(e) {} });
    this.sources.clear();
    this.audioQueue = [];
    this.conversationHistory = [];
    this.transcriptionHistory = [];
    this.nextStartTime = 0;
    
    this.isRecording = false;
    this.status = 'ready';
    this.isPlayingAudio = false;
    this.isSpeaking = false;
    this.speakingLock = false;
    
    console.log('🧹 [CLEANUP] Histórico e fila limpos');
    console.log('✅ [STOP] Gravação parada com sucesso');
  }

  private renderSkill(s: Skill) {
    const isSelected = this.selectedSkills.has(s.id);
    return html`
      <div>
        <div class="skill-chip ${isSelected ? 'active' : ''}" @click=${() => this.toggleSkill(s.id)}>
          ${s.label}
        </div>
        ${isSelected ? html`
          <div class="sub-topics">
            ${s.subTopics.map(topic => {
              const isTopicSelected = this.selectedSubTopics.get(s.id)?.has(topic);
              return html`
                <div class="sub-topic-item ${isTopicSelected ? 'active' : ''}" @click=${() => this.toggleSubTopic(s.id, topic)}>
                  <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  ${topic}
                </div>
              `;
            })}
            ${this.showCustomSubTopicInput === s.id ? html`
              <input class="custom-input" placeholder="Novo subtópico..." 
                @keydown=${(e: KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    this.addCustomSubTopic(s.id, (e.target as HTMLInputElement).value);
                  }
                }}
              />
            ` : html`
              <button class="add-btn-small" @click=${() => this.showCustomSubTopicInput = s.id}>+ Adicionar</button>
            `}
          </div>
        ` : ''}
      </div>
    `;
  }

  render() {
    const hardSkills = this.skills.filter(s => s.category === 'hard');
    const softSkills = this.skills.filter(s => s.category === 'soft');
    const selectedPersonasList = Array.from(this.selectedPersonas)
      .map(id => PERSONAS.find(p => p.id === id))
      .filter(p => p) as Persona[];
    const isDualMode = selectedPersonasList.length === 2;

    return html`
      <div class="app-container">
        <div class="sidebar">
          <div class="logo">
            <div class="logo-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" x2="12" y1="19" y2="22"></line>
              </svg>
            </div>
            <span class="logo-text">ENTREVISTA AI</span>
          </div>

          <div class="section">
            <span class="label">Entrevistadores (máx. 2)</span>
            <div class="persona-list">
              ${PERSONAS.map(p => html`
                <div class="persona-card ${this.selectedPersonas.has(p.id) ? 'active' : ''}" 
                     @click=${() => this.togglePersona(p.id)}>
                  ${p.svg}
                  <div class="persona-info">
                    <span class="persona-name">${p.name}</span>
                    <span class="persona-title">${p.title}</span>
                  </div>
                  ${this.selectedPersonas.has(p.id) ? html`
                    <span class="check-mark">✓</span>
                  ` : ''}
                </div>
              `)}
            </div>
            <div class="persona-hint">
              ${this.selectedPersonas.size === 2 
                ? '🎭 Modo painel: dois entrevistadores' 
                : '👤 Selecione até 2 entrevistadores'}
            </div>
          </div>

          <div class="section">
            <span class="label">Personalidade</span>
            <div class="personality-selector">
              ${(['tranquilo', 'equilibrado', 'tecnico'] as const).map(p => html`
                <button class="personality-btn ${this.personality === p ? 'active' : ''}" 
                        @click=${() => this.personality = p}>
                  ${p === 'tranquilo' ? '😊 Tranquilo' : p === 'equilibrado' ? '⚖️ Equilibrado' : '🔬 Técnico'}
                </button>
              `)}
            </div>
          </div>

          <div class="section">
            <span class="label">Duração: ${this.durationMinutes} min</span>
            <div class="duration-box">
              <input type="range" class="duration-slider" min="5" max="60" step="5" 
                     .value=${String(this.durationMinutes)}
                     @input=${(e: Event) => this.durationMinutes = Number((e.target as HTMLInputElement).value)} />
            </div>
          </div>

          <div class="section">
            <span class="label">Tópicos</span>
            <div class="skills-grid">
              <div class="skill-column">
                <span class="label" style="font-size: 0.65rem;">Hard Skills</span>
                ${hardSkills.map(s => this.renderSkill(s))}
                ${this.showCustomSkillInput === 'hard' ? html`
                  <input class="custom-input" placeholder="Nova skill..." 
                    @keydown=${(e: KeyboardEvent) => {
                      if (e.key === 'Enter') {
                        this.addCustomSkill('hard', (e.target as HTMLInputElement).value);
                      }
                    }}
                  />
                ` : html`
                  <button class="add-btn-small" @click=${() => this.showCustomSkillInput = 'hard'}>+ Adicionar</button>
                `}
              </div>
              <div class="skill-column">
                <span class="label" style="font-size: 0.65rem;">Soft Skills</span>
                ${softSkills.map(s => this.renderSkill(s))}
                ${this.showCustomSkillInput === 'soft' ? html`
                  <input class="custom-input" placeholder="Nova skill..." 
                    @keydown=${(e: KeyboardEvent) => {
                      if (e.key === 'Enter') {
                        this.addCustomSkill('soft', (e.target as HTMLInputElement).value);
                      }
                    }}
                  />
                ` : html`
                  <button class="add-btn-small" @click=${() => this.showCustomSkillInput = 'soft'}>+ Adicionar</button>
                `}
              </div>
            </div>
          </div>
        </div>

        <div class="main-view">
          <div class="visualizer-container">
            ${isDualMode ? html`
              <div class="dual-sphere-container">
                ${selectedPersonasList.map((persona, index) => html`
                  <div class="sphere-wrapper ${this.currentSpeaker === persona.id ? 'speaking' : ''}">
                    <gdm-live-audio-visuals-3d 
                      .inputNode=${this.inputNode} 
                      .outputNode=${this.outputNode}
                    ></gdm-live-audio-visuals-3d>
                    <div class="interviewer-label">
                      <div class="interviewer-name">${persona.name}</div>
                      <div class="interviewer-title">${persona.title}</div>
                    </div>
                  </div>
                `)}
              </div>
            ` : html`
              <gdm-live-audio-visuals-3d 
                .inputNode=${this.inputNode} 
                .outputNode=${this.outputNode}
              ></gdm-live-audio-visuals-3d>
            `}
          </div>
          
          <div class="overlay-ui">
            ${this.feedbackMessage ? html`
              <div class="feedback-overlay">
                <div class="feedback-message-center">${this.feedbackMessage}</div>
              </div>
            ` : ''}
            
            <div class="status-badge">
              <div class="dot ${this.isRecording ? 'live' : ''}"></div>
              ${this.status === 'ready' ? 'Pronto' : 
                this.status === 'connecting' ? 'Conectando...' : 
                'Ao Vivo'}
            </div>
            
            <div class="controls">
              ${!this.isRecording ? html`
                <button class="btn-circle btn-start" @click=${this.startRecording} ?disabled=${this.generatingScript}>
                  ${this.generatingScript ? html`<div class="spinner"></div>` : html`
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  `}
                </button>
              ` : html`
                <button class="btn-circle btn-stop" @click=${this.stopRecording}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <rect x="6" y="6" width="12" height="12" rx="2"></rect>
                  </svg>
                </button>
              `}
            </div>
          </div>
        </div>

        <div class="info-panel">
          <div class="timer">${this.duration}</div>
          
          <div class="confidence-display">
            <span class="label">Nível de Confiança</span>
            <div class="confidence-number">${this.confidenceLevel}%</div>
            <div class="confidence-bar-container">
              <div class="confidence-bar" style="width: ${this.confidenceLevel}%"></div>
            </div>
          </div>

          ${this.stages.length > 0 ? html`
            <div class="section">
              <span class="label">Roteiro</span>
              ${this.generatingScript ? html`
                <div class="loader-script">
                  <div class="spinner"></div>
                  Gerando roteiro...
                </div>
              ` : html`
                <div class="timeline">
                  <div class="timeline-progress" style="height: ${(this.currentStageIndex / Math.max(this.stages.length - 1, 1)) * 100}%"></div>
                  ${this.stages.map((stage, i) => html`
                    <div class="stage-item ${i === this.currentStageIndex ? 'active' : i < this.currentStageIndex ? 'completed' : ''}">
                      <div class="stage-dot"></div>
                      <div class="stage-content">
                        <div class="stage-title">${stage.title}</div>
                        <div class="stage-desc">${stage.description}</div>
                      </div>
                    </div>
                  `)}
                </div>
              `}
            </div>
          ` : ''}

          ${this.error ? html`
            <div style="color: #ef4444; font-size: 0.8rem; padding: 12px; background: rgba(239,68,68,0.1); border-radius: 8px;">
              ⚠️ ${this.error}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}
