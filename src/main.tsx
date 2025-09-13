
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.tsx'
import './index.css'
import './styles/button-overrides.css'

const PUBLISHABLE_KEY = "pk_test_aGFybWxlc3Mtc3VuYmVhbS05OS5jbGVyay5hY2NvdW50cy5kZXYk";

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key")
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} signInFallbackRedirectUrl="/">
      <App />
    </ClerkProvider>
  </React.StrictMode>,
)
