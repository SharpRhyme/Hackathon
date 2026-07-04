import { createContext, useCallback, useContext, useEffect, useState } from 'react'

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

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

  const speak = useCallback((text) => {
    if (!text || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = settings.largeText ? 0.82 : 0.9
    utterance.pitch = 1
    window.speechSynthesis.speak(utterance)
  }, [settings.largeText])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
  }, [])

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
