import { formatConsentTime } from '../services/consentService'

function AIConsent({
  consentStatus = null,
  recordedAt = null,
  loading = false,
  disabled = false,
  onConsentChange,
}) {
  const isGranted = consentStatus === 'granted'

  const handleChange = (event) => {
    const newStatus = event.target.checked
      ? 'granted'
      : 'revoked'

    if (onConsentChange) {
      onConsentChange(newStatus)
    }
  }

  const formattedTime = formatConsentTime(recordedAt)

  return (
    <div className="rounded-xl border border-[#2a1b4d] bg-[#160b32] p-5 sm:p-6">

      {/* Heading */}
      <div>

        <div className="flex items-start gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">
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

            <h2 className="text-lg font-semibold text-[#f3f0ff]">
              AI Processing Consent
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#a6a8c7]">
              Some study features use an external Generative AI
              service to create summaries, flashcards, quizzes,
              explanations and study plans.
            </p>

            <p className="mt-2 text-sm leading-6 text-[#a6a8c7]">
              Uploading a document alone does not send it to the AI
              service. Your consent is required before study material
              is sent for AI processing.
            </p>

          </div>

        </div>

      </div>

      {/* Consent Checkbox */}
      <div className="mt-5 rounded-lg border border-[#3a2860] bg-[#19103a] p-4">

        <label className="flex cursor-pointer items-start gap-3">

          <input
            type="checkbox"
            checked={isGranted}
            onChange={handleChange}
            disabled={loading || disabled}
            className="mt-1 h-4 w-4 shrink-0 accent-[#7a44ff] disabled:cursor-not-allowed disabled:opacity-60"
          />

          <span className="text-sm leading-6 text-[#d9d4eb]">
            I understand and consent to my study material being
            processed by the external Generative AI service when
            I request AI-generated study content.
          </span>

        </label>

      </div>

      {/* Loading */}
      {loading && (
        <div
          className="mt-4 flex items-center gap-3 rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 p-3"
          role="status"
        >

          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

          <p className="text-sm text-[#c9b4ff]">
            Updating your AI consent preference...
          </p>

        </div>
      )}

      {/* Granted */}
      {!loading && consentStatus === 'granted' && (
        <div className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3">

          <div className="flex items-start gap-3">

            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
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

            <div>

              <p className="text-sm font-medium text-emerald-300">
                AI processing consent is currently granted.
              </p>

              {formattedTime && (
                <p className="mt-1 text-xs text-emerald-200/70">
                  Last updated: {formattedTime}
                </p>
              )}

            </div>

          </div>

        </div>
      )}

      {/* Revoked */}
      {!loading && consentStatus === 'revoked' && (
        <div className="mt-4 rounded-lg border border-[#3a2860] bg-[#19103a] p-3">

          <div className="flex items-start gap-3">

            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#898cc0]/10 text-[#a6a8c7]">
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
                  d="M6 6l12 12M18 6 6 18"
                />
              </svg>
            </div>

            <div>

              <p className="text-sm font-medium text-[#d9d4eb]">
                AI processing consent is currently revoked.
              </p>

              <p className="mt-1 text-xs leading-5 text-[#898cc0]">
                AI generation features will remain unavailable until
                consent is granted again.
              </p>

              {formattedTime && (
                <p className="mt-1 text-xs text-[#727494]">
                  Last updated: {formattedTime}
                </p>
              )}

            </div>

          </div>

        </div>
      )}

      {/* No Decision */}
      {!loading && consentStatus === null && (
        <div className="mt-4 rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 p-3">

          <p className="text-sm text-[#c9b4ff]">
            You have not yet provided an AI processing consent
            decision.
          </p>

        </div>
      )}

      {/* Privacy Note */}
      <div className="mt-5 border-t border-[#2a1b4d] pt-4">

        <div className="flex items-start gap-3">

          <div className="mt-0.5 shrink-0 text-[#a97cff]">
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.3 4.6 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"
              />
            </svg>
          </div>

          <p className="text-xs leading-5 text-[#898cc0]">
            Avoid submitting sensitive, confidential or private
            information for AI processing. AI-generated content may
            contain inaccuracies or omissions and should be checked
            against the original study material.
          </p>

        </div>

      </div>

    </div>
  )
}

export default AIConsent