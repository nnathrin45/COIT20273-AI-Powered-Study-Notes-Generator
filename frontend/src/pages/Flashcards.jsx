import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getConsentStatus } from '../services/consentService'
import { getUploadedFiles } from '../services/uploadedService'
import { generateAIContent } from '../services/aiService'

function Flashcards() {
  const [documents, setDocuments] = useState([])
  const [selectedDocument, setSelectedDocument] = useState('')

  const [documentsLoading, setDocumentsLoading] =
    useState(true)
  const [documentsError, setDocumentsError] = useState('')

  const [flashcards, setFlashcards] = useState([])
  const [generatedOutput, setGeneratedOutput] = useState(null)
  const [disclaimer, setDisclaimer] = useState('')

  const [currentCard, setCurrentCard] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [generationLoading, setGenerationLoading] =
    useState(false)
  const [error, setError] = useState('')
  const [retryableError, setRetryableError] = useState(false)

  const [consentStatus, setConsentStatus] = useState(null)
  const [consentInitialLoading, setConsentInitialLoading] =
    useState(true)
  const [consentError, setConsentError] = useState('')

  useEffect(() => {
    const loadConsent = async () => {
      setConsentInitialLoading(true)
      setConsentError('')

      try {
        const response = await getConsentStatus()

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
          response.data?.consent?.status ?? null
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
        const response = await getUploadedFiles()

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

        setDocuments(response.data?.files ?? [])
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

  const clearGeneratedFlashcards = () => {
    setFlashcards([])
    setGeneratedOutput(null)
    setDisclaimer('')
    setCurrentCard(0)
    setShowAnswer(false)
  }

  const handleGenerate = async () => {
    if (!selectedDocument) {
      setError('Please select a study material first.')
      setRetryableError(false)
      clearGeneratedFlashcards()
      return
    }

    if (consentStatus !== 'granted') {
      setError(
        'Please grant AI processing consent before generating flashcards.'
      )
      setRetryableError(false)
      clearGeneratedFlashcards()
      return
    }

    setGenerationLoading(true)
    setError('')
    setRetryableError(false)
    clearGeneratedFlashcards()

    try {
      const response = await generateAIContent({
        fileId: Number(selectedDocument),
        outputType: 'flashcards',
      })

      if (!response.ok) {
        if (
          response.status === 403 &&
          response.data?.code === 'CONSENT_REQUIRED'
        ) {
          setConsentStatus('revoked')
          setError(
            'AI processing consent is required. Please manage your consent from the Dashboard.'
          )
          setRetryableError(false)
          return
        }

        if (response.status === 401) {
          setError(
            'Your login session is missing or invalid. Please sign in again.'
          )
          setRetryableError(false)
          return
        }

        if (response.status === 404) {
          setError(
            'The selected study material could not be found. Please select another document.'
          )
          setRetryableError(false)
          return
        }

        setError(
          response.data?.message ||
            'Unable to generate flashcards. Please try again.'
        )
        setRetryableError(response.data?.retryable === true)
        return
      }

      const output = response.data?.output
      const generatedCards = output?.content

      if (!Array.isArray(generatedCards)) {
        setError(
          'The server returned flashcards in an unexpected format.'
        )
        setRetryableError(false)
        return
      }

      if (generatedCards.length === 0) {
        setError(
          'No usable flashcards could be generated from this study material.'
        )
        setRetryableError(false)
        return
      }

      setGeneratedOutput(output)
      setFlashcards(generatedCards)
      setDisclaimer(response.data?.disclaimer ?? '')
      setCurrentCard(0)
      setShowAnswer(false)
      setRetryableError(false)
    } catch (generationError) {
      console.error(
        'Flashcard generation error:',
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

  const handleNext = () => {
    if (currentCard < flashcards.length - 1) {
      setCurrentCard(currentCard + 1)
      setShowAnswer(false)
    }
  }

  const handlePrevious = () => {
    if (currentCard > 0) {
      setCurrentCard(currentCard - 1)
      setShowAnswer(false)
    }
  }

  const selectedDocumentName =
    documents.find(
      (document) =>
        String(document.file_id) === selectedDocument
    )?.file_name || ''

  return (
    <div className="mx-auto max-w-5xl">

      {/* Page Heading */}
      <div className="mb-8">

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
          AI Study Tools
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-[#f3f0ff]">
          Flashcards
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#898cc0]">
          Generate flashcards from your uploaded study materials
          and use them for active recall practice.
        </p>

      </div>

      {/* Flashcard Generator */}
      <div className="rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6 sm:p-7">

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
                d="M5 5h12a2 2 0 0 1 2 2v10H7a2 2 0 0 1-2-2V5Zm2 12v2h12"
              />
            </svg>

          </div>

          <div>

            <h2 className="text-xl font-semibold text-[#f3f0ff]">
              Generate Flashcards
            </h2>

            <p className="mt-1 text-sm text-[#898cc0]">
              Select a document to create an AI-generated
              flashcard study set.
            </p>

          </div>

        </div>

        <div className="mt-6">

          <label
            htmlFor="flashcard-document"
            className="mb-2 block text-sm font-medium text-[#d9d4eb]"
          >
            Study Material
          </label>

          {documentsLoading ? (
            <div
              className="flex items-center gap-3 rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 p-4"
              role="status"
            >

              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

              <p className="text-sm text-[#c9b4ff]">
                Loading your uploaded study materials...
              </p>

            </div>
          ) : documents.length === 0 &&
            !documentsError ? (
            <div className="rounded-lg border border-amber-400/20 bg-amber-500/[0.07] p-5">

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

                  <p className="font-medium text-amber-200">
                    No uploaded study materials
                  </p>

                  <p className="mt-1 text-sm leading-6 text-amber-100/70">
                    Upload a PDF, DOCX or TXT document before
                    generating flashcards.
                  </p>

                  <Link
                    to="/upload"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#a97cff] transition hover:text-[#c9b4ff]"
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
            <select
              id="flashcard-document"
              value={selectedDocument}
              onChange={(event) => {
                setSelectedDocument(event.target.value)
                clearGeneratedFlashcards()
                setError('')
                setRetryableError(false)
              }}
              className="w-full rounded-lg border border-[#3a2860] bg-[#120928] px-4 py-3 text-[#d9d4eb] outline-none transition focus:border-[#7a44ff] focus:ring-2 focus:ring-[#7a44ff]/25"
            >
              <option value="">
                Select a document
              </option>

              {documents.map((document) => (
                <option
                  key={document.file_id}
                  value={document.file_id}
                >
                  {document.file_name}
                </option>
              ))}
            </select>
          )}

        </div>

        {/* Document Error */}
        {documentsError && (
          <div
            className="mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
            role="alert"
          >
            <p className="text-sm leading-6 text-red-300">
              {documentsError}
            </p>
          </div>
        )}

        {/* AI Consent Status */}
        <div className="mt-6">

          {consentInitialLoading ? (
            <div
              className="flex items-center gap-3 rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 p-4"
              role="status"
            >

              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

              <p className="text-sm text-[#c9b4ff]">
                Checking your AI processing consent...
              </p>

            </div>
          ) : consentStatus !== 'granted' ? (
            <div className="rounded-lg border border-amber-400/20 bg-amber-500/[0.07] p-5">

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
                      d="M12 3 4 7v5c0 4.5 3.2 7.6 8 9 4.8-1.4 8-4.5 8-9V7l-8-4Z"
                    />
                  </svg>

                </div>

                <div>

                  <p className="font-medium text-amber-200">
                    AI processing consent required
                  </p>

                  <p className="mt-1 text-sm leading-6 text-amber-100/70">
                    Grant AI processing consent from your Dashboard
                    before generating AI study content.
                  </p>

                  <Link
                    to="/dashboard"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#a97cff] transition hover:text-[#c9b4ff]"
                  >
                    Manage AI Consent

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
            <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4">

              <div className="flex items-center gap-3">

                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">

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

                <p className="text-sm font-medium text-emerald-300">
                  AI processing consent is granted.
                </p>

              </div>

            </div>
          )}

        </div>

        {/* Consent Error */}
        {consentError && (
          <div
            className="mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
            role="alert"
          >
            <p className="text-sm leading-6 text-red-300">
              {consentError}
            </p>
          </div>
        )}

        {/* Flashcard Error */}
        {error && (
          <div
            className="mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
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

                <p className="text-sm leading-6 text-red-300">
                  {error}
                </p>

                {retryableError && (
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generationLoading}
                    className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
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
            onClick={handleGenerate}
            disabled={
              documentsLoading ||
              documents.length === 0 ||
              consentInitialLoading ||
              consentStatus !== 'granted' ||
              generationLoading
            }
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#9c46ff] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(122,68,255,0.18)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-[#3a3150] disabled:to-[#3a3150] disabled:text-[#77718d] disabled:shadow-none"
          >

            {generationLoading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}

            {generationLoading
              ? 'Generating Flashcards...'
              : 'Generate Flashcards'}

          </button>

        </div>

      </div>

      {/* Generated Flashcards */}
      {flashcards.length > 0 && (
        <div className="mt-8">

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <div className="flex flex-wrap items-center gap-3">

                <h2 className="text-2xl font-semibold text-[#f3f0ff]">
                  Study Flashcards
                </h2>

                {generatedOutput?.is_ai_generated && (
                  <span className="rounded-full border border-[#7a44ff]/25 bg-[#7a44ff]/10 px-3 py-1 text-xs font-semibold text-[#c9b4ff]">
                    AI Generated
                  </span>
                )}

              </div>

              <p className="mt-2 text-sm text-[#727494]">
                Source:{' '}
                <span className="text-[#a6a8c7]">
                  {generatedOutput?.file_name ||
                    selectedDocumentName}
                </span>
              </p>

            </div>

            <div className="rounded-full border border-[#2a1b4d] bg-[#160b32] px-4 py-2 text-sm font-medium text-[#a6a8c7]">
              Card{' '}
              <span className="font-semibold text-[#c9b4ff]">
                {currentCard + 1}
              </span>{' '}
              of {flashcards.length}
            </div>

          </div>

          {/* Progress Bar */}
          <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-[#241743]">

            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7a44ff] to-[#d83dff] transition-all duration-300"
              style={{
                width: `${
                  ((currentCard + 1) / flashcards.length) * 100
                }%`,
              }}
            />

          </div>

          {/* Flashcard */}
          <div className="relative flex min-h-80 flex-col justify-between overflow-hidden rounded-2xl border border-[#2a1b4d] bg-[#160b32] p-7 shadow-[0_18px_50px_rgba(0,0,0,0.12)] sm:p-8">

            <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#7a44ff]/10 blur-3xl" />

            <div className="relative">

              <div className="flex items-center gap-2">

                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7a44ff]/10 text-[#a97cff]">

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
                      d="M9 8h6M9 12h6m-7 8h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"
                    />
                  </svg>

                </div>

                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
                  Question
                </p>

              </div>

              <h3 className="mt-5 max-w-4xl text-2xl font-semibold leading-relaxed text-[#f3f0ff]">
                {flashcards[currentCard]?.question}
              </h3>

              {showAnswer && (
                <div className="mt-8 border-t border-[#2a1b4d] pt-6">

                  <div className="flex items-center gap-2">

                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">

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

                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-300">
                      Answer
                    </p>

                  </div>

                  <p className="mt-4 max-w-4xl leading-7 text-[#d9d4eb]">
                    {flashcards[currentCard]?.answer}
                  </p>

                </div>
              )}

            </div>

            {!showAnswer && (
              <div className="relative mt-8">

                <button
                  type="button"
                  onClick={() => setShowAnswer(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#9c46ff] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(122,68,255,0.18)] transition hover:brightness-110 sm:w-auto"
                >

                  Reveal Answer

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
                      d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10 2.5A2.5 2.5 0 1 0 12 9a2.5 2.5 0 0 0 0 5.5Z"
                    />
                  </svg>

                </button>

              </div>
            )}

          </div>

          {/* Navigation */}
          <div className="mt-5 flex items-center justify-between gap-4">

            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentCard === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-[#3a2860] bg-[#160b32] px-5 py-2.5 text-sm font-medium text-[#c9b4ff] transition hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/10 disabled:cursor-not-allowed disabled:opacity-35"
            >

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
                  d="m15 18-6-6 6-6"
                />
              </svg>

              Previous

            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={
                currentCard === flashcards.length - 1
              }
              className="inline-flex items-center gap-2 rounded-lg border border-[#3a2860] bg-[#160b32] px-5 py-2.5 text-sm font-medium text-[#c9b4ff] transition hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/10 disabled:cursor-not-allowed disabled:opacity-35"
            >

              Next

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

            </button>

          </div>

          {/* Responsible AI Warning */}
          <div className="mt-6 rounded-lg border border-amber-400/20 bg-amber-500/[0.07] p-5">

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

                <h3 className="font-semibold text-amber-200">
                  AI-Generated Content
                </h3>

                <p className="mt-1 text-sm leading-6 text-amber-100/70">
                  {disclaimer ||
                    'This content was generated by AI and may contain errors or omissions. Please check it against your original study material.'}
                </p>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  )
}

export default Flashcards