import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getConsentStatus } from '../services/consentService'

function Explanation() {
  const [selectedDocument, setSelectedDocument] = useState('')
  const [concept, setConcept] = useState('')
  const [explanationLevel, setExplanationLevel] =
    useState('beginner')
  const [generated, setGenerated] = useState(false)
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

  // Temporary mock documents.
  // These will later come from the backend.
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

  const selectedDocumentName =
    documents.find(
      (document) =>
        document.id === Number(selectedDocument)
    )?.name || ''

  const handleGenerateExplanation = () => {
    if (!selectedDocument) {
      setError('Please select a study material first.')
      setGenerated(false)
      return
    }

    if (!concept.trim()) {
      setError(
        'Please enter a concept or topic you would like explained.'
      )
      setGenerated(false)
      return
    }

    if (consentStatus !== 'granted') {
      setError(
        'Please grant AI processing consent before generating a concept explanation.'
      )
      setGenerated(false)
      return
    }

    setError('')
    setGenerated(true)
  }

  const getMockExplanation = () => {
    if (explanationLevel === 'beginner') {
      return (
        <>
          <p>
            This is a simple explanation of{' '}
            <strong>{concept}</strong>. The purpose of the
            beginner level is to explain the idea using clear
            language and avoid unnecessary technical terminology.
          </p>

          <p>
            In the final system, this explanation will be
            generated from the selected uploaded study material
            so that the explanation remains connected to the
            student's source document.
          </p>
        </>
      )
    }

    if (explanationLevel === 'intermediate') {
      return (
        <>
          <p>
            <strong>{concept}</strong> can be understood by
            examining its main purpose, important characteristics
            and relationship with other concepts in the selected
            study material.
          </p>

          <p>
            At the intermediate level, the final AI-generated
            response will include more subject-specific
            terminology while still presenting the explanation
            in an accessible way.
          </p>
        </>
      )
    }

    return (
      <>
        <p>
          An advanced explanation of{' '}
          <strong>{concept}</strong> will provide greater
          technical depth, discuss relevant relationships and
          explain important terminology identified in the
          uploaded source material.
        </p>

        <p>
          The final implementation will use the project's
          Generative AI service to produce this explanation while
          keeping the uploaded document as the primary study
          context.
        </p>
      </>
    )
  }

  const getLevelLabel = () => {
    if (explanationLevel === 'beginner') {
      return 'Beginner'
    }

    if (explanationLevel === 'intermediate') {
      return 'Intermediate'
    }

    return 'Advanced'
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

            <select
              id="explanation-document"
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
                setGenerated(false)
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
              setGenerated(false)
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
              consentInitialLoading ||
              consentStatus !== 'granted'
            }
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Explain Concept
          </button>

        </div>

      </div>

      {/* Generated Explanation */}
      {generated && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

          <div className="border-b border-gray-200 pb-5">

            <div className="flex flex-wrap items-center gap-2">

              <h2 className="text-2xl font-semibold text-gray-900">
                {concept}
              </h2>

              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                AI Generated
              </span>

              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                {getLevelLabel()}
              </span>

            </div>

            <p className="mt-2 text-sm text-gray-500">
              Source: {selectedDocumentName}
            </p>

          </div>

          {/* Mock Explanation */}
          <div className="mt-6 space-y-4 leading-7 text-gray-700">
            {getMockExplanation()}
          </div>

          {/* Example */}
          <div className="mt-7 rounded-lg border border-gray-200 bg-gray-50 p-5">

            <h3 className="font-semibold text-gray-900">
              Example
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-700">
              A relevant example from the study material can be
              shown here to help the student connect the
              explanation with a practical or academic situation.
            </p>

          </div>

          {/* Important Points */}
          <div className="mt-7">

            <h3 className="text-lg font-semibold text-gray-900">
              Important Points
            </h3>

            <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-700">

              <li>
                Focus on the main purpose and meaning of the
                concept.
              </li>

              <li>
                Review how the concept relates to other topics in
                the source document.
              </li>

              <li>
                Check technical definitions against the original
                study material.
              </li>

            </ul>

          </div>

          {/* Responsible AI Warning */}
          <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5">

            <h3 className="font-semibold text-amber-900">
              AI-Generated Content
            </h3>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              This explanation may contain inaccuracies or
              omissions. Always verify important information
              against your original uploaded study material.
            </p>

          </div>

        </div>
      )}

    </div>
  )
}

export default Explanation