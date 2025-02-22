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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
