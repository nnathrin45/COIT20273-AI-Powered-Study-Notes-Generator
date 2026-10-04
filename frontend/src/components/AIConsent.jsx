import { formatConsentTime } from '../services/consentService'


function AIConsent({
  consentStatus = null,
  recordedAt = null,
  loading = false,
  disabled = false,
  onConsentChange,
}) {
  const isGranted =
    consentStatus === 'granted'


  const handleChange = (event) => {
    const newStatus =
      event.target.checked
        ? 'granted'
        : 'revoked'

    if (onConsentChange) {
      onConsentChange(newStatus)
    }
  }


  const formattedTime =
    formatConsentTime(recordedAt)


  return (
    <div className="ai-consent-theme ai-consent-main rounded-xl border border-[#2a1b4d] bg-[#160b32] p-5 sm:p-6">
      <style>
        {`
          /*
           * AI Consent theme timing
           *
           * Text     = 100ms
           * Surfaces = 500ms
           * Hover    = 300ms
           */

          .ai-consent-theme {
            transition:
              background-color 500ms ease,
              border-color 500ms ease,
              box-shadow 300ms ease;
          }


          .ai-consent-theme h2,
          .ai-consent-theme p,
          .ai-consent-theme span,
          .ai-consent-theme label {
            transition:
              color 100ms ease;
          }


          .ai-consent-surface {
            transition:
              background-color 500ms ease,
              border-color 500ms ease,
              box-shadow 300ms ease;
          }


          .ai-consent-interactive {
            transition:
              color 100ms ease,
              background-color 300ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease,
              opacity 300ms ease;
          }


          /*
           * -----------------------------------------------
           * MAIN COMPONENT
           * -----------------------------------------------
           */

          [data-theme-mode='light']
          .ai-consent-main {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;
          }


          [data-theme-mode='light']
          .ai-consent-heading {
            color:
              #171717 !important;
          }


          [data-theme-mode='light']
          .ai-consent-body {
            color:
              #65676b !important;
          }


          [data-theme-mode='light']
          .ai-consent-muted {
            color:
              #7a7575 !important;
          }


          [data-theme-mode='light']
          .ai-consent-accent {
            color:
              #7a44ff !important;
          }


          /*
           * -----------------------------------------------
           * ICON
           * -----------------------------------------------
           */

          [data-theme-mode='light']
          .ai-consent-icon {
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
           * -----------------------------------------------
           * CONSENT CHECKBOX PANEL
           * -----------------------------------------------
           */

          [data-theme-mode='light']
          .ai-consent-checkbox-panel {
            background-color:
              #f7f7fb !important;

            border-color:
              #dfdfdf !important;
          }


          [data-theme-mode='light']
          .ai-consent-checkbox-panel:hover {
            background-color:
              rgba(
                122,
                68,
                255,
                0.05
              ) !important;

            border-color:
              rgba(
                122,
                68,
                255,
                0.45
              ) !important;
          }


          [data-theme-mode='light']
          .ai-consent-checkbox-text {
            color:
              #2b2b33 !important;
          }


          /*
           * Keep the native checkbox purple
           */
          [data-theme-mode='light']
          .ai-consent-checkbox {
            accent-color:
              #7a44ff;
          }


          /*
           * -----------------------------------------------
           * LOADING
           * -----------------------------------------------
           */

          [data-theme-mode='light']
          .ai-consent-loading-panel {
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
                0.22
              ) !important;
          }


          [data-theme-mode='light']
          .ai-consent-loading-text {
            color:
              #6f42c1 !important;
          }


          /*
           * -----------------------------------------------
           * GRANTED STATE
           * -----------------------------------------------
           */

          [data-theme-mode='light']
          .ai-consent-granted-panel {
            background-color:
              #dcfce7 !important;

            border-color:
              #86efac !important;
          }


          [data-theme-mode='light']
          .ai-consent-granted-icon {
            background-color:
              rgba(
                22,
                101,
                52,
                0.10
              ) !important;

            color:
              #166534 !important;
          }


          [data-theme-mode='light']
          .ai-consent-granted-heading {
            color:
              #166534 !important;
          }


          [data-theme-mode='light']
          .ai-consent-granted-time {
            color:
              #3f6f4d !important;
          }


          /*
           * -----------------------------------------------
           * REVOKED STATE
           * -----------------------------------------------
           */

          [data-theme-mode='light']
          .ai-consent-revoked-panel {
            background-color:
              #fff7f7 !important;

            border-color:
              #fecaca !important;
          }


          [data-theme-mode='light']
          .ai-consent-revoked-icon {
            background-color:
              rgba(
                185,
                28,
                28,
                0.08
              ) !important;

            color:
              #b91c1c !important;
          }


          [data-theme-mode='light']
          .ai-consent-revoked-heading {
            color:
              #991b1b !important;
          }


          [data-theme-mode='light']
          .ai-consent-revoked-body {
            color:
              #65676b !important;
          }


          [data-theme-mode='light']
          .ai-consent-revoked-time {
            color:
              #7a7575 !important;
          }


          /*
           * -----------------------------------------------
           * NO DECISION STATE
           * -----------------------------------------------
           */

          [data-theme-mode='light']
          .ai-consent-no-decision {
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
                0.22
              ) !important;
          }


          [data-theme-mode='light']
          .ai-consent-no-decision-text {
            color:
              #6f42c1 !important;
          }


          /*
           * -----------------------------------------------
           * PRIVACY NOTE
           * -----------------------------------------------
           */

          [data-theme-mode='light']
          .ai-consent-privacy-note {
            border-color:
              #dfdfdf !important;
          }


          [data-theme-mode='light']
          .ai-consent-privacy-icon {
            color:
              #7a44ff !important;
          }


          [data-theme-mode='light']
          .ai-consent-privacy-text {
            color:
              #65676b !important;
          }


          /*
           * Disabled checkbox
           */

          [data-theme-mode='light']
          .ai-consent-checkbox:disabled {
            opacity:
              0.5 !important;

            cursor:
              not-allowed !important;
          }
        `}
      </style>


      {/* Heading */}
      <div>
        <div className="flex items-start gap-3">
          <div className="ai-consent-interactive ai-consent-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">
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
            <h2 className="ai-consent-heading text-lg font-semibold text-[#f3f0ff]">
              AI Processing Consent
            </h2>

            <p className="ai-consent-body mt-2 text-sm leading-6 text-[#a6a8c7]">
              Some study features use an external Generative AI
              service to create summaries, flashcards, quizzes,
              explanations and study plans.
            </p>

            <p className="ai-consent-body mt-2 text-sm leading-6 text-[#a6a8c7]">
              Uploading a document alone does not send it to the AI
              service. Your consent is required before study material
              is sent for AI processing.
            </p>
          </div>
        </div>
      </div>


      {/* Consent Checkbox */}
      <div className="ai-consent-surface ai-consent-checkbox-panel mt-5 rounded-lg border border-[#3a2860] bg-[#19103a] p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={isGranted}
            onChange={handleChange}
            disabled={
              loading ||
              disabled
            }
            className="ai-consent-checkbox mt-1 h-4 w-4 shrink-0 accent-[#7a44ff] disabled:cursor-not-allowed disabled:opacity-60"
          />

          <span className="ai-consent-checkbox-text text-sm leading-6 text-[#d9d4eb]">
            I understand and consent to my study material being
            processed by the external Generative AI service when
            I request AI-generated study content.
          </span>
        </label>
      </div>


      {/* Loading */}
      {loading && (
        <div
          className="ai-consent-surface ai-consent-loading-panel mt-4 flex items-center gap-3 rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 p-3"
          role="status"
        >
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

          <p className="ai-consent-loading-text text-sm text-[#c9b4ff]">
            Updating your AI consent preference...
          </p>
        </div>
      )}


      {/* Granted */}
      {!loading &&
        consentStatus ===
          'granted' && (
          <div className="ai-consent-surface ai-consent-granted-panel mt-4 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3">
            <div className="flex items-start gap-3">
              <div className="ai-consent-interactive ai-consent-granted-icon mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
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
                <p className="ai-consent-granted-heading text-sm font-medium text-emerald-300">
                  AI processing consent is currently granted.
                </p>

                {formattedTime && (
                  <p className="ai-consent-granted-time mt-1 text-xs text-emerald-200/70">
                    Last updated:{' '}
                    {formattedTime}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}


      {/* Revoked */}
      {!loading &&
        consentStatus ===
          'revoked' && (
          <div className="ai-consent-surface ai-consent-revoked-panel mt-4 rounded-lg border border-[#3a2860] bg-[#19103a] p-3">
            <div className="flex items-start gap-3">
              <div className="ai-consent-interactive ai-consent-revoked-icon mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#898cc0]/10 text-[#a6a8c7]">
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
                <p className="ai-consent-revoked-heading text-sm font-medium text-[#d9d4eb]">
                  AI processing consent is currently revoked.
                </p>

                <p className="ai-consent-revoked-body mt-1 text-xs leading-5 text-[#898cc0]">
                  AI generation features will remain unavailable until
                  consent is granted again.
                </p>

                {formattedTime && (
                  <p className="ai-consent-revoked-time mt-1 text-xs text-[#727494]">
                    Last updated:{' '}
                    {formattedTime}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}


      {/* No Decision */}
      {!loading &&
        consentStatus ===
          null && (
          <div className="ai-consent-surface ai-consent-no-decision mt-4 rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 p-3">
            <p className="ai-consent-no-decision-text text-sm text-[#c9b4ff]">
              You have not yet provided an AI processing consent
              decision.
            </p>
          </div>
        )}


      {/* Privacy Note */}
      <div className="ai-consent-surface ai-consent-privacy-note mt-5 border-t border-[#2a1b4d] pt-4">
        <div className="flex items-start gap-3">
          <div className="ai-consent-privacy-icon mt-0.5 shrink-0 text-[#a97cff]">
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

          <p className="ai-consent-privacy-text text-xs leading-5 text-[#898cc0]">
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