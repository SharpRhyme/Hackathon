import { useState, useEffect, useCallback, useRef } from 'react'
import { AccessibilityProvider, useAccessibility } from './context/AccessibilityContext'
import Sidebar from './components/Sidebar'
import AccessibilityPanel from './components/AccessibilityPanel'
import GeminiURLCrawler from './components/GeminiURLCrawler'
import BlurtMethod from './components/BlurtMethod'
import FeatureView from './components/FeatureView'

const VIEW_LABELS = {
  dashboard: 'Dashboard — your learning overview',
  blurt: 'Blurt Method — write everything you remember',
  flashcards: 'Flashcards with spaced repetition',
  exemplar: 'Exemplar essays for structure learning',
  timed: 'Timed practice sessions',
  mindmap: 'Mind map builder',
  cornell: 'Cornell notes template',
  crawler: 'URL Study Generator powered by Gemini',
  tutor: 'AI Socratic tutor',
  paths: 'Adaptive learning paths',
  progress: 'Progress dashboard',
  desmos: 'Desmos graphing calculator',
  whiteboard: 'Math step-by-step whiteboard',
  comprehension: 'Reading comprehension practice',
  essay: 'Essay planner scaffold',
  feedback: 'AI essay feedback',
  diagrams: 'Interactive science diagrams',
  labs: 'Virtual science labs',
  equations: 'Equation solver',
  accessibility: 'Accessibility settings panel',
}

function AppShell() {
  const [activeView, setActiveView] = useState('dashboard')
  const { settings, speak, stopSpeaking } = useAccessibility()
  const mainRef = useRef(null)

  const handleNavigate = useCallback((viewId) => {
    setActiveView(viewId)
  }, [])

  const handleGlobalTts = useCallback(() => {
    const label = VIEW_LABELS[activeView] || activeView
    const mainText = mainRef.current?.innerText?.slice(0, 1500) || ''
    if (window.speechSynthesis?.speaking) {
      stopSpeaking()
    } else {
      speak(`Current view: ${label}. ${mainText}`)
    }
  }, [activeView, speak, stopSpeaking])

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
        setActiveView('crawler')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleGlobalTts])

  const rootClasses = [
    settings.dyslexiaFont ? 'font-dyslexic' : 'font-sans',
    settings.highContrast ? 'high-contrast' : '',
    settings.colorblindMode !== 'none' ? `colorblind-${settings.colorblindMode}` : '',
    settings.adhdFocus ? 'adhd-focus' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const renderView = () => {
    switch (activeView) {
      case 'accessibility':
        return <AccessibilityPanel />
      case 'crawler':
        return <GeminiURLCrawler />
      case 'blurt':
        return <BlurtMethod />
      default:
        return <FeatureView viewId={activeView} />
    }
  }

  return (
    <div className={`flex h-screen overflow-hidden bg-zinc-950 text-zinc-300 ${rootClasses}`}>
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
        <header className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 backdrop-blur-sm">
          <p className="truncate text-xs text-zinc-500">
            {VIEW_LABELS[activeView] || activeView}
          </p>
          <div className="flex items-center gap-2">
            {settings.dyslexiaFont && (
              <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-500">
                Dyslexic
              </span>
            )}
            {settings.highContrast && (
              <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-500">
                High Contrast
              </span>
            )}
            {settings.adhdFocus && (
              <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-500">
                Focus
              </span>
            )}
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
    </div>
  )
}

export default function App() {
  return (
    <AccessibilityProvider>
      <AppShell />
    </AccessibilityProvider>
  )
}
