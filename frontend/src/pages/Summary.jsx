import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getConsentStatus } from '../services/consentService'
import { getUploadedFiles } from '../services/uploadedService'
import { generateAIContent } from '../services/aiService'
import AnimatedSelect from '../components/AnimatedSelect'
import AIConsentRequired from '../components/AIConsentRequired'


function Summary() {
  const [documents, setDocuments] = useState([])
  const [selectedDocument, setSelectedDocument] = useState('')

  const [documentsLoading, setDocumentsLoading] =
    useState(true)

  const [documentsError, setDocumentsError] =
    useState('')

  const [consentStatus, setConsentStatus] =
    useState(null)

  const [
    consentInitialLoading,
    setConsentInitialLoading,
  ] = useState(true)

  const [consentError, setConsentError] =
    useState('')

  const [
    generationLoading,
    setGenerationLoading,
  ] = useState(false)

  const [
    generatedOutput,
    setGeneratedOutput,
  ] = useState(null)

  const [disclaimer, setDisclaimer] =
    useState('')

  const [error, setError] =
    useState('')

  const [
    retryableError,
    setRetryableError,
  ] = useState(false)


  useEffect(() => {
    const loadConsent = async () => {
      setConsentInitialLoading(true)
      setConsentError('')

      try {
        const response =
          await getConsentStatus()

        if (!response.ok) {
          if (response.status === 401) {
            setConsentError(
              'Your login session is missing or invalid. Please sign in again.'
            )
          } else {
            setConsentError(
              response.data?.message ||
                'Unable to retrieve your AI consent preference.'
            )
          }

          return
        }

        setConsentStatus(
          response.data?.consent?.status ??
            null
        )
      } catch (consentFetchError) {
        console.error(
          'Consent fetch error:',
          consentFetchError
        )

        setConsentError(
          'Unable to connect to the server to retrieve your AI consent preference.'
        )
      } finally {
        setConsentInitialLoading(false)
      }
    }

    loadConsent()
  }, [])


  useEffect(() => {
    const loadDocuments = async () => {
      setDocumentsLoading(true)
      setDocumentsError('')

      try {
        const response =
          await getUploadedFiles()

        if (!response.ok) {
          if (response.status === 401) {
            setDocumentsError(
              'Your login session is missing or invalid. Please sign in again.'
            )
          } else {
            setDocumentsError(
              response.data?.message ||
                'Unable to retrieve your uploaded study materials.'
            )
          }

          return
        }

        setDocuments(
          response.data?.files ?? []
        )
      } catch (documentFetchError) {
        console.error(
          'Uploaded files fetch error:',
          documentFetchError
        )

        setDocumentsError(
          'Unable to connect to the server to retrieve your uploaded study materials.'
        )
      } finally {
        setDocumentsLoading(false)
      }
    }

    loadDocuments()
  }, [])


  const handleGenerateSummary =
    async () => {
      if (!selectedDocument) {
        setError(
          'Please select a study material first.'
        )

        setRetryableError(false)
        setGeneratedOutput(null)
        setDisclaimer('')

        return
      }

      if (
        consentStatus !== 'granted'
      ) {
        setError(
          'Please grant AI processing consent before generating a summary.'
        )

        setRetryableError(false)
        setGeneratedOutput(null)
        setDisclaimer('')

        return
      }

      setGenerationLoading(true)
      setError('')
      setRetryableError(false)
      setGeneratedOutput(null)
      setDisclaimer('')

      try {
        const response =
          await generateAIContent({
            fileId:
              Number(selectedDocument),

            outputType: 'summary',
          })

        if (!response.ok) {
          if (
            response.status === 403 &&
            response.data?.code ===
              'CONSENT_REQUIRED'
          ) {
            setConsentStatus('revoked')

            setError(
              'AI processing consent is required. Please manage your consent from the Privacy & Consent page.'
            )

            setRetryableError(false)

            return
          }

          if (
            response.status === 401
          ) {
            setError(
              'Your login session is missing or invalid. Please sign in again.'
            )

            setRetryableError(false)

            return
          }

          if (
            response.status === 404
          ) {
            setError(
              'The selected study material could not be found. Please select another document.'
            )

            setRetryableError(false)

            return
          }

          setError(
            response.data?.message ||
              'Unable to generate the summary. Please try again.'
          )

          setRetryableError(
            response.data?.retryable ===
              true
          )

          return
        }

        setGeneratedOutput(
          response.data?.output ?? null
        )

        setDisclaimer(
          response.data?.disclaimer ??
            ''
        )

        setRetryableError(false)
      } catch (generationError) {
        console.error(
          'Summary generation error:',
          generationError
        )

        setError(
          'Unable to connect to the server. Please try again.'
        )

        setRetryableError(true)
      } finally {
        setGenerationLoading(false)
      }
    }


  const selectedDocumentName =
    documents.find(
      (document) =>
        String(
          document.file_id
        ) === selectedDocument
    )?.file_name || ''


  return (
    <div className="summary-theme mx-auto max-w-5xl">
      <style>
        {`
          .summary-theme-text {
            transition:
              color 100ms ease;
          }

          .summary-theme-surface {
            transition:
              background-color 500ms ease,
              border-color 500ms ease,
              box-shadow 300ms ease;
          }

          .summary-theme-interactive {
            transition:
              color 100ms ease,
              background-color 300ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease,
              filter 300ms ease;
          }

          .summary-theme-border {
            transition:
              border-color 500ms ease;
          }


          [data-theme-mode='light']
          .summary-heading {
            color: #171717 !important;
          }

          [data-theme-mode='light']
          .summary-body {
            color: #65676b !important;
          }

          [data-theme-mode='light']
          .summary-muted {
            color: #7a7575 !important;
          }

          [data-theme-mode='light']
          .summary-accent {
            color: #7a44ff !important;
          }

          [data-theme-mode='light']
          .summary-accent-soft {
            color: #6f42c1 !important;
          }


          [data-theme-mode='light']
          .summary-surface {
            background-color: #ffffff !important;
            border-color: #dfdfdf !important;
          }


          [data-theme-mode='light']
          .summary-output-surface {
            background-color: #f7f7fb !important;
            border-color: #dfdfdf !important;
          }


          [data-theme-mode='light']
          .summary-loading-text {
            color: #6f42c1 !important;
          }


          [data-theme-mode='light']
          .summary-error-text {
            color: #b91c1c !important;
          }


          [data-theme-mode='light']
          .summary-warning-heading {
            color: #92400e !important;
          }

          [data-theme-mode='light']
          .summary-warning-body {
            color: #a16207 !important;
          }


          [data-theme-mode='light']
          .summary-consent-badge {
            color: #047857 !important;
            background-color:
              rgba(16, 185, 129, 0.08) !important;
            border-color:
              rgba(16, 185, 129, 0.25) !important;
          }


          [data-theme-mode='light']
          .summary-ai-badge {
            color: #6f42c1 !important;
            background-color:
              rgba(122, 68, 255, 0.08) !important;
            border-color:
              rgba(122, 68, 255, 0.22) !important;
          }


          [data-theme-mode='light']
          .summary-link:hover {
            color: #6634e8 !important;
          }


          [data-theme-mode='light']
          .summary-generate-button:disabled {
            background-image: none !important;
            background-color: #e6e3eb !important;
            color: #9a96a6 !important;
            box-shadow: none !important;
          }


          [data-theme-mode='light']
          .summary-retry-button:disabled {
            background-color: #e6e3eb !important;
            border-color: transparent !important;
            color: #9a96a6 !important;
          }


          [data-theme-mode='light']
          .summary-source-text {
            color: #5f5b78 !important;
          }
        `}
      </style>


      {/* Page Heading */}
      <div className="mb-8">
        <p className="summary-theme-text summary-accent mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
          AI Study Tools
        </p>

        <h1 className="summary-theme-text summary-heading text-3xl font-bold tracking-tight text-[#f3f0ff]">
          Generate Summary
        </h1>

        <p className="summary-theme-text summary-body mt-2 max-w-3xl text-sm leading-6 text-[#898cc0]">
          Create a clear AI-generated study summary from one of
          your uploaded documents.
        </p>
      </div>


      {/* Summary Settings */}
      <div className="summary-theme-surface summary-surface rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="summary-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">
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
                  d="M5 4h14v16H5V4Zm3 4h8M8 12h8M8 16h5"
                />
              </svg>
            </div>


            <div>
              <h2 className="summary-theme-text summary-heading text-xl font-semibold text-[#f3f0ff]">
                Summary Settings
              </h2>

              <p className="summary-theme-text summary-body mt-1 text-sm text-[#898cc0]">
                Select the study material you want to summarise.
              </p>
            </div>
          </div>


          {!consentInitialLoading &&
            consentStatus ===
              'granted' && (
              <Link
                to="/privacy"
                title="AI processing consent is granted. Manage consent."
                className="summary-theme-interactive summary-consent-badge inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:border-emerald-400/40 hover:bg-emerald-500/15"
              >
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  className="h-3.5 w-3.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m5 12 4 4L19 6"
                  />
                </svg>

                AI Consent On
              </Link>
            )}
        </div>


        <div className="mt-6">
          <label
            htmlFor="document"
            className="summary-theme-text summary-heading mb-2 block text-sm font-medium text-[#d9d4eb]"
          >
            Study Material
          </label>


          {documentsLoading ? (
            <div
              className="summary-theme-surface flex items-center gap-3 rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 p-4"
              role="status"
            >
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

              <p className="summary-theme-text summary-loading-text text-sm text-[#c9b4ff]">
                Loading your uploaded study materials...
              </p>
            </div>
          ) : documents.length ===
              0 &&
            !documentsError ? (
            <div className="summary-theme-surface rounded-lg border border-amber-400/20 bg-amber-500/[0.07] p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
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
                      d="M12 9v4m0 4h.01M10.3 4.6 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"
                    />
                  </svg>
                </div>


                <div>
                  <p className="summary-theme-text summary-warning-heading font-medium text-amber-200">
                    No uploaded study materials
                  </p>

                  <p className="summary-theme-text summary-warning-body mt-1 text-sm leading-6 text-amber-100/70">
                    Upload a PDF, DOCX or TXT document before
                    generating a summary.
                  </p>

                  <Link
                    to="/upload"
                    className="summary-theme-text summary-accent summary-link mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#a97cff]"
                  >
                    Upload Study Material

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
                        d="m9 18 6-6-6-6"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <AnimatedSelect
              id="document"
              value={
                selectedDocument
              }
              placeholder="Select a document"
              options={documents.map(
                (document) => ({
                  value:
                    document.file_id,

                  label:
                    document.file_name,
                })
              )}
              onChange={(
                newValue
              ) => {
                setSelectedDocument(
                  newValue
                )

                setGeneratedOutput(
                  null
                )

                setDisclaimer('')
                setError('')

                setRetryableError(
                  false
                )
              }}
            />
          )}
        </div>


        {/* Document Loading Error */}
        {documentsError && (
          <div
            className="summary-theme-surface mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
            role="alert"
          >
            <p className="summary-theme-text summary-error-text text-sm leading-6 text-red-300">
              {documentsError}
            </p>
          </div>
        )}


        {/* AI Consent Status */}
        <div className="mt-6">
          {consentInitialLoading ? (
            <div
              className="summary-theme-surface flex items-center gap-3 rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 p-4"
              role="status"
            >
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

              <p className="summary-theme-text summary-loading-text text-sm text-[#c9b4ff]">
                Checking your AI processing consent...
              </p>
            </div>
          ) : consentStatus !==
            'granted' ? (
            <AIConsentRequired
              featureName="AI-generated summaries"
            />
          ) : null}
        </div>


        {/* Consent Error */}
        {consentError && (
          <div
            className="summary-theme-surface mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
            role="alert"
          >
            <p className="summary-theme-text summary-error-text text-sm leading-6 text-red-300">
              {consentError}
            </p>
          </div>
        )}


        {/* Generation Error */}
        {error && (
          <div
            className="summary-theme-surface mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-400/10 text-red-300">
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
                    d="M12 9v4m0 4h.01M10.3 4.6 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"
                  />
                </svg>
              </div>


              <div>
                <p className="summary-theme-text summary-error-text text-sm leading-6 text-red-300">
                  {error}
                </p>

                {retryableError && (
                  <button
                    type="button"
                    onClick={
                      handleGenerateSummary
                    }
                    disabled={
                      generationLoading
                    }
                    className="summary-theme-interactive summary-retry-button mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#3a3150] disabled:text-[#77718d]"
                  >
                    {generationLoading && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#77718d]/40 border-t-[#c2c4e4]" />
                    )}

                    {generationLoading
                      ? 'Retrying...'
                      : 'Retry'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}


        {/* Generate Button */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={
              handleGenerateSummary
            }
            disabled={
              documentsLoading ||
              documents.length === 0 ||
              consentInitialLoading ||
              consentStatus !==
                'granted' ||
              generationLoading
            }
            className="summary-generate-button inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#9c46ff] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(122,68,255,0.18)] transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:from-[#3a3150] disabled:to-[#3a3150] disabled:text-[#77718d] disabled:shadow-none"
          >
            {generationLoading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}

            {generationLoading
              ? 'Generating Summary...'
              : 'Generate Summary'}
          </button>
        </div>
      </div>


      {/* Generated Summary */}
      {generatedOutput && (
        <div className="summary-theme-surface summary-surface mt-8 overflow-hidden rounded-xl border border-[#2a1b4d] bg-[#160b32]">
          <div className="summary-theme-border border-b border-[#2a1b4d] px-6 py-5 sm:px-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="summary-theme-text summary-heading text-2xl font-semibold text-[#f3f0ff]">
                    Generated Summary
                  </h2>


                  {generatedOutput.is_ai_generated && (
                    <span className="summary-theme-interactive summary-ai-badge rounded-full border border-[#7a44ff]/25 bg-[#7a44ff]/10 px-3 py-1 text-xs font-semibold text-[#c9b4ff]">
                      AI Generated
                    </span>
                  )}
                </div>


                <p className="summary-theme-text summary-muted mt-2 text-sm text-[#727494]">
                  Source:{' '}

                  <span className="summary-theme-text summary-source-text text-[#a6a8c7]">
                    {generatedOutput.file_name ||
                      selectedDocumentName}
                  </span>
                </p>
              </div>
            </div>
          </div>


          {/* Real AI Summary */}
          <div className="px-6 py-7 sm:px-7">
            <div className="summary-theme-surface summary-output-surface rounded-xl border border-[#2a1b4d] bg-[#120928]/50 p-5 sm:p-6">
              <p className="summary-theme-text summary-heading whitespace-pre-wrap text-[15px] leading-7 text-[#d9d4eb]">
                {generatedOutput.content}
              </p>
            </div>


            {/* Responsible AI Warning */}
            <div className="summary-theme-surface mt-6 rounded-lg border border-amber-400/20 bg-amber-500/[0.07] p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
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
                      d="M12 9v4m0 4h.01M10.3 4.6 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"
                    />
                  </svg>
                </div>


                <div>
                  <h3 className="summary-theme-text summary-warning-heading font-semibold text-amber-200">
                    AI-Generated Content
                  </h3>

                  <p className="summary-theme-text summary-warning-body mt-1 text-sm leading-6 text-amber-100/70">
                    {disclaimer ||
                      'This content was generated by AI and may contain errors or omissions. Please check it against your original study material.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


export default Summary