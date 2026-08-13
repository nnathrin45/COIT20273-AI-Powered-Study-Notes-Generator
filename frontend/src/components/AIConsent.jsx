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
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">

      <div>
        <h2 className="text-lg font-semibold text-amber-900">
          AI Processing Consent
        </h2>

        <p className="mt-2 text-sm leading-6 text-amber-800">
          Some study features use an external Generative AI
          service to create summaries, flashcards, quizzes,
          explanations and study plans.
        </p>

        <p className="mt-2 text-sm leading-6 text-amber-800">
          Uploading a document alone does not send it to the AI
          service. Your consent is required before study material
          is sent for AI processing.
        </p>
      </div>

      <div className="mt-5 rounded-lg border border-amber-300 bg-white/60 p-4">

        <label className="flex items-start gap-3">

          <input
            type="checkbox"
            checked={isGranted}
            onChange={handleChange}
            disabled={loading || disabled}
            className="mt-1 h-4 w-4 shrink-0"
          />

          <span className="text-sm leading-6 text-gray-800">
            I understand and consent to my study material being
            processed by the external Generative AI service when
            I request AI-generated study content.
          </span>

        </label>

      </div>

      {/* Loading */}
      {loading && (
        <div className="mt-4 rounded-lg bg-blue-50 p-3">

          <p className="text-sm text-blue-700">
            Updating your AI consent preference...
          </p>

        </div>
      )}

      {/* Granted */}
      {!loading && consentStatus === 'granted' && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">

          <p className="text-sm font-medium text-green-800">
            AI processing consent is currently granted.
          </p>

          {formattedTime && (
            <p className="mt-1 text-xs text-green-700">
              Last updated: {formattedTime}
            </p>
          )}

        </div>
      )}

      {/* Revoked */}
      {!loading && consentStatus === 'revoked' && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">

          <p className="text-sm font-medium text-gray-700">
            AI processing consent is currently revoked.
          </p>

          <p className="mt-1 text-xs text-gray-600">
            AI generation features will remain unavailable until
            consent is granted again.
          </p>

          {formattedTime && (
            <p className="mt-1 text-xs text-gray-500">
              Last updated: {formattedTime}
            </p>
          )}

        </div>
      )}

      {/* No Decision */}
      {!loading && consentStatus === null && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">

          <p className="text-sm text-blue-700">
            You have not yet provided an AI processing consent
            decision.
          </p>

        </div>
      )}

      <div className="mt-4">

        <p className="text-xs leading-5 text-amber-700">
          Avoid submitting sensitive, confidential or private
          information for AI processing. AI-generated content may
          contain inaccuracies or omissions and should be checked
          against the original study material.
        </p>

      </div>

    </div>
  )
}

export default AIConsent