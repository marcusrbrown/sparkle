import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'

// Development playground for UI components
function App() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Sparkle UI Development</h1>
      <div className="space-y-8">{/* Add your components here for testing */}</div>
    </div>
  )
}

const rootElement = document.querySelector('#root')
if (!rootElement) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
