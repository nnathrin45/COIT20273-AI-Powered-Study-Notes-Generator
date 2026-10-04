import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  updateConsentStatus,
} from '../services/consentService'


function FirstLoginConsentModal({
  onResolved,
}) {
  const [visible, setVisible] =
    useState(false)

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  const dialogRef = useRef(null)


  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow

    document.body.style.overflow =
      'hidden'

    const animationFrame =
      window.requestAnimationFrame(
        () => {
          setVisible(true)
          dialogRef.current?.focus()
        }
      )

    return () => {
      window.cancelAnimationFrame(
        animationFrame
      )

      document.body.style.overflow =
        previousOverflow
    }
  }, [])


  const handleDecision = async (
    status
  ) => {
    if (loading) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response =
        await updateConsentStatus(
          status
        )

      if (!response.ok) {
        if (
          response.status === 401
        ) {
          setError(
            'Your login session is missing or invalid. Please sign in again.'
          )
        } else {
          setError(
            response.data?.message ||
              'Unable to save your AI consent preference.'
          )
        }

        return
      }

      const resolvedStatus =
        response.data?.consent
          ?.status ?? status

      setVisible(false)

      window.setTimeout(() => {
        onResolved(
          resolvedStatus
        )
      }, 300)
    } catch (decisionError) {
      console.error(
        'First-login consent update error:',
        decisionError
      )

      setError(
        'Unable to connect to the server to save your AI consent preference.'
      )
    } finally {
      setLoading(false)
    }
  }


  const handleKeyDown = (
    event
  ) => {
    if (event.key !== 'Tab') {
      return
    }

    const focusableElements =
      dialogRef.current?.querySelectorAll(
        'button:not([disabled])'
      )

    if (
      !focusableElements?.length
    ) {
      return
    }

    const firstElement =
      focusableElements[0]

    const lastElement =
      focusableElements[
        focusableElements.length - 1
      ]

    if (
      event.shiftKey &&
      document.activeElement ===
        firstElement
    ) {
      event.preventDefault()
      lastElement.focus()
    } else if (
      !event.shiftKey &&
      document.activeElement ===
        lastElement
    ) {
      event.preventDefault()
      firstElement.focus()
    }
  }


  return (
    <div
      className={`first-consent-theme first-consent-overlay fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 transition-all duration-300 ${
        visible
          ? 'bg-[#080313]/65 backdrop-blur-md'
          : 'bg-transparent backdrop-blur-none'
      }`}
    >
      <style>
        {`
          /*
           * First-login consent modal
           *
           * Text       = 100ms
           * Surfaces   = 500ms
           * Hover      = 300ms
           * Modal      = existing 300ms
           */

          .first-consent-theme h2,
          .first-consent-theme p,
          .first-consent-theme span {
            transition:
              color 100ms ease;
          }


          .first-consent-dialog,
          .first-consent-info-panel {
            transition:
              background-color 500ms ease,
              border-color 500ms ease,
              box-shadow 500ms ease,
              transform 300ms ease,
              opacity 300ms ease;
          }


          .first-consent-interactive {
            transition:
              color 100ms ease,
              background-color 300ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease,
              filter 300ms ease,
              opacity 300ms ease,
              transform 300ms ease;
          }


          /*
           * -----------------------------------------------
           * OVERLAY
           * -----------------------------------------------
           */

          [data-theme-mode='light']
          .first-consent-overlay.bg-\\[\\#080313\\]\\/65 {
            background-color:
              rgba(
                31,
                24,
                43,
                0.38
              ) !important;
          }


          /*
           * -----------------------------------------------
           * MAIN MODAL
           * -----------------------------------------------
           */

          [data-theme-mode='light']
          .first-consent-dialog {
            background-color:
              rgba(
                255,
                255,
                255,
                0.98
              ) !important;

            border-color:
              #dfdfdf !important;

            box-shadow:
              0 28px 80px
              rgba(
                38,
                28,
                58,
                0.18
              ) !important;
          }


          /*
           * -----------------------------------------------
           * HEADING
           * -----------------------------------------------
           */

          [data-theme-mode='light']
          .first-consent-heading {
            color:
              #171717 !important;
          }


          [data-theme-mode='light']
          .first-consent-body {
            color:
              #65676b !important;
          }


          [data-theme-mode='light']
          .first-consent-muted {
            color:
              #7a7575 !important;
          }


          [data-theme-mode='light']
          .first-consent-accent {
            color:
              #7a44ff !important;
          }


          /*
           * -----------------------------------------------
           * SHIELD ICON
           * -----------------------------------------------
           */

          [data-theme-mode='light']
          .first-consent-main-icon {
            background-color:
              rgba(
                122,
                68,
                255,
                0.08
              ) !important;

            border-color:
              rgba(
                122,
                68,
                255,
                0.22
              ) !important;

            color:
              #7a44ff !important;

            box-shadow:
              0 0 28px
              rgba(
                122,
                68,
                255,
                0.10
              ) !important;
          }


          /*
           * -----------------------------------------------
           * INFORMATION PANEL
           * -----------------------------------------------
           */

          [data-theme-mode='light']
          .first-consent-info-panel {
            background-color:
              #f7f7fb !important;

            border-color:
              #dfdfdf !important;
          }


          /*
           * Purple information icon
           */

          [data-theme-mode='light']
          .first-consent-info-icon {
            background-color:
              rgba(
                122,
                68,
                255,
                0.08
              ) !important;

            color:
              #7a44ff !important;
          }


          /*
           * Green availability icon
           */

          [data-theme-mode='light']
          .first-consent-available-icon {
            background-color:
              rgba(
                16,
                185,
                129,
                0.09
              ) !important;

            color:
              #047857 !important;
          }


          /*
           * -----------------------------------------------
           * ERROR
           * -----------------------------------------------
           */

          [data-theme-mode='light']
          .first-consent-error {
            background-color:
              #fff7f7 !important;

            border-color:
              #fecaca !important;
          }


          [data-theme-mode='light']
          .first-consent-error-text {
            color:
              #b91c1c !important;
          }


          /*
           * -----------------------------------------------
           * DECLINE BUTTON
           * -----------------------------------------------
           */

          [data-theme-mode='light']
          .first-consent-decline {
            background-color:
              #ffffff !important;

            border-color:
              #d7d3df !important;

            color:
              #45424d !important;
          }


          [data-theme-mode='light']
          .first-consent-decline:hover:not(:disabled) {
            background-color:
              rgba(
                122,
                68,
                255,
                0.06
              ) !important;

            border-color:
              rgba(
                122,
                68,
                255,
                0.55
              ) !important;

            color:
              #6f42c1 !important;
          }


          /*
           * -----------------------------------------------
           * DISABLED BUTTONS
           * -----------------------------------------------
           */

          [data-theme-mode='light']
          .first-consent-decline:disabled,
          [data-theme-mode='light']
          .first-consent-allow:disabled {
            background-image:
              none !important;

            background-color:
              #e6e3eb !important;

            border-color:
              #dfdfdf !important;

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
           * Keep loading spinner visible
           * when the Allow button is disabled.
           */

          [data-theme-mode='light']
          .first-consent-allow:disabled
          .first-consent-spinner {
            border-color:
              rgba(
                122,
                68,
                255,
                0.25
              ) !important;

            border-top-color:
              #7a44ff !important;
          }
        `}
      </style>


      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-login-consent-title"
        aria-describedby="first-login-consent-description"
        tabIndex={-1}
        onKeyDown={
          handleKeyDown
        }
        className={`first-consent-dialog w-full max-w-xl rounded-2xl border border-[#49306f] bg-[#160b32]/95 p-6 shadow-[0_28px_80px_rgba(0,0,0,0.6)] outline-none transition-all duration-300 ease-out sm:p-8 ${
          visible
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-4 scale-[0.96] opacity-0'
        }`}
      >
        {/* Heading */}
        <div className="flex flex-col items-center text-center">
          <div className="first-consent-interactive first-consent-main-icon flex h-14 w-14 items-center justify-center rounded-2xl border border-[#7a44ff]/30 bg-[#7a44ff]/10 text-[#b995ff] shadow-[0_0_28px_rgba(122,68,255,0.18)]">
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-7 w-7"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3 5 6v5c0 4.5 2.8 8.3 7 10 4.2-1.7 7-5.5 7-10V6l-7-3Z"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.5 12 11 13.5 14.5 10"
              />
            </svg>
          </div>


          <p className="first-consent-accent mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#a97cff]">
            Privacy Choice
          </p>


          <h2
            id="first-login-consent-title"
            className="first-consent-heading mt-2 text-2xl font-bold tracking-tight text-[#f3f0ff]"
          >
            AI Processing Consent
          </h2>


          <p
            id="first-login-consent-description"
            className="first-consent-body mt-4 max-w-lg text-sm leading-6 text-[#a6a8c7]"
          >
            StudyA can use an external AI service to create
            summaries, flashcards, practice quizzes and concept
            explanations from your study materials.
          </p>
        </div>


        {/* Information */}
        <div className="first-consent-info-panel mt-6 space-y-3 rounded-xl border border-[#2a1b4d] bg-[#120928]/70 p-5">
          <div className="flex items-start gap-3">
            <div className="first-consent-interactive first-consent-info-icon mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7a44ff]/10 text-[#a97cff]">
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4m0 4h.01"
                />

                <circle
                  cx="12"
                  cy="12"
                  r="9"
                />
              </svg>
            </div>

            <p className="first-consent-body text-sm leading-6 text-[#a6a8c7]">
              Uploading a study document does not by itself send
              the document to the AI service. AI processing occurs
              when you request an AI-powered feature and consent
              has been granted.
            </p>
          </div>


          <div className="flex items-start gap-3">
            <div className="first-consent-interactive first-consent-available-icon mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m5 12 4 4L19 6"
                />
              </svg>
            </div>

            <p className="first-consent-body text-sm leading-6 text-[#a6a8c7]">
              You can continue using StudyA if you decline.
              Uploads, Study Planner, Saved Materials, Progress and
              other non-AI features will remain available.
            </p>
          </div>
        </div>


        {/* Decline explanation */}
        <p className="first-consent-muted mt-5 text-center text-xs leading-5 text-[#727494]">
          If you decline, new AI-generated summaries, flashcards,
          quizzes and concept explanations will remain unavailable
          until you change your preference in Privacy & Consent.
        </p>


        {/* Error */}
        {error && (
          <div
            role="alert"
            className="first-consent-error mt-5 rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-3"
          >
            <p className="first-consent-error-text text-sm leading-6 text-red-300">
              {error}
            </p>
          </div>
        )}


        {/* Decisions */}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              handleDecision(
                'revoked'
              )
            }
            className="first-consent-interactive first-consent-decline inline-flex min-h-11 items-center justify-center rounded-lg border border-[#49306f] bg-[#120928] px-5 py-2.5 text-sm font-semibold text-[#c2c4e4] hover:border-[#7a44ff]/60 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Decline AI Processing
          </button>


          <button
            type="button"
            disabled={loading}
            onClick={() =>
              handleDecision(
                'granted'
              )
            }
            className="first-consent-interactive first-consent-allow inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#9c46ff] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(122,68,255,0.22)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && (
              <span className="first-consent-spinner h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}

            {loading
              ? 'Saving preference...'
              : 'Allow AI Processing'}
          </button>
        </div>


        <p className="first-consent-muted mt-4 text-center text-xs text-[#727494]">
          You can change this decision later from Privacy & Consent.
        </p>
      </div>
    </div>
  )
}


export default FirstLoginConsentModal