import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { registerUser } from '../services/authService'

function Register() {
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')
    setSuccess('')

    const trimmedName = fullName.trim()
    const trimmedEmail = email.trim()

    if (
      !trimmedName ||
      !trimmedEmail ||
      !password ||
      !confirmPassword
    ) {
      setError('Please complete all fields.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    try {
      setIsLoading(true)

      const response = await registerUser(
        trimmedName,
        trimmedEmail,
        password
      )

      if (
        !response.ok ||
        response.data.status !== 'success'
      ) {
        setError(
          response.data.message ||
            'Registration failed. Please try again.'
        )
        return
      }

      setSuccess(
        response.data.message ||
          'Account created successfully.'
      )

      setFullName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')

      setTimeout(() => {
        navigate('/login')
      }, 1200)
    } catch (error) {
      console.error('Registration error:', error)

      setError(
        'Unable to connect to the server. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">

        <div className="text-center mb-8">

          <h1 className="text-3xl font-bold text-gray-900">
            Create Account
          </h1>

          <p className="mt-2 text-gray-600">
            Start creating smarter study materials
          </p>

        </div>

        <form
          className="space-y-5"
          onSubmit={handleSubmit}
        >

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Full Name
            </label>

            <input
              id="name"
              type="text"
              value={fullName}
              onChange={(event) =>
                setFullName(event.target.value)
              }
              placeholder="Enter your full name"
              autoComplete="name"
              disabled={isLoading}
              className="w-full rounded-lg border border-gray-300 px-4 py-3
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

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
              placeholder="Create a password"
              autoComplete="new-password"
              disabled={isLoading}
              className="w-full rounded-lg border border-gray-300 px-4 py-3
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirm Password
            </label>

            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder="Confirm your password"
              autoComplete="new-password"
              disabled={isLoading}
              className="w-full rounded-lg border border-gray-300 px-4 py-3
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {error && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
              role="status"
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg
                       font-medium hover:bg-blue-700 transition
                       disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isLoading
              ? 'Creating Account...'
              : 'Create Account'}
          </button>

        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-blue-600 font-medium hover:underline"
          >
            Sign In
          </Link>
        </p>

      </div>

    </main>
  )
}

export default Register