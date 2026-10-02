# Interview Copilot

Copilote silencieux d'entretien en temps réel. Écoute, transcrit, traduit, et suggère des réponses contextualisées via Claude — invisible pour le recruteur.

---

## Installation en 3 commandes

```bash
# 1. Cloner / se placer dans le dossier
cd interview-copilot

# 2. Configurer la clé API
cp .env.example backend/.env
# Éditez backend/.env et ajoutez votre ANTHROPIC_API_KEY

# 3. Installer + lancer
npm install && npm run install:all && npm run dev
```

Frontend → http://localhost:5173  
Backend → http://localhost:3001

---

## Configuration audio — Loopback (IMPORTANT)

Pour que le microphone capte aussi le son du système (voix du recruteur en visio) :

### macOS — BlackHole (gratuit)
```bash
brew install --cask blackhole-2ch
```
1. Ouvrez **Audio MIDI Setup** (Applications → Utilitaires)
2. Créez un **Aggregate Device** : BlackHole 2ch + votre micro physique
3. Dans Zoom/Teams : sélectionnez cet Aggregate Device comme entrée
4. Dans l'onglet Préférences du navigateur : autorisez ce micro

### Windows — VB-Cable (gratuit)
1. Téléchargez **VB-Cable** sur vb-audio.com
2. Dans Paramètres son → Enregistrement : activez "Mix stéréo" ou "Écoute de ce périphérique" sur VB-Cable
3. Sélectionnez VB-Cable comme entrée dans le navigateur

### Alternative simple (présentiel)
- Placez votre téléphone/tablette comme second micro entre vous et le recruteur
- Ou utilisez l'entrée ligne si vous avez un adaptateur audio

---

## Raccourcis clavier

| Touche | Action |
|--------|--------|
| `Espace` | Pause / Reprendre l'écoute |
| `R` | Régénérer une alternative |
| `C` | Version courte de la réponse |
| `L` | Version longue de la réponse |
| `Échap` | Vider l'affichage |
| `Alt + H` | **Mode furtif** (écran blanc instantané) |

---

## Conseils d'utilisation discrète

### Configuration écran
- **Second écran** : placez Interview Copilot sur un écran non partagé
- **PiP (Picture-in-Picture)** : utilisez l'extension Chrome "Picture-in-Picture" pour une fenêtre flottante
- **Toujours au premier plan** : macOS → Terminal : `osascript -e 'tell application "System Events" to set frontmost of process "Google Chrome" to true'`

### En entretien visio
1. Partagez uniquement la fenêtre de votre application (pas tout l'écran)
2. Alt+H masque tout en 0 seconde si quelqu'un vous demande de partager l'écran complet
3. Police large → lisible d'un coup d'œil rapide sans bouger la tête

### Workflow recommandé
1. **Avant** : remplissez l'onboarding complet (30 min) + entraînez-vous avec le Mode Entraînement
2. **Pendant** : mode "Les deux" activé, ne lisez pas mot pour mot — utilisez les Points clés et Mots-clés
3. **Timer** : visible en permanence pour ne pas dépasser le temps de vos réponses

---

## Architecture

```
interview-copilot/
├── backend/
│   ├── routes/
│   │   ├── upload.js       → Parsing PDF/DOCX (pdf-parse + mammoth)
│   │   ├── claude.js       → Streaming réponses + évaluation
│   │   └── research.js     → Brief entreprise via Claude
│   ├── services/
│   │   ├── pdfParser.js    → Extraction texte
│   │   ├── contextManager.js → Session en mémoire + prompt builder
│   │   └── streamHandler.js  → SSE streaming
│   └── server.js
├── frontend/src/
│   ├── components/
│   │   ├── Onboarding/     → 3 étapes de configuration
│   │   ├── Dashboard/      → Interface principale
│   │   └── Training/       → Mode entraînement
│   ├── hooks/
│   │   ├── useSpeechRecognition.js  → Web Speech API
│   │   ├── useClaudeStream.js       → Streaming SSE
│   │   └── useKeyboardShortcuts.js  → Raccourcis globaux
│   ├── services/
│   │   ├── claudeApi.js      → Appels API backend
│   │   └── contextBuilder.js → Parsing réponses + KPIs
│   └── store/
│       └── interviewStore.js → Zustand global state
```

---

## Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `ANTHROPIC_API_KEY` | Clé API Anthropic (obligatoire) | — |
| `PORT` | Port du backend | `3001` |

---

## Navigateurs supportés

| Navigateur | Speech-to-Text | Streaming | Support |
|------------|---------------|-----------|---------|
| Chrome 90+ | ✅ | ✅ | ✅ Recommandé |
| Edge 90+ | ✅ | ✅ | ✅ |
| Firefox | ❌ | ✅ | ⚠️ Sans transcription |
| Safari | ⚠️ Partiel | ✅ | ⚠️ |

---

## Limitations du prototype

- La transcription audio fonctionne via **Web Speech API** (Chrome/Edge) — pas de loopback natif, configuration audio manuelle requise
- Le contexte est **en mémoire** : redémarrer le serveur efface la session
- Pas de persistance des entretiens (par design — discrétion)
- Whisper fallback non implémenté dans ce prototype (prévu pour v2)
