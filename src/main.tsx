import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { preload } from '@imgly/background-removal'
import './index.css'
import App from './App.tsx'

preload({ model: 'isnet_quint8' }).catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
