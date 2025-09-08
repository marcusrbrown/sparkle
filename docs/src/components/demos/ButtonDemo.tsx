import React, {useState} from 'react'

/**
 * Demonstrates a button click interaction
 */
export function ButtonDemo() {
  const [clicked, setClicked] = useState(false)

  return (
    <div
      style={{
        padding: '1rem',
        border: '1px solid #ccc',
        borderRadius: '4px',
        background: '#f9f9f9',
      }}
    >
      <p>This is a simple React component for testing layout issues.</p>
      <button onClick={() => setClicked(!clicked)}>{clicked ? 'React is working!' : 'Test React Interactivity'}</button>
    </div>
  )
}
