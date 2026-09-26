import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router'

import studyaLogo from '../assets/studya-logo.png'

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

  const [code, setCode] = useState('')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [loading, setLoading] = useState(false)

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

    const timer = setInterval(() => {
      setResendSeconds((seconds) =>
        Math.max(seconds - 1, 0)
      )
    }, 1000)

    return () => clearInterval(timer)
  }, [resendSeconds])

  const handleCodeChange = (event) => {
    const digitsOnly =
      event.target.value.replace(/\D/g, '')

    setCode(digitsOnly.slice(0, 6))

    if (error) {
      setError('')
    }
  }

  const handleResendCode = async () => {
    const cleanEmail = email
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
            response.data?.retry_after || 60
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

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')
    setSuccess('')
    setResendMessage('')

    const cleanEmail = email
      .trim()
      .toLowerCase()

    if (!cleanEmail) {
      setError(
        'Please enter the email address you used to create your account.'
      )
      return
    }

    if (!/^\d{6}$/.test(code)) {
      setError(
        'Please enter the 6-digit verification code.'
      )
      return
    }

    setLoading(true)

    try {
      const response = await verifyEmail(
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
    <div className="min-h-screen bg-[#0d061f] px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">

        <div className="w-full rounded-2xl border border-[#2a1b4d] bg-[#160b32] p-8 shadow-2xl shadow-purple-950/20">

          <div className="mb-8 text-center">

            <img
              src={studyaLogo}
              alt="StudyA"
              className="mx-auto mb-5 h-16 w-auto"
            />

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#9c7cff]">
              Step 2 of 2
            </p>

            <h1 className="text-2xl font-bold text-[#f3f0ff]">
              Verify your email
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#898cc0]">
              We sent a 6-digit verification code
              to your email address. Enter it below
              to activate your StudyA account.
            </p>

          </div>

          {error && (
            <div
              className="mb-6 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
              role="alert"
            >
              <p className="text-sm text-red-300">
                {error}
              </p>
            </div>
          )}

          {success && (
            <div
              className="mb-6 rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-4"
              role="status"
            >
              <p className="text-sm text-emerald-300">
                {success}
              </p>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >

            <div>
              <label
                htmlFor="verification-email"
                className="mb-2 block text-sm font-medium text-[#c9b4ff]"
              >
                Email Address
              </label>

              <input
                id="verification-email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoComplete="email"
                disabled={!!success}
                className="w-full rounded-lg border border-[#2a1b4d] bg-[#120928] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#5f6285] focus:border-[#7a44ff] focus:ring-2 focus:ring-[#7a44ff]/20 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <label
                htmlFor="verification-code"
                className="mb-2 block text-sm font-medium text-[#c9b4ff]"
              >
                Verification Code
              </label>

              <input
                id="verification-code"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={handleCodeChange}
                maxLength={6}
                autoComplete="one-time-code"
                disabled={!!success}
                className="w-full rounded-lg border border-[#2a1b4d] bg-[#120928] px-4 py-4 text-center text-2xl font-bold tracking-[0.45em] text-white outline-none transition placeholder:text-[#5f6285] focus:border-[#7a44ff] focus:ring-2 focus:ring-[#7a44ff]/20 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="000000"
              />

              <p className="mt-2 text-center text-xs text-[#727494]">
                The code expires after 10 minutes.
              </p>

              <div className="mt-4 text-center">

                {resendMessage && (
                  <p className="mb-3 text-sm text-emerald-300">
                    {resendMessage}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={
                    resendSeconds > 0 ||
                    resendLoading ||
                    !!success
                  }
                  className="text-sm font-semibold text-[#a984ff] transition hover:text-[#d83dff] disabled:cursor-not-allowed disabled:text-[#727494]"
                >
                  {resendLoading
                    ? 'Sending...'
                    : resendSeconds > 0
                      ? `Resend code in ${resendSeconds}s`
                      : 'Resend Verification Code'}
                </button>

              </div>

            </div>

            <button
              type="submit"
              disabled={
                loading ||
                !!success
              }
              className="w-full rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#d83dff] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {success
                ? 'Email Verified'
                : loading
                  ? 'Verifying...'
                  : 'Verify Email'}
            </button>

          </form>

          <div className="mt-7 border-t border-[#2a1b4d] pt-6 text-center">

            <p className="text-sm text-[#898cc0]">
              Already verified?{' '}
              <Link
                to="/login"
                className="font-semibold text-[#a984ff] transition hover:text-[#d83dff]"
              >
                Sign in
              </Link>
            </p>

          </div>

        </div>

      </div>
    </div>
  )
}

export default VerifyEmail