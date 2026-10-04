import { useState } from 'react'
import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router'
import { loginUser } from '../services/authService'
import StudyALogo from '../components/StudyALogo'
import ThemeToggle from '../components/ThemeToggle'


function Login() {
  const navigate = useNavigate()
  const location = useLocation()

  const verificationSuccess =
    location.state?.successMessage || ''

  const [email, setEmail] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [error, setError] =
    useState('')

  const [isLoading, setIsLoading] =
    useState(false)


  const handleSubmit = async (
    event
  ) => {
    event.preventDefault()

    setError('')

    const trimmedEmail =
      email.trim()

    if (
      !trimmedEmail ||
      !password
    ) {
      setError(
        'Please enter your email and password.'
      )

      return
    }

    try {
      setIsLoading(true)

      const response =
        await loginUser(
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
          'Login failed. Please try again.'
        )

        return
      }

      if (
        response.data.code ===
        'LOGIN_2FA_REQUIRED' &&
        response.data
          .challenge_token
      ) {
        const challengeToken =
          response.data
            .challenge_token

        sessionStorage.setItem(
          'pendingLoginChallenge',
          challengeToken
        )

        sessionStorage.setItem(
          'pendingLoginEmail',
          trimmedEmail
        )

        navigate(
          '/verify-login',
          {
            state: {
              email:
                trimmedEmail,

              retryAfter:
                response.data
                  .retry_after ||
                60,
            },
          }
        )

        return
      }

      if (
        response.data.token
      ) {
        navigate('/dashboard')
        return
      }

      setError(
        'Unable to complete sign in. Please try again.'
      )
    } catch (error) {
      console.error(
        'Login error:',
        error
      )

      setError(
        'Unable to connect to the server. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <main className="login-theme login-page relative flex min-h-screen items-center justify-center overflow-hidden bg-[#120928] px-4 py-10">
      <ThemeToggle />
      <style>
        {`
          /*
           * Login theme timing
           *
           * Text       = 100ms
           * Surfaces   = 500ms
           * Hover      = 300ms
           */

          .login-page {
            transition:
              background-color 500ms ease;
          }

          .login-theme h1,
          .login-theme p,
          .login-theme label,
          .login-theme span,
          .login-theme a {
            transition:
              color 100ms ease;
          }

          .login-card {
            transition:
              background-color 500ms ease,
              border-color 500ms ease,
              box-shadow 500ms ease;
          }

          .login-input {
            transition:
              color 100ms ease,
              background-color 500ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease,
              opacity 300ms ease;
          }

          .login-interactive {
            transition:
              color 100ms ease,
              background-color 300ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease,
              transform 300ms ease,
              opacity 300ms ease;
          }


          /*
           * -----------------------------------------------
           * LIGHT PAGE
           * -----------------------------------------------
           */

          [data-theme-mode='light']
          .login-page {
            background-color:
              #eff1f5 !important;
          }


          /*
           * Background glow
           */

          [data-theme-mode='light']
          .login-glow-primary {
            background-color:
              rgba(
                122,
                68,
                255,
                0.10
              ) !important;
          }

          [data-theme-mode='light']
          .login-glow-secondary {
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
          .login-heading {
            color:
              #171717 !important;
          }

          [data-theme-mode='light']
          .login-body {
            color:
              #65676b !important;
          }

          [data-theme-mode='light']
          .login-muted {
            color:
              #7a7575 !important;
          }

          [data-theme-mode='light']
          .login-label {
            color:
              #45424d !important;
          }

          [data-theme-mode='light']
          .login-link {
            color:
              #7a44ff !important;
          }

          [data-theme-mode='light']
          .login-link:hover {
            color:
              #6634e8 !important;
          }


          /*
           * Login card
           */

          [data-theme-mode='light']
          .login-card {
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
          .login-input {
            background-color:
              #ffffff !important;

            border-color:
              #d7d3df !important;

            color:
              #2b2b33 !important;
          }

          [data-theme-mode='light']
          .login-input::placeholder {
            color:
              #8a8793 !important;
          }

          [data-theme-mode='light']
          .login-input:hover:not(:disabled) {
            border-color:
              rgba(
                122,
                68,
                255,
                0.55
              ) !important;
          }

          [data-theme-mode='light']
          .login-input:focus {
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
          .login-input:disabled {
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
           * Verification success
           */

          [data-theme-mode='light']
          .login-success-panel {
            background-color:
              #dcfce7 !important;

            border-color:
              #86efac !important;
          }

          [data-theme-mode='light']
          .login-success-text {
            color:
              #166534 !important;
          }


          /*
           * Login error
           */

          [data-theme-mode='light']
          .login-error-panel {
            background-color:
              #fff7f7 !important;

            border-color:
              #fecaca !important;

            color:
              #b91c1c !important;
          }


          /*
           * Submit disabled
           */

          [data-theme-mode='light']
          .login-submit-button:disabled {
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


          /*
           * Divider
           */

          [data-theme-mode='light']
          .login-divider {
            background-color:
              #dfdfdf !important;
          }


          /*
           * Light focus ring offset
           */

          [data-theme-mode='light']
          .login-submit-button:focus {
            --tw-ring-offset-color:
              #ffffff !important;
          }
        `}
      </style>


      {/* Background glow */}
      <div
        aria-hidden="true"
        className="login-glow-primary pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#7A44FF]/20 blur-[120px]"
      />

      <div
        aria-hidden="true"
        className="login-glow-secondary pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#D83DFF]/15 blur-[120px]"
      />


      <div className="relative z-10 w-full max-w-md auth-page-transition">
        {/* Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <StudyALogo
              alt="Studya AI-Powered Study Notes"
              className="h-auto w-full max-w-[600px] object-contain"
            />
          </div>

          <h1 className="login-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Welcome Back
          </h1>

          <p className="login-body mx-auto mt-3 max-w-sm text-sm leading-6 text-[#898CC0]">
            Sign in to continue creating smarter study
            notes and learning materials.
          </p>
        </div>


        {/* Login card */}
        <div className="login-card rounded-2xl border border-[#2A1B4D] bg-[#160B32]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur sm:p-8">
          <form
            className="space-y-5"
            onSubmit={
              handleSubmit
            }
          >
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="login-label mb-2 block text-sm font-medium text-[#C2C4E4]"
              >
                Email Address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(
                  event
                ) => {
                  setEmail(
                    event.target.value
                  )

                  setError('')
                }}
                placeholder="Enter your email"
                autoComplete="email"
                disabled={isLoading}
                className="login-input w-full rounded-xl border border-[#2A1B4D] bg-[#120928] px-4 py-3 text-sm text-white outline-none placeholder:text-[#727494] hover:border-[#493475] focus:border-[#7A44FF] focus:ring-2 focus:ring-[#7A44FF]/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>


            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="login-label mb-2 block text-sm font-medium text-[#C2C4E4]"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(
                  event
                ) => {
                  setPassword(
                    event.target.value
                  )

                  setError('')
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isLoading}
                className="login-input w-full rounded-xl border border-[#2A1B4D] bg-[#120928] px-4 py-3 text-sm text-white outline-none placeholder:text-[#727494] hover:border-[#493475] focus:border-[#7A44FF] focus:ring-2 focus:ring-[#7A44FF]/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>


            {/* Forgot Password */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/forgot-password'
                  )
                }
                className="login-interactive login-link text-sm font-medium text-[#A784FF] hover:text-[#D3C3FF]"
              >
                Forgot password?
              </button>
            </div>


            {/* Email Verification Success */}
            {verificationSuccess && (
              <div
                className="login-card login-success-panel mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
                role="status"
              >
                <p className="login-success-text text-sm text-emerald-300">
                  {verificationSuccess}
                </p>
              </div>
            )}


            {/* Login Error */}
            {error && (
              <div
                className="login-card login-error-panel rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                role="alert"
              >
                {error}
              </div>
            )}


            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="login-interactive login-submit-button relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#7A44FF] to-[#D83DFF] px-4 py-3 font-semibold text-white shadow-[0_10px_30px_rgba(122,68,255,0.22)] hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(122,68,255,0.34)] focus:outline-none focus:ring-2 focus:ring-[#A784FF] focus:ring-offset-2 focus:ring-offset-[#160B32] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {isLoading
                ? 'Signing In...'
                : 'Sign In'}
            </button>
          </form>


          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="login-card login-divider h-px flex-1 bg-[#2A1B4D]" />

            <span className="login-muted text-xs uppercase tracking-wider text-[#727494]">
              New here?
            </span>

            <div className="login-card login-divider h-px flex-1 bg-[#2A1B4D]" />
          </div>


          {/* Register */}
          <p className="login-body text-center text-sm text-[#898CC0]">
            Don't have an account?{' '}

            <Link
              to="/register"
              className="login-interactive login-link font-semibold text-[#A784FF] hover:text-[#D3C3FF]"
            >
              Create Account
            </Link>
          </p>
        </div>


        <p className="login-muted mt-6 text-center text-xs text-[#727494]">
          AI-Powered Study Notes Generator
        </p>
      </div>
    </main>
  )
}


export default Login