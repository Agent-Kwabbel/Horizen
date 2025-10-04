import { useState } from 'react'
import './App.css'

import AuroraCanvas from "./components/AuroraCanvas.tsx"

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <main className="min-h-screen relative">
        <AuroraCanvas />
      </main>
    </>
  )
}

export default App
