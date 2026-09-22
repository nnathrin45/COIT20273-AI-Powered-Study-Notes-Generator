import { useEffect, useState } from 'react'
import AIConsent from '../components/AIConsent'
import {
  getConsentStatus,
  updateConsentStatus,
} from '../services/consentService'

function Privacy() {
  const [consentStatus, setConsentStatus] = useState(null)
  const [consentRecordedAt, setConsentRecordedAt] =
    useState(null)

  const [initialLoading, setInitialLoading] =
    useState(true)

  const [consentLoading, setConsentLoading] =
    useState(false)

  const [error, setError] = useState('')

  useEffect(() => {
    const loadConsent = async () => {
      setInitialLoading(true)
      setError('')

      try {
        const response = await getConsentStatus()

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
          response.data?.consent?.status ?? null
        )

        setConsentRecordedAt(
          response.data?.consent?.recorded_at ?? null
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

  const handleConsentChange = async (newStatus) => {
    setConsentLoading(true)
    setError('')

    try {
      const response =
        await updateConsentStatus(newStatus)

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
        response.data?.consent?.status ?? newStatus
      )

      const latestResponse =
        await getConsentStatus()

      if (
        latestResponse.ok &&
        latestResponse.data?.consent
      ) {
        setConsentStatus(
          latestResponse.data.consent.status
        )

        setConsentRecordedAt(
          latestResponse.data.consent.recorded_at ??
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
    <div className="mx-auto w-full max-w-4xl">

      {/* Page heading */}
      <div className="mb-8">

        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
          Privacy
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-[#f3f0ff]">
          Privacy & Consent
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#898cc0]">
          Manage whether your uploaded study material may
          be processed by the external Generative AI service
          when you request AI-generated study content.
        </p>

      </div>

      {/* Privacy information */}
      <section className="mb-6 rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6">

        <div className="flex items-start gap-4">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">

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

            <h2 className="text-lg font-semibold text-[#f3f0ff]">
              Your AI Privacy Choice
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#a6a8c7]">
              Uploading a document does not automatically send
              it to the external AI service. Study material is
              only sent for AI processing when you request an
              AI-generated feature and consent has been granted.
            </p>

          </div>

        </div>

      </section>

      {/* Consent control */}
      <section>

        {initialLoading ? (
          <div
            className="flex items-center gap-3 rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6"
            role="status"
          >
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

            <p className="text-sm font-medium text-[#c9b4ff]">
              Loading your AI consent preference...
            </p>
          </div>
        ) : (
          <AIConsent
            consentStatus={consentStatus}
            recordedAt={consentRecordedAt}
            loading={consentLoading}
            onConsentChange={handleConsentChange}
          />
        )}

        {error && (
          <div
            className="mt-4 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
            role="alert"
          >
            <p className="text-sm text-red-300">
              {error}
            </p>
          </div>
        )}

      </section>

      {/* Responsible AI */}
      <section className="mt-6 rounded-xl border border-[#7a44ff]/25 bg-gradient-to-r from-[#7a44ff]/10 to-[#d83dff]/5 p-6">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">

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

            <h2 className="font-bold text-[#f3f0ff]">
              Responsible AI Reminder
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#a6a8c7]">
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