import { useState } from 'react'
import { Search, Building2, Pencil } from 'lucide-react'
import useInterviewStore from '../../store/interviewStore.js'
import { streamCompanyResearch, saveContext } from '../../services/claudeApi.js'

export default function CompanyResearch({ onNext }) {
  const { sessionId, companyName, setCompanyName, targetPosition, companyBrief, setCompanyBrief } = useInterviewStore()
  const [isSearching, setIsSearching] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  async function handleSearch() {
    if (!companyName.trim()) return
    setIsSearching(true)
    setCompanyBrief('')

    try {
      for await (const chunk of streamCompanyResearch(sessionId, companyName, targetPosition)) {
        setCompanyBrief(prev => prev + chunk)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSearching(false)
    }
  }

  async function handleNext() {
    await saveContext(sessionId, { companyName })
    onNext()
  }

  return (
    <div className="space-y-5">
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <Building2 size={14} className="inline mr-1 text-blue-400" />
          Nom de l'entreprise
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="ex: Dataiku, LVMH, BNP Paribas..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !companyName.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap">
            <Search size={15} />
            {isSearching ? 'Recherche...' : 'Brief Claude'}
          </button>
        </div>
      </div>

      {(companyBrief || isSearching) && (
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Brief entreprise généré</h3>
            {companyBrief && !isSearching && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                <Pencil size={11} />
                {isEditing ? 'Fermer édition' : 'Modifier'}
              </button>
            )}
          </div>

          {isSearching && !companyBrief && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span className="animate-pulse">⚡ Claude analyse l'entreprise...</span>
            </div>
          )}

          {isEditing ? (
            <textarea
              value={companyBrief}
              onChange={e => setCompanyBrief(e.target.value)}
              className="w-full h-72 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono resize-none focus:outline-none focus:border-blue-500"
            />
          ) : (
            <div className="text-sm text-gray-300 leading-relaxed max-h-72 overflow-y-auto prose prose-invert prose-sm whitespace-pre-wrap">
              {companyBrief}
              {isSearching && <span className="animate-pulse text-blue-400">▊</span>}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleNext}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
          {companyBrief ? 'Continuer →' : 'Passer cette étape →'}
        </button>
      </div>
    </div>
  )
}
