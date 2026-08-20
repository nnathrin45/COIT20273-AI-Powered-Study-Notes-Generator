import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getConsentStatus } from '../services/consentService'
import { getUploadedFiles } from '../services/uploadedService'
import {
  generateAIContent,
  submitQuizAttempt,
} from '../services/aiService'

function Quiz() {
  const [documents, setDocuments] = useState([])
  const [selectedDocument, setSelectedDocument] = useState('')

  const [documentsLoading, setDocumentsLoading] =
    useState(true)
  const [documentsError, setDocumentsError] = useState('')

  const [questions, setQuestions] = useState([])
  const [generatedOutput, setGeneratedOutput] = useState(null)
  const [disclaimer, setDisclaimer] = useState('')

  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})
  const [attempt, setAttempt] = useState(null)

  const [generationLoading, setGenerationLoading] =
    useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState('')

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

  const clearQuiz = () => {
    setQuestions([])
    setGeneratedOutput(null)
    setDisclaimer('')
    setCurrentQuestion(0)
    setAnswers({})
    setAttempt(null)
  }

  const handleGenerateQuiz = async () => {
    if (!selectedDocument) {
      setError('Please select a study material first.')
      clearQuiz()
      return
    }

    if (consentStatus !== 'granted') {
      setError(
        'Please grant AI processing consent before generating a practice quiz.'
      )
      clearQuiz()
      return
    }

    setGenerationLoading(true)
    setError('')
    clearQuiz()

    try {
      const response = await generateAIContent({
        fileId: Number(selectedDocument),
        outputType: 'quiz',
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
          return
        }

        if (response.status === 401) {
          setError(
            'Your login session is missing or invalid. Please sign in again.'
          )
          return
        }

        if (response.status === 404) {
          setError(
            'The selected study material could not be found. Please select another document.'
          )
          return
        }

        setError(
          response.data?.message ||
            'Unable to generate the practice quiz. Please try again.'
        )
        return
      }

      const output = response.data?.output
      const generatedQuestions = output?.content

      if (!Array.isArray(generatedQuestions)) {
        setError(
          'The server returned the quiz in an unexpected format.'
        )
        return
      }

      if (generatedQuestions.length === 0) {
        setError(
          'No usable quiz questions could be generated from this study material.'
        )
        return
      }

      setGeneratedOutput(output)
      setQuestions(generatedQuestions)
      setDisclaimer(response.data?.disclaimer ?? '')
      setCurrentQuestion(0)
      setAnswers({})
      setAttempt(null)
    } catch (generationError) {
      console.error(
        'Quiz generation error:',
        generationError
      )

      setError(
        'Unable to connect to the server. Please try again.'
      )
    } finally {
      setGenerationLoading(false)
    }
  }

  const handleAnswer = (option) => {
    if (attempt) {
      return
    }

    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [currentQuestion]: option,
    }))
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handleSubmitQuiz = async () => {
    if (!generatedOutput?.output_id) {
      setError(
        'The generated quiz could not be identified. Please generate it again.'
      )
      return
    }

    const submittedAnswers = questions.map(
      (_, index) => answers[index] ?? null
    )

    setSubmitLoading(true)
    setError('')

    try {
      const response = await submitQuizAttempt({
        outputId: generatedOutput.output_id,
        answers: submittedAnswers,
      })

      if (!response.ok) {
        if (response.status === 401) {
          setError(
            'Your login session is missing or invalid. Please sign in again.'
          )
          return
        }

        if (response.status === 404) {
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

      const savedAttempt = response.data?.attempt

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
  }

  const selectedDocumentName =
    documents.find(
      (document) =>
        String(document.file_id) === selectedDocument
    )?.file_name || ''

  const answeredCount = Object.keys(answers).length

  const currentQuestionData =
    questions[currentQuestion]

  const currentResult =
    attempt?.results?.[currentQuestion]

  return (
    <div className="mx-auto max-w-5xl">

      {/* Page Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Practice Quiz
        </h1>

        <p className="mt-2 text-gray-600">
          Generate a practice quiz from your uploaded study
          materials and test your understanding.
        </p>
      </div>

      {/* Quiz Generator */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

        <h2 className="text-xl font-semibold text-gray-900">
          Generate Quiz
        </h2>

        <div className="mt-6">

          <label
            htmlFor="quiz-document"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Study Material
          </label>

          {documentsLoading ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-700">
                Loading your uploaded study materials...
              </p>
            </div>
          ) : documents.length === 0 &&
            !documentsError ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">

              <p className="font-medium text-amber-900">
                No uploaded study materials
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                Upload a PDF, DOCX or TXT document before
                generating a practice quiz.
              </p>

              <Link
                to="/upload"
                className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Upload Study Material
              </Link>

            </div>
          ) : (
            <select
              id="quiz-document"
              value={selectedDocument}
              onChange={(event) => {
                setSelectedDocument(event.target.value)
                clearQuiz()
                setError('')
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {documentsError}
            </p>
          </div>
        )}

        {/* AI Consent Status */}
        <div className="mt-6">
          {consentInitialLoading ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-700">
                Checking your AI processing consent...
              </p>
            </div>
          ) : consentStatus !== 'granted' ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">

              <p className="font-medium text-amber-900">
                AI processing consent required
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                Grant AI processing consent from your Dashboard
                before generating AI study content.
              </p>

              <Link
                to="/dashboard"
                className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Manage AI Consent
              </Link>

            </div>
          ) : null}
        </div>

        {consentError && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {consentError}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* Generate Button */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleGenerateQuiz}
            disabled={
              documentsLoading ||
              documents.length === 0 ||
              consentInitialLoading ||
              consentStatus !== 'granted' ||
              generationLoading
            }
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {generationLoading
              ? 'Generating Quiz...'
              : 'Generate Quiz'}
          </button>
        </div>

      </div>

      {/* Generated Quiz */}
      {questions.length > 0 && currentQuestionData && (
        <div className="mt-8">

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

            <div>
              <div className="flex flex-wrap items-center gap-2">

                <h2 className="text-2xl font-semibold text-gray-900">
                  Practice Questions
                </h2>

                {generatedOutput?.is_ai_generated && (
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                    AI Generated
                  </span>
                )}

              </div>

              <p className="mt-2 text-sm text-gray-500">
                Source:{' '}
                {generatedOutput?.file_name ||
                  selectedDocumentName}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Answered {answeredCount} of {questions.length}
              </p>
            </div>

            <p className="text-sm font-medium text-gray-500">
              Question {currentQuestion + 1} of{' '}
              {questions.length}
            </p>

          </div>

          {/* Question Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              {currentQuestionData.type === 'true_false'
                ? 'True or False'
                : 'Multiple Choice'}
            </p>

            <h3 className="mt-3 text-xl font-semibold leading-relaxed text-gray-900">
              {currentQuestionData.question}
            </h3>

            <div className="mt-6 space-y-3">

              {currentQuestionData.options.map(
                (option, optionIndex) => {
                  const selected =
                    answers[currentQuestion] === option

                  const correctAfterSubmission =
                    attempt &&
                    currentResult?.correct_answer === option

                  const incorrectSelected =
                    attempt &&
                    selected &&
                    !currentResult?.is_correct

                  let optionStyle =
                    'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'

                  if (selected && !attempt) {
                    optionStyle =
                      'border-blue-500 bg-blue-50'
                  }

                  if (correctAfterSubmission) {
                    optionStyle =
                      'border-green-500 bg-green-50'
                  }

                  if (incorrectSelected) {
                    optionStyle =
                      'border-red-500 bg-red-50'
                  }

                  return (
                    <button
                      key={`${currentQuestion}-${optionIndex}`}
                      type="button"
                      onClick={() =>
                        handleAnswer(option)
                      }
                      disabled={Boolean(attempt)}
                      className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition ${optionStyle}`}
                    >
                      <div
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                          selected
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-gray-300 text-gray-600'
                        }`}
                      >
                        {String.fromCharCode(
                          65 + optionIndex
                        )}
                      </div>

                      <span className="text-gray-800">
                        {option}
                      </span>

                    </button>
                  )
                }
              )}

            </div>

            {/* Answer Feedback */}
            {attempt && currentResult && (
              <div className="mt-6 rounded-lg bg-gray-50 p-4">

                {currentResult.is_correct ? (
                  <p className="font-medium text-green-700">
                    Correct answer.
                  </p>
                ) : (
                  <div>

                    <p className="font-medium text-red-700">
                      {currentResult.submitted === null
                        ? 'Question not answered.'
                        : 'Incorrect answer.'}
                    </p>

                    <p className="mt-1 text-sm text-gray-700">
                      Correct answer:{' '}
                      {currentResult.correct_answer}
                    </p>

                  </div>
                )}

              </div>
            )}

          </div>

          {/* Question Navigation */}
          <div className="mt-5 flex items-center justify-between">

            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={
                currentQuestion === questions.length - 1
              }
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>

          </div>

          {/* Quiz Submission */}
          {!attempt ? (
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

              <p className="text-sm text-gray-600">
                You have answered {answeredCount} of{' '}
                {questions.length} questions. Unanswered
                questions will be scored as incorrect.
              </p>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSubmitQuiz}
                  disabled={submitLoading}
                  className="rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {submitLoading
                    ? 'Submitting Quiz...'
                    : 'Submit Quiz'}
                </button>
              </div>

            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

              <h3 className="text-xl font-semibold text-gray-900">
                Quiz Result
              </h3>

              <p className="mt-4 text-3xl font-bold text-blue-600">
                {attempt.score} / {attempt.total}
              </p>

              <p className="mt-1 text-gray-600">
                Score: {attempt.percentage}%
              </p>

              <p className="mt-3 text-sm text-gray-500">
                Your result has been recorded for this quiz
                attempt.
              </p>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="rounded-lg border border-blue-600 bg-white px-5 py-2.5 font-medium text-blue-600 transition hover:bg-blue-50"
                >
                  Retake Quiz
                </button>
              </div>

            </div>
          )}

          {/* Responsible AI Warning */}
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5">

            <h3 className="font-semibold text-amber-900">
              AI-Generated Content
            </h3>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              {disclaimer ||
                'This content was generated by AI and may contain errors or omissions. Please check it against your original study material.'}
            </p>

          </div>

        </div>
      )}

    </div>
  )
}

export default Quiz