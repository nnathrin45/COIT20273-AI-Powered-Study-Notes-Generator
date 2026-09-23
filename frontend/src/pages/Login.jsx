import { useState } from 'react'
import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router'
import { loginUser } from '../services/authService'
import studyaLogo from '../assets/studya-logo.png'

function Login() {

  const navigate = useNavigate()
  const location = useLocation()

  const verificationSuccess =
    location.state?.successMessage || ''

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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#120928] px-4 py-10">

      {/* Background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#7A44FF]/20 blur-[120px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#D83DFF]/15 blur-[120px]"
      />

      <div className="relative z-10 w-full max-w-md auth-page-transition">

        {/* Branding */}
        <div className="mb-8 text-center">

          <div className="mx-auto mb-4 flex justify-center">
            <img
              src={studyaLogo}
              alt="Studya AI-Powered Study Notes"
              className="h-auto w-full max-w-[600px] object-contain"
            />
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Welcome Back
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#898CC0]">
            Sign in to continue creating smarter study
            notes and learning materials.
          </p>

        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-[#2A1B4D] bg-[#160B32]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur sm:p-8">

          <form
            className="space-y-5"
            onSubmit={handleSubmit}
          >

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-[#C2C4E4]"
              >
                Email Address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError('')
                }}
                placeholder="Enter your email"
                autoComplete="email"
                disabled={isLoading}
                className="w-full rounded-xl border border-[#2A1B4D] bg-[#120928] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#727494] hover:border-[#493475] focus:border-[#7A44FF] focus:ring-2 focus:ring-[#7A44FF]/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-[#C2C4E4]"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setError('')
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isLoading}
                className="w-full rounded-xl border border-[#2A1B4D] bg-[#120928] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#727494] hover:border-[#493475] focus:border-[#7A44FF] focus:ring-2 focus:ring-[#7A44FF]/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm font-medium text-[#A784FF] transition hover:text-[#D3C3FF]"
              >
                Forgot password?
              </button>
            </div>

            {verificationSuccess && (
              <div
                className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
                role="status"
              >
                <p className="text-sm text-emerald-300">
                  {verificationSuccess}
                </p>
              </div>
            )}

            {error && (
              <div
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#7A44FF] to-[#D83DFF] px-4 py-3 font-semibold text-white shadow-[0_10px_30px_rgba(122,68,255,0.22)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(122,68,255,0.34)] focus:outline-none focus:ring-2 focus:ring-[#A784FF] focus:ring-offset-2 focus:ring-offset-[#160B32] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {isLoading
                ? 'Signing In...'
                : 'Sign In'}
            </button>

          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#2A1B4D]" />
            <span className="text-xs uppercase tracking-wider text-[#727494]">
              New here?
            </span>
            <div className="h-px flex-1 bg-[#2A1B4D]" />
          </div>

          <p className="text-center text-sm text-[#898CC0]">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-[#A784FF] transition hover:text-[#D3C3FF]"
            >
              Create Account
            </Link>
          </p>

        </div>

        <p className="mt-6 text-center text-xs text-[#727494]">
          AI-Powered Study Notes Generator
        </p>

      </div>

    </main>
  )
}

export default Login