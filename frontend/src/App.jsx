import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Palette, Play, Volume2, VolumeX } from 'lucide-react'
import { AccessibilityProvider, useAccessibility } from './context/AccessibilityContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import AccessibilityPanel from './components/AccessibilityPanel'
import AccountPanel from './components/AccountPanel'
import Mascot from './components/Mascot'
import Overview from './views/Overview'
import Blurt from './views/Blurt'
import Flashcards from './views/Flashcards'
import Exemplars from './views/Exemplars'
import TimedPractice from './views/TimedPractice'
import MindMap from './views/MindMap'
import Bookshelf from './views/Bookshelf'
import URLStudio from './views/URLStudio'
import TutorChat from './views/TutorChat'
import Interview from './views/Interview'
import Arcade from './views/Arcade'
import Paths from './views/Paths'
import Progress from './views/Progress'
import SubjectTools from './views/SubjectTools'
import { migrateLegacyData } from './lib/store'

migrateLegacyData()

const VIEW_LABELS = {
  dashboard: 'Home',
  blurt: 'Blurt Method',
  flashcards: 'Flashcards',
  exemplar: 'Exemplar Essays',
  timed: 'Timed Practice',
  mindmap: 'Mind Maps',
  cornell: 'Bookshelf',
  crawler: 'URL Studio',
  tutor: 'Study Chat',
  interview: 'Interview Simulator',
  paths: 'Adaptive Paths',
  progress: 'Progress',
  desmos: 'Graphing Calculator',
  whiteboard: 'Math Whiteboard',
  comprehension: 'Comprehension Practice',
  essay: 'Essay Planner',
  feedback: 'Essay Feedback',
  diagrams: 'Interactive Diagrams',
  labs: 'Virtual Labs',
  equations: 'Equation Solver',
  arcade: 'Break Room',
  accessibility: 'Accessibility',
  account: 'Account',
}

const SUBJECT_TOOL_VIEWS = new Set([
  'desmos',
  'whiteboard',
  'comprehension',
  'essay',
  'feedback',
  'diagrams',
  'labs',
  'equations',
])

