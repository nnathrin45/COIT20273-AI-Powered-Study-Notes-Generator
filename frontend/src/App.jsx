import { Routes, Route, Navigate } from 'react-router'

import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  return (
    <Routes>

      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

    </Routes>
  )
}

export default App