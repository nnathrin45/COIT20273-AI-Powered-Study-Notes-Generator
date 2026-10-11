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


function Flashcards() {
  const [documents, setDocuments] = useState([])
  const [selectedDocument, setSelectedDocument] = useState('')
  const [flashcardDifficulty, setFlashcardDifficulty] = useState('intermediate')

  const [documentsLoading, setDocumentsLoading] =
    useState(true)

  const [documentsError, setDocumentsError] =
    useState('')

  const [flashcards, setFlashcards] = useState([])

  const [
    generatedOutput,
    setGeneratedOutput,
  ] = useState(null)

  const [disclaimer, setDisclaimer] =
    useState('')

  const [currentCard, setCurrentCard] =
    useState(0)

  const [showAnswer, setShowAnswer] =
    useState(false)

  const [
    generationLoading,
    setGenerationLoading,
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

  const [
    savedFlashcardSets,
    setSavedFlashcardSets,
  ] = useState([])

  const [
    savedFlashcardSetsLoading,
    setSavedFlashcardSetsLoading,
  ] = useState(false)

  const [
    savedFlashcardSetsError,
    setSavedFlashcardSetsError,
  ] = useState('')


  const [
    flashcardActionLoading,
    setFlashcardActionLoading,
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


  useEffect(() => {
    if (!selectedDocument) {
      setSavedFlashcardSets([])
      setSavedFlashcardSetsError('')
      setGeneratedOutput(null)
      setFlashcards([])
      setCurrentCard(0)
      setShowAnswer(false)
      setDisclaimer('')

      return undefined
    }

    let isActive = true

    const loadSavedFlashcardSets = async () => {
      setSavedFlashcardSetsLoading(true)
      setSavedFlashcardSetsError('')

      try {
        const response = await getAIOutputs(
          Number(selectedDocument)
        )

        if (!isActive) {
          return
        }

        if (
          !response.ok ||
          response.data?.status !== 'success'
        ) {
          setSavedFlashcardSets([])
          setGeneratedOutput(null)
          setFlashcards([])
          setCurrentCard(0)
          setShowAnswer(false)

          setSavedFlashcardSetsError(
            response.data?.message ||
              'Unable to retrieve previous flashcard sets.'
          )

          return
        }

        const outputs = Array.isArray(
          response.data?.outputs
        )
          ? response.data.outputs
          : []

        const flashcardSets = outputs.filter(
          (output) =>
            output.output_type === 'flashcards' &&
            Array.isArray(output.content)
        )

        const latestFlashcardSet =
          flashcardSets[0] ?? null

        setSavedFlashcardSets(flashcardSets)
        setGeneratedOutput(latestFlashcardSet)
        setFlashcards(
          latestFlashcardSet?.content ?? []
        )
        setCurrentCard(0)
        setShowAnswer(false)
        setDisclaimer('')
      } catch (savedFlashcardsFetchError) {
        if (!isActive) {
          return
        }

        console.error(
          'Saved flashcards fetch error:',
          savedFlashcardsFetchError
        )

        setSavedFlashcardSets([])
        setGeneratedOutput(null)
        setFlashcards([])
        setCurrentCard(0)
        setShowAnswer(false)

        setSavedFlashcardSetsError(
          'Unable to connect to the server to retrieve previous flashcard sets.'
        )
      } finally {
        if (isActive) {
          setSavedFlashcardSetsLoading(false)
        }
      }
    }

    loadSavedFlashcardSets()

    return () => {
      isActive = false
    }
  }, [selectedDocument])


  const clearGeneratedFlashcards = () => {
    setFlashcards([])
    setGeneratedOutput(null)
    setDisclaimer('')
    setCurrentCard(0)
    setShowAnswer(false)
  }


  const handleGenerate = async () => {
    if (!selectedDocument) {
      setError(
        'Please select a study material first.'
      )

      setRetryableError(false)
      clearGeneratedFlashcards()

      return
    }

    if (
      consentStatus !== 'granted'
    ) {
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
      const response =
        await generateAIContent({
          fileId:
            Number(selectedDocument),

          outputType:
            'flashcards',
          level: flashcardDifficulty,
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
            'Unable to generate flashcards. Please try again.'
        )

        setRetryableError(
          response.data?.retryable ===
            true
        )

        return
      }

      const output =
        response.data?.output

      const generatedCards =
        output?.content

      if (
        !Array.isArray(
          generatedCards
        )
      ) {
        setError(
          'The server returned flashcards in an unexpected format.'
        )

        setRetryableError(false)

        return
      }

      if (
        generatedCards.length === 0
      ) {
        setError(
          'No usable flashcards could be generated from this study material.'
        )

        setRetryableError(false)

        return
      }

      setGeneratedOutput(output)

      if (output) {
        setSavedFlashcardSets(
          (currentFlashcardSets) => [
            output,
            ...currentFlashcardSets.filter(
              (flashcardSet) =>
                flashcardSet.output_id !==
                output.output_id
            ),
          ]
        )
      }

      setFlashcards(
        generatedCards
      )

      setDisclaimer(
        response.data?.disclaimer ??
          ''
      )

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


  const handleExportWord = async () => {
    const cards = Array.isArray(flashcards)
      ? flashcards
      : []

    if (cards.length === 0) {
      return
    }

    setFlashcardActionLoading(true)
    setError('')

    try {
      const sourceName =
        generatedOutput.file_name ||
        selectedDocumentName ||
        'Study material'

      const generatedDate = generatedOutput.generated_at
        ? new Date(
            generatedOutput.generated_at
          ).toLocaleString()
        : 'Date unavailable'

      const cardParagraphs = cards.flatMap(
        (card, index) => [
          new Paragraph({
            children: [
              new TextRun({
                text: `Question ${index + 1}`,
                bold: true,
                size: 24,
              }),
            ],
            spacing: {
              before: 180,
              after: 80,
            },
          }),
          new Paragraph({
            children: [
              new TextRun(
                String(card?.question ?? '')
              ),
            ],
            spacing: {
              after: 120,
            },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Answer',
                bold: true,
              }),
            ],
            spacing: {
              after: 60,
            },
          }),
          new Paragraph({
            children: [
              new TextRun(
                String(card?.answer ?? '')
              ),
            ],
            spacing: {
              after: 180,
            },
          }),
        ]
      )

      const wordDocument = new DocxDocument({
        sections: [
          {
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Generated Flashcards',
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
                    text: `Generated: ${generatedDate}`,
                    italics: true,
                  }),
                ],
                spacing: {
                  after: 260,
                },
              }),
              ...cardParagraphs,
            ],
          },
        ],
      })

      const blob = await Packer.toBlob(
        wordDocument
      )

      const downloadUrl =
        URL.createObjectURL(blob)

      const anchor =
        document.createElement('a')

      const safeSourceName = sourceName
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/^-+|-+$/g, '') ||
        'study-material'

      anchor.href = downloadUrl
      anchor.download =
        `${safeSourceName}-flashcards-${Date.now()}.docx`

      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()

      URL.revokeObjectURL(downloadUrl)
    } catch (exportError) {
      console.error(
        'Flashcards Word export error:',
        exportError
      )

      setError(
        'Unable to export these flashcards to Word. Please try again.'
      )
    } finally {
      setFlashcardActionLoading(false)
    }
  }


  const handleExportPdf = () => {
    const cards = Array.isArray(flashcards)
      ? flashcards
      : []

    if (cards.length === 0) {
      return
    }

    setFlashcardActionLoading(true)
    setError('')

    try {
      const sourceName =
        generatedOutput.file_name ||
        selectedDocumentName ||
        'Study material'

      const generatedDate = generatedOutput.generated_at
        ? new Date(
            generatedOutput.generated_at
          ).toLocaleString()
        : 'Date unavailable'

      const pdf = new jsPDF({
        unit: 'pt',
        format: 'a4',
      })

      const margin = 48
      const pageWidth =
        pdf.internal.pageSize.getWidth()

      const pageHeight =
        pdf.internal.pageSize.getHeight()

      const contentWidth =
        pageWidth - margin * 2

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(18)
      pdf.text(
        'Generated Flashcards',
        margin,
        56
      )

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)

      pdf.text(
        `Source: ${sourceName}`,
        margin,
        78
      )

      pdf.text(
        `Generated: ${generatedDate}`,
        margin,
        94
      )

      let y = 126

      cards.forEach((card, index) => {
        const questionLines =
          pdf.splitTextToSize(
            String(card?.question ?? ''),
            contentWidth
          )

        const answerLines =
          pdf.splitTextToSize(
            String(card?.answer ?? ''),
            contentWidth
          )

        const estimatedHeight =
          18 +
          questionLines.length * 16 +
          24 +
          answerLines.length * 16 +
          28

        if (
          y + estimatedHeight >
          pageHeight - margin
        ) {
          pdf.addPage()
          y = margin
        }

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(11)

        pdf.text(
          `Question ${index + 1}`,
          margin,
          y
        )

        y += 18

        pdf.setFont('helvetica', 'normal')
        pdf.text(
          questionLines,
          margin,
          y
        )

        y +=
          questionLines.length * 16 + 14

        pdf.setFont('helvetica', 'bold')
        pdf.text(
          'Answer',
          margin,
          y
        )

        y += 18

        pdf.setFont('helvetica', 'normal')
        pdf.text(
          answerLines,
          margin,
          y
        )

        y +=
          answerLines.length * 16 + 28
      })

      const safeSourceName = sourceName
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/^-+|-+$/g, '') ||
        'study-material'

      pdf.save(
        `${safeSourceName}-flashcards.pdf`
      )
    } catch (exportError) {
      console.error(
        'Flashcards PDF export error:',
        exportError
      )

      setError(
        'Unable to export these flashcards to PDF. Please try again.'
      )
    } finally {
      setFlashcardActionLoading(false)
    }
  }


  const handleDeleteFlashcards = async () => {
    if (!generatedOutput?.output_id) {
      return
    }

    const shouldDelete = window.confirm(
      'Delete this generated flashcard set? This action cannot be undone.'
    )

    if (!shouldDelete) {
      return
    }

    setFlashcardActionLoading(true)
    setError('')

    try {
      const response = await deleteAIOutput(
        generatedOutput.output_id
      )

      if (!response.ok) {
        setError(
          response.data?.message ||
            'Unable to delete this flashcard set. Please try again.'
        )

        return
      }

      const remainingFlashcardSets =
        savedFlashcardSets.filter(
          (flashcardSet) =>
            flashcardSet.output_id !==
            generatedOutput.output_id
        )

      const nextFlashcardSet =
        remainingFlashcardSets[0] ?? null

      setSavedFlashcardSets(
        remainingFlashcardSets
      )

      setGeneratedOutput(
        nextFlashcardSet
      )

      setFlashcards(
        Array.isArray(nextFlashcardSet?.content)
          ? nextFlashcardSet.content
          : []
      )

      setCurrentCard(0)
      setShowAnswer(false)
      setDisclaimer('')
      setRetryableError(false)
    } catch (deleteError) {
      console.error(
        'Flashcards delete error:',
        deleteError
      )

      setError(
        'Unable to connect to the server. Please try again.'
      )
    } finally {
      setFlashcardActionLoading(false)
    }
  }


  const handleNext = () => {
    if (
      currentCard <
      flashcards.length - 1
    ) {
      setCurrentCard(
        currentCard + 1
      )

      setShowAnswer(false)
    }
  }


  const handlePrevious = () => {
    if (currentCard > 0) {
      setCurrentCard(
        currentCard - 1
      )

      setShowAnswer(false)
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
    <div className="flashcards-theme mx-auto w-full max-w-[1660px]">
      <style>
        {`
          .flashcards-theme-text {
            transition:
              color 100ms ease;
          }

          .flashcards-theme-surface {
            transition:
              background-color 500ms ease,
              border-color 500ms ease,
              box-shadow 300ms ease;
          }

          .flashcards-theme-interactive {
            transition:
              color 100ms ease,
              background-color 300ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease,
              opacity 300ms ease,
              filter 300ms ease;
          }

          .flashcards-theme-border {
            transition:
              border-color 500ms ease;
          }


          [data-theme-mode='light']
          .flashcards-heading {
            color: #171717 !important;
          }

          [data-theme-mode='light']
          .flashcards-body {
            color: #65676b !important;
          }

          [data-theme-mode='light']
          .flashcards-muted {
            color: #7a7575 !important;
          }

          [data-theme-mode='light']
          .flashcards-accent {
            color: #7a44ff !important;
          }

          [data-theme-mode='light']
          .flashcards-accent-soft {
            color: #6f42c1 !important;
          }


          [data-theme-mode='light']
          .flashcards-surface {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;
          }


          [data-theme-mode='light']
          .flashcards-loading-text {
            color:
              #6f42c1 !important;
          }


          [data-theme-mode='light']
          .flashcards-error-text {
            color:
              #b91c1c !important;
          }


          [data-theme-mode='light']
          .flashcards-warning-heading {
            color:
              #92400e !important;
          }

          [data-theme-mode='light']
          .flashcards-warning-body {
            color:
              #a16207 !important;
          }


          [data-theme-mode='light']
          .flashcards-consent-badge {
            color:
              #047857 !important;

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
          .flashcards-ai-badge {
            color:
              #6f42c1 !important;

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
          .flashcards-link:hover {
            color:
              #6634e8 !important;
          }


          [data-theme-mode='light']
          .flashcards-export-action {
            background-color:
              #ffffff !important;

            border-color:
              rgba(
                122,
                68,
                255,
                0.32
              ) !important;

            color:
              #6d35d8 !important;
          }


          [data-theme-mode='light']
          .flashcards-export-action:hover {
            background-color:
              rgba(
                122,
                68,
                255,
                0.10
              ) !important;

            border-color:
              rgba(
                122,
                68,
                255,
                0.60
              ) !important;

            color:
              #5420b8 !important;
          }


          [data-theme-mode='light']
          .flashcards-delete-action {
            background-color:
              #ffffff !important;

            border-color:
              rgba(
                220,
                38,
                38,
                0.30
              ) !important;

            color:
              #dc2626 !important;
          }


          [data-theme-mode='light']
          .flashcards-delete-action:hover {
            background-color:
              rgba(
                220,
                38,
                38,
                0.08
              ) !important;

            border-color:
              rgba(
                220,
                38,
                38,
                0.58
              ) !important;

            color:
              #b91c1c !important;
          }


          [data-theme-mode='light']
          .flashcards-export-action svg,
          [data-theme-mode='light']
          .flashcards-delete-action svg {
            opacity:
              1 !important;
          }


          [data-theme-mode='light']
          .flashcards-generate-button:disabled {
            background-image:
              none !important;

            background-color:
              #e6e3eb !important;

            color:
              #9a96a6 !important;

            box-shadow:
              none !important;
          }


          [data-theme-mode='light']
          .flashcards-retry-button:disabled {
            background-color:
              #e6e3eb !important;

            border-color:
              transparent !important;

            color:
              #9a96a6 !important;
          }


          [data-theme-mode='light']
          .flashcards-source {
            color:
              #5f5b78 !important;
          }


          [data-theme-mode='light']
          .flashcards-counter {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;

            color:
              #65676b !important;
          }


          [data-theme-mode='light']
          .flashcards-progress-track {
            background-color:
              #e5e1ec !important;
          }


          [data-theme-mode='light']
          .flashcards-card {
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
                0.08
              ) !important;
          }


          [data-theme-mode='light']
          .flashcards-answer-border {
            border-color:
              #dfdfdf !important;
          }


          [data-theme-mode='light']
          .flashcards-answer-label {
            color:
              #047857 !important;
          }


          [data-theme-mode='light']
          .flashcards-navigation-button {
            background-color:
              #ffffff !important;

            border-color:
              #d7d3df !important;

            color:
              #6f42c1 !important;
          }


          [data-theme-mode='light']
          .flashcards-navigation-button:hover:not(:disabled) {
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
          .flashcards-navigation-button:disabled {
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
           * STUDYA FLASHCARDS ILLUMINATED SURFACE
           *
           * Visual enhancement only.
           * Generation, history, reveal, navigation,
           * export and consent behaviour are unchanged.
           */
          .flashcards-surface {
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
           * Reflective upper edge.
           */
          .flashcards-surface::after {
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


          .flashcards-surface:hover {
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
          .flashcards-surface {
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
          .flashcards-surface::after {
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
          .flashcards-surface:hover {
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
        <p className="flashcards-theme-text flashcards-accent mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
          AI Study Tools
        </p>

        <h1 className="flashcards-theme-text flashcards-heading text-3xl font-bold tracking-tight text-[#f3f0ff]">
          Flashcards
        </h1>

        <p className="flashcards-theme-text flashcards-body mt-2 max-w-3xl text-sm leading-6 text-[#898cc0]">
          Generate and review AI flashcards from your uploaded
          study materials.
        </p>
      </div>


      {/* Flashcard Generator */}
      <div className="mb-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)] lg:gap-6">
          <div className="w-full">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <label
              htmlFor="flashcard-document"
              className="flashcards-theme-text flashcards-heading block text-sm font-medium text-[#d9d4eb]"
            >
              Select a document
            </label>

            {!consentInitialLoading &&
              consentStatus ===
                'granted' && (
                <Link
                  to="/privacy"
                  title="AI processing consent is granted. Manage consent."
                  className="flashcards-theme-interactive flashcards-consent-badge inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:border-emerald-400/40 hover:bg-emerald-500/15"
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
              className="flashcards-theme-surface flex items-center gap-3 rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 p-4"
              role="status"
            >
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

              <p className="flashcards-theme-text flashcards-loading-text text-sm text-[#c9b4ff]">
                Loading your uploaded study materials...
              </p>
            </div>
          ) : documents.length ===
              0 &&
            !documentsError ? (
            <div className="flashcards-theme-surface rounded-lg border border-amber-400/20 bg-amber-500/[0.07] p-5">
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
                  <p className="flashcards-theme-text flashcards-warning-heading font-medium text-amber-200">
                    No uploaded study materials
                  </p>

                  <p className="flashcards-theme-text flashcards-warning-body mt-1 text-sm leading-6 text-amber-100/70">
                    Upload a PDF, DOCX or TXT document before
                    generating flashcards.
                  </p>

                  <Link
                    to="/upload"
                    className="flashcards-theme-text flashcards-accent flashcards-link mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#a97cff]"
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
              id="flashcard-document"
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

                clearGeneratedFlashcards()

                setError('')

                setRetryableError(
                  false
                )
              }}
            />
          )}
        </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-end">
            <div className="w-full sm:w-44">
              <label
                htmlFor="flashcard-difficulty"
                className="mb-2 block text-xs font-medium text-[#898cc0]"
              >
                Flashcard Difficulty
              </label>
              <AnimatedSelect
                id="flashcard-difficulty"
                value={flashcardDifficulty}
                options={[
                  { value: 'beginner', label: 'Beginner' },
                  { value: 'intermediate', label: 'Intermediate' },
                  { value: 'advanced', label: 'Advanced' },
                ]}
                onChange={(newValue) => {
                  setFlashcardDifficulty(newValue)
                  setError('')
                  setRetryableError(false)
                }}
              />
            </div>

            <div className="flex items-end lg:justify-end">
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
                className="flashcards-generate-button inline-flex w-fit shrink-0 items-center gap-2 rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#9c46ff] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(122,68,255,0.18)] transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:from-[#3a3150] disabled:to-[#3a3150] disabled:text-[#77718d] disabled:shadow-none"
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
                  ? 'Generating Flashcards...'
                  : 'Generate New Flashcards'}
              </button>
            </div>
          </div>


        </div>
        {/* Document Error */}
        {documentsError && (
          <div
            className="flashcards-theme-surface mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
            role="alert"
          >
            <p className="flashcards-theme-text flashcards-error-text text-sm leading-6 text-red-300">
              {documentsError}
            </p>
          </div>
        )}


        {/* AI Consent Status */}
        <div className="mt-6">
          {consentInitialLoading ? (
            <div
              className="flashcards-theme-surface flex items-center gap-3 rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 p-4"
              role="status"
            >
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

              <p className="flashcards-theme-text flashcards-loading-text text-sm text-[#c9b4ff]">
                Checking your AI processing consent...
              </p>
            </div>
          ) : consentStatus !==
            'granted' ? (
            <AIConsentRequired
              featureName="AI-generated flashcards"
            />
          ) : null}
        </div>


        {/* Consent Error */}
        {consentError && (
          <div
            className="flashcards-theme-surface mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
            role="alert"
          >
            <p className="flashcards-theme-text flashcards-error-text text-sm leading-6 text-red-300">
              {consentError}
            </p>
          </div>
        )}


        {/* Flashcard Error */}
        {error && (
          <div
            className="flashcards-theme-surface mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
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
                <p className="flashcards-theme-text flashcards-error-text text-sm leading-6 text-red-300">
                  {error}
                </p>

                {retryableError && (
                  <button
                    type="button"
                    onClick={
                      handleGenerate
                    }
                    disabled={
                      generationLoading
                    }
                    className="flashcards-theme-interactive flashcards-retry-button mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#3a3150] disabled:text-[#77718d]"
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


      {/* Flashcard History and Generated Flashcards */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)]">
      {/* Previous Flashcard Sets */}
      <section className="flashcards-theme-surface flashcards-surface overflow-hidden rounded-xl border border-[#2a1b4d] bg-[#160b32]">
        <div className="flashcards-theme-border border-b border-[#2a1b4d] px-5 py-4">
          <p className="flashcards-theme-text flashcards-accent text-xs font-semibold uppercase tracking-[0.14em] text-[#a97cff]">
            Previous Flashcard Sets
          </p>
        </div>
        <div className="p-3">
          {!selectedDocument ? (
            <p className="flashcards-theme-text flashcards-body px-2 py-5 text-sm leading-6 text-[#898cc0]">
              Select a document to view its previous flashcard sets.
            </p>
          ) : savedFlashcardSetsLoading ? (
            <div
              className="flex items-center gap-3 px-2 py-5"
              role="status"
            >
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

              <p className="flashcards-theme-text flashcards-loading-text text-sm text-[#c9b4ff]">
                Loading previous flashcard sets...
              </p>
            </div>
          ) : savedFlashcardSetsError ? (
            <p
              className="flashcards-theme-text flashcards-error-text px-2 py-5 text-sm leading-6 text-red-300"
              role="alert"
            >
              {savedFlashcardSetsError}
            </p>
          ) : savedFlashcardSets.length === 0 ? (
            <p className="flashcards-theme-text flashcards-body px-2 py-5 text-sm leading-6 text-[#898cc0]">
              No flashcard sets have been generated for this document yet.
            </p>
          ) : (
            <div className="space-y-2">
              {[...savedFlashcardSets].reverse().map(
                (flashcardSet, index) => {
                  const isActiveFlashcardSet =
                    generatedOutput?.output_id ===
                    flashcardSet.output_id

                  return (
                    <button
                      key={flashcardSet.output_id}
                      type="button"
                      onClick={() => {
                        setGeneratedOutput(
                          flashcardSet
                        )

                        setFlashcards(
                          Array.isArray(
                            flashcardSet.content
                          )
                            ? flashcardSet.content
                            : []
                        )

                        setCurrentCard(0)
                        setShowAnswer(false)
                        setDisclaimer('')
                        setError('')

                        setRetryableError(
                          false
                        )
                      }}
                      className={`flashcards-theme-interactive flashcards-history-item w-full rounded-lg border px-4 py-3 text-left transition duration-300 ${
                        isActiveFlashcardSet
                          ? 'flashcards-history-item-active border-[#7a44ff]/40 bg-[#7a44ff]/10'
                          : 'border-transparent hover:border-[#7a44ff]/20 hover:bg-[#7a44ff]/5'
                      }`}
                    >
                      <p className="flashcards-theme-text flashcards-heading text-sm font-semibold text-[#e7e2f5]">
                        Flashcards{' '}
                        {index + 1}
                      </p>

                      <p className="flashcards-theme-text flashcards-body mt-1 text-xs text-[#727494]">
                        Generated{' '}
                        {flashcardSet.generated_at
                          ? new Date(
                              flashcardSet.generated_at
                            ).toLocaleString()
                          : 'Date unavailable'}
                      </p>
                    </button>
                  )
                }
              )}
            </div>
          )}
        </div>
      </section>


      {/* Generated Flashcards */}
      <section className="flashcards-theme-surface flashcards-surface min-h-[360px] overflow-hidden rounded-xl border border-[#2a1b4d] bg-[#160b32]">
        <div className="flashcards-theme-border border-b border-[#2a1b4d] px-6 py-5 sm:px-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="flashcards-theme-text flashcards-heading text-2xl font-semibold text-[#f3f0ff]">
                  Generated Flashcards
                </h2>

                {generatedOutput?.is_ai_generated && (
                  <span className="flashcards-theme-interactive flashcards-ai-badge rounded-full border border-[#7a44ff]/25 bg-[#7a44ff]/10 px-3 py-1 text-xs font-semibold text-[#c9b4ff]">
                    AI Generated
                  </span>
                )}
              </div>

              {generatedOutput && (
                <>
                  <p className="flashcards-theme-text flashcards-muted mt-2 text-sm text-[#727494]">
                    Source:{' '}

                    <span className="flashcards-theme-text flashcards-source text-[#a6a8c7]">
                      {generatedOutput.file_name ||
                        selectedDocumentName}
                    </span>
                  </p>

                  <p className="flashcards-theme-text flashcards-muted mt-1 text-sm text-[#727494]">
                    Generated:{' '}

                    <span className="flashcards-theme-text flashcards-source text-[#a6a8c7]">
                      {generatedOutput.generated_at
                        ? new Date(
                            generatedOutput.generated_at
                          ).toLocaleString()
                        : 'Date unavailable'}
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
                  disabled={flashcardActionLoading}
                  title="Export flashcards to Word"
                  aria-label="Export flashcards to Word"
                  className="flashcards-theme-interactive flashcards-export-action inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#c9b4ff] transition duration-300 hover:border-[#a97cff]/50 hover:bg-[#7a44ff]/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
                  disabled={flashcardActionLoading}
                  title="Export flashcards to PDF"
                  aria-label="Export flashcards to PDF"
                  className="flashcards-theme-interactive flashcards-export-action inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#c9b4ff] transition duration-300 hover:border-[#a97cff]/50 hover:bg-[#7a44ff]/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
                  onClick={handleDeleteFlashcards}
                  disabled={flashcardActionLoading}
                  title="Delete flashcard set"
                  aria-label="Delete flashcard set"
                  className="flashcards-theme-interactive flashcards-delete-action inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-400/25 bg-red-500/10 text-red-300 transition duration-300 hover:border-red-400/50 hover:bg-red-500/20 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
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


        {generatedOutput && flashcards.length > 0 ? (
          <div className="px-6 py-7 sm:px-7">
            <div className="mb-5 flex justify-end">
              <div className="flashcards-theme-surface flashcards-counter rounded-full border border-[#2a1b4d] bg-[#160b32] px-4 py-2 text-sm font-medium text-[#a6a8c7]">
                Card{' '}

                <span className="flashcards-theme-text flashcards-accent-soft font-semibold text-[#c9b4ff]">
                  {currentCard + 1}
                </span>{' '}

                of {flashcards.length}
              </div>
            </div>


            {/* Progress Bar */}
            <div className="flashcards-theme-surface flashcards-progress-track mb-5 h-1.5 overflow-hidden rounded-full bg-[#241743]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7a44ff] to-[#d83dff] transition-all duration-300"
                style={{
                  width: `${(
                    (currentCard + 1) /
                    flashcards.length
                  ) * 100}%`,
                }}
              />
            </div>


            {/* Flashcard */}
            <div className="flashcards-theme-surface flashcards-card relative flex min-h-80 flex-col justify-between overflow-hidden rounded-2xl border border-[#2a1b4d] bg-[#120928]/50 p-7 shadow-[0_18px_50px_rgba(0,0,0,0.12)] sm:p-8">
              <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#7a44ff]/10 blur-3xl" />

              <div className="relative">
                <div className="flex items-center gap-2">
                  <div className="flashcards-accent flex h-8 w-8 items-center justify-center rounded-lg bg-[#7a44ff]/10 text-[#a97cff]">
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

                  <p className="flashcards-theme-text flashcards-accent text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
                    Question
                  </p>
                </div>

                <h3 className="flashcards-theme-text flashcards-heading mt-5 max-w-4xl text-2xl font-semibold leading-relaxed text-[#f3f0ff]">
                  {
                    flashcards[
                      currentCard
                    ]?.question
                  }
                </h3>


                {showAnswer && (
                  <div className="flashcards-theme-border flashcards-answer-border mt-8 border-t border-[#2a1b4d] pt-6">
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

                      <p className="flashcards-theme-text flashcards-answer-label text-xs font-semibold uppercase tracking-[0.15em] text-emerald-300">
                        Answer
                      </p>
                    </div>

                    <p className="flashcards-theme-text flashcards-heading mt-4 max-w-4xl leading-7 text-[#d9d4eb]">
                      {
                        flashcards[
                          currentCard
                        ]?.answer
                      }
                    </p>
                  </div>
                )}
              </div>


              {!showAnswer && (
                <div className="relative mt-8">
                  <button
                    type="button"
                    onClick={() =>
                      setShowAnswer(
                        true
                      )
                    }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#9c46ff] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(122,68,255,0.18)] transition duration-300 hover:brightness-110 sm:w-auto"
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
                onClick={
                  handlePrevious
                }
                disabled={
                  currentCard === 0
                }
                className="flashcards-theme-interactive flashcards-navigation-button inline-flex items-center gap-2 rounded-lg border border-[#3a2860] bg-[#160b32] px-5 py-2.5 text-sm font-medium text-[#c9b4ff] hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/10 disabled:cursor-not-allowed disabled:opacity-35"
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
                  currentCard ===
                  flashcards.length - 1
                }
                className="flashcards-theme-interactive flashcards-navigation-button inline-flex items-center gap-2 rounded-lg border border-[#3a2860] bg-[#160b32] px-5 py-2.5 text-sm font-medium text-[#c9b4ff] hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/10 disabled:cursor-not-allowed disabled:opacity-35"
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
            <div className="flashcards-theme-surface mt-6 rounded-lg border border-amber-400/20 bg-amber-500/[0.07] p-5">
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
                  <h3 className="flashcards-theme-text flashcards-warning-heading font-semibold text-amber-200">
                    AI-Generated Content
                  </h3>

                  <p className="flashcards-theme-text flashcards-warning-body mt-1 text-sm leading-6 text-amber-100/70">
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


              <p className="flashcards-theme-text flashcards-heading font-semibold text-[#e7e2f5]">
                No flashcard set selected
              </p>

              <p className="flashcards-theme-text flashcards-body mt-2 text-sm leading-6 text-[#898cc0]">
                {selectedDocument
                  ? 'Choose a previous flashcard set from the left or generate a new flashcard set for this document.'
                  : 'Select a document above to view or generate flashcards.'}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
    </div>
  )
}


export default Flashcards
