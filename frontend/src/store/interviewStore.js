import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

const SESSION_ID = `session_${Date.now()}`

const useInterviewStore = create(subscribeWithSelector((set, get) => ({
  // ── Session ──────────────────────────────────────────────────────────────
  sessionId: SESSION_ID,

  // ── Onboarding ───────────────────────────────────────────────────────────
  step: 0, // 0=onboarding, 1=dashboard, 2=practice
  onboardingStep: 1,

  jobOfferText: '',
  cvText: '',
  personalNotes: '',
  companyName: '',
  targetPosition: '',
  candidateName: '',
  companyBrief: '',

  preferences: {
    interviewLang: 'fr',
    responseLang: 'fr',
    displayMode: 'both',
    formality: 'standard',
  },

  // ── Empreinte vocale ─────────────────────────────────────────────────────
  voiceFingerprint: null,   // { mean: number[], threshold: number } | null
  voiceNoiseLevel: null,    // RMS du bruit ambiant (pour seuil adaptatif)

  // ── Transcription ─────────────────────────────────────────────────────────
  isListening: false,
  isPaused: false,
  transcription: [], // [{ id, role, text, isFinal, timestamp }]
  currentInterimText: '',
  detectedQuestion: '',
  speakerMode: 'recruiter', // 'recruiter' | 'candidate'

  // ── Réponse IA ────────────────────────────────────────────────────────────
  isGenerating: false,
  streamedResponse: '',
  finalResponse: '',
  responseHistory: [],

  // ── UI ────────────────────────────────────────────────────────────────────
  isSidePanelOpen: true,
  isStealthMode: false,
  interviewTimer: 0,
  sidePanelTab: 'company', // 'company' | 'kpis' | 'questions'

  // ── Actions ───────────────────────────────────────────────────────────────
  setStep: (step) => set({ step }),
  setOnboardingStep: (onboardingStep) => set({ onboardingStep }),

  setJobOfferText: (jobOfferText) => set({ jobOfferText }),
  setCvText: (cvText) => set({ cvText }),
  setPersonalNotes: (personalNotes) => set({ personalNotes }),
  setCompanyName: (companyName) => set({ companyName }),
  setTargetPosition: (targetPosition) => set({ targetPosition }),
  setCandidateName: (candidateName) => set({ candidateName }),
  setCompanyBrief: (companyBriefOrUpdater) => set((s) => ({
    companyBrief: typeof companyBriefOrUpdater === 'function'
      ? companyBriefOrUpdater(s.companyBrief)
      : companyBriefOrUpdater,
  })),
  setPreferences: (prefs) => set((s) => ({ preferences: { ...s.preferences, ...prefs } })),
  setVoiceFingerprint: (voiceFingerprint) => set({ voiceFingerprint }),
  setVoiceNoiseLevel: (voiceNoiseLevel) => set({ voiceNoiseLevel }),

  setIsListening: (isListening) => set({ isListening }),
  setIsPaused: (isPaused) => set({ isPaused }),
  setSpeakerMode: (speakerMode) => set({ speakerMode }),
  setCurrentInterimText: (currentInterimText) => set({ currentInterimText }),
  setDetectedQuestion: (detectedQuestion) => set({ detectedQuestion }),

  addTranscriptionEntry: (entry) =>
    set((s) => ({
      transcription: [...s.transcription, { id: Date.now(), timestamp: new Date().toISOString(), ...entry }],
    })),

  updateLastTranscription: (text) =>
    set((s) => {
      const last = s.transcription[s.transcription.length - 1]
      if (!last || last.isFinal) return s
      return {
        transcription: [
          ...s.transcription.slice(0, -1),
          { ...last, text },
        ],
      }
    }),

  setIsGenerating: (isGenerating) => set({ isGenerating }),
  appendStreamedResponse: (text) => set((s) => ({ streamedResponse: s.streamedResponse + text })),
  setStreamedResponse: (streamedResponse) => set({ streamedResponse }),
  setFinalResponse: (finalResponse) => set({ finalResponse }),
  clearResponse: () => set({ streamedResponse: '', finalResponse: '', isGenerating: false }),

  pushResponseToHistory: (question, response) =>
    set((s) => ({
      responseHistory: [...s.responseHistory.slice(-9), { question, response, timestamp: new Date().toISOString() }],
    })),

  toggleSidePanel: () => set((s) => ({ isSidePanelOpen: !s.isSidePanelOpen })),
  setSidePanelTab: (sidePanelTab) => set({ sidePanelTab }),
  toggleStealthMode: () => set((s) => ({ isStealthMode: !s.isStealthMode })),
  setStealthMode: (isStealthMode) => set({ isStealthMode }),
  tickTimer: () => set((s) => ({ interviewTimer: s.interviewTimer + 1 })),
  resetTimer: () => set({ interviewTimer: 0 }),
})))

export default useInterviewStore
