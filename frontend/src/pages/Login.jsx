import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { loginUser } from '../services/authService'

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')

    const trimmedEmail = email.trim()

    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.')
      return
    }

    try {
      setIsLoading(true)

      const response = await loginUser(
        trimmedEmail,
        password
      )

      if (
        !response.ok ||
        response.data.status !== 'success'
      ) {
        setError(
          response.data.message ||
            'Login failed. Please try again.'
        )
        return
      }

      navigate('/dashboard')
    } catch (error) {
      console.error('Login error:', error)

      setError(
        'Unable to connect to the server. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            AI Study Notes
          </h1>

          <p className="mt-2 text-gray-600">
            Sign in to continue your learning
          </p>
        </div>

        <form
          className="space-y-5"
          onSubmit={handleSubmit}
        >

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email Address
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Enter your email"
              autoComplete="email"
              disabled={isLoading}
              className="w-full rounded-lg border border-gray-300 px-4 py-3
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={isLoading}
              className="w-full rounded-lg border border-gray-300 px-4 py-3
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="text-sm text-blue-600 hover:underline"
            >
              Forgot password?
            </button>
          </div>

          {error && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg
                       font-medium hover:bg-blue-700 transition
                       disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>

        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-blue-600 font-medium hover:underline"
          >
            Create Account
          </Link>
        </p>

      </div>
    </main>
  )
}

export default Login