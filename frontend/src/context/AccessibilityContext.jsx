import { createContext, useContext, useState, useCallback } from 'react'

const AccessibilityContext = createContext(null)

const defaultSettings = {
  dyslexiaFont: false,
  highContrast: false,
  colorblindMode: 'none',
  adhdFocus: false,
  ttsEnabled: false,
  sidebarCollapsed: false,
}

export function AccessibilityProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings)

  const toggle = useCallback((key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const setColorblindMode = useCallback((mode) => {
    setSettings((prev) => ({ ...prev, colorblindMode: mode }))
  }, [])

  const speak = useCallback((text) => {
    if (!text || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    window.speechSynthesis.speak(utterance)
  }, [])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
  }, [])

  return (
    <AccessibilityContext.Provider
      value={{ settings, toggle, setColorblindMode, speak, stopSpeaking, setSettings }}
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
