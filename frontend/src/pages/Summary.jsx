import { useEffect, useState } from 'react'
import AIConsent from '../components/AIConsent'
import {
  getConsentStatus,
  updateConsentStatus,
} from '../services/consentService'

function Summary() {
  const [selectedDocument, setSelectedDocument] = useState('')
  const [summaryLength, setSummaryLength] = useState('concise')
  const [generated, setGenerated] = useState(false)
  const [error, setError] = useState('')

  const [consentStatus, setConsentStatus] = useState(null)
  const [consentRecordedAt, setConsentRecordedAt] = useState(null)
  const [consentInitialLoading, setConsentInitialLoading] =
    useState(true)
  const [consentLoading, setConsentLoading] = useState(false)
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

        setConsentRecordedAt(
          response.data?.consent?.recorded_at ?? null
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

  const handleConsentChange = async (newStatus) => {
    setConsentLoading(true)
    setConsentError('')

    try {
      const response = await updateConsentStatus(newStatus)

      if (!response.ok) {
        if (response.status === 401) {
          setConsentError(
            'Your login session is missing or invalid. Please sign in again.'
          )
        } else {
          setConsentError(
            response.data?.message ||
              'Unable to update your AI consent preference.'
          )
        }

        return
      }

      setConsentStatus(
        response.data?.consent?.status ?? newStatus
      )

      if (newStatus !== 'granted') {
        setGenerated(false)
      }

      // Retrieve the latest record so the backend timestamp
      // can be shown in the interface.
      const latestResponse = await getConsentStatus()

      if (
        latestResponse.ok &&
        latestResponse.data?.consent
      ) {
        setConsentStatus(
          latestResponse.data.consent.status
        )

        setConsentRecordedAt(
          latestResponse.data.consent.recorded_at ?? null
        )
      }
    } catch (consentUpdateError) {
      console.error(
        'Consent update error:',
        consentUpdateError
      )

      setConsentError(
        'Unable to connect to the server to update your AI consent preference.'
      )
    } finally {
      setConsentLoading(false)
    }
  }

  const documents = [
    {
      id: 1,
      name: 'Introduction to Artificial Intelligence.pdf',
    },
    {
      id: 2,
      name: 'Database Systems Week 4.docx',
    },
    {
      id: 3,
      name: 'Software Engineering Notes.txt',
    },
  ]

  const handleGenerateSummary = () => {
    if (!selectedDocument) {
      setError('Please select a study material first.')
      setGenerated(false)
      return
    }

    if (consentStatus !== 'granted') {
      setError(
        'Please grant AI processing consent before generating a summary.'
      )
      setGenerated(false)
      return
    }

    setError('')
    setGenerated(true)
  }

  const selectedDocumentName =
    documents.find(
      (document) => document.id === Number(selectedDocument)
    )?.name || ''

  return (
    <div className="mx-auto max-w-5xl">

      {/* Page Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Generate Summary
        </h1>

        <p className="mt-2 text-gray-600">
          Create a clear study summary from one of your uploaded documents.
        </p>
      </div>

      {/* Summary Settings */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

        <h2 className="text-xl font-semibold text-gray-900">
          Summary Settings
        </h2>

        <div className="mt-6 grid gap-6 md:grid-cols-2">

          {/* Document Selection */}
          <div>
            <label
              htmlFor="document"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Study Material
            </label>

            <select
              id="document"
              value={selectedDocument}
              onChange={(event) => {
                setSelectedDocument(event.target.value)
                setGenerated(false)
                setError('')
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">
                Select a document
              </option>

              {documents.map((document) => (
                <option
                  key={document.id}
                  value={document.id}
                >
                  {document.name}
                </option>
              ))}
            </select>
          </div>

          {/* Summary Length */}
          <div>
            <label
              htmlFor="summary-length"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Summary Length
            </label>

            <select
              id="summary-length"
              value={summaryLength}
              onChange={(event) => {
                setSummaryLength(event.target.value)
                setGenerated(false)
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="concise">
                Concise
              </option>

              <option value="detailed">
                Detailed
              </option>
            </select>
          </div>

        </div>
        
        {/* AI Processing Consent */}
        <div className="mt-6">
          {consentInitialLoading ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-sm text-blue-700">
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
        </div>

        {/* Consent Error */}
        {consentError && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {consentError}
            </p>
          </div>
        )}

        {/* Error */}
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
              consentInitialLoading ||
              consentLoading ||
              consentStatus !== 'granted'
            }
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Generate Summary
          </button>
        </div>

      </div>

      {/* Generated Summary */}
      {generated && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-3 border-b border-gray-200 pb-5 sm:flex-row sm:items-start sm:justify-between">

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Generated Summary
                </h2>

                <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                  AI Generated
                </span>
              </div>

              <p className="mt-2 text-sm text-gray-500">
                Source: {selectedDocumentName}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Length: {summaryLength === 'concise' ? 'Concise' : 'Detailed'}
              </p>
            </div>

          </div>

          {/* Mock Summary Content */}
          <div className="mt-6 space-y-6">

            <section>
              <h3 className="text-lg font-semibold text-gray-900">
                Overview
              </h3>

              <p className="mt-2 leading-7 text-gray-700">
                This is temporary sample summary content used to demonstrate
                the frontend interface. The final version will display a
                summary generated from the selected uploaded study material
                using the project's Generative AI service.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900">
                Key Points
              </h3>

              <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-700">
                <li>
                  Important information from the source document will be
                  identified and condensed.
                </li>

                <li>
                  Key ideas will be presented in a clear format for study and
                  revision.
                </li>

                <li>
                  The summary will remain associated with the original uploaded
                  study material.
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900">
                Key Concepts
              </h3>

              <div className="mt-3 grid gap-4 sm:grid-cols-2">

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="font-medium text-gray-900">
                    Concept One
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    A short explanation of an important concept identified in
                    the uploaded document.
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="font-medium text-gray-900">
                    Concept Two
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    Another important idea that the student may need to review.
                  </p>
                </div>

              </div>
            </section>

          </div>

          {/* Responsible AI Warning */}
          <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5">

            <div className="flex items-start gap-3">

              <div>
                <h3 className="font-semibold text-amber-900">
                  AI-Generated Content
                </h3>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  This summary may contain inaccuracies or omissions. Always
                  verify important information against the original uploaded
                  study material.
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