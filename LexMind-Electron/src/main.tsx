import './injectReact'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ChatProvider } from './context/ChatContext'

const rootElement = document.getElementById('root')
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <ChatProvider>
        <App />
      </ChatProvider>
    </React.StrictMode>,
  )
}
