import { useEffect, useState } from 'react'
import AIConsent from '../components/AIConsent'
import {
  getConsentStatus,
  updateConsentStatus,
} from '../services/consentService'


function Privacy() {
  const [consentStatus, setConsentStatus] = useState(null)

  const [
    consentRecordedAt,
    setConsentRecordedAt,
  ] = useState(null)

  const [
    initialLoading,
    setInitialLoading,
  ] = useState(true)

  const [
    consentLoading,
    setConsentLoading,
  ] = useState(false)

  const [error, setError] = useState('')


  useEffect(() => {
    const loadConsent = async () => {
      setInitialLoading(true)
      setError('')

      try {
        const response =
          await getConsentStatus()

        if (!response.ok) {
          if (response.status === 401) {
            setError(
              'Your login session is missing or invalid. Please sign in again.'
            )
          } else {
            setError(
              response.data?.message ||
              'Unable to retrieve your AI consent preference.'
            )
          }

          return
        }

        setConsentStatus(
          response.data?.consent
            ?.status ?? null
        )

        setConsentRecordedAt(
          response.data?.consent
            ?.recorded_at ?? null
        )
      } catch (loadError) {
        console.error(
          'Consent fetch error:',
          loadError
        )

        setError(
          'Unable to connect to the server to retrieve your AI consent preference.'
        )
      } finally {
        setInitialLoading(false)
      }
    }

    loadConsent()
  }, [])


  const handleConsentChange =
    async (newStatus) => {
      setConsentLoading(true)
      setError('')

      try {
        const response =
          await updateConsentStatus(
            newStatus
          )

        if (!response.ok) {
          if (response.status === 401) {
            setError(
              'Your login session is missing or invalid. Please sign in again.'
            )
          } else {
            setError(
              response.data?.message ||
              'Unable to update your AI consent preference.'
            )
          }

          return
        }

        setConsentStatus(
          response.data?.consent
            ?.status ?? newStatus
        )

        const latestResponse =
          await getConsentStatus()

        if (
          latestResponse.ok &&
          latestResponse.data?.consent
        ) {
          setConsentStatus(
            latestResponse.data
              .consent.status
          )

          setConsentRecordedAt(
            latestResponse.data
              .consent.recorded_at ??
            null
          )
        }
      } catch (updateError) {
        console.error(
          'Consent update error:',
          updateError
        )

        setError(
          'Unable to connect to the server to update your AI consent preference.'
        )
      } finally {
        setConsentLoading(false)
      }
    }


  return (
    <div className="privacy-theme mx-auto w-full max-w-4xl">
      <style>
        {`
          /*
           * Theme timing
           *
           * Text     = 100ms
           * Surfaces = 500ms
           * Hover    = 300ms
           */

          .privacy-theme h1,
          .privacy-theme h2,
          .privacy-theme h3,
          .privacy-theme p,
          .privacy-theme span,
          .privacy-theme label {
            transition:
              color 100ms ease;
          }


          .privacy-theme-surface {
            transition:
              background-color 500ms ease,
              border-color 500ms ease,
              box-shadow 300ms ease;
          }


          .privacy-theme-interactive {
            transition:
              color 100ms ease,
              background-color 300ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease,
              filter 300ms ease,
              opacity 300ms ease;
          }


          /*
           * -----------------------------------------------
           * MAIN PRIVACY PAGE
           * -----------------------------------------------
           */

          [data-theme-mode='light']
          .privacy-heading {
            color:
              #171717 !important;
          }


          [data-theme-mode='light']
          .privacy-body {
            color:
              #65676b !important;
          }


          [data-theme-mode='light']
          .privacy-muted {
            color:
              #7a7575 !important;
          }


          [data-theme-mode='light']
          .privacy-accent {
            color:
              #7a44ff !important;
          }


          [data-theme-mode='light']
          .privacy-accent-soft {
            color:
              #6f42c1 !important;
          }


          /*
           * White cards
           */

          [data-theme-mode='light']
          .privacy-surface {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;
          }


          /*
           * Purple icon boxes
           */

          [data-theme-mode='light']
          .privacy-icon {
            color:
              #7a44ff !important;

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
                0.20
              ) !important;
          }


          /*
           * Loading state
           */

          [data-theme-mode='light']
          .privacy-loading {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;
          }


          [data-theme-mode='light']
          .privacy-loading-text {
            color:
              #6f42c1 !important;
          }


          /*
           * Error state
           */

          [data-theme-mode='light']
          .privacy-error-text {
            color:
              #b91c1c !important;
          }


          /*
           * Responsible AI panel
           */

          [data-theme-mode='light']
          .privacy-responsible-ai {
            background:
              linear-gradient(
                90deg,
                rgba(
                  122,
                  68,
                  255,
                  0.07
                ),
                rgba(
                  216,
                  61,
                  255,
                  0.03
                )
              ) !important;

            border-color:
              rgba(
                122,
                68,
                255,
                0.22
              ) !important;
          }


          /*
           * -----------------------------------------------
           * AI CONSENT COMPONENT
           * -----------------------------------------------
           *
           * These selectors are limited to Privacy.jsx only.
           * They do not globally alter AIConsent.
           */

          .privacy-consent-area
          [class~="bg-[#160b32]"],
          .privacy-consent-area
          [class~="bg-[#120928]"],
          .privacy-consent-area
          [class~="bg-[#191426]"],
          .privacy-consent-area
          [class~="bg-[#251149]"],
          .privacy-consent-area
          [class~="bg-[#2a1f46]"] {
            transition:
              background-color 500ms ease,
              border-color 500ms ease,
              box-shadow 300ms ease;
          }


          [data-theme-mode='light']
          .privacy-consent-area
          [class~="bg-[#160b32]"] {
            background-color:
              #ffffff !important;
          }


          [data-theme-mode='light']
          .privacy-consent-area
          [class~="bg-[#120928]"],
          [data-theme-mode='light']
          .privacy-consent-area
          [class~="bg-[#191426]"] {
            background-color:
              #f7f7fb !important;
          }


          [data-theme-mode='light']
          .privacy-consent-area
          [class~="bg-[#251149]"],
          [data-theme-mode='light']
          .privacy-consent-area
          [class~="bg-[#2a1f46]"] {
            background-color:
              rgba(
                122,
                68,
                255,
                0.08
              ) !important;
          }


          /*
           * Consent component borders
           */

          [data-theme-mode='light']
          .privacy-consent-area
          [class~="border-[#2a1b4d]"],
          [data-theme-mode='light']
          .privacy-consent-area
          [class~="border-[#392461]"],
          [data-theme-mode='light']
          .privacy-consent-area
          [class~="border-[#3a2860]"],
          [data-theme-mode='light']
          .privacy-consent-area
          [class~="border-[#3A2763]"] {
            border-color:
              #dfdfdf !important;
          }


          /*
           * Consent component headings
           */

          [data-theme-mode='light']
          .privacy-consent-area
          [class~="text-[#f3f0ff]"],
          [data-theme-mode='light']
          .privacy-consent-area
          [class~="text-white"] {
            color:
              #171717 !important;
          }


          /*
           * Consent component body text
           */

          [data-theme-mode='light']
          .privacy-consent-area
          [class~="text-[#a6a8c7]"],
          [data-theme-mode='light']
          .privacy-consent-area
          [class~="text-[#898cc0]"],
          [data-theme-mode='light']
          .privacy-consent-area
          [class~="text-[#898CC0]"] {
            color:
              #65676b !important;
          }


          /*
           * Consent component muted text
           */

          [data-theme-mode='light']
          .privacy-consent-area
          [class~="text-[#727494]"],
          [data-theme-mode='light']
          .privacy-consent-area
          [class~="text-[#595c90]"],
          [data-theme-mode='light']
          .privacy-consent-area
          [class~="text-[#595C90]"] {
            color:
              #7a7575 !important;
          }


          /*
           * Consent component purple text
           */

          [data-theme-mode='light']
          .privacy-consent-area
          [class~="text-[#a97cff]"],
          [data-theme-mode='light']
          .privacy-consent-area
          [class~="text-[#A77BFF]"],
          [data-theme-mode='light']
          .privacy-consent-area
          [class~="text-[#c9b4ff]"] {
            color:
              #6f42c1 !important;
          }


          /*
            * Consent success / granted state
            */

            [data-theme-mode='light']
            .privacy-consent-area
            [class*="bg-emerald"] {
              background-color:
                #dcfce7 !important;
            }

            [data-theme-mode='light']
            .privacy-consent-area
            [class*="border-emerald"] {
              border-color:
                #86efac !important;
            }

            [data-theme-mode='light']
            .privacy-consent-area
            [class*="text-emerald-200"],
            [data-theme-mode='light']
            .privacy-consent-area
            [class*="text-emerald-300"],
            [data-theme-mode='light']
            .privacy-consent-area
            [class*="text-emerald-400"],
            [data-theme-mode='light']
            .privacy-consent-area
            [class*="text-emerald-500"] {
              color:
                #166534 !important;
            }

            [data-theme-mode='light']
            .privacy-consent-area
            [class*="text-green-200"],
            [data-theme-mode='light']
            .privacy-consent-area
            [class*="text-green-300"],
            [data-theme-mode='light']
            .privacy-consent-area
            [class*="text-green-400"],
            [data-theme-mode='light']
            .privacy-consent-area
            [class*="text-green-500"] {
              color:
                #166534 !important;
            }

          /*
           * Consent warning colour
           */

          [data-theme-mode='light']
          .privacy-consent-area
          [class~="text-amber-200"],
          [data-theme-mode='light']
          .privacy-consent-area
          [class~="text-amber-300"] {
            color:
              #92400e !important;
          }


          /*
           * Consent error / revoke colour
           */

          [data-theme-mode='light']
          .privacy-consent-area
          [class~="text-red-300"] {
            color:
              #b91c1c !important;
          }


          /*
           * Buttons inside AIConsent
           */

          .privacy-consent-area button {
            transition:
              color 100ms ease,
              background-color 300ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease,
              filter 300ms ease,
              transform 300ms ease;
          }


          /*
           * Disabled consent buttons
           */

          [data-theme-mode='light']
          .privacy-consent-area
          button:disabled {
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

            transform:
              none !important;
          }
        `}
      </style>


      {/* Page heading */}
      <div className="mb-8">
        <p className="privacy-accent mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
          Privacy
        </p>

        <h1 className="privacy-heading text-3xl font-bold tracking-tight text-[#f3f0ff]">
          Privacy & Consent
        </h1>

        <p className="privacy-body mt-3 max-w-2xl text-sm leading-6 text-[#898cc0]">
          Manage whether your uploaded study material may
          be processed by the external Generative AI service
          when you request AI-generated study content.
        </p>
      </div>


      {/* Privacy information */}
      <section className="privacy-theme-surface privacy-surface mb-6 rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6">
        <div className="flex items-start gap-4">
          <div className="privacy-theme-interactive privacy-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3 5 6v5c0 4.5 2.8 8.3 7 10 4.2-1.7 7-5.5 7-10V6l-7-3Z"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4"
              />
            </svg>
          </div>


          <div>
            <h2 className="privacy-heading text-lg font-semibold text-[#f3f0ff]">
              Your AI Privacy Choice
            </h2>

            <p className="privacy-body mt-2 text-sm leading-6 text-[#a6a8c7]">
              Uploading a document does not automatically send
              it to the external AI service. Study material is
              only sent for AI processing when you request an
              AI-generated feature and consent has been granted.
            </p>
          </div>
        </div>
      </section>


      {/* Consent control */}
      <section className="privacy-consent-area">
        {initialLoading ? (
          <div
            className="privacy-theme-surface privacy-loading flex items-center gap-3 rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6"
            role="status"
          >
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

            <p className="privacy-loading-text text-sm font-medium text-[#c9b4ff]">
              Loading your AI consent preference...
            </p>
          </div>
        ) : (
          <AIConsent
            consentStatus={
              consentStatus
            }
            recordedAt={
              consentRecordedAt
            }
            loading={
              consentLoading
            }
            onConsentChange={
              handleConsentChange
            }
          />
        )}


        {error && (
          <div
            className="mt-4 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
            role="alert"
          >
            <p className="privacy-error-text text-sm text-red-300">
              {error}
            </p>
          </div>
        )}
      </section>


      {/* Responsible AI */}
      <section className="privacy-theme-surface privacy-responsible-ai mt-6 rounded-xl border border-[#7a44ff]/25 bg-gradient-to-r from-[#7a44ff]/10 to-[#d83dff]/5 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="privacy-theme-interactive privacy-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3 4 7v5c0 4.5 3.2 7.6 8 9 4.8-1.4 8-4.5 8-9V7l-8-4Zm0 5v5m0 3h.01"
              />
            </svg>
          </div>


          <div>
            <h2 className="privacy-heading font-bold text-[#f3f0ff]">
              Responsible AI Reminder
            </h2>

            <p className="privacy-body mt-2 text-sm leading-6 text-[#a6a8c7]">
              AI-generated study materials may contain
              inaccuracies or omissions. Always verify
              generated information against your original
              study material.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}


export default Privacy