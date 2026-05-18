import React, { useEffect } from 'react'
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
  // useAppTheme is provided by ThemeContext inside <App />, so this component is rendered as a child.
  // We keep it simple: read the class on <html> to determine mode (set by ThemeContext).
  const [mode, setMode] = React.useState(
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light'
  );

  useEffect(() => {
    // Ensure Arabic RTL on the document
    document.documentElement.setAttribute('dir', 'rtl');
    document.documentElement.setAttribute('lang', 'ar');

    // Watch for dark-class changes on <html> driven by ThemeContext
    const observer = new MutationObserver(() => {
      setMode(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const theme = React.useMemo(() => buildTheme(mode), [mode]);

  return (
    <CacheProvider value={rtlCache}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </CacheProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemedApp>
      <App />
    </ThemedApp>
  </React.StrictMode>,
)
