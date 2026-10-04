import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
} from 'react-router'

import StudyALogo from '../components/StudyALogo'
import ThemeToggle from '../components/ThemeToggle'

import {
  requestPasswordReset,
  resetUserPassword,
  verifyPasswordResetCode,
} from '../services/authService'


const waitForMinimumFeedback = async (
  startedAt,
  minimumMs = 2000
) => {
  const elapsedTime =
    Date.now() - startedAt

  const remainingTime = Math.max(
    0,
    minimumMs - elapsedTime
  )

  if (remainingTime > 0) {
    await new Promise((resolve) => {
      window.setTimeout(
        resolve,
        remainingTime
      )
    })
  }
}


const waitForNextPaint = () =>
  new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve)
    })
  })


function ForgotPassword() {
  const navigate = useNavigate()

  const [step, setStep] =
    useState('email')

  const [email, setEmail] =
    useState(
      sessionStorage.getItem(
        'pendingPasswordResetEmail'
      ) || ''
    )

  const [code, setCode] =
    useState('')

  const [resetToken, setResetToken] =
    useState('')

  const [newPassword, setNewPassword] =
    useState('')

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('')

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  const [
    resendLoading,
    setResendLoading,
  ] = useState(false)

  const [
    resendSeconds,
    setResendSeconds,
  ] = useState(0)

  const [
    resendMessage,
    setResendMessage,
  ] = useState('')


  useEffect(() => {
    if (resendSeconds <= 0) {
      return
    }

    const timer = window.setInterval(
      () => {
        setResendSeconds((seconds) =>
          Math.max(seconds - 1, 0)
        )
      },
      1000
    )

    return () =>
      window.clearInterval(timer)
  }, [resendSeconds])


  const handleCodeChange = (event) => {
    const numericCode =
      event.target.value
        .replace(/\D/g, '')
        .slice(0, 6)

    setCode(numericCode)
    setError('')
    setResendMessage('')
  }


  const handleRequestCode = async (
    event
  ) => {
    event.preventDefault()

    const cleanEmail =
      email.trim().toLowerCase()

    setError('')
    setSuccess('')
    setResendMessage('')

    if (!cleanEmail) {
      setError(
        'Please enter your email address.'
      )
      return
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailPattern.test(cleanEmail)) {
      setError(
        'Please enter a valid email address.'
      )
      return
    }

    const actionStartedAt = Date.now()

    setLoading(true)

    let response = null
    let requestErrorMessage = ''

    try {
      response =
        await requestPasswordReset(
          cleanEmail
        )
    } catch (requestError) {
      console.error(
        'Password reset request error:',
        requestError
      )

      requestErrorMessage =
        'Unable to connect to the server. Please try again.'
    }

    await waitForMinimumFeedback(
      actionStartedAt
    )

    setLoading(false)

    await waitForNextPaint()

    if (requestErrorMessage) {
      setError(
        requestErrorMessage
      )
      return
    }

    if (
      !response?.ok ||
      response.data?.status !==
      'success'
    ) {
      if (
        response?.data?.code ===
        'PASSWORD_RESET_COOLDOWN'
      ) {
        setResendSeconds(
          Number(
            response.data?.retry_after ||
            60
          )
        )
      }

      setError(
        response?.data?.message ||
        'Unable to request a password reset code.'
      )

      return
    }

    setEmail(cleanEmail)

    sessionStorage.setItem(
      'pendingPasswordResetEmail',
      cleanEmail
    )

    setCode('')
    setResendSeconds(60)
    setStep('code')
  }


  const handleVerifyCode = async (
    event
  ) => {
    event.preventDefault()

    setError('')
    setSuccess('')
    setResendMessage('')

    if (!/^\d{6}$/.test(code)) {
      setError(
        'Please enter the 6-digit reset code.'
      )
      return
    }

    const actionStartedAt = Date.now()

    setLoading(true)

    let response = null
    let requestErrorMessage = ''

    try {
      response =
        await verifyPasswordResetCode(
          email,
          code
        )
    } catch (requestError) {
      console.error(
        'Password reset verification error:',
        requestError
      )

      requestErrorMessage =
        'Unable to connect to the server. Please try again.'
    }

    await waitForMinimumFeedback(
      actionStartedAt
    )

    setLoading(false)

    await waitForNextPaint()

    if (requestErrorMessage) {
      setError(
        requestErrorMessage
      )
      return
    }

    if (
      !response?.ok ||
      response.data?.status !==
      'success'
    ) {
      if (
        response?.data?.code ===
        'PASSWORD_RESET_CODE_EXPIRED' ||
        response?.data?.code ===
        'PASSWORD_RESET_ATTEMPTS_EXCEEDED'
      ) {
        setResendSeconds(0)
      }

      setError(
        response?.data?.message ||
        'Unable to verify the reset code.'
      )

      return
    }

    if (!response.data?.reset_token) {
      setError(
        'Unable to start the password reset session. Please request a new code.'
      )
      return
    }

    setResetToken(
      response.data.reset_token
    )

    setCode('')
    setStep('password')
  }


  const handleResendCode = async () => {
    setError('')
    setResendMessage('')

    if (!email) {
      setError(
        'Please enter your email address again.'
      )
      setStep('email')
      return
    }

    const actionStartedAt = Date.now()

    setResendLoading(true)

    let response = null
    let requestErrorMessage = ''

    try {
      response =
        await requestPasswordReset(
          email
        )
    } catch (requestError) {
      console.error(
        'Password reset resend error:',
        requestError
      )

      requestErrorMessage =
        'Unable to connect to the server. Please try again.'
    }

    await waitForMinimumFeedback(
      actionStartedAt
    )

    setResendLoading(false)

    await waitForNextPaint()

    if (requestErrorMessage) {
      setError(
        requestErrorMessage
      )
      return
    }

    if (
      !response?.ok ||
      response.data?.status !==
      'success'
    ) {
      if (
        response?.data?.code ===
        'PASSWORD_RESET_COOLDOWN'
      ) {
        setResendSeconds(
          Number(
            response.data?.retry_after ||
            60
          )
        )
      }

      setError(
        response?.data?.message ||
        'Unable to send another reset code.'
      )

      return
    }

    setCode('')
    setResendSeconds(60)

    setResendMessage(
      'A new password reset code has been sent to your email.'
    )
  }


  const handleResetPassword = async (
    event
  ) => {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!resetToken) {
      setError(
        'Your password reset session is missing. Please request a new code.'
      )
      return
    }

    if (!newPassword) {
      setError(
        'Please enter a new password.'
      )
      return
    }

    if (newPassword.length < 8) {
      setError(
        'New password must be at least 8 characters long.'
      )
      return
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setError(
        'New password and confirmation do not match.'
      )
      return
    }

    const actionStartedAt = Date.now()

    setLoading(true)

    let response = null
    let requestErrorMessage = ''

    try {
      response =
        await resetUserPassword(
          resetToken,
          newPassword
        )
    } catch (requestError) {
      console.error(
        'Password reset error:',
        requestError
      )

      requestErrorMessage =
        'Unable to connect to the server. Please try again.'
    }

    await waitForMinimumFeedback(
      actionStartedAt
    )

    setLoading(false)

    await waitForNextPaint()

    if (requestErrorMessage) {
      setError(
        requestErrorMessage
      )
      return
    }

    if (
      !response?.ok ||
      response.data?.status !==
      'success'
    ) {
      setError(
        response?.data?.message ||
        'Unable to reset your password.'
      )

      return
    }

    setResetToken('')
    setNewPassword('')
    setConfirmPassword('')

    sessionStorage.removeItem(
      'pendingPasswordResetEmail'
    )

    setSuccess(
      'Your password has been reset successfully.'
    )

    setStep('success')
  }


  const restartReset = () => {
    setCode('')
    setResetToken('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess('')
    setResendMessage('')
    setResendSeconds(0)

    sessionStorage.removeItem(
      'pendingPasswordResetEmail'
    )

    setStep('email')
  }


  return (
    <main className="forgot-password-theme forgot-password-page relative flex min-h-screen items-center justify-center overflow-hidden bg-[#120928] px-4 py-10">
      <style>
        {`
          /*
           * Forgot Password theme timing
           *
           * Text       = 100ms
           * Surfaces   = 500ms
           * Hover      = 300ms
           */

          .forgot-password-page {
            transition:
              background-color 500ms ease;
          }

          .forgot-password-theme h1,
          .forgot-password-theme p,
          .forgot-password-theme label,
          .forgot-password-theme span,
          .forgot-password-theme a {
            transition:
              color 100ms ease;
          }

          .forgot-password-card,
          .forgot-password-panel {
            transition:
              background-color 500ms ease,
              border-color 500ms ease,
              box-shadow 500ms ease;
          }

          .forgot-password-input {
            transition:
              color 100ms ease,
              background-color 500ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease,
              opacity 300ms ease;
          }

          .forgot-password-interactive {
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
          .forgot-password-page {
            background-color:
              #eff1f5 !important;
          }


          /*
           * Background glows
           */

          [data-theme-mode='light']
          .forgot-password-glow-primary {
            background-color:
              rgba(
                122,
                68,
                255,
                0.10
              ) !important;
          }

          [data-theme-mode='light']
          .forgot-password-glow-secondary {
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
          .forgot-password-heading {
            color:
              #171717 !important;
          }

          [data-theme-mode='light']
          .forgot-password-body {
            color:
              #65676b !important;
          }

          [data-theme-mode='light']
          .forgot-password-muted {
            color:
              #7a7575 !important;
          }

          [data-theme-mode='light']
          .forgot-password-label {
            color:
              #45424d !important;
          }

          [data-theme-mode='light']
          .forgot-password-accent {
            color:
              #7a44ff !important;
          }

          [data-theme-mode='light']
          .forgot-password-link {
            color:
              #7a44ff !important;
          }

          [data-theme-mode='light']
          .forgot-password-link:hover {
            color:
              #6634e8 !important;
          }


          /*
           * Main card
           */

          [data-theme-mode='light']
          .forgot-password-card {
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
           * Email information panel
           */

          [data-theme-mode='light']
          .forgot-password-email-panel {
            background-color:
              #f7f7fb !important;

            border-color:
              #dfdfdf !important;
          }

          [data-theme-mode='light']
          .forgot-password-email {
            color:
              #45424d !important;
          }


          /*
           * Inputs
           */

          [data-theme-mode='light']
          .forgot-password-input {
            background-color:
              #ffffff !important;

            border-color:
              #d7d3df !important;

            color:
              #2b2b33 !important;
          }

          [data-theme-mode='light']
          .forgot-password-input::placeholder {
            color:
              #8a8793 !important;
          }

          [data-theme-mode='light']
          .forgot-password-input:hover:not(:disabled) {
            border-color:
              rgba(
                122,
                68,
                255,
                0.55
              ) !important;
          }

          [data-theme-mode='light']
          .forgot-password-input:focus {
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
          .forgot-password-input:disabled {
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
           * Errors
           */

          [data-theme-mode='light']
          .forgot-password-error {
            background-color:
              #fff7f7 !important;

            border-color:
              #fecaca !important;

            color:
              #b91c1c !important;
          }


          /*
           * Success / resend states
           */

          [data-theme-mode='light']
          .forgot-password-success {
            background-color:
              #dcfce7 !important;

            border-color:
              #86efac !important;
          }

          [data-theme-mode='light']
          .forgot-password-success-text {
            color:
              #166534 !important;
          }


          /*
           * Primary disabled buttons
           */

          [data-theme-mode='light']
          .forgot-password-primary:disabled {
            background-image:
              none !important;

            background-color:
              #e6e3eb !important;

            color:
              #9a96a6 !important;

            border-color:
              #dfdfdf !important;

            box-shadow:
              none !important;

            transform:
              none !important;
          }


          /*
           * Resend button
           */

          [data-theme-mode='light']
          .forgot-password-resend {
            background-color:
              #ffffff !important;

            border-color:
              #d7d3df !important;

            color:
              #6f42c1 !important;
          }

          [data-theme-mode='light']
          .forgot-password-resend:hover:not(:disabled) {
            background-color:
              rgba(
                122,
                68,
                255,
                0.07
              ) !important;

            border-color:
              rgba(
                122,
                68,
                255,
                0.55
              ) !important;

            color:
              #7a44ff !important;
          }

          [data-theme-mode='light']
          .forgot-password-resend:disabled {
            background-color:
              #f1eff4 !important;

            border-color:
              #dfdfdf !important;

            color:
              #9a96a6 !important;
          }


          /*
           * Start Over
           */

          [data-theme-mode='light']
          .forgot-password-start-over {
            color:
              #65676b !important;
          }

          [data-theme-mode='light']
          .forgot-password-start-over:hover:not(:disabled) {
            color:
              #171717 !important;
          }

          [data-theme-mode='light']
          .forgot-password-start-over:disabled {
            color:
              #aaa6b1 !important;

            opacity:
              1 !important;
          }


          /*
           * Divider
           */

          [data-theme-mode='light']
          .forgot-password-divider {
            border-color:
              #dfdfdf !important;
          }
        `}
      </style>


      <ThemeToggle />


      {/* Background glow */}
      <div
        aria-hidden="true"
        className="forgot-password-glow-primary pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#7A44FF]/20 blur-[120px]"
      />

      <div
        aria-hidden="true"
        className="forgot-password-glow-secondary pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#D83DFF]/15 blur-[120px]"
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

          <p className="forgot-password-accent mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#A784FF]">
            Password Recovery
          </p>

          <h1 className="forgot-password-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {step === 'email' &&
              'Forgot your password?'}

            {step === 'code' &&
              'Check your email'}

            {step === 'password' &&
              'Create a new password'}

            {step === 'success' &&
              'Password reset'}
          </h1>

          <p className="forgot-password-body mx-auto mt-3 max-w-sm text-sm leading-6 text-[#898CC0]">
            {step === 'email' &&
              'Enter your account email and we will send you a 6-digit password reset code.'}

            {step === 'code' &&
              'Enter the 6-digit password reset code sent to your email address.'}

            {step === 'password' &&
              'Choose a new password for your StudyA account.'}

            {step === 'success' &&
              'Your password has been updated successfully.'}
          </p>
        </div>


        {/* Main Card */}
        <div className="forgot-password-card rounded-2xl border border-[#2A1B4D] bg-[#160B32]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur sm:p-8">
          {/* Current Reset Email */}
          {step !== 'email' &&
            step !== 'success' &&
            email && (
              <div className="forgot-password-panel forgot-password-email-panel mb-5 rounded-xl border border-[#2A1B4D] bg-[#120928] px-4 py-3">
                <p className="forgot-password-muted text-xs uppercase tracking-wider text-[#727494]">
                  Password reset for
                </p>

                <p className="forgot-password-email mt-1 break-all text-sm font-medium text-[#C2C4E4]">
                  {email}
                </p>
              </div>
            )}


          {/* Error */}
          {error && (
            <div
              className="forgot-password-panel forgot-password-error mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              role="alert"
            >
              {error}
            </div>
          )}


          {/* Resend Success */}
          {resendMessage && (
            <div
              className="forgot-password-panel forgot-password-success mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
              role="status"
            >
              <p className="forgot-password-success-text text-sm text-emerald-300">
                {resendMessage}
              </p>
            </div>
          )}


          {/* Step 1 — Email */}
          {step === 'email' && (
            <form
              onSubmit={
                handleRequestCode
              }
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="reset-email"
                  className="forgot-password-label mb-2 block text-sm font-medium text-[#C2C4E4]"
                >
                  Email Address
                </label>

                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(
                      event.target.value
                    )

                    setError('')
                  }}
                  autoComplete="email"
                  placeholder="Enter your email address"
                  disabled={loading}
                  className="forgot-password-input w-full rounded-xl border border-[#2A1B4D] bg-[#120928] px-4 py-3 text-white outline-none placeholder:text-[#727494] hover:border-[#493475] focus:border-[#7A44FF] focus:ring-2 focus:ring-[#7A44FF]/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="forgot-password-interactive forgot-password-primary inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7A44FF] to-[#D83DFF] px-4 py-3 font-semibold text-white shadow-[0_10px_30px_rgba(122,68,255,0.22)] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:from-[#3a3150] disabled:to-[#3a3150] disabled:text-[#77718d] disabled:shadow-none disabled:hover:translate-y-0"
              >
                {loading && (
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-[#77718d]/40 border-t-[#c2c4e4]"
                  />
                )}

                {loading
                  ? 'Sending...'
                  : 'Send Reset Code'}
              </button>
            </form>
          )}


          {/* Step 2 — Code */}
          {step === 'code' && (
            <form
              onSubmit={
                handleVerifyCode
              }
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="reset-code"
                  className="forgot-password-label mb-2 block text-sm font-medium text-[#C2C4E4]"
                >
                  Reset Code
                </label>

                <input
                  id="reset-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={
                    handleCodeChange
                  }
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  disabled={loading}
                  className="forgot-password-input w-full rounded-xl border border-[#2A1B4D] bg-[#120928] px-4 py-3 text-center text-xl font-semibold tracking-[0.35em] text-white outline-none placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-[#727494] hover:border-[#493475] focus:border-[#7A44FF] focus:ring-2 focus:ring-[#7A44FF]/20 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <p className="forgot-password-muted mt-2 text-xs text-[#727494]">
                  The reset code expires
                  after 10 minutes.
                </p>
              </div>

              <button
                type="submit"
                disabled={
                  loading ||
                  resendLoading
                }
                className="forgot-password-interactive forgot-password-primary inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7A44FF] to-[#D83DFF] px-4 py-3 font-semibold text-white hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:from-[#3a3150] disabled:to-[#3a3150] disabled:text-[#77718d] disabled:shadow-none disabled:hover:translate-y-0"
              >
                {loading && (
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-[#77718d]/40 border-t-[#c2c4e4]"
                  />
                )}

                {loading
                  ? 'Verifying...'
                  : 'Verify Reset Code'}
              </button>

              <button
                type="button"
                onClick={
                  handleResendCode
                }
                disabled={
                  resendLoading ||
                  resendSeconds > 0 ||
                  loading
                }
                className="forgot-password-interactive forgot-password-resend inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#493475] bg-[#120928] px-4 py-3 text-sm font-semibold text-[#C9B8FF] hover:border-[#7A44FF] hover:text-white disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#3a3150] disabled:text-[#77718d]"
              >
                {resendLoading && (
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-[#77718d]/40 border-t-[#c2c4e4]"
                  />
                )}

                {resendLoading
                  ? 'Sending...'
                  : resendSeconds > 0
                    ? `Resend code in ${resendSeconds}s`
                    : 'Resend Reset Code'}
              </button>
            </form>
          )}


          {/* Step 3 — New Password */}
          {step === 'password' && (
            <form
              onSubmit={
                handleResetPassword
              }
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="new-reset-password"
                  className="forgot-password-label mb-2 block text-sm font-medium text-[#C2C4E4]"
                >
                  New Password
                </label>

                <input
                  id="new-reset-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(
                      event.target.value
                    )

                    setError('')
                  }}
                  autoComplete="new-password"
                  placeholder="Enter a new password"
                  disabled={loading}
                  className="forgot-password-input w-full rounded-xl border border-[#2A1B4D] bg-[#120928] px-4 py-3 text-white outline-none placeholder:text-[#727494] hover:border-[#493475] focus:border-[#7A44FF] focus:ring-2 focus:ring-[#7A44FF]/20 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <p className="forgot-password-muted mt-2 text-xs text-[#727494]">
                  Password must be at least
                  8 characters long.
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirm-reset-password"
                  className="forgot-password-label mb-2 block text-sm font-medium text-[#C2C4E4]"
                >
                  Confirm New Password
                </label>

                <input
                  id="confirm-reset-password"
                  type="password"
                  value={
                    confirmPassword
                  }
                  onChange={(event) => {
                    setConfirmPassword(
                      event.target.value
                    )

                    setError('')
                  }}
                  autoComplete="new-password"
                  placeholder="Confirm your new password"
                  disabled={loading}
                  className="forgot-password-input w-full rounded-xl border border-[#2A1B4D] bg-[#120928] px-4 py-3 text-white outline-none placeholder:text-[#727494] hover:border-[#493475] focus:border-[#7A44FF] focus:ring-2 focus:ring-[#7A44FF]/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="forgot-password-interactive forgot-password-primary inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7A44FF] to-[#D83DFF] px-4 py-3 font-semibold text-white hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:from-[#3a3150] disabled:to-[#3a3150] disabled:text-[#77718d] disabled:shadow-none disabled:hover:translate-y-0"
              >
                {loading && (
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-[#77718d]/40 border-t-[#c2c4e4]"
                  />
                )}

                {loading
                  ? 'Resetting...'
                  : 'Reset Password'}
              </button>
            </form>
          )}


          {/* Step 4 — Success */}
          {step === 'success' && (
            <div className="space-y-5">
              <div
                className="forgot-password-panel forgot-password-success rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4"
                role="status"
              >
                <p className="forgot-password-success-text text-sm text-emerald-300">
                  {success}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate('/login', {
                    replace: true,

                    state: {
                      successMessage:
                        'Password reset successfully. You can now sign in with your new password.',
                    },
                  })
                }
                className="forgot-password-interactive w-full rounded-xl bg-gradient-to-r from-[#7A44FF] to-[#D83DFF] px-4 py-3 font-semibold text-white hover:-translate-y-0.5"
              >
                Return to Sign In
              </button>
            </div>
          )}


          {/* Navigation */}
          {step !== 'success' && (
            <div className="forgot-password-divider mt-6 border-t border-[#2A1B4D] pt-5 text-center">
              {step !== 'email' && (
                <button
                  type="button"
                  onClick={
                    restartReset
                  }
                  disabled={
                    loading ||
                    resendLoading
                  }
                  className="forgot-password-interactive forgot-password-start-over mb-4 block w-full text-sm font-medium text-[#898CC0] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Start Over
                </button>
              )}

              <Link
                to="/login"
                className="forgot-password-interactive forgot-password-link text-sm font-medium text-[#A784FF] hover:text-[#D3C3FF]"
              >
                Back to Sign In
              </Link>
            </div>
          )}
        </div>


        <p className="forgot-password-muted mt-6 text-center text-xs text-[#727494]">
          AI-Powered Study Notes Generator
        </p>
      </div>
    </main>
  )
}


export default ForgotPassword