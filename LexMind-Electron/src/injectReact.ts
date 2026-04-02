import React from 'react'
import { createRoot } from 'react-dom/client'

// Make React available globally
window.React = React

export default function injectReact() {
  console.log('React injected globally')
}
