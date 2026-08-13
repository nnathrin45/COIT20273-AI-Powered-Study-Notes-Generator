import { Navigate, Outlet } from 'react-router'
import { getAuthToken } from '../services/api'

function ProtectedRoute() {
  const token = getAuthToken()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute