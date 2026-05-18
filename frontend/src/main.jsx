import { StrictMode, useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { CacheProvider } from '@emotion/react'
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material'
import App from './App'
import { buildTheme } from './theme'
import rtlCache from './rtlCache'
import './index.css'

/**
 * Bridges the existing app ThemeContext (light/dark toggle) with MUI's ThemeProvider,
 * and wires up RTL via the Emotion cache + `dir="rtl"` on <html>.
 */
function ThemedApp({ children }) {
  const [mode, setMode] = useState(
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light'
  )

  useEffect(() => {
    // Ensure Arabic RTL on the document
    document.documentElement.setAttribute('dir', 'rtl')
    document.documentElement.setAttribute('lang', 'ar')

    // Watch for dark-class changes on <html> driven by ThemeContext
    const observer = new MutationObserver(() => {
      setMode(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const theme = useMemo(() => buildTheme(mode), [mode])

  return (
    <CacheProvider value={rtlCache}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </CacheProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemedApp>
      <App />
    </ThemedApp>
  </StrictMode>,
)
