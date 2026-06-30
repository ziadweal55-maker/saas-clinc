import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './utils/apiBridge'
import './index.css'
import App from './App'
import { TenantProvider } from './hooks/useTenant'
import { LanguageProvider } from './hooks/useLanguage'

// Global override for window.confirm in Electron to prevent focus freeze bugs
if (window.api && !(window as any).isMobilePortal && window.api.confirm) {
  window.confirm = (message?: string) => {
    return (window.api as any).confirm(message);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TenantProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </TenantProvider>
  </StrictMode>,
)
