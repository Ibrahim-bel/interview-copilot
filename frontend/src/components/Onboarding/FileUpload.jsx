import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import useInterviewStore from '../../store/interviewStore.js'
import { uploadFile, uploadJobOffer, uploadCV, saveContext } from '../../services/claudeApi.js'

export default function FileUpload({ onNext }) {
  const { sessionId, setJobOfferText, setCvText, setPersonalNotes, personalNotes, setCandidateName, setTargetPosition, candidateName, targetPosition } = useInterviewStore()

  const [jobStatus, setJobStatus] = useState(null) // null | 'loading' | 'ok' | 'error'
  const [cvStatus, setCvStatus] = useState(null)
  const [jobText, setJobText] = useState('')
  const [cvTabMode, setCvTabMode] = useState('file') // 'file' | 'text'
  const [jobTabMode, setJobTabMode] = useState('file') // 'file' | 'text'

  const jobFileRef = useRef()
  const cvFileRef = useRef()

  async function handleJobFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setJobStatus('loading')
    try {
      const res = await uploadFile(sessionId, file, 'job-offer')
      if (res.success) {
        setJobStatus('ok')
        setJobOfferText(`[Fichier chargé: ${file.name}]`)
      } else throw new Error(res.error)
    } catch { setJobStatus('error') }
  }

  async function handleJobText() {
    if (!jobText.trim()) return
    setJobStatus('loading')
    try {
      const res = await uploadJobOffer(sessionId, jobText)
      if (res.success) { setJobStatus('ok'); setJobOfferText(jobText) }
      else throw new Error(res.error)
    } catch { setJobStatus('error') }
  }

  async function handleCvFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setCvStatus('loading')
    try {
      const res = await uploadFile(sessionId, file, 'cv')
      if (res.success) { setCvStatus('ok'); setCvText(`[Fichier chargé: ${file.name}]`) }
      else throw new Error(res.error)
    } catch { setCvStatus('error') }
  }

  async function handleCvText(text) {
    if (!text.trim()) return
    setCvStatus('loading')
    try {
      const res = await uploadCV(sessionId, text)
      if (res.success) { setCvStatus('ok'); setCvText(text) }
      else throw new Error(res.error)
    } catch { setCvStatus('error') }
  }

  async function handleNext() {
    await saveContext(sessionId, { personalNotes, candidateName, targetPosition })
    onNext()
  }

  return (
    <div className="space-y-6">
      {/* Infos candidat */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Votre prénom</label>
          <input
            type="text"
            value={candidateName}
            onChange={e => setCandidateName(e.target.value)}
            placeholder="ex: Marie"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Poste visé</label>
          <input
            type="text"
            value={targetPosition}
            onChange={e => setTargetPosition(e.target.value)}
            placeholder="ex: Product Manager"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Offre d'emploi */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <FileText size={16} className="text-blue-400" />
            Offre d'emploi
          </h3>
          <div className="flex gap-2 text-xs">
            {['file', 'text'].map(m => (
              <button key={m} onClick={() => setJobTabMode(m)}
                className={`px-2 py-1 rounded ${jobTabMode === m ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                {m === 'file' ? 'PDF/DOCX' : 'Texte brut'}
              </button>
            ))}
          </div>
        </div>

        {jobTabMode === 'file' ? (
          <div
            onClick={() => jobFileRef.current?.click()}
            className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
            <Upload size={24} className="mx-auto mb-2 text-gray-400" />
            <p className="text-gray-400 text-sm">Cliquez pour charger un PDF ou DOCX</p>
            <input ref={jobFileRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={handleJobFile} />
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              placeholder="Collez ici le texte de l'offre d'emploi..."
              className="w-full h-28 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500"
              onChange={e => setJobText(e.target.value)}
            />
            <button onClick={handleJobText}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
              Valider
            </button>
          </div>
        )}
        <StatusBadge status={jobStatus} />
      </div>

      {/* CV */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <FileText size={16} className="text-green-400" />
            CV / Background
          </h3>
          <div className="flex gap-2 text-xs">
            {['file', 'text'].map(m => (
              <button key={m} onClick={() => setCvTabMode(m)}
                className={`px-2 py-1 rounded ${cvTabMode === m ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                {m === 'file' ? 'PDF/DOCX' : 'Texte brut'}
              </button>
            ))}
          </div>
        </div>

        {cvTabMode === 'file' ? (
          <div
            onClick={() => cvFileRef.current?.click()}
            className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-green-500 transition-colors">
            <Upload size={24} className="mx-auto mb-2 text-gray-400" />
            <p className="text-gray-400 text-sm">Votre CV en PDF ou DOCX</p>
            <input ref={cvFileRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={handleCvFile} />
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              placeholder="Collez le texte de votre CV..."
              className="w-full h-28 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-green-500"
              onBlur={e => handleCvText(e.target.value)}
            />
          </div>
        )}
        <StatusBadge status={cvStatus} />
      </div>

      {/* Notes personnelles */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <h3 className="font-semibold text-white mb-2 text-sm">Notes personnelles <span className="text-gray-500 font-normal">(optionnel)</span></h3>
        <textarea
          value={personalNotes}
          onChange={e => setPersonalNotes(e.target.value)}
          placeholder="Forces, faiblesses, anecdotes clés, chiffres à citer, projets emblématiques..."
          className="w-full h-24 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500"
        />
      </div>

      <button
        onClick={handleNext}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
        Étape suivante →
      </button>
    </div>
  )
}

function StatusBadge({ status }) {
  if (!status) return null
  return (
    <div className={`flex items-center gap-1.5 mt-2 text-xs ${status === 'ok' ? 'text-green-400' : status === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
      {status === 'loading' && <span className="animate-pulse">Chargement...</span>}
      {status === 'ok' && <><CheckCircle size={12} /> Chargé avec succès</>}
      {status === 'error' && <><AlertCircle size={12} /> Erreur lors du chargement</>}
    </div>
  )
}
