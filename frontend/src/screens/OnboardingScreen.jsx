import { Zap } from 'lucide-react'
import useInterviewStore from '../store/interviewStore.js'
import FileUpload from '../components/Onboarding/FileUpload.jsx'
import VoiceEnrollment from '../components/Onboarding/VoiceEnrollment.jsx'
import CompanyResearch from '../components/Onboarding/CompanyResearch.jsx'
import Preferences from '../components/Onboarding/Preferences.jsx'

const STEPS = [
  { label: 'Documents',  sub: 'CV & offre' },
  { label: 'Voix',       sub: 'Empreinte vocale' },
  { label: 'Entreprise', sub: 'Brief auto' },
  { label: 'Préférences', sub: 'Langue & ton' },
]
const TOTAL = STEPS.length

const DESCRIPTIONS = {
  1: 'Chargez vos documents pour que le copilote puisse personnaliser chaque réponse.',
  2: 'Enregistrez votre voix pour que le système distingue automatiquement qui parle.',
  3: 'Générez un brief entreprise pour arriver préparé.',
  4: 'Configurez la langue et le style des suggestions.',
}

export default function OnboardingScreen({ onComplete }) {
  const { onboardingStep, setOnboardingStep, voiceFingerprint } = useInterviewStore()

  function goNext() {
    if (onboardingStep < TOTAL) setOnboardingStep(onboardingStep + 1)
    else onComplete()
  }

  function goBack() {
    if (onboardingStep > 1) setOnboardingStep(onboardingStep - 1)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Zap size={18} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-white">Interview Copilot</h1>
        <span className="text-xs text-gray-500 px-2 py-0.5 border border-gray-800 rounded-full">prototype</span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => {
          const step = i + 1
          const isActive = onboardingStep === step
          const isDone = onboardingStep > step
          return (
            <div key={step} className="flex items-center">
              <button
                onClick={() => isDone && setOnboardingStep(step)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-600/20 text-white'
                  : isDone ? 'text-green-400 cursor-pointer hover:text-green-300'
                  : 'text-gray-600'
                }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isActive ? 'bg-blue-600 text-white'
                  : isDone ? 'bg-green-700 text-white'
                  : 'bg-gray-800 text-gray-500'
                }`}>
                  {isDone ? '✓' : step}
                </span>
                <span className="text-xs font-medium hidden sm:block">{s.label}</span>
                {step === 2 && voiceFingerprint && isDone && (
                  <span className="text-[10px] text-green-500">·calibré</span>
                )}
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-px mx-1 ${isDone ? 'bg-green-700' : 'bg-gray-800'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Card */}
      <div className="w-full max-w-xl bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-white">
            {STEPS[onboardingStep - 1].label}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{DESCRIPTIONS[onboardingStep]}</p>
        </div>

        {onboardingStep === 1 && <FileUpload onNext={goNext} />}
        {onboardingStep === 2 && <VoiceEnrollment onNext={goNext} />}
        {onboardingStep === 3 && <CompanyResearch onNext={goNext} />}
        {onboardingStep === 4 && <Preferences onNext={onComplete} />}

        {onboardingStep > 1 && (
          <button onClick={goBack} className="mt-3 text-xs text-gray-600 hover:text-gray-400 transition-colors">
            ← Retour
          </button>
        )}
      </div>

      <p className="mt-6 text-xs text-gray-700">
        L'empreinte vocale reste en mémoire locale — jamais envoyée à un serveur.
      </p>
    </div>
  )
}
