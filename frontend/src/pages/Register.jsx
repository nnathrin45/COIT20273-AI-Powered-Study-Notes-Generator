import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { registerUser } from '../services/authService'
import studyaLogo from '../assets/studya-logo.png'

const isValidEmail = (email) => {
  const emailPattern =
    /^[A-Za-z0-9_%+-]+(?:\.[A-Za-z0-9_%+-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/

  return emailPattern.test(email)
}

function Register() {
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] =
    useState('')

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

    if (!isValidEmail(trimmedEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    if (password.length < 8) {
      setError(
        'Password must be at least 8 characters long.'
      )
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

      const verificationEmail =
        response.data?.email ||
        email.trim().toLowerCase()

      sessionStorage.setItem(
        'pendingVerificationEmail',
        verificationEmail
      )

      navigate('/verify-email', {
        state: {
          email: verificationEmail,
        },
      })

      setSuccess(
        response.data.message ||
          'Account created successfully.'
      )

      setFullName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')

    } catch (error) {
      console.error(
        'Registration error:',
        error
      )

      setError(
        'Unable to connect to the server. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const clearMessages = () => {
    setError('')
    setSuccess('')
  }

  const inputClass =
    'w-full rounded-xl border border-[#2A1B4D] bg-[#120928] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#727494] hover:border-[#493475] focus:border-[#7A44FF] focus:ring-2 focus:ring-[#7A44FF]/20 disabled:cursor-not-allowed disabled:opacity-60'

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
        <div className="mb-7 text-center">

          <div className="mx-auto mb-4 flex justify-center">
            <img
              src={studyaLogo}
              alt="Study AI - AI-Powered Study Notes"
              className="h-auto w-full max-w-[360px] object-contain"
            />
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Create Account
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#898CC0]">
            Create your account and start building
            smarter study materials.
          </p>

        </div>

        {/* Register card */}
        <div className="rounded-2xl border border-[#2A1B4D] bg-[#160B32]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur sm:p-8">

          <form
            className="space-y-5"
            onSubmit={handleSubmit}
          >

            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-[#C2C4E4]"
              >
                Full Name
              </label>

              <input
                id="name"
                type="text"
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value)
                  clearMessages()
                }}
                placeholder="Enter your full name"
                autoComplete="name"
                disabled={isLoading}
                className={inputClass}
              />
            </div>

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
                  clearMessages()
                }}
                placeholder="Enter your email"
                autoComplete="email"
                disabled={isLoading}
                className={inputClass}
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
                  clearMessages()
                }}
                placeholder="Create a password"
                autoComplete="new-password"
                disabled={isLoading}
                minLength={8}
                className={inputClass}
              />

              <p className="mt-2 text-xs text-[#727494]">
                Use at least 8 characters.
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-[#C2C4E4]"
              >
                Confirm Password
              </label>

              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(
                    event.target.value
                  )
                  clearMessages()
                }}
                placeholder="Confirm your password"
                autoComplete="new-password"
                minLength={8}
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            {error && (
              <div
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                role="alert"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
                role="status"
              >
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#7A44FF] to-[#D83DFF] px-4 py-3 font-semibold text-white shadow-[0_10px_30px_rgba(122,68,255,0.22)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(122,68,255,0.34)] focus:outline-none focus:ring-2 focus:ring-[#A784FF] focus:ring-offset-2 focus:ring-offset-[#160B32] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {isLoading
                ? 'Creating Account...'
                : 'Create Account'}
            </button>

          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#2A1B4D]" />

            <span className="text-xs uppercase tracking-wider text-[#727494]">
              Already registered?
            </span>

            <div className="h-px flex-1 bg-[#2A1B4D]" />
          </div>

          <p className="text-center text-sm text-[#898CC0]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-[#A784FF] transition hover:text-[#D3C3FF]"
            >
              Sign In
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

export default Register