import { Zap } from 'lucide-react'
import useInterviewStore from '../../store/interviewStore.js'
import { saveContext } from '../../services/claudeApi.js'

const LANGS = [
  { value: 'fr', label: '🇫🇷 Français' },
  { value: 'en', label: '🇬🇧 English' },
  { value: 'es', label: '🇪🇸 Español' },
]

const MODES = [
  { value: 'full', label: 'Réponse complète', desc: 'Texte fluide prêt à l\'oral' },
  { value: 'bullets', label: 'Points clés', desc: 'Bullets à développer soi-même' },
  { value: 'both', label: 'Les deux', desc: 'Réponse + points + mots-clés (recommandé)' },
]

const FORMALITY = [
  { value: 'casual', label: 'Casual', desc: 'Décontracté, startup' },
  { value: 'standard', label: 'Standard', desc: 'Professionnel naturel' },
  { value: 'corporate', label: 'Corporate', desc: 'Très formel, grand groupe' },
]

export default function Preferences({ onNext }) {
  const { sessionId, preferences, setPreferences } = useInterviewStore()

  function set(key, value) {
    setPreferences({ [key]: value })
  }

  async function handleLaunch() {
    await saveContext(sessionId, { preferences })
    onNext()
  }

  return (
    <div className="space-y-6">
      {/* Langue entretien */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Langue de l'entretien</label>
        <div className="flex gap-2 flex-wrap">
          {LANGS.map(l => (
            <button key={l.value} onClick={() => set('interviewLang', l.value)}
              className={`px-4 py-2 rounded-lg text-sm border transition-colors ${preferences.interviewLang === l.value
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Langue réponse */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Langue des réponses suggérées</label>
        <div className="flex gap-2 flex-wrap">
          {LANGS.map(l => (
            <button key={l.value} onClick={() => set('responseLang', l.value)}
              className={`px-4 py-2 rounded-lg text-sm border transition-colors ${preferences.responseLang === l.value
                ? 'bg-green-700 border-green-600 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode d'affichage */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Mode d'affichage</label>
        <div className="space-y-2">
          {MODES.map(m => (
            <button key={m.value} onClick={() => set('displayMode', m.value)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${preferences.displayMode === m.value
                ? 'bg-blue-600/20 border-blue-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'}`}>
              <span className="font-medium">{m.label}</span>
              <span className="text-xs text-gray-400 ml-2">— {m.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Formalité */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Niveau de formalité</label>
        <div className="flex gap-2">
          {FORMALITY.map(f => (
            <button key={f.value} onClick={() => set('formality', f.value)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors text-center ${preferences.formality === f.value
                ? 'bg-purple-700/40 border-purple-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'}`}>
              <div className="font-medium">{f.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{f.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleLaunch}
        className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-lg">
        <Zap size={20} />
        Lancer l'entretien
      </button>
    </div>
  )
}
