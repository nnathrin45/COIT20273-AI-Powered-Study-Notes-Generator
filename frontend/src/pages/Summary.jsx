import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'
import { jsPDF } from 'jspdf'
import { getConsentStatus } from '../services/consentService'
import { getUploadedFiles } from '../services/uploadedService'
import {
  deleteAIOutput,
  generateAIContent,
  getAIOutputs,
} from '../services/aiService'
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

  const [savedSummaries, setSavedSummaries] =
    useState([])

  const [
    savedSummariesLoading,
    setSavedSummariesLoading,
  ] = useState(false)

  const [savedSummariesError, setSavedSummariesError] =
    useState('')

  const [summaryActionLoading, setSummaryActionLoading] =
    useState(false)


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


  useEffect(() => {
    let isActive = true

    if (!selectedDocument) {
      setSavedSummaries([])
      setSavedSummariesError('')
      setSavedSummariesLoading(false)

      return () => {
        isActive = false
      }
    }

    const loadSavedSummaries = async () => {
      setSavedSummariesLoading(true)
      setSavedSummariesError('')

      try {
        const response =
          await getAIOutputs(
            Number(selectedDocument)
          )

        if (
          !response.ok ||
          response.data?.status !== 'success'
        ) {
          if (isActive) {
            setSavedSummaries([])
            setSavedSummariesError(
              response.data?.message ||
                'Unable to load previous summaries.'
            )
          }

          return
        }

        if (isActive) {
          const outputs =
            response.data?.outputs ?? []

          const summaries =
            outputs.filter(
              (output) =>
                output.output_type === 'summary'
            )

          setSavedSummaries(summaries)
          setGeneratedOutput(
            summaries[0] ?? null
          )
          setDisclaimer('')
        }
      } catch (savedSummariesFetchError) {
        console.error(
          'Saved summaries fetch error:',
          savedSummariesFetchError
        )

        if (isActive) {
          setSavedSummaries([])
          setSavedSummariesError(
            'Unable to connect to the server to retrieve previous summaries.'
          )
        }
      } finally {
        if (isActive) {
          setSavedSummariesLoading(false)
        }
      }
    }

    loadSavedSummaries()

    return () => {
      isActive = false
    }
  }, [selectedDocument])


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

        const newSummary =
          response.data?.output ?? null

        setGeneratedOutput(newSummary)

        if (newSummary) {
          setSavedSummaries(
            (currentSummaries) => [
              newSummary,
              ...currentSummaries.filter(
                (summary) =>
                  summary.output_id !==
                  newSummary.output_id
              ),
            ]
          )
        }

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

  const formatSummaryDate = (value) => {
    if (!value) {
      return 'Unknown date'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return 'Unknown date'
    }

    return date.toLocaleString()
  }


  const buildSummaryFileName = (extension) => {
    const sourceName =
      generatedOutput?.file_name ||
      selectedDocumentName ||
      'study-material'

    const baseName = sourceName
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .trim()
      .replace(/\s+/g, '-')

    return `${baseName || 'study-material'}-summary.${extension}`
  }


  const handleExportWord = async () => {
    if (!generatedOutput?.content) {
      return
    }

    setSummaryActionLoading(true)
    setError('')

    try {
      const sourceName =
        generatedOutput.file_name ||
        selectedDocumentName ||
        'Study material'

      const contentParagraphs =
        String(generatedOutput.content)
          .split(/\r?\n/)
          .map(
            (line) =>
              new Paragraph({
                children: [
                  new TextRun(line || ' '),
                ],
                spacing: {
                  after: 120,
                },
              })
          )

      const wordDocument = new DocxDocument({
        sections: [
          {
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Generated Summary',
                    bold: true,
                    size: 32,
                  }),
                ],
                spacing: {
                  after: 180,
                },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Source: ${sourceName}`,
                    italics: true,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Generated: ${formatSummaryDate(
                      generatedOutput.generated_at
                    )}`,
                    italics: true,
                  }),
                ],
                spacing: {
                  after: 260,
                },
              }),
              ...contentParagraphs,
            ],
          },
        ],
      })

      const blob = await Packer.toBlob(wordDocument)
      const url = URL.createObjectURL(blob)
      const link = window.document.createElement('a')

      link.href = url
      link.download = buildSummaryFileName('docx')

      window.document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (exportError) {
      console.error(
        'Summary Word export error:',
        exportError
      )

      setError(
        'Unable to export this summary to Word. Please try again.'
      )
    } finally {
      setSummaryActionLoading(false)
    }
  }


  const handleExportPdf = () => {
    if (!generatedOutput?.content) {
      return
    }

    setSummaryActionLoading(true)
    setError('')

    try {
      const sourceName =
        generatedOutput.file_name ||
        selectedDocumentName ||
        'Study material'

      const pdf = new jsPDF({
        unit: 'pt',
        format: 'a4',
      })

      const margin = 48
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const contentWidth =
        pageWidth - margin * 2

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(18)
      pdf.text('Generated Summary', margin, 56)

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.text(
        `Source: ${sourceName}`,
        margin,
        78
      )
      pdf.text(
        `Generated: ${formatSummaryDate(
          generatedOutput.generated_at
        )}`,
        margin,
        94
      )

      pdf.setFontSize(11)

      const lines = pdf.splitTextToSize(
        String(generatedOutput.content),
        contentWidth
      )

      let y = 124

      lines.forEach((line) => {
        if (y > pageHeight - margin) {
          pdf.addPage()
          y = margin
        }

        pdf.text(line, margin, y)
        y += 16
      })

      pdf.save(buildSummaryFileName('pdf'))
    } catch (exportError) {
      console.error(
        'Summary PDF export error:',
        exportError
      )

      setError(
        'Unable to export this summary to PDF. Please try again.'
      )
    } finally {
      setSummaryActionLoading(false)
    }
  }


  const handleDeleteSummary = async () => {
    if (!generatedOutput?.output_id) {
      return
    }

    const shouldDelete = window.confirm(
      'Delete this generated summary? This action cannot be undone.'
    )

    if (!shouldDelete) {
      return
    }

    setSummaryActionLoading(true)
    setError('')

    try {
      const response = await deleteAIOutput(
        generatedOutput.output_id
      )

      if (!response.ok) {
        setError(
          response.data?.message ||
            'Unable to delete this summary. Please try again.'
        )

        return
      }

      const remainingSummaries =
        savedSummaries.filter(
          (summary) =>
            summary.output_id !==
            generatedOutput.output_id
        )

      setSavedSummaries(remainingSummaries)
      setGeneratedOutput(
        remainingSummaries[0] ?? null
      )
      setDisclaimer('')
    } catch (deleteError) {
      console.error(
        'Summary delete error:',
        deleteError
      )

      setError(
        'Unable to connect to the server. Please try again.'
      )
    } finally {
      setSummaryActionLoading(false)
    }
  }


  return (
    <div className="summary-theme mx-auto w-full max-w-[1660px]">
      <style>
        {`
          [data-theme-mode='light'] .summary-export-action {
            background-color: #ffffff !important;
            border-color: rgba(122, 68, 255, 0.32) !important;
            color: #6d35d8 !important;
          }

          [data-theme-mode='light'] .summary-export-action:hover {
            background-color: rgba(122, 68, 255, 0.10) !important;
            border-color: rgba(122, 68, 255, 0.60) !important;
            color: #5420b8 !important;
          }

          [data-theme-mode='light'] .summary-delete-action {
            background-color: #ffffff !important;
            border-color: rgba(220, 38, 38, 0.30) !important;
            color: #dc2626 !important;
          }

          [data-theme-mode='light'] .summary-delete-action:hover {
            background-color: rgba(220, 38, 38, 0.08) !important;
            border-color: rgba(220, 38, 38, 0.58) !important;
            color: #b91c1c !important;
          }

          [data-theme-mode='light'] .summary-export-action svg,
          [data-theme-mode='light'] .summary-delete-action svg {
            opacity: 1 !important;
          }

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


          [data-theme-mode='light']
          .summary-history-item {
            color: #4f4b63 !important;
          }

          [data-theme-mode='light']
          .summary-history-item:hover {
            background-color:
              rgba(122, 68, 255, 0.06) !important;
            border-color:
              rgba(122, 68, 255, 0.18) !important;
          }

          [data-theme-mode='light']
          .summary-history-item-active {
            background-color:
              rgba(122, 68, 255, 0.1) !important;
            border-color:
              rgba(122, 68, 255, 0.32) !important;
          }

          /*
           * STUDYA SUMMARY ILLUMINATED SURFACE
           *
           * Visual enhancement only.
           * Generation, history, export, delete and consent
           * functionality are unchanged.
           */
          .summary-surface {
            position: relative;

            background:
              radial-gradient(
                ellipse 75% 52% at 22% -8%,
                rgba(255, 255, 255, 0.075),
                rgba(255, 255, 255, 0.025) 34%,
                transparent 68%
              ),
              radial-gradient(
                ellipse 65% 48% at 88% -12%,
                rgba(122, 68, 255, 0.10),
                transparent 66%
              ),
              linear-gradient(
                180deg,
                rgba(255, 255, 255, 0.018),
                transparent 48%
              ),
              #160b32 !important;

            border-color:
              rgba(169, 124, 255, 0.16) !important;

            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.065),
              inset 0 0 26px rgba(122, 68, 255, 0.025),
              0 12px 34px rgba(3, 0, 15, 0.24);

            transition:
              background-color 500ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease;
          }


          /*
           * Fine reflective highlight across the upper edge.
           */
          .summary-surface::after {
            content: '';
            position: absolute;
            pointer-events: none;

            top: 0;
            left: 9%;
            right: 9%;
            height: 1px;

            background:
              linear-gradient(
                90deg,
                transparent,
                rgba(255, 255, 255, 0.15) 28%,
                rgba(201, 180, 255, 0.15) 50%,
                rgba(255, 255, 255, 0.10) 72%,
                transparent
              );

            opacity: 0.72;
          }


          .summary-surface:hover {
            border-color:
              rgba(122, 68, 255, 0.34) !important;

            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.085),
              inset 0 0 30px rgba(122, 68, 255, 0.04),
              0 14px 38px rgba(30, 10, 62, 0.28),
              0 0 22px rgba(122, 68, 255, 0.06);
          }


          /*
           * Light mode
           */
          [data-theme-mode='light']
          .summary-surface {
            background:
              radial-gradient(
                ellipse 75% 55% at 20% -10%,
                rgba(255, 255, 255, 0.96),
                rgba(255, 255, 255, 0.52) 38%,
                transparent 68%
              ),
              radial-gradient(
                ellipse 62% 48% at 88% -10%,
                rgba(122, 68, 255, 0.055),
                transparent 67%
              ),
              linear-gradient(
                180deg,
                rgba(122, 68, 255, 0.018),
                transparent 48%
              ),
              #ffffff !important;

            border-color:
              rgba(91, 72, 125, 0.14) !important;

            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 1),
              inset 0 0 20px rgba(122, 68, 255, 0.012),
              0 10px 28px rgba(61, 44, 92, 0.075);
          }


          [data-theme-mode='light']
          .summary-surface::after {
            background:
              linear-gradient(
                90deg,
                transparent,
                rgba(122, 68, 255, 0.075) 28%,
                rgba(122, 68, 255, 0.12) 50%,
                rgba(122, 68, 255, 0.06) 72%,
                transparent
              );

            opacity: 0.52;
          }


          [data-theme-mode='light']
          .summary-surface:hover {
            border-color:
              rgba(122, 68, 255, 0.28) !important;

            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 1),
              0 13px 32px rgba(91, 60, 145, 0.10),
              0 0 18px rgba(122, 68, 255, 0.04);
          }
        `}
      </style>


      {/* Page Heading */}
      <div className="mb-8">
        <p className="summary-theme-text summary-accent mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
          AI Study Tools
        </p>

        <h1 className="summary-theme-text summary-heading text-3xl font-bold tracking-tight text-[#f3f0ff]">
          Summaries
        </h1>

        <p className="summary-theme-text summary-body mt-2 max-w-3xl text-sm leading-6 text-[#898cc0]">
          Generate and review AI summaries from your uploaded
          study materials.
        </p>
      </div>


      {/* Document Selection */}
      <div className="mb-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)] lg:gap-6">
          <div className="w-full">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <label
                htmlFor="document"
                className="summary-theme-text summary-heading text-sm font-medium text-[#d9d4eb]"
              >
                Select a document
              </label>

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

          <div className="flex items-end lg:justify-end">
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
              className="summary-generate-button inline-flex w-fit shrink-0 items-center gap-2 rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#9c46ff] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(122,68,255,0.18)] transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:from-[#3a3150] disabled:to-[#3a3150] disabled:text-[#77718d] disabled:shadow-none"
            >
              {generationLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
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
                    d="M12 5v14M5 12h14"
                  />
                </svg>
              )}

              {generationLoading
                ? 'Generating Summary...'
                : 'Generate New Summary'}
            </button>
          </div>
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


      </div>


      {/* Summary History and Generated Summary */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)]">
        <section className="summary-theme-surface summary-surface overflow-hidden rounded-xl border border-[#2a1b4d] bg-[#160b32]">
          <div className="summary-theme-border border-b border-[#2a1b4d] px-5 py-4">
            <p className="summary-theme-text summary-accent text-xs font-semibold uppercase tracking-[0.14em] text-[#a97cff]">
              Previous Summaries
            </p>
          </div>

          <div className="p-3">
            {!selectedDocument ? (
              <p className="summary-theme-text summary-body px-2 py-5 text-sm leading-6 text-[#898cc0]">
                Select a document to view its previous summaries.
              </p>
            ) : savedSummariesLoading ? (
              <div
                className="flex items-center gap-3 px-2 py-5"
                role="status"
              >
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

                <p className="summary-theme-text summary-loading-text text-sm text-[#c9b4ff]">
                  Loading previous summaries...
                </p>
              </div>
            ) : savedSummariesError ? (
              <p
                className="summary-theme-text summary-error-text px-2 py-5 text-sm leading-6 text-red-300"
                role="alert"
              >
                {savedSummariesError}
              </p>
            ) : savedSummaries.length === 0 ? (
              <p className="summary-theme-text summary-body px-2 py-5 text-sm leading-6 text-[#898cc0]">
                No summaries have been generated for this document yet.
              </p>
            ) : (
              <div className="space-y-2">
                {savedSummaries.map(
                  (summary, index) => {
                    const isActiveSummary =
                      generatedOutput?.output_id ===
                      summary.output_id

                    return (
                      <button
                        key={summary.output_id}
                        type="button"
                        onClick={() => {
                          setGeneratedOutput(summary)
                          setDisclaimer('')
                          setError('')
                          setRetryableError(false)
                        }}
                        className={`summary-theme-interactive summary-history-item w-full rounded-lg border px-4 py-3 text-left transition duration-300 ${
                          isActiveSummary
                            ? 'summary-history-item-active border-[#7a44ff]/40 bg-[#7a44ff]/10'
                            : 'border-transparent hover:border-[#7a44ff]/20 hover:bg-[#7a44ff]/5'
                        }`}
                      >
                        <p className="summary-theme-text summary-heading text-sm font-semibold text-[#e7e2f5]">
                          Summary{' '}
                          {savedSummaries.length -
                            index}
                        </p>

                        <p className="summary-theme-text summary-body mt-1 text-xs text-[#727494]">
                          Generated{' '}
                          {formatSummaryDate(
                            summary.generated_at
                          )}
                        </p>
                      </button>
                    )
                  }
                )}
              </div>
            )}
          </div>
        </section>


        <section className="summary-theme-surface summary-surface min-h-[360px] overflow-hidden rounded-xl border border-[#2a1b4d] bg-[#160b32]">
          <div className="summary-theme-border border-b border-[#2a1b4d] px-6 py-5 sm:px-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="summary-theme-text summary-heading text-2xl font-semibold text-[#f3f0ff]">
                    Generated Summary
                  </h2>

                  {generatedOutput?.is_ai_generated && (
                    <span className="summary-theme-interactive summary-ai-badge rounded-full border border-[#7a44ff]/25 bg-[#7a44ff]/10 px-3 py-1 text-xs font-semibold text-[#c9b4ff]">
                      AI Generated
                    </span>
                  )}
                </div>

                {generatedOutput && (
                  <>
                    <p className="summary-theme-text summary-muted mt-2 text-sm text-[#727494]">
                      Source:{' '}

                      <span className="summary-theme-text summary-source-text text-[#a6a8c7]">
                        {generatedOutput.file_name ||
                          selectedDocumentName}
                      </span>
                    </p>

                    <p className="summary-theme-text summary-muted mt-1 text-sm text-[#727494]">
                      Generated:{' '}

                      <span className="summary-theme-text summary-source-text text-[#a6a8c7]">
                        {formatSummaryDate(
                          generatedOutput.generated_at
                        )}
                      </span>
                    </p>
                  </>
                )}
              </div>

              {generatedOutput && (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportWord}
                    disabled={summaryActionLoading}
                    title="Export summary to Word"
                    aria-label="Export summary to Word"
                    className="summary-theme-interactive summary-export-action inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#c9b4ff] transition duration-300 hover:border-[#a97cff]/50 hover:bg-[#7a44ff]/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
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
                        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14 2v6h6M8 13l1.2 5L12 14l2.8 4L16 13"
                      />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPdf}
                    disabled={summaryActionLoading}
                    title="Export summary to PDF"
                    aria-label="Export summary to PDF"
                    className="summary-theme-interactive summary-export-action inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#c9b4ff] transition duration-300 hover:border-[#a97cff]/50 hover:bg-[#7a44ff]/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
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
                        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14 2v6h6"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 17v-5h1.5a1.5 1.5 0 0 1 0 3H8m5-3v5m0-5h1.25a2.5 2.5 0 0 1 0 5H13m5-5h3m-3 2h2"
                      />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteSummary}
                    disabled={summaryActionLoading}
                    title="Delete summary"
                    aria-label="Delete summary"
                    className="summary-theme-interactive summary-delete-action inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-400/25 bg-red-500/10 text-red-300 transition duration-300 hover:border-red-400/50 hover:bg-red-500/20 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
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
                        d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5M14 11v5"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>


          {generatedOutput ? (
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
          ) : (
            <div className="flex min-h-[280px] items-center justify-center px-6 py-10 text-center sm:px-7">
              <div className="max-w-md">
                <p className="summary-theme-text summary-heading font-semibold text-[#e7e2f5]">
                  No summary selected
                </p>

                <p className="summary-theme-text summary-body mt-2 text-sm leading-6 text-[#898cc0]">
                  {selectedDocument
                    ? 'Choose a previous summary from the left or generate a new summary for this document.'
                    : 'Select a document above to view or generate a summary.'}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}


export default Summary