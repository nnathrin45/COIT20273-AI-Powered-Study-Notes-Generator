import { useEffect, useState } from 'react'
import {
    Link,
    useLocation,
    useNavigate,
} from 'react-router'

import studyaLogo from '../assets/studya-logo.png'

import {
    resendLoginCode,
    verifyLoginCode,
} from '../services/authService'

function VerifyLogin() {
    const navigate = useNavigate()
    const location = useLocation()

    const [challengeToken, setChallengeToken] =
        useState(
            sessionStorage.getItem(
                'pendingLoginChallenge'
            ) || ''
        )

    const [email] = useState(
        location.state?.email ||
        sessionStorage.getItem(
            'pendingLoginEmail'
        ) ||
        ''
    )

    const [code, setCode] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const [loading, setLoading] =
        useState(false)

    const [resendLoading, setResendLoading] =
        useState(false)

    const [resendMessage, setResendMessage] =
        useState('')

    const [resendSeconds, setResendSeconds] =
        useState(
            Number(
                location.state?.retryAfter ?? 60
            )
        )

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

    useEffect(() => {
        if (!challengeToken) {
            navigate('/login', {
                replace: true,
                state: {
                    successMessage:
                        'Please sign in again to receive a new verification code.',
                },
            })
        }
    }, [challengeToken, navigate])

    const handleCodeChange = (event) => {
        const numericCode =
            event.target.value
                .replace(/\D/g, '')
                .slice(0, 6)

        setCode(numericCode)
        setError('')
        setSuccess('')
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        setError('')
        setSuccess('')
        setResendMessage('')

        if (!challengeToken) {
            setError(
                'Your sign-in verification session is missing. Please sign in again.'
            )
            return
        }

        if (!/^\d{6}$/.test(code)) {
            setError(
                'Please enter the 6-digit verification code.'
            )
            return
        }

        try {
            setLoading(true)

            const response =
                await verifyLoginCode(
                    challengeToken,
                    code
                )

            if (
                !response.ok ||
                response.data.status !== 'success'
            ) {
                if (
                    response.data.code ===
                    'LOGIN_CHALLENGE_EXPIRED' ||
                    response.data.code ===
                    'LOGIN_CODE_EXPIRED' ||
                    response.data.code ===
                    'LOGIN_CODE_ATTEMPTS_EXCEEDED'
                ) {
                    sessionStorage.removeItem(
                        'pendingLoginChallenge'
                    )

                    sessionStorage.removeItem(
                        'pendingLoginEmail'
                    )
                }

                setError(
                    response.data.message ||
                    'Unable to verify the sign-in code.'
                )

                return
            }

            sessionStorage.removeItem(
                'pendingLoginChallenge'
            )

            sessionStorage.removeItem(
                'pendingLoginEmail'
            )

            setCode('')

            setSuccess(
                'Sign-in verified successfully! Redirecting to your dashboard...'
            )

            setTimeout(() => {
                navigate('/dashboard', {
                    replace: true,
                })
            }, 1200)
        } catch (requestError) {
            console.error(
                'Login verification error:',
                requestError
            )

            setError(
                'Unable to connect to the server. Please try again.'
            )
        } finally {
            setLoading(false)
        }
    }

    const handleResend = async () => {
        setError('')
        setSuccess('')
        setResendMessage('')

        if (!challengeToken) {
            setError(
                'Your sign-in verification session is missing. Please sign in again.'
            )
            return
        }

        try {
            setResendLoading(true)

            const response =
                await resendLoginCode(
                    challengeToken
                )

            if (
                !response.ok ||
                response.data.status !== 'success'
            ) {
                if (
                    response.data.code ===
                    'LOGIN_RESEND_COOLDOWN'
                ) {
                    setResendSeconds(
                        Number(
                            response.data.retry_after ||
                            60
                        )
                    )
                }

                if (
                    response.data.code ===
                    'LOGIN_CHALLENGE_EXPIRED'
                ) {
                    sessionStorage.removeItem(
                        'pendingLoginChallenge'
                    )

                    sessionStorage.removeItem(
                        'pendingLoginEmail'
                    )
                }

                setError(
                    response.data.message ||
                    'Unable to resend the verification code.'
                )

                return
            }

            if (response.data.challenge_token) {
                setChallengeToken(
                    response.data.challenge_token
                )

                sessionStorage.setItem(
                    'pendingLoginChallenge',
                    response.data.challenge_token
                )
            }

            setCode('')

            setResendSeconds(
                Number(
                    response.data.retry_after || 60
                )
            )

            setResendMessage(
                response.data.message ||
                'A new sign-in verification code has been sent to your email.'
            )
        } catch (requestError) {
            console.error(
                'Login code resend error:',
                requestError
            )

            setError(
                'Unable to connect to the server. Please try again.'
            )
        } finally {
            setResendLoading(false)
        }
    }

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#120928] px-4 py-10">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#7A44FF]/20 blur-[120px]"
            />

            <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#D83DFF]/15 blur-[120px]"
            />

            <div className="relative z-10 w-full max-w-md auth-page-transition">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex justify-center">
                        <img
                            src={studyaLogo}
                            alt="Studya AI-Powered Study Notes"
                            className="h-auto w-full max-w-[600px] object-contain"
                        />
                    </div>

                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#A784FF]">
                        Two-Step Sign-In
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                        Verify your sign-in
                    </h1>

                    <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#898CC0]">
                        Enter the 6-digit verification
                        code we sent to your email to
                        complete your sign-in.
                    </p>
                </div>

                <div className="rounded-2xl border border-[#2A1B4D] bg-[#160B32]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur sm:p-8">
                    {email && (
                        <div className="mb-5 rounded-xl border border-[#2A1B4D] bg-[#120928] px-4 py-3">
                            <p className="text-xs uppercase tracking-wider text-[#727494]">
                                Verification code sent to
                            </p>

                            <p className="mt-1 break-all text-sm font-medium text-[#C2C4E4]">
                                {email}
                            </p>
                        </div>
                    )}

                    <form
                        className="space-y-5"
                        onSubmit={handleSubmit}
                    >
                        <div>
                            <label
                                htmlFor="login-code"
                                className="mb-2 block text-sm font-medium text-[#C2C4E4]"
                            >
                                Verification Code
                            </label>

                            <input
                                id="login-code"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                value={code}
                                onChange={handleCodeChange}
                                placeholder="Enter 6-digit code"
                                maxLength={6}
                                disabled={
                                    loading ||
                                    Boolean(success)
                                }
                                className="w-full rounded-xl border border-[#2A1B4D] bg-[#120928] px-4 py-3 text-center text-xl font-semibold tracking-[0.35em] text-white outline-none transition placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-[#727494] hover:border-[#493475] focus:border-[#7A44FF] focus:ring-2 focus:ring-[#7A44FF]/20 disabled:cursor-not-allowed disabled:opacity-60"
                            />

                            <p className="mt-2 text-xs text-[#727494]">
                                The code expires after 10
                                minutes.
                            </p>
                        </div>

                        {resendMessage && (
                            <div
                                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
                                role="status"
                            >
                                <p className="text-sm text-emerald-300">
                                    {resendMessage}
                                </p>
                            </div>
                        )}

                        {success && (
                            <div
                                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
                                role="status"
                            >
                                <p className="text-sm text-emerald-300">
                                    {success}
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
                            disabled={
                                loading ||
                                Boolean(success)
                            }
                            className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#7A44FF] to-[#D83DFF] px-4 py-3 font-semibold text-white shadow-[0_10px_30px_rgba(122,68,255,0.22)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(122,68,255,0.34)] focus:outline-none focus:ring-2 focus:ring-[#A784FF] focus:ring-offset-2 focus:ring-offset-[#160B32] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                        >
                            {success
                                ? 'Verified'
                                : loading
                                    ? 'Verifying...'
                                    : 'Verify Sign-In'}
                        </button>

                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={
                                resendLoading ||
                                resendSeconds > 0 ||
                                loading ||
                                Boolean(success)
                            }
                            className="w-full rounded-xl border border-[#493475] bg-[#120928] px-4 py-3 text-sm font-semibold text-[#C9B8FF] transition hover:border-[#7A44FF] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {resendLoading
                                ? 'Sending...'
                                : resendSeconds > 0
                                    ? `Resend code in ${resendSeconds}s`
                                    : 'Resend Sign-In Code'}
                        </button>
                    </form>

                    <div className="mt-6 border-t border-[#2A1B4D] pt-5 text-center">
                        <Link
                            to="/login"
                            onClick={() => {
                                sessionStorage.removeItem(
                                    'pendingLoginChallenge'
                                )

                                sessionStorage.removeItem(
                                    'pendingLoginEmail'
                                )
                            }}
                            className="text-sm font-medium text-[#A784FF] transition hover:text-[#D3C3FF]"
                        >
                            Back to Sign In
                        </Link>
                    </div>
                </div>

                <p className="mt-6 text-center text-xs text-[#727494]">
                    AI-Powered Study Notes Generator
                </p>
            </div>
        </main>
    )
}

export default VerifyLogin