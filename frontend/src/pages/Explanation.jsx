import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getConsentStatus } from '../services/consentService'
import { getUploadedFiles } from '../services/uploadedService'
import { generateAIContent } from '../services/aiService'

function Explanation() {
  const [documents, setDocuments] = useState([])
  const [selectedDocument, setSelectedDocument] = useState('')
  const [concept, setConcept] = useState('')
  const [explanationLevel, setExplanationLevel] =
    useState('beginner')

  const [documentsLoading, setDocumentsLoading] =
    useState(true)
  const [documentsError, setDocumentsError] = useState('')

  const [generatedOutput, setGeneratedOutput] = useState(null)
  const [disclaimer, setDisclaimer] = useState('')
  const [generationLoading, setGenerationLoading] =
    useState(false)
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

  const clearGeneratedExplanation = () => {
    setGeneratedOutput(null)
    setDisclaimer('')
  }

  const handleGenerateExplanation = async () => {
    if (!selectedDocument) {
      setError('Please select a study material first.')
      clearGeneratedExplanation()
      return
    }

    if (!concept.trim()) {
      setError(
        'Please enter a concept or topic you would like explained.'
      )
      clearGeneratedExplanation()
      return
    }

    if (consentStatus !== 'granted') {
      setError(
        'Please grant AI processing consent before generating a concept explanation.'
      )
      clearGeneratedExplanation()
      return
    }

    setGenerationLoading(true)
    setError('')
    clearGeneratedExplanation()

    try {
      const response = await generateAIContent({
        fileId: Number(selectedDocument),
        outputType: 'explanation',
        concept: concept.trim(),
        level: explanationLevel,
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

        if (
          response.status === 400 &&
          response.data?.code === 'MISSING_CONCEPT'
        ) {
          setError(
            'Please enter a concept or topic you would like explained.'
          )
          return
        }

        if (
          response.status === 400 &&
          response.data?.code === 'INVALID_LEVEL'
        ) {
          setError(
            'Please select a valid explanation level.'
          )
          return
        }

        setError(
          response.data?.message ||
            'Unable to generate the explanation. Please try again.'
        )
        return
      }

      const output = response.data?.output

      if (
        !output ||
        typeof output.content !== 'string' ||
        !output.content.trim()
      ) {
        setError(
          'The server returned the explanation in an unexpected format.'
        )
        return
      }

      setGeneratedOutput(output)
      setDisclaimer(response.data?.disclaimer ?? '')
    } catch (generationError) {
      console.error(
        'Explanation generation error:',
        generationError
      )

      setError(
        'Unable to connect to the server. Please try again.'
      )
    } finally {
      setGenerationLoading(false)
    }
  }

  const selectedDocumentName =
    documents.find(
      (document) =>
        String(document.file_id) === selectedDocument
    )?.file_name || ''

  const getLevelLabel = (level) => {
    if (level === 'intermediate') {
      return 'Intermediate'
    }

    if (level === 'advanced') {
      return 'Advanced'
    }

    return 'Beginner'
  }

  return (
    <div className="mx-auto max-w-5xl">

      {/* Page Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Concept Explanation
        </h1>

        <p className="mt-2 text-gray-600">
          Select a study material and request a clearer
          explanation of a topic or concept.
        </p>
      </div>

      {/* Explanation Generator */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

        <h2 className="text-xl font-semibold text-gray-900">
          Explain a Concept
        </h2>

        <div className="mt-6 grid gap-6 md:grid-cols-2">

          {/* Document */}
          <div>
            <label
              htmlFor="explanation-document"
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
                  generating a concept explanation.
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
                id="explanation-document"
                value={selectedDocument}
                onChange={(event) => {
                  setSelectedDocument(event.target.value)
                  clearGeneratedExplanation()
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

          {/* Explanation Level */}
          <div>
            <label
              htmlFor="explanation-level"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Explanation Level
            </label>

            <select
              id="explanation-level"
              value={explanationLevel}
              onChange={(event) => {
                setExplanationLevel(event.target.value)
                clearGeneratedExplanation()
                setError('')
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="beginner">
                Beginner
              </option>

              <option value="intermediate">
                Intermediate
              </option>

              <option value="advanced">
                Advanced
              </option>
            </select>
          </div>

        </div>

        {/* Concept */}
        <div className="mt-6">

          <label
            htmlFor="concept"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Concept or Topic
          </label>

          <input
            id="concept"
            type="text"
            value={concept}
            onChange={(event) => {
              setConcept(event.target.value)
              clearGeneratedExplanation()
              setError('')
            }}
            placeholder="e.g. Machine learning, database normalisation..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <p className="mt-2 text-sm text-gray-500">
            Enter a concept that appears in your selected study
            material.
          </p>

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

        {/* Consent Error */}
        {consentError && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {consentError}
            </p>
          </div>
        )}

        {/* Explanation Error */}
        {error && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* Generate */}
        <div className="mt-6 flex justify-end">

          <button
            type="button"
            onClick={handleGenerateExplanation}
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
              ? 'Generating Explanation...'
              : 'Explain Concept'}
          </button>

        </div>

      </div>

      {/* Generated Explanation */}
      {generatedOutput && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

          <div className="border-b border-gray-200 pb-5">

            <div className="flex flex-wrap items-center gap-2">

              <h2 className="text-2xl font-semibold text-gray-900">
                {generatedOutput.concept || concept}
              </h2>

              {generatedOutput.is_ai_generated && (
                <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                  AI Generated
                </span>
              )}

              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                {getLevelLabel(
                  generatedOutput.level ||
                    explanationLevel
                )}
              </span>

            </div>

            <p className="mt-2 text-sm text-gray-500">
              Source:{' '}
              {generatedOutput.file_name ||
                selectedDocumentName}
            </p>

          </div>

          {/* Real AI Explanation */}
          <div className="mt-6">
            <p className="whitespace-pre-wrap leading-7 text-gray-700">
              {generatedOutput.content}
            </p>
          </div>

          {/* Responsible AI Warning */}
          <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5">

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

export default Explanation