import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getConsentStatus } from '../services/consentService'
import { getUploadedFiles } from '../services/uploadedService'
import {
  generateAIContent,
  submitQuizAttempt,
} from '../services/aiService'
import AnimatedSelect from '../components/AnimatedSelect'
import AIConsentRequired from '../components/AIConsentRequired'


function Quiz() {
  const [documents, setDocuments] = useState([])
  const [selectedDocument, setSelectedDocument] = useState('')

  const [documentsLoading, setDocumentsLoading] =
    useState(true)

  const [documentsError, setDocumentsError] =
    useState('')

  const [questions, setQuestions] = useState([])

  const [
    generatedOutput,
    setGeneratedOutput,
  ] = useState(null)

  const [disclaimer, setDisclaimer] =
    useState('')

  const [
    currentQuestion,
    setCurrentQuestion,
  ] = useState(0)

  const [answers, setAnswers] =
    useState({})

  const [attempt, setAttempt] =
    useState(null)

  const [
    generationLoading,
    setGenerationLoading,
  ] = useState(false)

  const [
    submitLoading,
    setSubmitLoading,
  ] = useState(false)

  const [error, setError] =
    useState('')

  const [
    retryableError,
    setRetryableError,
  ] = useState(false)

  const [
    consentStatus,
    setConsentStatus,
  ] = useState(null)

  const [
    consentInitialLoading,
    setConsentInitialLoading,
  ] = useState(true)

  const [
    consentError,
    setConsentError,
  ] = useState('')


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


  const clearQuiz = () => {
    setQuestions([])
    setGeneratedOutput(null)
    setDisclaimer('')
    setCurrentQuestion(0)
    setAnswers({})
    setAttempt(null)
  }


  const handleGenerateQuiz =
    async () => {
      if (!selectedDocument) {
        setError(
          'Please select a study material first.'
        )

        setRetryableError(false)
        clearQuiz()

        return
      }

      if (
        consentStatus !== 'granted'
      ) {
        setError(
          'Please grant AI processing consent before generating a practice quiz.'
        )

        setRetryableError(false)
        clearQuiz()

        return
      }

      setGenerationLoading(true)
      setError('')
      setRetryableError(false)
      clearQuiz()

      try {
        const response =
          await generateAIContent({
            fileId:
              Number(selectedDocument),

            outputType: 'quiz',
          })

        if (!response.ok) {
          if (
            response.status === 403 &&
            response.data?.code ===
              'CONSENT_REQUIRED'
          ) {
            setConsentStatus(
              'revoked'
            )

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
              'Unable to generate the practice quiz. Please try again.'
          )

          setRetryableError(
            response.data?.retryable ===
              true
          )

          return
        }

        const output =
          response.data?.output

        const generatedQuestions =
          output?.content

        if (
          !Array.isArray(
            generatedQuestions
          )
        ) {
          setError(
            'The server returned the quiz in an unexpected format.'
          )

          setRetryableError(false)

          return
        }

        if (
          generatedQuestions.length ===
          0
        ) {
          setError(
            'No usable quiz questions could be generated from this study material.'
          )

          setRetryableError(false)

          return
        }

        setGeneratedOutput(output)

        setQuestions(
          generatedQuestions
        )

        setDisclaimer(
          response.data?.disclaimer ??
            ''
        )

        setCurrentQuestion(0)
        setAnswers({})
        setAttempt(null)
        setRetryableError(false)
      } catch (generationError) {
        console.error(
          'Quiz generation error:',
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


  const handleAnswer = (option) => {
    if (attempt) {
      return
    }

    setAnswers(
      (currentAnswers) => ({
        ...currentAnswers,

        [currentQuestion]:
          option,
      })
    )
  }


  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(
        currentQuestion - 1
      )
    }
  }


  const handleNext = () => {
    if (
      currentQuestion <
      questions.length - 1
    ) {
      setCurrentQuestion(
        currentQuestion + 1
      )
    }
  }


  const handleSubmitQuiz =
    async () => {
      if (
        !generatedOutput?.output_id
      ) {
        setError(
          'The generated quiz could not be identified. Please generate it again.'
        )

        setRetryableError(false)

        return
      }

      const submittedAnswers =
        questions.map(
          (_, index) =>
            answers[index] ?? null
        )

      setSubmitLoading(true)
      setError('')
      setRetryableError(false)

      try {
        const response =
          await submitQuizAttempt({
            outputId:
              generatedOutput.output_id,

            answers:
              submittedAnswers,
          })

        if (!response.ok) {
          if (
            response.status === 401
          ) {
            setError(
              'Your login session is missing or invalid. Please sign in again.'
            )

            return
          }

          if (
            response.status === 404
          ) {
            setError(
              'The generated quiz could not be found. Please generate a new quiz.'
            )

            return
          }

          setError(
            response.data?.message ||
              'Unable to submit the quiz. Please try again.'
          )

          return
        }

        const savedAttempt =
          response.data?.attempt

        if (!savedAttempt) {
          setError(
            'The server returned the quiz result in an unexpected format.'
          )

          return
        }

        setAttempt(savedAttempt)
      } catch (submitError) {
        console.error(
          'Quiz submission error:',
          submitError
        )

        setError(
          'Unable to connect to the server while submitting the quiz. Please try again.'
        )
      } finally {
        setSubmitLoading(false)
      }
    }


  const handleRetake = () => {
    setAnswers({})
    setAttempt(null)
    setCurrentQuestion(0)
    setError('')
    setRetryableError(false)
  }


  const selectedDocumentName =
    documents.find(
      (document) =>
        String(
          document.file_id
        ) === selectedDocument
    )?.file_name || ''


  const answeredCount =
    Object.keys(answers).length


  const currentQuestionData =
    questions[currentQuestion]


  const currentResult =
    attempt?.results?.[
      currentQuestion
    ]


  return (
    <div className="quiz-theme mx-auto max-w-5xl">
      <style>
        {`
          .quiz-theme-text {
            transition:
              color 100ms ease;
          }

          .quiz-theme-surface {
            transition:
              background-color 500ms ease,
              border-color 500ms ease,
              box-shadow 300ms ease;
          }

          .quiz-theme-interactive {
            transition:
              color 100ms ease,
              background-color 300ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease,
              opacity 300ms ease,
              filter 300ms ease;
          }

          .quiz-theme-border {
            transition:
              border-color 500ms ease;
          }


          [data-theme-mode='light']
          .quiz-heading {
            color: #171717 !important;
          }

          [data-theme-mode='light']
          .quiz-body {
            color: #65676b !important;
          }

          [data-theme-mode='light']
          .quiz-muted {
            color: #7a7575 !important;
          }

          [data-theme-mode='light']
          .quiz-accent {
            color: #7a44ff !important;
          }

          [data-theme-mode='light']
          .quiz-accent-soft {
            color: #6f42c1 !important;
          }


          [data-theme-mode='light']
          .quiz-surface {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;
          }


          [data-theme-mode='light']
          .quiz-loading-text {
            color: #6f42c1 !important;
          }


          [data-theme-mode='light']
          .quiz-error-text {
            color: #b91c1c !important;
          }


          [data-theme-mode='light']
          .quiz-warning-heading {
            color: #92400e !important;
          }

          [data-theme-mode='light']
          .quiz-warning-body {
            color: #a16207 !important;
          }


          [data-theme-mode='light']
          .quiz-consent-badge {
            color: #047857 !important;

            background-color:
              rgba(
                16,
                185,
                129,
                0.08
              ) !important;

            border-color:
              rgba(
                16,
                185,
                129,
                0.25
              ) !important;
          }


          [data-theme-mode='light']
          .quiz-ai-badge {
            color: #6f42c1 !important;

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
          }


          [data-theme-mode='light']
          .quiz-link:hover {
            color: #6634e8 !important;
          }


          [data-theme-mode='light']
          .quiz-generate-button:disabled,
          [data-theme-mode='light']
          .quiz-submit-button:disabled {
            background-image:
              none !important;

            background-color:
              #e6e3eb !important;

            color:
              #9a96a6 !important;

            box-shadow:
              none !important;

            opacity: 1 !important;
          }


          [data-theme-mode='light']
          .quiz-retry-button:disabled {
            background-color:
              #e6e3eb !important;

            border-color:
              transparent !important;

            color:
              #9a96a6 !important;
          }


          [data-theme-mode='light']
          .quiz-source {
            color: #5f5b78 !important;
          }


          [data-theme-mode='light']
          .quiz-counter {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;

            color:
              #65676b !important;
          }


          [data-theme-mode='light']
          .quiz-progress-track {
            background-color:
              #e5e1ec !important;
          }


          [data-theme-mode='light']
          .quiz-question-card {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;

            box-shadow:
              0 18px 50px
              rgba(
                50,
                39,
                75,
                0.06
              ) !important;
          }


          /*
           * Default Answer Option
           */
          [data-theme-mode='light']
          .quiz-option-default {
            background-color:
              #f7f7fb !important;

            border-color:
              #dfdfdf !important;
          }

          [data-theme-mode='light']
          .quiz-option-default:hover {
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
                0.5
              ) !important;
          }

          [data-theme-mode='light']
          .quiz-option-circle-default {
            background-color:
              #ffffff !important;

            border-color:
              #c9c9d3 !important;

            color:
              #65676b !important;
          }

          [data-theme-mode='light']
          .quiz-option-text-default {
            color: #2b2b33 !important;
          }


          /*
           * Selected Answer Option
           */
          [data-theme-mode='light']
          .quiz-option-selected {
            background-color:
              rgba(
                122,
                68,
                255,
                0.09
              ) !important;

            border-color:
              #7a44ff !important;

            box-shadow:
              0 0 0 1px
              rgba(
                122,
                68,
                255,
                0.10
              ) !important;
          }

          [data-theme-mode='light']
          .quiz-option-circle-selected {
            background-color:
              #7a44ff !important;

            border-color:
              #7a44ff !important;

            color:
              #ffffff !important;
          }

          [data-theme-mode='light']
          .quiz-option-text-selected {
            color: #4c248f !important;
          }


          /*
           * Correct Answer
           */
          [data-theme-mode='light']
          .quiz-option-correct {
            background-color:
              rgba(
                16,
                185,
                129,
                0.08
              ) !important;

            border-color:
              rgba(
                16,
                185,
                129,
                0.45
              ) !important;
          }

          [data-theme-mode='light']
          .quiz-option-circle-correct {
            background-color:
              rgba(
                16,
                185,
                129,
                0.12
              ) !important;

            border-color:
              rgba(
                16,
                185,
                129,
                0.45
              ) !important;

            color:
              #047857 !important;
          }

          [data-theme-mode='light']
          .quiz-option-text-correct {
            color:
              #047857 !important;
          }


          /*
           * Incorrect Answer
           */
          [data-theme-mode='light']
          .quiz-option-incorrect {
            background-color:
              rgba(
                239,
                68,
                68,
                0.07
              ) !important;

            border-color:
              rgba(
                239,
                68,
                68,
                0.4
              ) !important;
          }

          [data-theme-mode='light']
          .quiz-option-circle-incorrect {
            background-color:
              rgba(
                239,
                68,
                68,
                0.10
              ) !important;

            border-color:
              rgba(
                239,
                68,
                68,
                0.4
              ) !important;

            color:
              #b91c1c !important;
          }

          [data-theme-mode='light']
          .quiz-option-text-incorrect {
            color:
              #b91c1c !important;
          }


          /*
           * Submission Feedback
           */
          [data-theme-mode='light']
          .quiz-correct-text {
            color:
              #047857 !important;
          }

          [data-theme-mode='light']
          .quiz-incorrect-text {
            color:
              #b91c1c !important;
          }

          [data-theme-mode='light']
          .quiz-incorrect-detail {
            color:
              #991b1b !important;
          }


          /*
           * Question Navigation
           */
          [data-theme-mode='light']
          .quiz-navigation-button {
            background-color:
              #ffffff !important;

            border-color:
              #d7d3df !important;

            color:
              #6f42c1 !important;
          }

          [data-theme-mode='light']
          .quiz-navigation-button:hover:not(:disabled) {
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
                0.55
              ) !important;

            color:
              #7a44ff !important;
          }

          [data-theme-mode='light']
          .quiz-navigation-button:disabled {
            background-color:
              #f1eff4 !important;

            border-color:
              #dfdfdf !important;

            color:
              #aaa6b1 !important;

            opacity:
              1 !important;
          }


          /*
           * Submission Card
           */
          [data-theme-mode='light']
          .quiz-submit-card {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;
          }


          /*
           * Result Card
           */
          [data-theme-mode='light']
          .quiz-result-card {
            background:
              linear-gradient(
                135deg,
                #f8f5ff,
                #ffffff
              ) !important;

            border-color:
              rgba(
                122,
                68,
                255,
                0.28
              ) !important;
          }


          [data-theme-mode='light']
          .quiz-retake-button {
            color:
              #6f42c1 !important;

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
                0.4
              ) !important;
          }

          [data-theme-mode='light']
          .quiz-retake-button:hover {
            color:
              #7a44ff !important;

            background-color:
              rgba(
                122,
                68,
                255,
                0.12
              ) !important;
          }
        `}
      </style>


      {/* Page Heading */}
      <div className="mb-8">
        <p className="quiz-theme-text quiz-accent mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
          AI Study Tools
        </p>

        <h1 className="quiz-theme-text quiz-heading text-3xl font-bold tracking-tight text-[#f3f0ff]">
          Practice Quiz
        </h1>

        <p className="quiz-theme-text quiz-body mt-2 max-w-3xl text-sm leading-6 text-[#898cc0]">
          Generate a practice quiz from your uploaded study
          materials and test your understanding.
        </p>
      </div>


      {/* Quiz Generator */}
      <div className="quiz-theme-surface quiz-surface rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="quiz-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">
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
                  d="M8 3h8a2 2 0 0 1 2 2v16H6V5a2 2 0 0 1 2-2Zm2 5h4m-4 4h4m-4 4h2"
                />
              </svg>
            </div>

            <div>
              <h2 className="quiz-theme-text quiz-heading text-xl font-semibold text-[#f3f0ff]">
                Generate Quiz
              </h2>

              <p className="quiz-theme-text quiz-body mt-1 text-sm text-[#898cc0]">
                Select a study document to create an
                AI-generated practice quiz.
              </p>
            </div>
          </div>


          {!consentInitialLoading &&
            consentStatus ===
              'granted' && (
              <Link
                to="/privacy"
                title="AI processing consent is granted. Manage consent."
                className="quiz-theme-interactive quiz-consent-badge inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:border-emerald-400/40 hover:bg-emerald-500/15"
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
            htmlFor="quiz-document"
            className="quiz-theme-text quiz-heading mb-2 block text-sm font-medium text-[#d9d4eb]"
          >
            Study Material
          </label>


          {documentsLoading ? (
            <div
              className="quiz-theme-surface flex items-center gap-3 rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 p-4"
              role="status"
            >
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

              <p className="quiz-theme-text quiz-loading-text text-sm text-[#c9b4ff]">
                Loading your uploaded study materials...
              </p>
            </div>
          ) : documents.length ===
              0 &&
            !documentsError ? (
            <div className="quiz-theme-surface rounded-lg border border-amber-400/20 bg-amber-500/[0.07] p-5">
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
                  <p className="quiz-theme-text quiz-warning-heading font-medium text-amber-200">
                    No uploaded study materials
                  </p>

                  <p className="quiz-theme-text quiz-warning-body mt-1 text-sm leading-6 text-amber-100/70">
                    Upload a PDF, DOCX or TXT document before
                    generating a practice quiz.
                  </p>

                  <Link
                    to="/upload"
                    className="quiz-theme-text quiz-accent quiz-link mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#a97cff]"
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
              id="quiz-document"
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

                clearQuiz()

                setError('')

                setRetryableError(
                  false
                )
              }}
            />
          )}
        </div>


        {/* Document Error */}
        {documentsError && (
          <div
            className="quiz-theme-surface mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
            role="alert"
          >
            <p className="quiz-theme-text quiz-error-text text-sm leading-6 text-red-300">
              {documentsError}
            </p>
          </div>
        )}


        {/* AI Consent Status */}
        <div className="mt-6">
          {consentInitialLoading ? (
            <div
              className="quiz-theme-surface flex items-center gap-3 rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 p-4"
              role="status"
            >
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

              <p className="quiz-theme-text quiz-loading-text text-sm text-[#c9b4ff]">
                Checking your AI processing consent...
              </p>
            </div>
          ) : consentStatus !==
            'granted' ? (
            <AIConsentRequired
              featureName="AI-generated practice quizzes"
            />
          ) : null}
        </div>


        {/* Consent Error */}
        {consentError && (
          <div
            className="quiz-theme-surface mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
            role="alert"
          >
            <p className="quiz-theme-text quiz-error-text text-sm leading-6 text-red-300">
              {consentError}
            </p>
          </div>
        )}


        {/* Quiz Error */}
        {error && (
          <div
            className="quiz-theme-surface mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
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
                <p className="quiz-theme-text quiz-error-text text-sm leading-6 text-red-300">
                  {error}
                </p>

                {retryableError && (
                  <button
                    type="button"
                    onClick={
                      handleGenerateQuiz
                    }
                    disabled={
                      generationLoading
                    }
                    className="quiz-theme-interactive quiz-retry-button mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#3a3150] disabled:text-[#77718d]"
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
              handleGenerateQuiz
            }
            disabled={
              documentsLoading ||
              documents.length ===
                0 ||
              consentInitialLoading ||
              consentStatus !==
                'granted' ||
              generationLoading
            }
            className="quiz-generate-button inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#9c46ff] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(122,68,255,0.18)] transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:from-[#3a3150] disabled:to-[#3a3150] disabled:text-[#77718d] disabled:shadow-none"
          >
            {generationLoading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}

            {generationLoading
              ? 'Generating Quiz...'
              : 'Generate Quiz'}
          </button>
        </div>
      </div>


      {/* Generated Quiz */}
      {questions.length > 0 &&
        currentQuestionData && (
          <div className="mt-8">
            {/* Quiz Heading */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="quiz-theme-text quiz-heading text-2xl font-semibold text-[#f3f0ff]">
                    Practice Questions
                  </h2>

                  {generatedOutput?.is_ai_generated && (
                    <span className="quiz-theme-interactive quiz-ai-badge rounded-full border border-[#7a44ff]/25 bg-[#7a44ff]/10 px-3 py-1 text-xs font-semibold text-[#c9b4ff]">
                      AI Generated
                    </span>
                  )}
                </div>

                <p className="quiz-theme-text quiz-muted mt-2 text-sm text-[#727494]">
                  Source:{' '}

                  <span className="quiz-theme-text quiz-source text-[#a6a8c7]">
                    {generatedOutput?.file_name ||
                      selectedDocumentName}
                  </span>
                </p>

                <p className="quiz-theme-text quiz-muted mt-1 text-sm text-[#727494]">
                  Answered{' '}

                  <span className="quiz-theme-text quiz-accent-soft font-semibold text-[#c9b4ff]">
                    {answeredCount}
                  </span>{' '}

                  of {questions.length}
                </p>
              </div>


              <div className="quiz-theme-surface quiz-counter rounded-full border border-[#2a1b4d] bg-[#160b32] px-4 py-2 text-sm font-medium text-[#a6a8c7]">
                Question{' '}

                <span className="quiz-theme-text quiz-accent-soft font-semibold text-[#c9b4ff]">
                  {currentQuestion + 1}
                </span>{' '}

                of {questions.length}
              </div>
            </div>


            {/* Progress Bar */}
            <div className="quiz-theme-surface quiz-progress-track mb-5 h-1.5 overflow-hidden rounded-full bg-[#241743]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7a44ff] to-[#d83dff] transition-all duration-300"
                style={{
                  width: `${(
                    (currentQuestion +
                      1) /
                    questions.length
                  ) * 100}%`,
                }}
              />
            </div>


            {/* Question Card */}
            <div className="quiz-theme-surface quiz-question-card relative overflow-hidden rounded-2xl border border-[#2a1b4d] bg-[#160b32] p-6 sm:p-7">
              <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#7a44ff]/10 blur-3xl" />

              <div className="relative">
                <p className="quiz-theme-text quiz-accent text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
                  {currentQuestionData.type ===
                  'true_false'
                    ? 'True or False'
                    : 'Multiple Choice'}
                </p>

                <h3 className="quiz-theme-text quiz-heading mt-4 max-w-4xl text-xl font-semibold leading-relaxed text-[#f3f0ff]">
                  {
                    currentQuestionData.question
                  }
                </h3>


                {/* Options */}
                <div className="mt-6 space-y-3">
                  {currentQuestionData.options.map(
                    (
                      option,
                      optionIndex
                    ) => {
                      const selected =
                        answers[
                          currentQuestion
                        ] === option

                      const correctAfterSubmission =
                        attempt &&
                        currentResult
                          ?.correct_answer ===
                          option

                      const incorrectSelected =
                        attempt &&
                        selected &&
                        !currentResult
                          ?.is_correct

                      let optionStyle =
                        'quiz-option-default border-[#2a1b4d] bg-[#120928]/45 hover:border-[#7a44ff]/50 hover:bg-[#7a44ff]/10'

                      let circleStyle =
                        'quiz-option-circle-default border-[#4a3a68] bg-[#160b32] text-[#898cc0]'

                      let optionTextStyle =
                        'quiz-option-text-default text-[#d9d4eb]'

                      if (
                        selected &&
                        !attempt
                      ) {
                        optionStyle =
                          'quiz-option-selected border-[#7a44ff] bg-[#7a44ff]/15 shadow-[0_0_0_1px_rgba(122,68,255,0.15)]'

                        circleStyle =
                          'quiz-option-circle-selected border-[#7a44ff] bg-[#7a44ff] text-white'

                        optionTextStyle =
                          'quiz-option-text-selected text-[#f3f0ff]'
                      }

                      if (
                        correctAfterSubmission
                      ) {
                        optionStyle =
                          'quiz-option-correct border-emerald-400/50 bg-emerald-500/10'

                        circleStyle =
                          'quiz-option-circle-correct border-emerald-400/50 bg-emerald-400/15 text-emerald-300'

                        optionTextStyle =
                          'quiz-option-text-correct text-emerald-200'
                      }

                      if (
                        incorrectSelected
                      ) {
                        optionStyle =
                          'quiz-option-incorrect border-red-400/50 bg-red-500/10'

                        circleStyle =
                          'quiz-option-circle-incorrect border-red-400/50 bg-red-400/15 text-red-300'

                        optionTextStyle =
                          'quiz-option-text-incorrect text-red-200'
                      }

                      return (
                        <button
                          key={`${currentQuestion}-${optionIndex}`}
                          type="button"
                          onClick={() =>
                            handleAnswer(
                              option
                            )
                          }
                          disabled={Boolean(
                            attempt
                          )}
                          className={`quiz-theme-interactive flex w-full items-start gap-3 rounded-lg border p-4 text-left disabled:cursor-default ${optionStyle}`}
                        >
                          <div
                            className={`quiz-theme-interactive mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${circleStyle}`}
                          >
                            {String.fromCharCode(
                              65 +
                                optionIndex
                            )}
                          </div>

                          <span
                            className={`quiz-theme-text leading-6 ${optionTextStyle}`}
                          >
                            {option}
                          </span>
                        </button>
                      )
                    }
                  )}
                </div>


                {/* Answer Feedback */}
                {attempt &&
                  currentResult && (
                    <div
                      className={`quiz-theme-surface mt-6 rounded-lg border p-4 ${
                        currentResult.is_correct
                          ? 'border-emerald-400/20 bg-emerald-500/10'
                          : 'border-red-400/20 bg-red-500/10'
                      }`}
                    >
                      {currentResult.is_correct ? (
                        <div className="flex items-start gap-3">
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

                          <p className="quiz-theme-text quiz-correct-text font-medium text-emerald-300">
                            Correct answer.
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-400/10 text-red-300">
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
                            <p className="quiz-theme-text quiz-incorrect-text font-medium text-red-300">
                              {currentResult.submitted ===
                              null
                                ? 'Question not answered.'
                                : 'Incorrect answer.'}
                            </p>

                            <p className="quiz-theme-text quiz-incorrect-detail mt-1 text-sm text-red-100/70">
                              Correct answer:{' '}

                              <span className="font-medium text-red-200">
                                {
                                  currentResult.correct_answer
                                }
                              </span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>


            {/* Question Navigation */}
            <div className="mt-5 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={
                  handlePrevious
                }
                disabled={
                  currentQuestion ===
                  0
                }
                className="quiz-theme-interactive quiz-navigation-button inline-flex items-center gap-2 rounded-lg border border-[#3a2860] bg-[#160b32] px-5 py-2.5 text-sm font-medium text-[#c9b4ff] hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/10 disabled:cursor-not-allowed disabled:opacity-35"
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
                onClick={
                  handleNext
                }
                disabled={
                  currentQuestion ===
                  questions.length -
                    1
                }
                className="quiz-theme-interactive quiz-navigation-button inline-flex items-center gap-2 rounded-lg border border-[#3a2860] bg-[#160b32] px-5 py-2.5 text-sm font-medium text-[#c9b4ff] hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/10 disabled:cursor-not-allowed disabled:opacity-35"
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


            {/* Quiz Submission */}
            {!attempt ? (
              <div className="quiz-theme-surface quiz-submit-card mt-6 rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="quiz-theme-text quiz-heading font-medium text-[#d9d4eb]">
                      Ready to submit?
                    </p>

                    <p className="quiz-theme-text quiz-body mt-1 text-sm leading-6 text-[#898cc0]">
                      You have answered{' '}

                      <span className="quiz-theme-text quiz-accent-soft font-semibold text-[#c9b4ff]">
                        {answeredCount}
                      </span>{' '}

                      of {questions.length} questions. Unanswered
                      questions will be scored as incorrect.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleSubmitQuiz
                    }
                    disabled={
                      submitLoading
                    }
                    className="quiz-submit-button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#9c46ff] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(122,68,255,0.18)] transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitLoading && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    )}

                    {submitLoading
                      ? 'Submitting Quiz...'
                      : 'Submit Quiz'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="quiz-theme-surface quiz-result-card relative mt-6 overflow-hidden rounded-xl border border-[#7a44ff]/30 bg-gradient-to-br from-[#1a0c38] to-[#160b32] p-6">
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#7a44ff]/15 blur-3xl" />

                <div className="relative">
                  <p className="quiz-theme-text quiz-accent text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
                    Completed
                  </p>

                  <h3 className="quiz-theme-text quiz-heading mt-2 text-xl font-semibold text-[#f3f0ff]">
                    Quiz Result
                  </h3>

                  <div className="mt-5 flex flex-wrap items-end gap-3">
                    <p className="quiz-theme-text quiz-accent-soft text-4xl font-bold tracking-tight text-[#c9b4ff]">
                      {attempt.score}
                    </p>

                    <p className="quiz-theme-text quiz-body pb-1 text-lg text-[#898cc0]">
                      / {attempt.total}
                    </p>
                  </div>

                  <p className="quiz-theme-text quiz-heading mt-2 text-sm text-[#d9d4eb]">
                    Score:{' '}

                    <span className="quiz-theme-text quiz-accent-soft font-semibold text-[#c9b4ff]">
                      {
                        attempt.percentage
                      }
                      %
                    </span>
                  </p>

                  <p className="quiz-theme-text quiz-body mt-3 text-sm leading-6 text-[#898cc0]">
                    Your result has been recorded for this quiz
                    attempt.
                  </p>

                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={
                        handleRetake
                      }
                      className="quiz-theme-interactive quiz-retake-button inline-flex items-center gap-2 rounded-lg border border-[#7a44ff]/50 bg-[#7a44ff]/10 px-5 py-2.5 text-sm font-semibold text-[#c9b4ff] hover:bg-[#7a44ff]/20"
                    >
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
                          d="M4 4v6h6M20 20v-6h-6M5.5 15a7 7 0 0 0 12 2M18.5 9A7 7 0 0 0 6.5 7"
                        />
                      </svg>

                      Retake Quiz
                    </button>
                  </div>
                </div>
              </div>
            )}


            {/* Responsible AI Warning */}
            <div className="quiz-theme-surface mt-6 rounded-lg border border-amber-400/20 bg-amber-500/[0.07] p-5">
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
                  <h3 className="quiz-theme-text quiz-warning-heading font-semibold text-amber-200">
                    AI-Generated Content
                  </h3>

                  <p className="quiz-theme-text quiz-warning-body mt-1 text-sm leading-6 text-amber-100/70">
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


export default Quiz