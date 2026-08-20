import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getConsentStatus } from '../services/consentService'
import { getUploadedFiles } from '../services/uploadedService'
import { generateAIContent } from '../services/aiService'

function Summary() {
  const [documents, setDocuments] = useState([])
  const [selectedDocument, setSelectedDocument] = useState('')

  const [documentsLoading, setDocumentsLoading] =
    useState(true)
  const [documentsError, setDocumentsError] = useState('')

  const [consentStatus, setConsentStatus] = useState(null)
  const [consentInitialLoading, setConsentInitialLoading] =
    useState(true)
  const [consentError, setConsentError] = useState('')

  const [generationLoading, setGenerationLoading] =
    useState(false)
  const [generatedOutput, setGeneratedOutput] = useState(null)
  const [disclaimer, setDisclaimer] = useState('')
  const [error, setError] = useState('')

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

  const handleGenerateSummary = async () => {
    if (!selectedDocument) {
      setError('Please select a study material first.')
      setGeneratedOutput(null)
      setDisclaimer('')
      return
    }

    if (consentStatus !== 'granted') {
      setError(
        'Please grant AI processing consent before generating a summary.'
      )
      setGeneratedOutput(null)
      setDisclaimer('')
      return
    }

    setGenerationLoading(true)
    setError('')
    setGeneratedOutput(null)
    setDisclaimer('')

    try {
      const response = await generateAIContent({
        fileId: Number(selectedDocument),
        outputType: 'summary',
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
            'Unable to generate the summary. Please try again.'
        )
        return
      }

      setGeneratedOutput(response.data?.output ?? null)
      setDisclaimer(response.data?.disclaimer ?? '')
    } catch (generationError) {
      console.error(
        'Summary generation error:',
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

  return (
    <div className="mx-auto max-w-5xl">

      {/* Page Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Generate Summary
        </h1>

        <p className="mt-2 text-gray-600">
          Create a clear AI-generated study summary from one of
          your uploaded documents.
        </p>
      </div>

      {/* Summary Settings */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

        <h2 className="text-xl font-semibold text-gray-900">
          Summary Settings
        </h2>

        <div className="mt-6">

          <label
            htmlFor="document"
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
                generating a summary.
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
              id="document"
              value={selectedDocument}
              onChange={(event) => {
                setSelectedDocument(event.target.value)
                setGeneratedOutput(null)
                setDisclaimer('')
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

        {/* Document Loading Error */}
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

        {/* Generation Error */}
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
            onClick={handleGenerateSummary}
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
              ? 'Generating Summary...'
              : 'Generate Summary'}
          </button>
        </div>

      </div>

      {/* Generated Summary */}
      {generatedOutput && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-3 border-b border-gray-200 pb-5 sm:flex-row sm:items-start sm:justify-between">

            <div>
              <div className="flex flex-wrap items-center gap-2">

                <h2 className="text-2xl font-semibold text-gray-900">
                  Generated Summary
                </h2>

                {generatedOutput.is_ai_generated && (
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                    AI Generated
                  </span>
                )}

              </div>

              <p className="mt-2 text-sm text-gray-500">
                Source:{' '}
                {generatedOutput.file_name ||
                  selectedDocumentName}
              </p>
            </div>

          </div>

          {/* Real AI Summary */}
          <div className="mt-6">
            <p className="whitespace-pre-wrap leading-7 text-gray-700">
              {generatedOutput.content}
            </p>
          </div>

          {/* Responsible AI Warning */}
          <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5">

            <div className="flex items-start gap-3">

              <div>
                <h3 className="font-semibold text-amber-900">
                  AI-Generated Content
                </h3>

                <p className="mt-1 text-sm leading-6 text-amber-800">
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

export default Summary