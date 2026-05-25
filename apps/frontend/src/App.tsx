import { Route, Routes } from 'react-router-dom'

function App() {
  return (
    <Routes>
      <Route path="/" element={<div className="p-8 text-2xl font-bold">Kartex</div>} />
    </Routes>
  )
}

export default App
