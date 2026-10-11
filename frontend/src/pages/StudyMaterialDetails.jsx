import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate, useParams } from 'react-router'

import { getAIOutputs } from '../services/aiService'
import { getUploadedFile } from '../services/uploadedService'

const AI_RESOURCE_TYPES = [
  {
    type: 'summary',
    label: 'Summary',
  },
  {
    type: 'flashcards',
    label: 'Flashcards',
  },
  {
    type: 'quiz',
    label: 'Practice Quiz',
  },
  {
    type: 'explanation',
    label: 'Concept Explanation',
  },
]

function StudyMaterialDetails() {
  const navigate = useNavigate()
  const { fileId } = useParams()

  const [file, setFile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [aiOutputs, setAIOutputs] = useState([])
  const [isLoadingAI, setIsLoadingAI] = useState(true)
  const [aiError, setAIError] = useState('')

  useEffect(() => {
    let isActive = true

    const loadFile = async () => {
      setIsLoading(true)
      setError('')

      try {
        const response = await getUploadedFile(fileId)

        if (
          !response.ok ||
          response.data?.status !== 'success'
        ) {
          if (isActive) {
            setError(
              response.data?.message ||
              'Unable to load this study material.'
            )
          }

          return
        }

        if (isActive) {
          setFile(response.data?.file || null)
        }
      } catch (loadError) {
        console.error(
          'Study material details load error:',
          loadError
        )

        if (isActive) {
          setError(
            'Unable to connect to the server while loading this study material.'
          )
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadFile()

    return () => {
      isActive = false
    }
  }, [fileId])

  useEffect(() => {
    let isActive = true

    const loadAIOutputs = async () => {
      setIsLoadingAI(true)
      setAIError('')

      try {
        const response = await getAIOutputs(fileId)

        if (
          !response.ok ||
          response.data?.status !== 'success'
        ) {
          if (isActive) {
            setAIError(
              response.data?.message ||
              'Unable to load generated study resources.'
            )
          }

          return
        }

        if (isActive) {
          setAIOutputs(response.data?.outputs || [])
        }
      } catch (loadError) {
        console.error(
          'Study material AI resources load error:',
          loadError
        )

        if (isActive) {
          setAIError(
            'Unable to connect to the server while loading generated study resources.'
          )
        }
      } finally {
        if (isActive) {
          setIsLoadingAI(false)
        }
      }
    }

    loadAIOutputs()

    return () => {
      isActive = false
    }
  }, [fileId])

  const fileExtension = useMemo(() => {
    if (!file?.file_name) {
      return 'Unknown'
    }

    return (
      file.file_name
        .split('.')
        .pop()
        ?.toUpperCase() || 'Unknown'
    )
  }, [file?.file_name])

  const extractedTextStatistics = useMemo(() => {
    const text = file?.extracted_text || ''
    const trimmedText = text.trim()

    return {
      characters: text.length,
      words: trimmedText
        ? trimmedText.split(/\s+/).length
        : 0,
    }
  }, [file?.extracted_text])

  const aiResourceSummary = useMemo(
    () =>
      AI_RESOURCE_TYPES.map((resource) => {
        const matchingOutputs = aiOutputs.filter(
          (output) =>
            output.output_type === resource.type
        )

        return {
          ...resource,
          count: matchingOutputs.length,
          latestGeneratedAt:
            matchingOutputs[0]?.generated_at || null,
        }
      }),
    [aiOutputs]
  )

  const generatedResourceTypes =
    aiResourceSummary.filter(
      (resource) => resource.count > 0
    ).length

  const formatUploadedDate = (value) => {
    if (!value) {
      return 'Unknown date'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return 'Unknown date'
    }

    return date.toLocaleString()
  }

  return (
    <div className="study-material-details mx-auto w-full max-w-[1660px]">
      <style>
        {`
          .study-material-details-text {
            transition: color 100ms ease;
          }

          .study-material-details-surface {
            transition:
              background-color 500ms ease,
              border-color 500ms ease,
              box-shadow 300ms ease,
              transform 300ms ease;
          }

          .study-material-details-back {
            transition:
              color 100ms ease,
              background-color 300ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease;
          }

          [data-theme-mode='light']
          .study-material-details-heading {
            color: #171717 !important;
          }

          [data-theme-mode='light']
          .study-material-details-body {
            color: #65676b !important;
          }

          [data-theme-mode='light']
          .study-material-details-accent {
            color: #7a44ff !important;
          }

          [data-theme-mode='light']
          .study-material-details-surface {
            background-color: #ffffff !important;
            border-color: #dfdfdf !important;
          }

          [data-theme-mode='light']
          .study-material-details .divide-\[\#2a1b4d\] > :not([hidden]) ~ :not([hidden]) {
            border-color: #dfdfdf !important;
          }

          [data-theme-mode='light']
          .study-material-status-check {
            background-color: #d1fae5 !important;
            color: #047857 !important;
          }

          [data-theme-mode='light']
          .study-material-status-generated {
            background-color: #ecfdf5 !important;
            border-color: #a7f3d0 !important;
            color: #047857 !important;
          }

          [data-theme-mode='light']
          .study-material-status-pending {
            background-color: #f7f7fb !important;
            border-color: #d7d3df !important;
            color: #65676b !important;
          }

          [data-theme-mode='light']
          .study-material-details-back {
            background-color: #ffffff !important;
            border-color: #d7d3df !important;
            color: #6f42c1 !important;
          }

          [data-theme-mode='light']
          .study-material-details-back:hover {
            background-color: rgba(122, 68, 255, 0.08) !important;
            border-color: rgba(122, 68, 255, 0.6) !important;
            color: #7a44ff !important;
          }

          /*
           * STUDYA STUDY MATERIAL DETAILS ILLUMINATED SURFACE
           *
           * Visual enhancement only.
           * Upload data, AI resource data, status information
           * and navigation behaviour remain unchanged.
           */
          .study-material-details-surface:not([role='alert']) {
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
              box-shadow 300ms ease,
              transform 300ms ease;
          }


          /*
           * Reflective upper edge.
           */
          .study-material-details-surface:not([role='alert'])::after {
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


          .study-material-details-surface:not([role='alert']):hover {
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
          .study-material-details-surface:not([role='alert']) {
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
          .study-material-details-surface:not([role='alert'])::after {
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
          .study-material-details-surface:not([role='alert']):hover {
            border-color:
              rgba(122, 68, 255, 0.28) !important;

            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 1),
              0 13px 32px rgba(91, 60, 145, 0.10),
              0 0 18px rgba(122, 68, 255, 0.04);
          }
        `}
      </style>

      <button
        type="button"
        onClick={() => navigate('/upload')}
        className="study-material-details-back mb-6 inline-flex items-center gap-2 rounded-lg border border-[#3a2860] bg-[#19103a] px-4 py-2 text-sm font-medium text-[#c9b4ff] hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/10"
      >
        <span aria-hidden="true">←</span>
        Back to Uploaded Materials
      </button>

      <p className="study-material-details-text study-material-details-accent mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
        Study Materials
      </p>

      <h1 className="study-material-details-text study-material-details-heading text-3xl font-bold tracking-tight text-[#f3f0ff]">
        Study Material Details
      </h1>

      <p className="study-material-details-text study-material-details-body mt-2 text-sm leading-6 text-[#898cc0]">
        Review document information and StudyA processing details.
      </p>

      {isLoading ? (
        <div className="mt-8 flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

          <p className="study-material-details-text study-material-details-body text-sm text-[#898cc0]">
            Loading study material...
          </p>
        </div>
      ) : error ? (
        <div
          className="study-material-details-surface mt-8 rounded-xl border border-red-400/25 bg-red-500/10 p-5"
          role="alert"
        >
          <p className="study-material-details-text text-sm leading-6 text-red-300">
            {error}
          </p>
        </div>
      ) : file ? (
        <>
          <section className="study-material-details-surface mt-8 rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="study-material-details-accent flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#7a44ff]/20 bg-[#7a44ff]/10 text-[#a97cff]">
                  <svg
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 3h9l3 3v15H6V3Zm9 0v4h4M9 11h6M9 15h6"
                    />
                  </svg>
                </div>

                <div className="min-w-0">
                  <p className="study-material-details-text study-material-details-heading break-words text-xl font-bold text-[#f3f0ff]">
                    {file.file_name}
                  </p>

                  <p className="study-material-details-text study-material-details-body mt-1 text-sm text-[#898cc0]">
                    Uploaded {formatUploadedDate(file.uploaded_at)}
                  </p>
                </div>
              </div>

              <span className="study-material-details-text study-material-details-accent self-start rounded-lg border border-[#7a44ff]/20 bg-[#7a44ff]/10 px-3 py-2 text-xs font-bold tracking-wide text-[#a97cff]">
                {fileExtension}
              </span>
            </div>
          </section>

          <section
            aria-label="Study material statistics"
            className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {[
              {
                label: 'File Type',
                value: fileExtension,
              },
              {
                label: 'Extracted Text',
                value: `${extractedTextStatistics.characters.toLocaleString()} chars`,
              },
              {
                label: 'Word Count',
                value: extractedTextStatistics.words.toLocaleString(),
              },
              {
                label: 'AI Resources',
                value: isLoadingAI
                  ? '—'
                  : `${generatedResourceTypes} / 4`,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="study-material-details-surface rounded-xl border border-[#2a1b4d] bg-[#160b32] p-5 hover:-translate-y-0.5 hover:shadow-[0_8px_26px_rgba(122,68,255,0.12)]"
              >
                <p className="study-material-details-text study-material-details-body text-sm font-medium text-[#898cc0]">
                  {stat.label}
                </p>

                <p className="study-material-details-text study-material-details-heading mt-3 text-2xl font-bold tracking-tight text-[#f3f0ff]">
                  {stat.value}
                </p>
              </div>
            ))}
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="study-material-details-surface rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6">
              <p className="study-material-details-text study-material-details-accent mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
                File Details
              </p>

              <dl className="mt-5 space-y-4">
                <div>
                  <dt className="study-material-details-text study-material-details-body text-xs font-medium uppercase tracking-wide text-[#727494]">
                    File name
                  </dt>
                  <dd className="study-material-details-text study-material-details-heading mt-1 break-words text-sm font-medium text-[#e7e2f5]">
                    {file.file_name}
                  </dd>
                </div>

                <div>
                  <dt className="study-material-details-text study-material-details-body text-xs font-medium uppercase tracking-wide text-[#727494]">
                    Format
                  </dt>
                  <dd className="study-material-details-text study-material-details-heading mt-1 text-sm font-medium text-[#e7e2f5]">
                    {fileExtension}
                  </dd>
                </div>

                <div>
                  <dt className="study-material-details-text study-material-details-body text-xs font-medium uppercase tracking-wide text-[#727494]">
                    Uploaded
                  </dt>
                  <dd className="study-material-details-text study-material-details-heading mt-1 text-sm font-medium text-[#e7e2f5]">
                    {formatUploadedDate(file.uploaded_at)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="study-material-details-surface rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6">
              <p className="study-material-details-text study-material-details-accent mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
                Document Status
              </p>

              <div className="mt-5 space-y-3">
                {[
                  'Upload completed',
                  'Text extraction completed',
                  'Ready for AI study tools',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3"
                  >
                    <span className="study-material-status-check flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
                      ✓
                    </span>

                    <p className="study-material-details-text study-material-details-heading text-sm font-medium text-[#e7e2f5]">
                      {item}
                    </p>
                  </div>
                ))}
              </div>

              <p className="study-material-details-text study-material-details-body mt-5 text-sm leading-6 text-[#898cc0]">
                AI consent is checked separately when generating study resources.
              </p>
            </div>
          </section>

          <section className="study-material-details-surface mt-5 rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6 sm:p-7">
            <div>
              <p className="study-material-details-text study-material-details-accent mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
                AI Study Resources
              </p>

              <h2 className="study-material-details-text study-material-details-heading text-xl font-bold text-[#f3f0ff]">
                Generated Resources
              </h2>

              <p className="study-material-details-text study-material-details-body mt-1 text-sm leading-6 text-[#898cc0]">
                See which StudyA resources have already been generated from this document.
              </p>
            </div>

            {isLoadingAI ? (
              <div className="mt-6 flex items-center gap-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

                <p className="study-material-details-text study-material-details-body text-sm text-[#898cc0]">
                  Loading generated resources...
                </p>
              </div>
            ) : aiError ? (
              <div
                className="mt-6 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
                role="alert"
              >
                <p className="study-material-details-text text-sm leading-6 text-red-300">
                  {aiError}
                </p>
              </div>
            ) : (
              <div className="mt-6 divide-y divide-[#2a1b4d]">
                {aiResourceSummary.map((resource) => (
                  <div
                    key={resource.type}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="study-material-details-text study-material-details-heading font-medium text-[#e7e2f5]">
                        {resource.label}
                      </p>

                      <p className="study-material-details-text study-material-details-body mt-1 text-sm text-[#898cc0]">
                        {resource.count > 0
                          ? `${resource.count} saved ${
                              resource.count === 1
                                ? 'resource'
                                : 'resources'
                            }`
                          : 'No saved resource yet'}
                      </p>
                    </div>

                    <div className="flex flex-col items-start gap-1 sm:items-end">
                      <span
                        className={
                          resource.count > 0
                            ? 'study-material-status-generated rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300'
                            : 'study-material-status-pending study-material-details-text study-material-details-body rounded-full border border-[#3a2860] bg-[#120928]/60 px-3 py-1 text-xs font-semibold text-[#898cc0]'
                        }
                      >
                        {resource.count > 0
                          ? 'Generated'
                          : 'Not generated'}
                      </span>

                      {resource.latestGeneratedAt && (
                        <p className="study-material-details-text study-material-details-body text-xs text-[#727494]">
                          Latest:{' '}
                          {formatUploadedDate(
                            resource.latestGeneratedAt
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}

export default StudyMaterialDetails
