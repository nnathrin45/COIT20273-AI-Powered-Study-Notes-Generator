import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router'

import StudyALogo from '../components/StudyALogo'
import ThemeToggle from '../components/ThemeToggle'

import {
  resendVerificationCode,
  verifyEmail,
} from '../services/authService'


function VerifyEmail() {
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState(
    location.state?.email ||
    sessionStorage.getItem(
      'pendingVerificationEmail'
    ) ||
    ''
  )

  const [code, setCode] =
    useState('')

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  const [
    resendSeconds,
    setResendSeconds,
  ] = useState(60)

  const [
    resendLoading,
    setResendLoading,
  ] = useState(false)

  const [
    resendMessage,
    setResendMessage,
  ] = useState('')


  useEffect(() => {
    if (resendSeconds <= 0) {
      return
    }

    const timer = setInterval(
      () => {
        setResendSeconds(
          (seconds) =>
            Math.max(
              seconds - 1,
              0
            )
        )
      },
      1000
    )

    return () =>
      clearInterval(timer)
  }, [resendSeconds])


  const handleCodeChange = (
    event
  ) => {
    const digitsOnly =
      event.target.value.replace(
        /\D/g,
        ''
      )

    setCode(
      digitsOnly.slice(0, 6)
    )

    if (error) {
      setError('')
    }
  }


  const handleResendCode =
    async () => {
      const cleanEmail =
        email
          .trim()
          .toLowerCase()

      setError('')
      setResendMessage('')

      if (!cleanEmail) {
        setError(
          'Please enter your email address before requesting another code.'
        )

        return
      }

      setResendLoading(true)

      try {
        const response =
          await resendVerificationCode(
            cleanEmail
          )

        if (!response.ok) {
          if (
            response.data?.code ===
            'VERIFICATION_RESEND_COOLDOWN'
          ) {
            setResendSeconds(
              response.data
                ?.retry_after || 60
            )
          }

          setError(
            response.data?.message ||
            'Unable to resend verification code.'
          )

          return
        }

        setResendSeconds(60)
        setCode('')

        setResendMessage(
          'A new verification code has been sent to your email.'
        )
      } catch (error) {
        console.error(
          'Resend verification error:',
          error
        )

        setError(
          'Unable to connect to the server. Please try again.'
        )
      } finally {
        setResendLoading(false)
      }
    }


  const handleSubmit = async (
    event
  ) => {
    event.preventDefault()

    setError('')
    setSuccess('')
    setResendMessage('')

    const cleanEmail =
      email
        .trim()
        .toLowerCase()

    if (!cleanEmail) {
      setError(
        'Please enter the email address you used to create your account.'
      )

      return
    }

    if (
      !/^\d{6}$/.test(code)
    ) {
      setError(
        'Please enter the 6-digit verification code.'
      )

      return
    }

    setLoading(true)

    try {
      const response =
        await verifyEmail(
          cleanEmail,
          code
        )

      if (!response.ok) {
        setError(
          response.data?.message ||
          'Unable to verify your email address.'
        )

        return
      }

      sessionStorage.removeItem(
        'pendingVerificationEmail'
      )

      setSuccess(
        'Email verified successfully! Redirecting you to sign in...'
      )

      setCode('')

      setTimeout(() => {
        navigate('/login', {
          replace: true,

          state: {
            successMessage:
              'Email verified successfully. You can now sign in.',
          },
        })
      }, 1800)
    } catch (error) {
      console.error(
        'Email verification error:',
        error
      )

      setError(
        'Unable to connect to the server. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }


  return (
    <main className="verify-email-theme verify-email-page relative min-h-screen overflow-hidden bg-[#0d061f] px-4 py-10 text-white">
      <style>
        {`
          /*
           * Verify Email theme timing
           *
           * Text       = 100ms
           * Surfaces   = 500ms
           * Hover      = 300ms
           */

          .verify-email-page {
            transition:
              background-color 500ms ease,
              color 100ms ease;
          }

          .verify-email-theme h1,
          .verify-email-theme p,
          .verify-email-theme label,
          .verify-email-theme span,
          .verify-email-theme a {
            transition:
              color 100ms ease;
          }

          .verify-email-card,
          .verify-email-panel {
            transition:
              background-color 500ms ease,
              border-color 500ms ease,
              box-shadow 500ms ease;
          }

          .verify-email-input {
            transition:
              color 100ms ease,
              background-color 500ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease,
              opacity 300ms ease;
          }

          .verify-email-interactive {
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
          .verify-email-page {
            background-color:
              #eff1f5 !important;

            color:
              #171717 !important;
          }


          /*
           * Soft background glow
           */

          .verify-email-glow-primary,
          .verify-email-glow-secondary {
            transition:
              background-color 500ms ease;
          }

          [data-theme-mode='light']
          .verify-email-glow-primary {
            background-color:
              rgba(
                122,
                68,
                255,
                0.10
              ) !important;
          }

          [data-theme-mode='light']
          .verify-email-glow-secondary {
            background-color:
              rgba(
                216,
                61,
                255,
                0.07
              ) !important;
          }


          /*
           * Main card
           */

          [data-theme-mode='light']
          .verify-email-card {
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
           * Typography
           */

          [data-theme-mode='light']
          .verify-email-heading {
            color:
              #171717 !important;
          }

          [data-theme-mode='light']
          .verify-email-body {
            color:
              #65676b !important;
          }

          [data-theme-mode='light']
          .verify-email-muted {
            color:
              #7a7575 !important;
          }

          [data-theme-mode='light']
          .verify-email-label {
            color:
              #45424d !important;
          }

          [data-theme-mode='light']
          .verify-email-accent {
            color:
              #7a44ff !important;
          }

          [data-theme-mode='light']
          .verify-email-link {
            color:
              #7a44ff !important;
          }

          [data-theme-mode='light']
          .verify-email-link:hover {
            color:
              #6634e8 !important;
          }


          /*
           * Inputs
           */

          [data-theme-mode='light']
          .verify-email-input {
            background-color:
              #ffffff !important;

            border-color:
              #d7d3df !important;

            color:
              #2b2b33 !important;
          }

          [data-theme-mode='light']
          .verify-email-input::placeholder {
            color:
              #8a8793 !important;
          }

          [data-theme-mode='light']
          .verify-email-input:hover:not(:disabled) {
            border-color:
              rgba(
                122,
                68,
                255,
                0.55
              ) !important;
          }

          [data-theme-mode='light']
          .verify-email-input:focus {
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
          .verify-email-input:disabled {
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
          .verify-email-error {
            background-color:
              #fff7f7 !important;

            border-color:
              #fecaca !important;
          }

          [data-theme-mode='light']
          .verify-email-error-text {
            color:
              #b91c1c !important;
          }


          /*
           * Success
           */

          [data-theme-mode='light']
          .verify-email-success {
            background-color:
              #dcfce7 !important;

            border-color:
              #86efac !important;
          }

          [data-theme-mode='light']
          .verify-email-success-text {
            color:
              #166534 !important;
          }


          /*
           * Resend message
           */

          [data-theme-mode='light']
          .verify-email-resend-success {
            color:
              #166534 !important;
          }


          /*
           * Resend disabled
           */

          [data-theme-mode='light']
          .verify-email-resend-button:disabled {
            color:
              #9a96a6 !important;
          }


          /*
           * Verify button disabled
           */

          [data-theme-mode='light']
          .verify-email-submit-button:disabled {
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
          .verify-email-divider {
            border-color:
              #dfdfdf !important;
          }
        `}
      </style>


      <ThemeToggle />


      {/* Background glow */}
      <div
        aria-hidden="true"
        className="verify-email-glow-primary pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#7A44FF]/15 blur-[120px]"
      />

      <div
        aria-hidden="true"
        className="verify-email-glow-secondary pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#D83DFF]/10 blur-[120px]"
      />


      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center auth-page-transition">
        <div className="verify-email-card w-full rounded-2xl border border-[#2a1b4d] bg-[#160b32] p-8 shadow-2xl shadow-purple-950/20">
          {/* Branding */}
          <div className="mb-8 text-center">
            <StudyALogo
              alt="StudyA"
              className="mx-auto mb-5 h-16 w-auto"
            />

            <p className="verify-email-accent mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#9c7cff]">
              Step 2 of 2
            </p>

            <h1 className="verify-email-heading text-2xl font-bold text-[#f3f0ff]">
              Verify your email
            </h1>

            <p className="verify-email-body mt-3 text-sm leading-6 text-[#898cc0]">
              We sent a 6-digit verification code
              to your email address. Enter it below
              to activate your StudyA account.
            </p>
          </div>


          {/* Error */}
          {error && (
            <div
              className="verify-email-panel verify-email-error mb-6 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
              role="alert"
            >
              <p className="verify-email-error-text text-sm text-red-300">
                {error}
              </p>
            </div>
          )}


          {/* Success */}
          {success && (
            <div
              className="verify-email-panel verify-email-success mb-6 rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-4"
              role="status"
            >
              <p className="verify-email-success-text text-sm text-emerald-300">
                {success}
              </p>
            </div>
          )}


          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Email */}
            <div>
              <label
                htmlFor="verification-email"
                className="verify-email-label mb-2 block text-sm font-medium text-[#c9b4ff]"
              >
                Email Address
              </label>

              <input
                id="verification-email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                autoComplete="email"
                disabled={!!success}
                className="verify-email-input w-full rounded-lg border border-[#2a1b4d] bg-[#120928] px-4 py-3 text-sm text-white outline-none placeholder:text-[#5f6285] focus:border-[#7a44ff] focus:ring-2 focus:ring-[#7a44ff]/20 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Enter your email address"
              />
            </div>


            {/* Code */}
            <div>
              <label
                htmlFor="verification-code"
                className="verify-email-label mb-2 block text-sm font-medium text-[#c9b4ff]"
              >
                Verification Code
              </label>

              <input
                id="verification-code"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={
                  handleCodeChange
                }
                maxLength={6}
                autoComplete="one-time-code"
                disabled={!!success}
                className="verify-email-input w-full rounded-lg border border-[#2a1b4d] bg-[#120928] px-4 py-4 text-center text-2xl font-bold tracking-[0.45em] text-white outline-none placeholder:text-[#5f6285] focus:border-[#7a44ff] focus:ring-2 focus:ring-[#7a44ff]/20 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="000000"
              />

              <p className="verify-email-muted mt-2 text-center text-xs text-[#727494]">
                The code expires after 10 minutes.
              </p>


              {/* Resend */}
              <div className="mt-4 text-center">
                {resendMessage && (
                  <p className="verify-email-resend-success mb-3 text-sm text-emerald-300">
                    {resendMessage}
                  </p>
                )}

                <button
                  type="button"
                  onClick={
                    handleResendCode
                  }
                  disabled={
                    resendSeconds > 0 ||
                    resendLoading ||
                    !!success
                  }
                  className="verify-email-interactive verify-email-link verify-email-resend-button text-sm font-semibold text-[#a984ff] hover:text-[#d83dff] disabled:cursor-not-allowed disabled:text-[#727494]"
                >
                  {resendLoading
                    ? 'Sending...'
                    : resendSeconds > 0
                      ? `Resend code in ${resendSeconds}s`
                      : 'Resend Verification Code'}
                </button>
              </div>
            </div>


            {/* Verify */}
            <button
              type="submit"
              disabled={
                loading ||
                !!success
              }
              className="verify-email-interactive verify-email-submit-button w-full rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#d83dff] px-5 py-3 text-sm font-semibold text-white hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {success
                ? 'Email Verified'
                : loading
                  ? 'Verifying...'
                  : 'Verify Email'}
            </button>
          </form>


          {/* Sign In */}
          <div className="verify-email-divider mt-7 border-t border-[#2a1b4d] pt-6 text-center">
            <p className="verify-email-body text-sm text-[#898cc0]">
              Already verified?{' '}

              <Link
                to="/login"
                className="verify-email-interactive verify-email-link font-semibold text-[#a984ff] hover:text-[#d83dff]"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}


export default VerifyEmail