function AppShell() {
  const [activeView, setActiveView] = useState('dashboard')
  const [showIntro, setShowIntro] = useState(() => localStorage.getItem('ld.shortcutsAcknowledged') !== 'true')
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [mascotOpen, setMascotOpen] = useState(false)
  const { settings, setSettings, speak, stopSpeaking, speaking, voices } = useAccessibility()
  const { user, loading: authLoading } = useAuth()
  const mainRef = useRef(null)

  const handleNavigate = useCallback((viewId) => {
    setActiveView(viewId)
    mainRef.current?.scrollTo({ top: 0 })
  }, [])

  const handleGlobalTts = useCallback(() => {
    if (speaking) {
      stopSpeaking()
      return
    }
    const label = VIEW_LABELS[activeView] || activeView
    const mainText = mainRef.current?.innerText?.slice(0, 2500) || ''
    speak(`${label}. ${mainText}`)
  }, [activeView, speak, stopSpeaking, speaking])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault()
        handleGlobalTts()
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault()
        setActiveView('accessibility')
      }
      if (e.ctrlKey && e.key === '1') {
        e.preventDefault()
        setActiveView('dashboard')
      }
      if (e.ctrlKey && e.key === '2') {
        e.preventDefault()
        setActiveView('tutor')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleGlobalTts])

  const rootClasses = [
    settings.theme && settings.theme !== 'porcelain' ? `theme-${settings.theme}` : '',
    settings.dyslexiaFont ? 'font-dyslexic' : 'font-sans',
    settings.highContrast ? 'high-contrast' : '',
    settings.colorblindMode !== 'none' ? `colorblind-${settings.colorblindMode}` : '',
    settings.adhdFocus ? 'adhd-focus' : '',
    settings.reducedMotion ? 'reduced-motion' : '',
    settings.largeText ? 'large-text' : '',
    settings.extraSpacing ? 'extra-spacing' : '',
    settings.readingGuide ? 'reading-guide' : '',
    settings.underlineLinks ? 'underline-links' : '',
    settings.reducedTransparency ? 'reduced-transparency' : '',
    settings.captionsMode ? 'captions-mode' : '',
    settings.wideFocusRing ? 'wide-focus-ring' : '',
    settings.readingWidth !== 'normal' ? `reading-width-${settings.readingWidth}` : '',
    settings.textAlign !== 'left' ? `text-align-${settings.textAlign}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  const renderView = () => {
    if (SUBJECT_TOOL_VIEWS.has(activeView)) return <SubjectTools viewId={activeView} />
    switch (activeView) {
      case 'account':
        return <AccountPanel />
      case 'accessibility':
        return <AccessibilityPanel />
      case 'blurt':
        return <Blurt />
      case 'flashcards':
        return <Flashcards />
      case 'exemplar':
        return <Exemplars />
      case 'timed':
        return <TimedPractice />
      case 'mindmap':
        return <MindMap />
      case 'cornell':
        return <Bookshelf />
      case 'crawler':
        return <URLStudio />
      case 'tutor':
        return <TutorChat />
      case 'interview':
        return <Interview />
      case 'arcade':
        return <Arcade />
      case 'paths':
        return <Paths />
      case 'progress':
        return <Progress />
      default:
        return <Overview onNavigate={handleNavigate} />
    }
  }

  return (
    <div
      className={`flex h-screen overflow-hidden bg-paper text-ink ${rootClasses}`}
      style={{
        '--font-sans': settings.fontSans && settings.fontSans !== 'System' ? `'${settings.fontSans}', system-ui, sans-serif` : `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif`,
        '--font-display': settings.fontDisplay && settings.fontDisplay !== 'System' ? `'${settings.fontDisplay}', system-ui, sans-serif` : `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif`,
      }}
    >
      {/* SVG filters for colorblind simulation */}
      <svg className="absolute h-0 w-0" aria-hidden="true">
        <defs>
          <filter id="protanopia-filter">
            <feColorMatrix type="matrix" values="0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0" />
          </filter>
          <filter id="deuteranopia-filter">
            <feColorMatrix type="matrix" values="0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0" />
          </filter>
          <filter id="tritanopia-filter">
            <feColorMatrix type="matrix" values="0.95,0.05,0,0,0 0,0.433,0.567,0,0 0,0.475,0.525,0,0 0,0,0,1,0" />
          </filter>
        </defs>
      </svg>

      <Sidebar activeView={activeView} onNavigate={handleNavigate} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="relative z-[70] flex h-[4.35rem] shrink-0 items-center justify-between border-b border-line/70 bg-paper/86 px-6 backdrop-blur-xl">
          <p className="truncate text-sm font-medium text-faint">
            {VIEW_LABELS[activeView] || activeView}
          </p>
          <div className="flex items-center gap-2">
            {settings.dyslexiaFont && <Badge>Dyslexic type</Badge>}
            {settings.highContrast && <Badge>High contrast</Badge>}
            {settings.adhdFocus && <Badge>Focus</Badge>}
            <div className="relative">
              <button
                type="button"
                onClick={() => setVoiceOpen((v) => !v)}
                className="hidden items-center gap-2 rounded-full border border-line bg-raised px-3 py-2 text-xs font-medium text-soft shadow-card transition-colors hover:bg-sunken hover:text-ink sm:flex"
                aria-label="Choose read aloud voice"
              >
                <Volume2 className="h-4 w-4" />
                Voice
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {voiceOpen && (
                <VoiceMenu
                  voices={voices}
                  settings={settings}
                  setSettings={setSettings}
                  speak={speak}
                  stopSpeaking={stopSpeaking}
                  onClose={() => setVoiceOpen(false)}
                />
              )}
            </div>
            <button
              type="button"
              onClick={handleGlobalTts}
              className={`grid h-10 w-10 place-items-center rounded-full border shadow-card transition-colors ${
                speaking
                  ? 'border-clay bg-clay-wash text-clay'
                  : 'border-line bg-raised text-faint hover:text-ink'
              }`}
              aria-label={speaking ? 'Stop reading this page aloud' : 'Read this page aloud'}
              title="Read page aloud (Ctrl+Space)"
            >
              {speaking ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            {user && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMascotOpen((v) => !v)}
                  className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-line bg-raised shadow-card transition-colors hover:bg-sunken"
                  aria-label="Customise mascot"
                  title="Customise mascot"
                >
                  <Mascot pose="wave" size={1.35} />
                </button>
                {mascotOpen && <MascotMenu settings={settings} setSettings={setSettings} />}
              </div>
            )}
            <button
              type="button"
              onClick={() => setActiveView('account')}
              className="flex max-w-44 items-center gap-2 truncate rounded-full border border-line bg-raised px-3 py-2 text-xs font-medium text-soft shadow-card transition-colors hover:bg-sunken hover:text-ink"
            >
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-clay text-[10px] font-bold text-white">
                {(user?.display_name || 'G')[0].toUpperCase()}
              </span>
              {authLoading ? 'Checking...' : user ? user.display_name : 'Log in'}
            </button>
          </div>
        </header>

        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto scrollbar-thin"
          id="main-content"
          tabIndex={-1}
        >
          {renderView()}
        </main>
      </div>
      {showIntro && (
        <ShortcutIntro
          onClose={() => {
            localStorage.setItem('ld.shortcutsAcknowledged', 'true')
            setShowIntro(false)
          }}
          onOpenAccessibility={() => {
            localStorage.setItem('ld.shortcutsAcknowledged', 'true')
            setShowIntro(false)
            setActiveView('accessibility')
          }}
        />
      )}
    </div>
  )
}

function VoiceMenu({ voices, settings, setSettings, speak, stopSpeaking }) {
  const preview = (voiceName) => {
    stopSpeaking()
    setSettings((s) => ({ ...s, ttsVoice: voiceName, ttsRate: Math.max(s.ttsRate || 1.25, 1.25) }))
    window.setTimeout(() => speak('This is the read aloud voice preview.'), 40)
  }

  return (
    <div className="absolute right-0 top-12 z-[80] w-80 rounded-2xl border border-line bg-raised p-3 shadow-lift">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Read aloud voice</p>
        <span className="text-[11px] text-faint">{Number(settings.ttsRate || 1.25).toFixed(2)}x</span>
      </div>
      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Speed</span>
        <input
          type="range"
          min="0.85"
          max="1.8"
          step="0.05"
          value={settings.ttsRate || 1.25}
          onChange={(e) => setSettings((s) => ({ ...s, ttsRate: Number(e.target.value) }))}
          className="mt-2 w-full accent-[rgb(var(--c-clay))]"
        />
      </label>
      <div className="mt-3 max-h-72 space-y-1 overflow-y-auto pr-1 scrollbar-thin">
        <VoiceRow
          active={!settings.ttsVoice}
          label="System default"
          sub="Fast browser voice"
          onPick={() => setSettings((s) => ({ ...s, ttsVoice: '' }))}
          onPreview={() => preview('')}
        />
        {voices.slice(0, 14).map((voice) => (
          <VoiceRow
            key={voice.name}
            active={settings.ttsVoice === voice.name}
            label={voice.name}
            sub={voice.lang}
            onPick={() => setSettings((s) => ({ ...s, ttsVoice: voice.name }))}
            onPreview={() => preview(voice.name)}
          />
        ))}
      </div>
    </div>
  )
}

function VoiceRow({ active, label, sub, onPick, onPreview }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl p-2 ${active ? 'bg-clay-wash' : 'hover:bg-sunken'}`}>
      <button type="button" onClick={onPick} className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
          {active && <Check className="h-3.5 w-3.5 text-clay" />} {label}
        </span>
        <span className="block truncate text-xs text-faint">{sub}</span>
      </button>
      <button type="button" onClick={onPreview} className="grid h-8 w-8 place-items-center rounded-full bg-raised text-soft shadow-card hover:text-ink" aria-label={`Preview ${label}`}>
        <Play className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function MascotMenu({ settings, setSettings }) {
  const swatches = {
    skin: ['#FFDABC', '#F2C4A7', '#D89A72', '#8F573A'],
    hair: ['#343A54', '#111827', '#7C4A2D', '#D6A548'],
    shirt: ['#0071E3', '#34C759', '#AF52DE', '#FF3B30'],
    scarf: ['#B0802C', '#FF9500', '#5AC8FA', '#FF2D55'],
  }
  return (
    <div className="absolute right-0 top-12 z-40 w-72 rounded-2xl border border-line bg-raised p-4 shadow-lift">
      <div className="flex items-center gap-3">
        <Mascot pose="wave" size={3.6} />
        <div>
          <p className="text-sm font-semibold text-ink">Your mascot</p>
          <p className="text-xs text-faint">Saved across the app.</p>
        </div>
      </div>
      <div className="mt-3 space-y-3">
        {Object.entries(swatches).map(([key, colors]) => (
          <div key={key}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">{key}</p>
            <div className="flex gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, mascot: { ...(s.mascot || {}), [key]: color } }))}
                  className={`h-7 w-7 rounded-full border shadow-card ${(settings.mascot || {})[key] === color ? 'ring-2 ring-clay ring-offset-2 ring-offset-raised' : 'border-line'}`}
                  style={{ backgroundColor: color }}
                  aria-label={`${key} ${color}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ShortcutIntro({ onClose, onOpenAccessibility }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/22 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-line bg-raised p-6 shadow-lift">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-clay-wash text-clay">
            <Palette className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">Accessibility shortcuts</h2>
            <p className="mt-2 text-sm leading-relaxed text-soft">
              Press <kbd className="rounded-md bg-sunken px-1.5 py-0.5 text-[11px] font-semibold">Ctrl</kbd> + <kbd className="rounded-md bg-sunken px-1.5 py-0.5 text-[11px] font-semibold">Space</kbd> anywhere to have the page read aloud.
              Press <kbd className="rounded-md bg-sunken px-1.5 py-0.5 text-[11px] font-semibold">Ctrl</kbd> + <kbd className="rounded-md bg-sunken px-1.5 py-0.5 text-[11px] font-semibold">Shift</kbd> + <kbd className="rounded-md bg-sunken px-1.5 py-0.5 text-[11px] font-semibold">A</kbd> to open accessibility settings.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onOpenAccessibility} className="rounded-xl px-4 py-2 text-sm font-medium text-soft hover:bg-sunken hover:text-ink">
            Open settings
          </button>
          <button type="button" onClick={onClose} className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white">
            Understood
          </button>
        </div>
      </div>
    </div>
  )
}

function Badge({ children }) {
  return (
    <span className="rounded-lg border border-line bg-raised px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-faint">
      {children}
    </span>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AccessibilityProvider>
        <AppShell />
      </AccessibilityProvider>
    </AuthProvider>
  )
}
