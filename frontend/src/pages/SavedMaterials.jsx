import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  getUploadedFiles,
} from '../services/uploadedService'

import {
  deleteAIOutput,
  getAIOutputs,
} from '../services/aiService'

import AnimatedSelect from '../components/AnimatedSelect'


function SavedMaterials() {
  const [filter, setFilter] =
    useState('all')

  const [search, setSearch] =
    useState('')

  const [materials, setMaterials] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [
    expandedMaterialId,
    setExpandedMaterialId,
  ] = useState(null)

  const [
    deletingMaterialId,
    setDeletingMaterialId,
  ] = useState(null)

  const [
    actionError,
    setActionError,
  ] = useState('')

  const [
    actionSuccess,
    setActionSuccess,
  ] = useState('')

  const [
    savedMaterialsOpen,
    setSavedMaterialsOpen,
  ] = useState(false)


  const loadSavedMaterials =
    async () => {
      setLoading(true)
      setError('')

      try {
        const uploadedResponse =
          await getUploadedFiles()

        if (
          !uploadedResponse.ok
        ) {
          if (
            uploadedResponse.status ===
            401
          ) {
            setError(
              'Your login session is missing or invalid. Please sign in again.'
            )
          } else {
            setError(
              uploadedResponse.data
                ?.message ||
                'Unable to retrieve your uploaded study materials.'
            )
          }

          return
        }

        const files =
          uploadedResponse.data
            ?.files ?? []

        if (
          files.length === 0
        ) {
          setMaterials([])
          return
        }

        const outputRequests =
          files.map(
            async (file) => {
              const response =
                await getAIOutputs(
                  file.file_id
                )

              return {
                file,
                response,
              }
            }
          )

        const results =
          await Promise.all(
            outputRequests
          )

        const savedMaterials = []

        results.forEach(
          ({ file, response }) => {
            if (!response.ok) {
              console.error(
                `Unable to load saved AI outputs for file ${file.file_id}:`,
                response.data
              )

              return
            }

            const outputs =
              response.data
                ?.outputs ?? []

            outputs.forEach(
              (output) => {
                savedMaterials.push(
                  {
                    id:
                      output.output_id,

                    outputId:
                      output.output_id,

                    fileId:
                      file.file_id,

                    title:
                      getMaterialTitle(
                        output.output_type,
                        file.file_name
                      ),

                    type:
                      getMaterialTypeLabel(
                        output.output_type
                      ),

                    outputType:
                      output.output_type,

                    source:
                      file.file_name,

                    createdAt:
                      output.generated_at,

                    content:
                      output.content,

                    isAiGenerated:
                      Boolean(
                        output.is_ai_generated
                      ),
                  }
                )
              }
            )
          }
        )

        savedMaterials.sort(
          (a, b) => {
            const dateA =
              new Date(
                a.createdAt
              ).getTime()

            const dateB =
              new Date(
                b.createdAt
              ).getTime()

            return dateB - dateA
          }
        )

        setMaterials(
          savedMaterials
        )
      } catch (loadError) {
        console.error(
          'Saved materials load error:',
          loadError
        )

        setError(
          'Unable to connect to the server to retrieve your saved materials.'
        )
      } finally {
        setLoading(false)
      }
    }


  useEffect(() => {
    loadSavedMaterials()
  }, [])


  useEffect(() => {
    if (!actionSuccess) {
      return undefined
    }

    const timer =
      window.setTimeout(
        () => {
          setActionSuccess('')
        },
        4000
      )

    return () =>
      window.clearTimeout(
        timer
      )
  }, [actionSuccess])


  const filteredMaterials =
    useMemo(() => {
      const normalisedSearch =
        search
          .trim()
          .toLowerCase()

      return materials.filter(
        (material) => {
          const matchesFilter =
            filter === 'all' ||
            material.outputType ===
              filter

          const matchesSearch =
            normalisedSearch ===
              '' ||
            material.title
              .toLowerCase()
              .includes(
                normalisedSearch
              ) ||
            material.source
              .toLowerCase()
              .includes(
                normalisedSearch
              )

          return (
            matchesFilter &&
            matchesSearch
          )
        }
      )
    }, [
      filter,
      search,
      materials,
    ])


  const handleToggleMaterial =
    (materialId) => {
      setExpandedMaterialId(
        (currentId) =>
          currentId ===
          materialId
            ? null
            : materialId
      )

      setActionError('')
    }


  const handleDeleteMaterial =
    async (material) => {
      const confirmed =
        window.confirm(
          `Are you sure you want to delete "${material.title}"? This action cannot be undone.`
        )

      if (!confirmed) {
        return
      }

      const actionStartedAt =
        Date.now()

      const waitForMinimumFeedback =
        async () => {
          const elapsedTime =
            Date.now() -
            actionStartedAt

          const remainingFeedbackTime =
            Math.max(
              0,
              2000 -
                elapsedTime
            )

          if (
            remainingFeedbackTime >
            0
          ) {
            await new Promise(
              (resolve) => {
                window.setTimeout(
                  resolve,
                  remainingFeedbackTime
                )
              }
            )
          }
        }

      setDeletingMaterialId(
        material.outputId
      )

      setActionError('')
      setActionSuccess('')

      try {
        const response =
          await deleteAIOutput(
            material.outputId
          )

        if (!response.ok) {
          if (
            response.status ===
            401
          ) {
            setActionError(
              'Your login session is missing or invalid. Please sign in again.'
            )

            return
          }

          if (
            response.status ===
              404 ||
            response.data?.code ===
              'OUTPUT_NOT_FOUND'
          ) {
            await waitForMinimumFeedback()

            setDeletingMaterialId(
              null
            )

            setMaterials(
              (
                currentMaterials
              ) =>
                currentMaterials.filter(
                  (
                    currentMaterial
                  ) =>
                    currentMaterial.outputId !==
                    material.outputId
                )
            )

            if (
              expandedMaterialId ===
              material.outputId
            ) {
              setExpandedMaterialId(
                null
              )
            }

            setActionError(
              'This saved material could not be found. It has been removed from the displayed list.'
            )

            return
          }

          setActionError(
            response.data?.message ||
              'Unable to delete the saved material.'
          )

          return
        }

        await waitForMinimumFeedback()

        setDeletingMaterialId(
          null
        )

        setMaterials(
          (
            currentMaterials
          ) =>
            currentMaterials.filter(
              (
                currentMaterial
              ) =>
                currentMaterial.outputId !==
                material.outputId
            )
        )

        if (
          expandedMaterialId ===
          material.outputId
        ) {
          setExpandedMaterialId(
            null
          )
        }

        setActionSuccess(
          'Saved material deleted successfully.'
        )
      } catch (deleteError) {
        console.error(
          'Saved material delete error:',
          deleteError
        )

        setActionError(
          'Unable to connect to the server. Please try again.'
        )
      } finally {
        await waitForMinimumFeedback()

        setDeletingMaterialId(
          null
        )
      }
    }


  const formatDate = (
    value
  ) => {
    if (!value) {
      return ''
    }

    const date =
      new Date(value)

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return ''
    }

    return date.toLocaleDateString()
  }


  const getTypeStyle = (
    type
  ) => {
    switch (type) {
      case 'Summary':
        return 'saved-materials-type-summary border-sky-400/20 bg-sky-500/10 text-sky-300'

      case 'Flashcards':
        return 'saved-materials-type-flashcards border-purple-400/20 bg-purple-500/10 text-purple-300'

      case 'Quiz':
        return 'saved-materials-type-quiz border-emerald-400/20 bg-emerald-500/10 text-emerald-300'

      case 'Explanation':
        return 'saved-materials-type-explanation border-amber-400/20 bg-amber-500/10 text-amber-300'

      default:
        return 'saved-materials-type-default border-[#3a2860] bg-[#120928] text-[#a6a8c7]'
    }
  }


  const renderMaterialContent =
    (material) => {
      if (
        material.outputType ===
          'summary' ||
        material.outputType ===
          'explanation'
      ) {
        return (
          <div className="saved-materials-theme-surface saved-materials-content-card rounded-xl border border-[#2a1b4d] bg-[#120928]/55 p-5 sm:p-6">
            <p className="saved-materials-theme-text saved-materials-content-text whitespace-pre-wrap text-sm leading-7 text-[#c2c4e4]">
              {material.content}
            </p>
          </div>
        )
      }

      if (
        material.outputType ===
          'flashcards' &&
        Array.isArray(
          material.content
        )
      ) {
        return (
          <div className="space-y-4">
            {material.content.map(
              (card, index) => (
                <div
                  key={index}
                  className="saved-materials-theme-surface saved-materials-content-card rounded-xl border border-[#2a1b4d] bg-[#120928]/55 p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="saved-materials-accent-soft flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7a44ff]/10 text-xs font-semibold text-[#c9b4ff]">
                      {index + 1}
                    </div>

                    <div className="min-w-0">
                      <p className="saved-materials-theme-text saved-materials-heading font-semibold leading-6 text-[#f3f0ff]">
                        {
                          card.question
                        }
                      </p>

                      <div className="saved-materials-theme-surface saved-materials-answer-card mt-3 rounded-lg border border-[#3a2860] bg-[#160b32] p-4">
                        <p className="saved-materials-theme-text saved-materials-accent mb-1 text-xs font-semibold uppercase tracking-wide text-[#a97cff]">
                          Answer
                        </p>

                        <p className="saved-materials-theme-text saved-materials-content-text text-sm leading-6 text-[#c2c4e4]">
                          {
                            card.answer
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )
      }

      if (
        material.outputType ===
          'quiz' &&
        Array.isArray(
          material.content
        )
      ) {
        return (
          <div className="space-y-4">
            {material.content.map(
              (
                question,
                index
              ) => (
                <div
                  key={index}
                  className="saved-materials-theme-surface saved-materials-content-card rounded-xl border border-[#2a1b4d] bg-[#120928]/55 p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="saved-materials-accent-soft flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7a44ff]/10 text-xs font-semibold text-[#c9b4ff]">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="saved-materials-theme-text saved-materials-heading font-semibold leading-6 text-[#f3f0ff]">
                        {
                          question.question
                        }
                      </p>

                      {Array.isArray(
                        question.options
                      ) && (
                        <div className="mt-4 space-y-2">
                          {question.options.map(
                            (
                              option,
                              optionIndex
                            ) => (
                              <div
                                key={
                                  optionIndex
                                }
                                className="saved-materials-theme-surface saved-materials-option-card flex gap-3 rounded-lg border border-[#2a1b4d] bg-[#160b32] px-4 py-3"
                              >
                                <span className="saved-materials-theme-text saved-materials-accent font-semibold text-[#a97cff]">
                                  {String.fromCharCode(
                                    65 +
                                      optionIndex
                                  )}
                                  .
                                </span>

                                <p className="saved-materials-theme-text saved-materials-content-text text-sm leading-6 text-[#c2c4e4]">
                                  {option}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )
      }

      return (
        <div className="saved-materials-theme-surface saved-materials-content-card rounded-xl border border-[#2a1b4d] bg-[#120928]/55 p-5">
          <p className="saved-materials-theme-text saved-materials-body text-sm text-[#898cc0]">
            This saved material could not be displayed.
          </p>
        </div>
      )
    }


  return (
    <div className="saved-materials-theme mx-auto max-w-6xl">
      <style>
        {`
          .saved-materials-theme-text {
            transition:
              color 100ms ease;
          }

          .saved-materials-theme-surface {
            transition:
              background-color 500ms ease,
              border-color 500ms ease,
              box-shadow 300ms ease;
          }

          .saved-materials-theme-interactive {
            transition:
              color 100ms ease,
              background-color 300ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease,
              opacity 300ms ease,
              filter 300ms ease;
          }

          .saved-materials-theme-border {
            transition:
              border-color 500ms ease;
          }


          /*
           * Typography
           */
          [data-theme-mode='light']
          .saved-materials-heading {
            color:
              #171717 !important;
          }

          [data-theme-mode='light']
          .saved-materials-body {
            color:
              #65676b !important;
          }

          [data-theme-mode='light']
          .saved-materials-muted {
            color:
              #7a7575 !important;
          }

          [data-theme-mode='light']
          .saved-materials-accent {
            color:
              #7a44ff !important;
          }

          [data-theme-mode='light']
          .saved-materials-accent-soft {
            color:
              #6f42c1 !important;
          }

          [data-theme-mode='light']
          .saved-materials-content-text {
            color:
              #45424d !important;
          }


          /*
           * Main surfaces
           */
          [data-theme-mode='light']
          .saved-materials-surface {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;
          }


          /*
           * Search input
           */
          [data-theme-mode='light']
          .saved-materials-search-input {
            background-color:
              #ffffff !important;

            border-color:
              #d7d3df !important;

            color:
              #2b2b33 !important;
          }

          [data-theme-mode='light']
          .saved-materials-search-input::placeholder {
            color:
              #8a8793 !important;
          }

          [data-theme-mode='light']
          .saved-materials-search-input:hover {
            border-color:
              rgba(
                122,
                68,
                255,
                0.55
              ) !important;
          }

          [data-theme-mode='light']
          .saved-materials-search-input:focus {
            border-color:
              #7a44ff !important;

            box-shadow:
              0 0 0 2px
              rgba(
                122,
                68,
                255,
                0.18
              ) !important;
          }

          [data-theme-mode='light']
          .saved-materials-search-icon {
            color:
              #7a7575 !important;
          }


          /*
           * Loading and messages
           */
          [data-theme-mode='light']
          .saved-materials-loading-text {
            color:
              #6f42c1 !important;
          }

          [data-theme-mode='light']
          .saved-materials-error-text {
            color:
              #b91c1c !important;
          }

          [data-theme-mode='light']
          .saved-materials-success-text {
            color:
              #047857 !important;
          }


          /*
           * Main saved-material accordion
           */
          [data-theme-mode='light']
          .saved-materials-library {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;
          }

          [data-theme-mode='light']
          .saved-materials-library:hover {
            border-color:
              #7a44ff !important;

            box-shadow:
              0 0 24px
              rgba(
                122,
                68,
                255,
                0.12
              ) !important;
          }

          [data-theme-mode='light']
          .saved-materials-library-border {
            border-color:
              #dfdfdf !important;
          }


          /*
           * Accordion chevron
           */
          [data-theme-mode='light']
          .saved-materials-chevron {
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
                0.20
              ) !important;

            color:
              #7a44ff !important;
          }


          /*
           * Material cards
           */
          [data-theme-mode='light']
          .saved-materials-material-card {
            background-color:
              #f7f7fb !important;

            border-color:
              #dfdfdf !important;
          }


          /*
           * AI badge
           */
          [data-theme-mode='light']
          .saved-materials-ai-badge {
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


          /*
           * Material type badges
           */
          [data-theme-mode='light']
          .saved-materials-type-summary {
            color:
              #0369a1 !important;

            background-color:
              rgba(
                14,
                165,
                233,
                0.08
              ) !important;

            border-color:
              rgba(
                14,
                165,
                233,
                0.25
              ) !important;
          }

          [data-theme-mode='light']
          .saved-materials-type-flashcards {
            color:
              #6f42c1 !important;

            background-color:
              rgba(
                168,
                85,
                247,
                0.08
              ) !important;

            border-color:
              rgba(
                168,
                85,
                247,
                0.25
              ) !important;
          }

          [data-theme-mode='light']
          .saved-materials-type-quiz {
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
          .saved-materials-type-explanation {
            color:
              #92400e !important;

            background-color:
              rgba(
                245,
                158,
                11,
                0.08
              ) !important;

            border-color:
              rgba(
                245,
                158,
                11,
                0.25
              ) !important;
          }

          [data-theme-mode='light']
          .saved-materials-type-default {
            color:
              #65676b !important;

            background-color:
              #f7f7fb !important;

            border-color:
              #dfdfdf !important;
          }


          /*
           * View Material
           */
          [data-theme-mode='light']
          .saved-materials-view-button {
            background-color:
              #ffffff !important;

            border-color:
              #d7d3df !important;

            color:
              #6f42c1 !important;
          }

          [data-theme-mode='light']
          .saved-materials-view-button:hover {
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


          /*
           * Delete
           */
          [data-theme-mode='light']
          .saved-materials-delete-button {
            color:
              #b91c1c !important;

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
                0.25
              ) !important;
          }

          [data-theme-mode='light']
          .saved-materials-delete-button:hover:not(:disabled) {
            color:
              #991b1b !important;

            background-color:
              rgba(
                239,
                68,
                68,
                0.11
              ) !important;

            border-color:
              rgba(
                239,
                68,
                68,
                0.45
              ) !important;
          }

          [data-theme-mode='light']
          .saved-materials-delete-button:disabled {
            background-color:
              #e6e3eb !important;

            border-color:
              transparent !important;

            color:
              #9a96a6 !important;

            box-shadow:
              none !important;
          }


          /*
           * Expanded material area
           */
          [data-theme-mode='light']
          .saved-materials-expanded {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;
          }


          [data-theme-mode='light']
          .saved-materials-date-badge {
            background-color:
              #f7f7fb !important;

            border-color:
              #dfdfdf !important;

            color:
              #65676b !important;
          }


          /*
           * Material content
           */
          [data-theme-mode='light']
          .saved-materials-content-card {
            background-color:
              #f7f7fb !important;

            border-color:
              #dfdfdf !important;
          }


          [data-theme-mode='light']
          .saved-materials-answer-card {
            background-color:
              #ffffff !important;

            border-color:
              #d7d3df !important;
          }


          [data-theme-mode='light']
          .saved-materials-option-card {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;
          }


          /*
           * Responsible AI warning
           */
          [data-theme-mode='light']
          .saved-materials-warning-heading {
            color:
              #92400e !important;
          }

          [data-theme-mode='light']
          .saved-materials-warning-body {
            color:
              #a16207 !important;
          }


          /*
           * Empty state
           */
          [data-theme-mode='light']
          .saved-materials-empty {
            background-color:
              #f7f7fb !important;

            border-color:
              #c9c9d3 !important;
          }
        `}
      </style>


      {/* Page Heading */}
      <div className="mb-8">
        <p className="saved-materials-theme-text saved-materials-accent mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
          Study Library
        </p>

        <h1 className="saved-materials-theme-text saved-materials-heading text-3xl font-bold tracking-tight text-[#f3f0ff]">
          Saved Materials
        </h1>

        <p className="saved-materials-theme-text saved-materials-body mt-2 max-w-3xl text-sm leading-6 text-[#898cc0]">
          Search, review and manage the AI-generated
          study materials saved to your account.
        </p>
      </div>


      {/* Search and Filter */}
      <div className="saved-materials-theme-surface saved-materials-surface rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6 sm:p-7">
        <div className="flex items-start gap-3">
          <div className="saved-materials-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">
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
                d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM4 5.5A2.5 2.5 0 0 0 6.5 8H20"
              />
            </svg>
          </div>

          <div>
            <h2 className="saved-materials-theme-text saved-materials-heading text-xl font-semibold text-[#f3f0ff]">
              Find Saved Content
            </h2>

            <p className="saved-materials-theme-text saved-materials-body mt-1 text-sm text-[#898cc0]">
              Search by material title or source
              document and filter by content type.
            </p>
          </div>
        </div>


        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="saved-search"
              className="saved-materials-theme-text saved-materials-heading mb-2 block text-sm font-medium text-[#d9d4eb]"
            >
              Search Materials
            </label>

            <div className="relative">
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="saved-materials-theme-text saved-materials-search-icon pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#727494]"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                />

                <path d="m20 20-3.5-3.5" />
              </svg>

              <input
                id="saved-search"
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search by title or source document..."
                className="saved-materials-search-input w-full rounded-lg border border-[#3a2860] bg-[#120928] py-3 pl-11 pr-4 text-[#d9d4eb] outline-none transition-all duration-300 placeholder:text-[#5f5b78]"
              />
            </div>
          </div>


          <div>
            <label
              htmlFor="saved-filter"
              className="saved-materials-theme-text saved-materials-heading mb-2 block text-sm font-medium text-[#d9d4eb]"
            >
              Material Type
            </label>

            <AnimatedSelect
              id="saved-filter"
              value={filter}
              options={[
                {
                  value: 'all',
                  label:
                    'All Materials',
                },
                {
                  value:
                    'summary',
                  label:
                    'Summaries',
                },
                {
                  value:
                    'flashcards',
                  label:
                    'Flashcards',
                },
                {
                  value: 'quiz',
                  label:
                    'Quizzes',
                },
                {
                  value:
                    'explanation',
                  label:
                    'Explanations',
                },
              ]}
              onChange={(
                newValue
              ) => {
                setFilter(
                  newValue
                )
              }}
            />
          </div>
        </div>
      </div>


      {/* Loading */}
      {loading && (
        <div
          className="saved-materials-theme-surface mt-6 flex items-center gap-3 rounded-xl border border-[#7a44ff]/20 bg-[#7a44ff]/10 p-5"
          role="status"
        >
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

          <p className="saved-materials-theme-text saved-materials-loading-text text-sm text-[#c9b4ff]">
            Loading your saved materials...
          </p>
        </div>
      )}


      {/* Main Load Error */}
      {error && (
        <div
          className="saved-materials-theme-surface mt-6 rounded-xl border border-red-400/25 bg-red-500/10 p-5"
          role="alert"
        >
          <p className="saved-materials-theme-text saved-materials-error-text text-sm leading-6 text-red-300">
            {error}
          </p>
        </div>
      )}


      {/* Delete / Action Error */}
      {actionError && (
        <div
          className="saved-materials-theme-surface mt-6 rounded-xl border border-red-400/25 bg-red-500/10 p-5"
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

            <p className="saved-materials-theme-text saved-materials-error-text text-sm leading-6 text-red-300">
              {actionError}
            </p>
          </div>
        </div>
      )}


      {/* Delete Success */}
      {actionSuccess && (
        <div
          className="saved-materials-theme-surface mt-6 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-5"
          role="status"
        >
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

            <p className="saved-materials-theme-text saved-materials-success-text text-sm text-emerald-300">
              {actionSuccess}
            </p>
          </div>
        </div>
      )}


      {!loading &&
        !error && (
          <>
            {/* Saved Materials Accordion */}
            <section className="saved-materials-theme-surface saved-materials-library group mt-7 overflow-hidden rounded-xl border border-[#2a1b4d] bg-[#160b32] transition-all duration-300 hover:border-[#7a44ff] hover:shadow-[0_0_24px_rgba(122,68,255,0.20)]">
              {/* Accordion Header */}
              <button
                type="button"
                onClick={() =>
                  setSavedMaterialsOpen(
                    (
                      current
                    ) =>
                      !current
                  )
                }
                aria-expanded={
                  savedMaterialsOpen
                }
                aria-controls="saved-materials-list-content"
                className="relative flex w-full flex-col gap-3 px-5 py-5 text-left transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-[#7a44ff] sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="saved-materials-theme-text saved-materials-body text-sm text-[#898cc0]">
                  Showing{' '}

                  <span className="saved-materials-theme-text saved-materials-heading font-semibold text-[#f3f0ff]">
                    {
                      filteredMaterials.length
                    }
                  </span>{' '}

                  saved material
                  {filteredMaterials.length !==
                  1
                    ? 's'
                    : ''}
                </p>


                <div className="flex items-center gap-3">
                  {materials.length >
                    0 && (
                    <span className="saved-materials-theme-text saved-materials-muted text-xs text-[#727494]">
                      {
                        materials.length
                      }{' '}
                      total saved
                    </span>
                  )}

                  <span className="saved-materials-theme-interactive saved-materials-chevron flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#392461] bg-[#251149] text-[#a97cff]">
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                      className={`h-4 w-4 transition-transform duration-300 ${
                        savedMaterialsOpen
                          ? 'rotate-180'
                          : ''
                      }`}
                    >
                      <path
                        d="M5 7.5L10 12.5L15 7.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
              </button>


              {/* Saved Materials Content */}
              <div
                id="saved-materials-list-content"
                aria-hidden={
                  !savedMaterialsOpen
                }
                className={`grid transition-all duration-300 ease-in-out ${
                  savedMaterialsOpen
                    ? 'visible grid-rows-[1fr] opacity-100'
                    : 'invisible grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="saved-materials-theme-border saved-materials-library-border border-t border-[#2a1b4d] p-5">
                    {filteredMaterials.length >
                    0 ? (
                      <div className="space-y-4">
                        {filteredMaterials.map(
                          (
                            material
                          ) => {
                            const isExpanded =
                              expandedMaterialId ===
                              material.outputId

                            const isDeleting =
                              deletingMaterialId ===
                              material.outputId

                            const contentId =
                              `saved-material-${material.outputId}`

                            return (
                              <article
                                key={
                                  material.id
                                }
                                className="saved-materials-theme-surface saved-materials-material-card overflow-hidden rounded-xl border border-[#2a1b4d] bg-[#160b32]"
                              >
                                {/* Material Summary */}
                                <div className="p-5 sm:p-6">
                                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span
                                          className={`saved-materials-theme-interactive inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getTypeStyle(
                                            material.type
                                          )}`}
                                        >
                                          {
                                            material.type
                                          }
                                        </span>

                                        {material.isAiGenerated && (
                                          <span className="saved-materials-theme-interactive saved-materials-ai-badge inline-flex rounded-full border border-[#7a44ff]/25 bg-[#7a44ff]/10 px-3 py-1 text-xs font-semibold text-[#c9b4ff]">
                                            AI Generated
                                          </span>
                                        )}
                                      </div>

                                      <h2 className="saved-materials-theme-text saved-materials-heading mt-4 text-lg font-semibold text-[#f3f0ff]">
                                        {
                                          material.title
                                        }
                                      </h2>

                                      <div className="saved-materials-theme-text saved-materials-body mt-3 flex flex-col gap-1 text-sm text-[#898cc0]">
                                        <p className="break-words">
                                          <span className="saved-materials-theme-text saved-materials-muted text-[#727494]">
                                            Source:
                                          </span>{' '}
                                          {
                                            material.source
                                          }
                                        </p>

                                        <p>
                                          <span className="saved-materials-theme-text saved-materials-muted text-[#727494]">
                                            Saved:
                                          </span>{' '}
                                          {formatDate(
                                            material.createdAt
                                          )}
                                        </p>
                                      </div>
                                    </div>


                                    {/* Actions */}
                                    <div className="flex shrink-0 flex-wrap gap-2">
                                      <button
                                        type="button"
                                        aria-expanded={
                                          isExpanded
                                        }
                                        aria-controls={
                                          contentId
                                        }
                                        onClick={() =>
                                          handleToggleMaterial(
                                            material.outputId
                                          )
                                        }
                                        className="saved-materials-theme-interactive saved-materials-view-button inline-flex items-center gap-2 rounded-lg border border-[#3a2860] bg-[#120928] px-4 py-2.5 text-sm font-medium text-[#c9b4ff] hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/10"
                                      >
                                        {isExpanded
                                          ? 'Hide Material'
                                          : 'View Material'}

                                        <svg
                                          aria-hidden="true"
                                          xmlns="http://www.w3.org/2000/svg"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          className={`h-4 w-4 transition-transform duration-300 ${
                                            isExpanded
                                              ? 'rotate-180'
                                              : ''
                                          }`}
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="m6 9 6 6 6-6"
                                          />
                                        </svg>
                                      </button>


                                      <button
                                        type="button"
                                        disabled={
                                          isDeleting
                                        }
                                        onClick={() =>
                                          handleDeleteMaterial(
                                            material
                                          )
                                        }
                                        className="saved-materials-theme-interactive saved-materials-delete-button inline-flex min-w-[104px] items-center justify-center gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 hover:border-red-400/50 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#3a3150] disabled:text-[#77718d] disabled:shadow-none"
                                      >
                                        {isDeleting ? (
                                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#77718d]/40 border-t-[#c2c4e4]" />
                                        ) : (
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
                                              d="M4 7h16M9 7V4h6v3m-9 0 1 14h10l1-14M10 11v6m4-6v6"
                                            />
                                          </svg>
                                        )}

                                        {isDeleting
                                          ? 'Deleting...'
                                          : 'Delete'}
                                      </button>
                                    </div>
                                  </div>
                                </div>


                                {/* Inline Expanded Material */}
                                <div
                                  id={
                                    contentId
                                  }
                                  aria-hidden={
                                    !isExpanded
                                  }
                                  className={`grid transition-all duration-300 ease-in-out ${
                                    isExpanded
                                      ? 'visible grid-rows-[1fr] opacity-100'
                                      : 'invisible grid-rows-[0fr] opacity-0'
                                  }`}
                                >
                                  <div className="min-h-0 overflow-hidden">
                                    <div className="saved-materials-theme-surface saved-materials-expanded saved-materials-theme-border border-t border-[#2a1b4d] bg-[#120928]/20 p-5 sm:p-6">
                                      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                          <p className="saved-materials-theme-text saved-materials-accent text-xs font-semibold uppercase tracking-[0.12em] text-[#a97cff]">
                                            Saved Content
                                          </p>

                                          <h3 className="saved-materials-theme-text saved-materials-heading mt-1 text-lg font-semibold text-[#f3f0ff]">
                                            {
                                              material.type
                                            }
                                          </h3>
                                        </div>

                                        <span className="saved-materials-theme-surface saved-materials-date-badge w-fit rounded-full border border-[#2a1b4d] bg-[#160b32] px-3 py-1 text-xs text-[#898cc0]">
                                          {formatDate(
                                            material.createdAt
                                          )}
                                        </span>
                                      </div>


                                      {renderMaterialContent(
                                        material
                                      )}


                                      {material.isAiGenerated && (
                                        <div className="saved-materials-theme-surface mt-5 rounded-xl border border-amber-400/20 bg-amber-500/10 p-5">
                                          <div className="flex items-start gap-3">
                                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
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
                                                  d="M12 9v4m0 4h.01M10.3 4.6 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"
                                                />
                                              </svg>
                                            </div>

                                            <div>
                                              <h4 className="saved-materials-theme-text saved-materials-warning-heading font-semibold text-amber-200">
                                                AI-Generated Content
                                              </h4>

                                              <p className="saved-materials-theme-text saved-materials-warning-body mt-1 text-sm leading-6 text-amber-200/80">
                                                This content was generated
                                                by AI and may contain errors
                                                or omissions. Please check
                                                it against your original
                                                study material.
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </article>
                            )
                          }
                        )}
                      </div>
                    ) : (
                      <div className="saved-materials-theme-surface saved-materials-empty rounded-xl border border-dashed border-[#3a2860] bg-[#120928]/35 p-10 text-center">
                        <div className="saved-materials-accent mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#7a44ff]/10 text-[#a97cff]">
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
                              d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM4 5.5A2.5 2.5 0 0 0 6.5 8H20"
                            />
                          </svg>
                        </div>

                        <h2 className="saved-materials-theme-text saved-materials-heading mt-4 text-xl font-semibold text-[#f3f0ff]">
                          No saved materials found
                        </h2>

                        <p className="saved-materials-theme-text saved-materials-body mx-auto mt-2 max-w-lg text-sm leading-6 text-[#898cc0]">
                          {materials.length ===
                          0
                            ? 'Generate a summary, flashcard set, quiz or explanation to see it here.'
                            : 'Try changing your search or filter selection.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
    </div>
  )
}


const getMaterialTypeLabel = (
  outputType
) => {
  switch (outputType) {
    case 'summary':
      return 'Summary'

    case 'flashcards':
      return 'Flashcards'

    case 'quiz':
      return 'Quiz'

    case 'explanation':
      return 'Explanation'

    default:
      return 'Saved Material'
  }
}


const getMaterialTitle = (
  outputType,
  fileName
) => {
  const typeLabel =
    getMaterialTypeLabel(
      outputType
    )

  const baseName =
    fileName.replace(
      /\.[^/.]+$/,
      ''
    )

  return `${baseName} — ${typeLabel}`
}


export default SavedMaterials