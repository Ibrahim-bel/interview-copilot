import { Building2, BarChart2, HelpCircle, ChevronRight } from 'lucide-react'
import useInterviewStore from '../../store/interviewStore.js'
import { extractKPIs, extractQuestionsToAsk } from '../../services/contextBuilder.js'

const TABS = [
  { id: 'company', label: 'Entreprise', icon: Building2 },
  { id: 'kpis', label: 'Mes chiffres', icon: BarChart2 },
  { id: 'questions', label: 'À poser', icon: HelpCircle },
]

export default function SidePanel() {
  const { isSidePanelOpen, sidePanelTab, setSidePanelTab, toggleSidePanel, companyBrief, companyName, cvText, targetPosition } = useInterviewStore()

  const kpis = extractKPIs(cvText)
  const questionsToAsk = extractQuestionsToAsk(companyBrief)

  if (!isSidePanelOpen) {
    return (
      <button
        onClick={toggleSidePanel}
        className="flex items-center justify-center w-8 bg-gray-900 border-l border-gray-800 text-gray-600 hover:text-gray-300 transition-colors">
        <ChevronRight size={16} />
      </button>
    )
  }

  return (
    <div className="flex flex-col w-64 bg-gray-900 border-l border-gray-800">
      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setSidePanelTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                sidePanelTab === tab.id ? 'text-white border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'
              }`}>
              <Icon size={13} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {sidePanelTab === 'company' && (
          <div className="space-y-2">
            {companyName && <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{companyName}</h3>}
            {companyBrief ? (
              <div className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">
                {companyBrief.slice(0, 1500)}
                {companyBrief.length > 1500 && <span className="text-gray-600">...</span>}
              </div>
            ) : (
              <p className="text-xs text-gray-600">Brief entreprise non disponible. Retournez à l'onboarding pour le générer.</p>
            )}
          </div>
        )}

        {sidePanelTab === 'kpis' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 mb-3">Chiffres extraits de votre CV à citer en entretien :</p>
            {kpis.length > 0 ? (
              kpis.map((kpi, i) => (
                <div key={i} className="px-3 py-2 bg-gray-800 rounded-lg">
                  <p className="text-sm text-white font-medium">{kpi.metric}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{kpi.context}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-600">Aucun chiffre clé extrait. Ajoutez votre CV à l'étape 1.</p>
            )}
          </div>
        )}

        {sidePanelTab === 'questions' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 mb-3">Questions pertinentes à poser au recruteur :</p>
            {questionsToAsk.map((q, i) => (
              <div key={i}
                className="px-3 py-2 bg-gray-800 rounded-lg text-xs text-gray-300 cursor-pointer hover:bg-gray-700 hover:text-white transition-colors leading-relaxed">
                {q}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Collapse button */}
      <button
        onClick={toggleSidePanel}
        className="flex items-center justify-center py-2 text-gray-600 hover:text-gray-400 border-t border-gray-800 text-xs gap-1 transition-colors">
        Masquer <ChevronRight size={12} className="rotate-180" />
      </button>
    </div>
  )
}
