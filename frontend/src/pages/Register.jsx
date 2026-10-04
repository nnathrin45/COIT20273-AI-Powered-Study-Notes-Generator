import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { registerUser } from '../services/authService'
import StudyALogo from '../components/StudyALogo'
import ThemeToggle from '../components/ThemeToggle'


const isValidEmail = (email) => {
  const emailPattern =
    /^[A-Za-z0-9._%+-]+(?:\.[A-Za-z0-9._%+-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/

  return emailPattern.test(email)
}


function Register() {
  const navigate = useNavigate()

  const [fullName, setFullName] =
    useState('')

  const [email, setEmail] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('')

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const [isLoading, setIsLoading] =
    useState(false)


  const handleSubmit = async (
    event
  ) => {
    event.preventDefault()

    setError('')
    setSuccess('')

    const trimmedName =
      fullName.trim()

    const trimmedEmail =
      email.trim()

    if (
      !trimmedName ||
      !trimmedEmail ||
      !password ||
      !confirmPassword
    ) {
      setError(
        'Please complete all fields.'
      )

      return
    }

    if (
      !isValidEmail(
        trimmedEmail
      )
    ) {
      setError(
        'Please enter a valid email address.'
      )

      return
    }

    if (
      password.length < 8
    ) {
      setError(
        'Password must be at least 8 characters long.'
      )

      return
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        'Passwords do not match.'
      )

      return
    }

    try {
      setIsLoading(true)

      const response =
        await registerUser(
          trimmedName,
          trimmedEmail,
          password
        )

      if (
        !response.ok ||
        response.data.status !==
        'success'
      ) {
        setError(
          response.data.message ||
          'Registration failed. Please try again.'
        )

        return
      }

      const verificationEmail =
        response.data?.email ||
        email
          .trim()
          .toLowerCase()

      sessionStorage.setItem(
        'pendingVerificationEmail',
        verificationEmail
      )

      navigate(
        '/verify-email',
        {
          state: {
            email:
              verificationEmail,
          },
        }
      )

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
    'register-input w-full rounded-xl border border-[#2A1B4D] bg-[#120928] px-4 py-3 text-sm text-white outline-none placeholder:text-[#727494] hover:border-[#493475] focus:border-[#7A44FF] focus:ring-2 focus:ring-[#7A44FF]/20 disabled:cursor-not-allowed disabled:opacity-60'


  return (
    <main className="register-theme register-page relative flex min-h-screen items-center justify-center overflow-hidden bg-[#120928] px-4 py-10">
      <style>
        {`
          /*
           * Register theme timing
           *
           * Text       = 100ms
           * Surfaces   = 500ms
           * Hover      = 300ms
           */

          .register-page {
            transition:
              background-color 500ms ease;
          }

          .register-theme h1,
          .register-theme p,
          .register-theme label,
          .register-theme span,
          .register-theme a {
            transition:
              color 100ms ease;
          }

          .register-card {
            transition:
              background-color 500ms ease,
              border-color 500ms ease,
              box-shadow 500ms ease;
          }

          .register-input {
            transition:
              color 100ms ease,
              background-color 500ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease,
              opacity 300ms ease;
          }

          .register-interactive {
            transition:
              color 100ms ease,
              background-color 300ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease,
              transform 300ms ease,
              opacity 300ms ease;
          }


          /*
           * Page
           */

          [data-theme-mode='light']
          .register-page {
            background-color:
              #eff1f5 !important;
          }


          /*
           * Background glows
           */

          [data-theme-mode='light']
          .register-glow-primary {
            background-color:
              rgba(
                122,
                68,
                255,
                0.10
              ) !important;
          }

          [data-theme-mode='light']
          .register-glow-secondary {
            background-color:
              rgba(
                216,
                61,
                255,
                0.07
              ) !important;
          }


          /*
           * Typography
           */

          [data-theme-mode='light']
          .register-heading {
            color:
              #171717 !important;
          }

          [data-theme-mode='light']
          .register-body {
            color:
              #65676b !important;
          }

          [data-theme-mode='light']
          .register-muted {
            color:
              #7a7575 !important;
          }

          [data-theme-mode='light']
          .register-label {
            color:
              #45424d !important;
          }

          [data-theme-mode='light']
          .register-link {
            color:
              #7a44ff !important;
          }

          [data-theme-mode='light']
          .register-link:hover {
            color:
              #6634e8 !important;
          }


          /*
           * Registration card
           */

          [data-theme-mode='light']
          .register-card {
            background-color:
              rgba(
                255,
                255,
                255,
                0.97
              ) !important;

            border-color:
              #dfdfdf !important;

            box-shadow:
              0 24px 70px
              rgba(
                50,
                39,
                75,
                0.10
              ) !important;
          }


          /*
           * Inputs
           */

          [data-theme-mode='light']
          .register-input {
            background-color:
              #ffffff !important;

            border-color:
              #d7d3df !important;

            color:
              #2b2b33 !important;
          }

          [data-theme-mode='light']
          .register-input::placeholder {
            color:
              #8a8793 !important;
          }

          [data-theme-mode='light']
          .register-input:hover:not(:disabled) {
            border-color:
              rgba(
                122,
                68,
                255,
                0.55
              ) !important;
          }

          [data-theme-mode='light']
          .register-input:focus {
            border-color:
              #7a44ff !important;

            box-shadow:
              0 0 0 2px
              rgba(
                122,
                68,
                255,
                0.18
              ) !important;
          }

          [data-theme-mode='light']
          .register-input:disabled {
            background-color:
              #f1eff4 !important;

            border-color:
              #dfdfdf !important;

            color:
              #9a96a6 !important;

            opacity:
              1 !important;
          }


          /*
           * Error
           */

          [data-theme-mode='light']
          .register-error {
            background-color:
              #fff7f7 !important;

            border-color:
              #fecaca !important;

            color:
              #b91c1c !important;
          }


          /*
           * Success
           */

          [data-theme-mode='light']
          .register-success {
            background-color:
              #dcfce7 !important;

            border-color:
              #86efac !important;

            color:
              #166534 !important;
          }


          /*
           * Submit button
           */

          [data-theme-mode='light']
          .register-submit-button:disabled {
            background-image:
              none !important;

            background-color:
              #e6e3eb !important;

            color:
              #9a96a6 !important;

            box-shadow:
              none !important;

            opacity:
              1 !important;

            transform:
              none !important;
          }

          [data-theme-mode='light']
          .register-submit-button:focus {
            --tw-ring-offset-color:
              #ffffff !important;
          }


          /*
           * Divider
           */

          [data-theme-mode='light']
          .register-divider {
            background-color:
              #dfdfdf !important;
          }
        `}
      </style>


      {/* Light / Dark Mode */}
      <ThemeToggle />


      {/* Background glow */}
      <div
        aria-hidden="true"
        className="register-glow-primary pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#7A44FF]/20 blur-[120px]"
      />

      <div
        aria-hidden="true"
        className="register-glow-secondary pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#D83DFF]/15 blur-[120px]"
      />


      <div className="relative z-10 w-full max-w-md auth-page-transition">
        {/* Branding */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <StudyALogo
              alt="Study AI - AI-Powered Study Notes"
              className="h-auto w-full max-w-[360px] object-contain"
            />
          </div>

          <h1 className="register-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Create Account
          </h1>

          <p className="register-body mx-auto mt-3 max-w-sm text-sm leading-6 text-[#898CC0]">
            Create your account and start building
            smarter study materials.
          </p>
        </div>


        {/* Register card */}
        <div className="register-card rounded-2xl border border-[#2A1B4D] bg-[#160B32]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur sm:p-8">
          <form
            className="space-y-5"
            onSubmit={handleSubmit}
          >
            {/* Full Name */}
            <div>
              <label
                htmlFor="name"
                className="register-label mb-2 block text-sm font-medium text-[#C2C4E4]"
              >
                Full Name
              </label>

              <input
                id="name"
                type="text"
                value={fullName}
                onChange={(event) => {
                  setFullName(
                    event.target.value
                  )

                  clearMessages()
                }}
                placeholder="Enter your full name"
                autoComplete="name"
                disabled={isLoading}
                className={inputClass}
              />
            </div>


            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="register-label mb-2 block text-sm font-medium text-[#C2C4E4]"
              >
                Email Address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(
                    event.target.value
                  )

                  clearMessages()
                }}
                placeholder="Enter your email"
                autoComplete="email"
                disabled={isLoading}
                className={inputClass}
              />
            </div>


            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="register-label mb-2 block text-sm font-medium text-[#C2C4E4]"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(
                    event.target.value
                  )

                  clearMessages()
                }}
                placeholder="Create a password"
                autoComplete="new-password"
                disabled={isLoading}
                minLength={8}
                className={inputClass}
              />

              <p className="register-muted mt-2 text-xs text-[#727494]">
                Use at least 8 characters.
              </p>
            </div>


            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="register-label mb-2 block text-sm font-medium text-[#C2C4E4]"
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


            {/* Error */}
            {error && (
              <div
                className="register-card register-error rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                role="alert"
              >
                {error}
              </div>
            )}


            {/* Success */}
            {success && (
              <div
                className="register-card register-success rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
                role="status"
              >
                {success}
              </div>
            )}


            {/* Create Account */}
            <button
              type="submit"
              disabled={isLoading}
              className="register-interactive register-submit-button relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#7A44FF] to-[#D83DFF] px-4 py-3 font-semibold text-white shadow-[0_10px_30px_rgba(122,68,255,0.22)] hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(122,68,255,0.34)] focus:outline-none focus:ring-2 focus:ring-[#A784FF] focus:ring-offset-2 focus:ring-offset-[#160B32] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {isLoading
                ? 'Creating Account...'
                : 'Create Account'}
            </button>
          </form>


          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="register-card register-divider h-px flex-1 bg-[#2A1B4D]" />

            <span className="register-muted text-xs uppercase tracking-wider text-[#727494]">
              Already registered?
            </span>

            <div className="register-card register-divider h-px flex-1 bg-[#2A1B4D]" />
          </div>


          {/* Login */}
          <p className="register-body text-center text-sm text-[#898CC0]">
            Already have an account?{' '}

            <Link
              to="/login"
              className="register-interactive register-link font-semibold text-[#A784FF] hover:text-[#D3C3FF]"
            >
              Sign In
            </Link>
          </p>
        </div>


        <p className="register-muted mt-6 text-center text-xs text-[#727494]">
          AI-Powered Study Notes Generator
        </p>
      </div>
    </main>
  )
}


export default Register