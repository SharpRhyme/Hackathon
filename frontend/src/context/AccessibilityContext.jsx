import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const AccessibilityContext = createContext(null)
const STORAGE_KEY = 'learndifferent.accessibility'

const defaultSettings = {
  dyslexiaFont: false,
  highContrast: false,
  colorblindMode: 'none',
  adhdFocus: false,
  ttsEnabled: false,
  sidebarCollapsed: false,
  reducedMotion: false,
  largeText: false,
  extraSpacing: false,
  readingGuide: false,
  underlineLinks: false,
  reducedTransparency: false,
  captionsMode: false,
  wideFocusRing: true,
  readingWidth: 'normal',
  textAlign: 'left',
  ttsRate: 1.25,
  ttsVoice: '',
  theme: 'porcelain',
  fontSans: 'System',
  fontDisplay: 'System',
  mascot: {
    skin: '#FFDABC',
    hair: '#343A54',
    shirt: '#0071E3',
    scarf: '#B0802C',
  },
}

// Splits long text into speakable chunks; long utterances get cut off in
// several browsers, so we queue sentence-sized pieces instead.
function chunkText(text, maxLen = 220) {
  const sentences = text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]*/g) || [text]
  const chunks = []
  let current = ''
  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen && current) {
      chunks.push(current.trim())
      current = ''
    }
    current += sentence
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

export function AccessibilityProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      return { ...defaultSettings, ...stored }
    } catch {
      return defaultSettings
    }
  })
  const [voices, setVoices] = useState([])
  const [speaking, setSpeaking] = useState(false)
  const speakSession = useRef(0)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    if (!window.speechSynthesis) return undefined
    const load = () => {
      const list = window.speechSynthesis.getVoices()
      if (list.length) {
        setVoices(list.filter((v) => v.lang.toLowerCase().startsWith('en')).concat(list.filter((v) => !v.lang.toLowerCase().startsWith('en'))))
      }
    }
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  const toggle = useCallback((key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const setColorblindMode = useCallback((mode) => {
    setSettings((prev) => ({ ...prev, colorblindMode: mode }))
  }, [])

  const setReadingWidth = useCallback((readingWidth) => {
    setSettings((prev) => ({ ...prev, readingWidth }))
  }, [])

  const setTextAlign = useCallback((textAlign) => {
    setSettings((prev) => ({ ...prev, textAlign }))
  }, [])

  const resetAccessibility = useCallback(() => {
    setSettings(defaultSettings)
  }, [])

  const stopSpeaking = useCallback(() => {
    speakSession.current += 1
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }, [])

  const speak = useCallback(
    (text, onEnd) => {
      const synth = window.speechSynthesis
      if (!text || !synth) {
        onEnd?.()
        return
      }
      synth.cancel()
      const session = ++speakSession.current
      const chunks = chunkText(String(text))
      const preferredVoice =
        voices.find((v) => v.name === settings.ttsVoice) ||
        voices.find((v) => /natural|online|premium|enhanced/i.test(v.name)) ||
        voices[0] ||
        null
      setSpeaking(true)

      chunks.forEach((chunk, i) => {
        const utterance = new SpeechSynthesisUtterance(chunk)
        utterance.rate = Math.min(Math.max(settings.ttsRate || 1.25, 0.65), 2)
        utterance.pitch = 1
        if (preferredVoice) utterance.voice = preferredVoice
        if (i === chunks.length - 1) {
          utterance.onend = () => {
            if (speakSession.current === session) {
              setSpeaking(false)
              onEnd?.()
            }
          }
        }
        synth.speak(utterance)
      })
    },
    [settings.ttsRate, settings.ttsVoice, voices],
  )

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        toggle,
        setColorblindMode,
        setReadingWidth,
        setTextAlign,
        resetAccessibility,
        speak,
        stopSpeaking,
        speaking,
        voices,
        setSettings,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext)
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider')
  return ctx
}

export default AccessibilityContext
