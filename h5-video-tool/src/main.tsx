import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// 当 VITE_GOOGLE_CLIENT_ID 为空时，跳过 GoogleOAuthProvider，避免崩溃导致黑屏
const AppWithOptionalGoogle = clientId
  ? (
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  )
  : <App />

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {AppWithOptionalGoogle}
  </StrictMode>,
)
