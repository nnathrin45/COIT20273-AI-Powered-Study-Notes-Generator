import { Navigate, Route, Routes } from 'react-router'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ComingSoon from './pages/ComingSoon'
import AppLayout from './components/AppLayout'
import Upload from './pages/Upload'
import Summary from './pages/Summary'
import Flashcards from './pages/Flashcards'

function App() {
  return (
    <Routes>

      {/* Authentication */}
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

      {/* Main application */}
      <Route element={<AppLayout />}>

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/upload"
          element={<Upload />}
        />

        <Route
          path="/summaries"
          element={<Summary />}
        />

        <Route
          path="/flashcards"
          element={<Flashcards />}
        />

        <Route
          path="/quiz"
          element={<ComingSoon title="Practice Quiz" />}
        />

        <Route
          path="/explanation"
          element={<ComingSoon title="Concept Explanation" />}
        />

        <Route
          path="/study-plan"
          element={<ComingSoon title="Study Planner" />}
        />

        <Route
          path="/saved-materials"
          element={<ComingSoon title="Saved Materials" />}
        />

        <Route
          path="/progress"
          element={<ComingSoon title="Progress" />}
        />

      </Route>

    </Routes>
  )
}

export default App