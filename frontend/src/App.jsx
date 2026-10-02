import useInterviewStore from './store/interviewStore.js'
import Dashboard from './components/Dashboard/index.jsx'
import PracticeMode from './components/Training/PracticeMode.jsx'
import OnboardingScreen from './screens/OnboardingScreen.jsx'

export default function App() {
  const { step, setStep } = useInterviewStore()

  if (step === 0) return <OnboardingScreen onComplete={() => setStep(1)} />
  if (step === 2) return <PracticeMode onBack={() => setStep(1)} />
  return <Dashboard onPracticeMode={() => setStep(2)} />
}
