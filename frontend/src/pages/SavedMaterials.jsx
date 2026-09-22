import { useEffect, useMemo, useState } from 'react'
import { getUploadedFiles } from '../services/uploadedService'
import {
  deleteAIOutput,
  getAIOutputs,
} from '../services/aiService'

function SavedMaterials() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [expandedMaterialId, setExpandedMaterialId] =
    useState(null)

  const [deletingMaterialId, setDeletingMaterialId] =
    useState(null)

  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  const loadSavedMaterials = async () => {
    setLoading(true)
    setError('')

    try {
      const uploadedResponse = await getUploadedFiles()

      if (!uploadedResponse.ok) {
        if (uploadedResponse.status === 401) {
          setError(
            'Your login session is missing or invalid. Please sign in again.'
          )
        } else {
          setError(
            uploadedResponse.data?.message ||
              'Unable to retrieve your uploaded study materials.'
          )
        }

        return
      }

      const files = uploadedResponse.data?.files ?? []

      if (files.length === 0) {
        setMaterials([])
        return
      }

      const outputRequests = files.map(async (file) => {
        const response = await getAIOutputs(file.file_id)

        return {
          file,
          response,
        }
      })

      const results = await Promise.all(outputRequests)

      const savedMaterials = []

      results.forEach(({ file, response }) => {
        if (!response.ok) {
          console.error(
            `Unable to load saved AI outputs for file ${file.file_id}:`,
            response.data
          )

          return
        }

        const outputs = response.data?.outputs ?? []

        outputs.forEach((output) => {
          savedMaterials.push({
            id: output.output_id,
            outputId: output.output_id,
            fileId: file.file_id,
            title: getMaterialTitle(
              output.output_type,
              file.file_name
            ),
            type: getMaterialTypeLabel(
              output.output_type
            ),
            outputType: output.output_type,
            source: file.file_name,
            createdAt: output.generated_at,
            content: output.content,
            isAiGenerated: Boolean(
              output.is_ai_generated
            ),
          })
        })
      })

      savedMaterials.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()

        return dateB - dateA
      })

      setMaterials(savedMaterials)
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

    const timer = window.setTimeout(() => {
      setActionSuccess('')
    }, 4000)

    return () => window.clearTimeout(timer)
  }, [actionSuccess])

  const filteredMaterials = useMemo(() => {
    const normalisedSearch = search
      .trim()
      .toLowerCase()

    return materials.filter((material) => {
      const matchesFilter =
        filter === 'all' ||
        material.outputType === filter

      const matchesSearch =
        normalisedSearch === '' ||
        material.title
          .toLowerCase()
          .includes(normalisedSearch) ||
        material.source
          .toLowerCase()
          .includes(normalisedSearch)

      return matchesFilter && matchesSearch
    })
  }, [filter, search, materials])

  const handleToggleMaterial = (materialId) => {
    setExpandedMaterialId((currentId) =>
      currentId === materialId
        ? null
        : materialId
    )

    setActionError('')
  }

  const handleDeleteMaterial = async (material) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${material.title}"? This action cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    setDeletingMaterialId(material.outputId)
    setActionError('')
    setActionSuccess('')

    try {
      const response = await deleteAIOutput(
        material.outputId
      )

      if (!response.ok) {
        if (response.status === 401) {
          setActionError(
            'Your login session is missing or invalid. Please sign in again.'
          )
          return
        }

        if (
          response.status === 404 ||
          response.data?.code === 'OUTPUT_NOT_FOUND'
        ) {
          setMaterials((currentMaterials) =>
            currentMaterials.filter(
              (currentMaterial) =>
                currentMaterial.outputId !==
                material.outputId
            )
          )

          if (
            expandedMaterialId ===
            material.outputId
          ) {
            setExpandedMaterialId(null)
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

      setMaterials((currentMaterials) =>
        currentMaterials.filter(
          (currentMaterial) =>
            currentMaterial.outputId !==
            material.outputId
        )
      )

      if (
        expandedMaterialId ===
        material.outputId
      ) {
        setExpandedMaterialId(null)
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
      setDeletingMaterialId(null)
    }
  }

  const formatDate = (value) => {
    if (!value) {
      return ''
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return ''
    }

    return date.toLocaleDateString()
  }

  const getTypeStyle = (type) => {
    switch (type) {
      case 'Summary':
        return 'border-sky-400/20 bg-sky-500/10 text-sky-300'

      case 'Flashcards':
        return 'border-purple-400/20 bg-purple-500/10 text-purple-300'

      case 'Quiz':
        return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'

      case 'Explanation':
        return 'border-amber-400/20 bg-amber-500/10 text-amber-300'

      default:
        return 'border-[#3a2860] bg-[#120928] text-[#a6a8c7]'
    }
  }

  const renderMaterialContent = (material) => {
    if (
      material.outputType === 'summary' ||
      material.outputType === 'explanation'
    ) {
      return (
        <div className="rounded-xl border border-[#2a1b4d] bg-[#120928]/55 p-5 sm:p-6">
          <p className="whitespace-pre-wrap text-sm leading-7 text-[#c2c4e4]">
            {material.content}
          </p>
        </div>
      )
    }

    if (
      material.outputType === 'flashcards' &&
      Array.isArray(material.content)
    ) {
      return (
        <div className="space-y-4">
          {material.content.map((card, index) => (
            <div
              key={index}
              className="rounded-xl border border-[#2a1b4d] bg-[#120928]/55 p-5"
            >
              <div className="flex items-start gap-3">

                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7a44ff]/10 text-xs font-semibold text-[#c9b4ff]">
                  {index + 1}
                </div>

                <div className="min-w-0">

                  <p className="font-semibold leading-6 text-[#f3f0ff]">
                    {card.question}
                  </p>

                  <div className="mt-3 rounded-lg border border-[#3a2860] bg-[#160b32] p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#a97cff]">
                      Answer
                    </p>

                    <p className="text-sm leading-6 text-[#c2c4e4]">
                      {card.answer}
                    </p>
                  </div>

                </div>

              </div>
            </div>
          ))}
        </div>
      )
    }

    if (
      material.outputType === 'quiz' &&
      Array.isArray(material.content)
    ) {
      return (
        <div className="space-y-4">
          {material.content.map(
            (question, index) => (
              <div
                key={index}
                className="rounded-xl border border-[#2a1b4d] bg-[#120928]/55 p-5"
              >

                <div className="flex items-start gap-3">

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7a44ff]/10 text-xs font-semibold text-[#c9b4ff]">
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">

                    <p className="font-semibold leading-6 text-[#f3f0ff]">
                      {question.question}
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
                              key={optionIndex}
                              className="flex gap-3 rounded-lg border border-[#2a1b4d] bg-[#160b32] px-4 py-3"
                            >

                              <span className="font-semibold text-[#a97cff]">
                                {String.fromCharCode(
                                  65 +
                                    optionIndex
                                )}
                                .
                              </span>

                              <p className="text-sm leading-6 text-[#c2c4e4]">
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
      <div className="rounded-xl border border-[#2a1b4d] bg-[#120928]/55 p-5">
        <p className="text-sm text-[#898cc0]">
          This saved material could not be displayed.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl">

      {/* Page Heading */}
      <div className="mb-8">

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
          Study Library
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-[#f3f0ff]">
          Saved Materials
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#898cc0]">
          Search, review and manage the AI-generated
          study materials saved to your account.
        </p>

      </div>

      {/* Search and Filter */}
      <div className="rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6 sm:p-7">

        <div className="flex items-start gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">

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

            <h2 className="text-xl font-semibold text-[#f3f0ff]">
              Find Saved Content
            </h2>

            <p className="mt-1 text-sm text-[#898cc0]">
              Search by material title or source
              document and filter by content type.
            </p>

          </div>

        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">

          <div>

            <label
              htmlFor="saved-search"
              className="mb-2 block text-sm font-medium text-[#d9d4eb]"
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
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#727494]"
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
                  setSearch(event.target.value)
                }
                placeholder="Search by title or source document..."
                className="w-full rounded-lg border border-[#3a2860] bg-[#120928] py-3 pl-11 pr-4 text-[#d9d4eb] outline-none transition placeholder:text-[#5f5b78] focus:border-[#7a44ff] focus:ring-2 focus:ring-[#7a44ff]/25"
              />

            </div>

          </div>

          <div>

            <label
              htmlFor="saved-filter"
              className="mb-2 block text-sm font-medium text-[#d9d4eb]"
            >
              Material Type
            </label>

            <select
              id="saved-filter"
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value)
              }
              className="w-full rounded-lg border border-[#3a2860] bg-[#120928] px-4 py-3 text-[#d9d4eb] outline-none transition focus:border-[#7a44ff] focus:ring-2 focus:ring-[#7a44ff]/25"
            >
              <option value="all">
                All Materials
              </option>

              <option value="summary">
                Summaries
              </option>

              <option value="flashcards">
                Flashcards
              </option>

              <option value="quiz">
                Quizzes
              </option>

              <option value="explanation">
                Explanations
              </option>
            </select>

          </div>

        </div>

      </div>

      {/* Loading */}
      {loading && (
        <div
          className="mt-6 flex items-center gap-3 rounded-xl border border-[#7a44ff]/20 bg-[#7a44ff]/10 p-5"
          role="status"
        >
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

          <p className="text-sm text-[#c9b4ff]">
            Loading your saved materials...
          </p>
        </div>
      )}

      {/* Main Load Error */}
      {error && (
        <div
          className="mt-6 rounded-xl border border-red-400/25 bg-red-500/10 p-5"
          role="alert"
        >
          <p className="text-sm leading-6 text-red-300">
            {error}
          </p>
        </div>
      )}

      {/* Delete / Action Error */}
      {actionError && (
        <div
          className="mt-6 rounded-xl border border-red-400/25 bg-red-500/10 p-5"
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

            <p className="text-sm leading-6 text-red-300">
              {actionError}
            </p>

          </div>
        </div>
      )}

      {/* Delete Success */}
      {actionSuccess && (
        <div
          className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-5"
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

            <p className="text-sm text-emerald-300">
              {actionSuccess}
            </p>

          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Material Count */}
          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-sm text-[#898cc0]">
              Showing{' '}
              <span className="font-semibold text-[#f3f0ff]">
                {filteredMaterials.length}
              </span>{' '}
              saved material
              {filteredMaterials.length !== 1
                ? 's'
                : ''}
            </p>

            {materials.length > 0 && (
              <p className="text-xs text-[#727494]">
                {materials.length} total saved
              </p>
            )}

          </div>

          {/* Saved Materials */}
          {filteredMaterials.length > 0 ? (
            <div className="mt-4 space-y-4">

              {filteredMaterials.map(
                (material) => {
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
                      key={material.id}
                      className="overflow-hidden rounded-xl border border-[#2a1b4d] bg-[#160b32]"
                    >

                      {/* Material Summary */}
                      <div className="p-5 sm:p-6">

                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getTypeStyle(
                                  material.type
                                )}`}
                              >
                                {material.type}
                              </span>

                              {material.isAiGenerated && (
                                <span className="inline-flex rounded-full border border-[#7a44ff]/25 bg-[#7a44ff]/10 px-3 py-1 text-xs font-semibold text-[#c9b4ff]">
                                  AI Generated
                                </span>
                              )}

                            </div>

                            <h2 className="mt-4 text-lg font-semibold text-[#f3f0ff]">
                              {material.title}
                            </h2>

                            <div className="mt-3 flex flex-col gap-1 text-sm text-[#898cc0]">

                              <p className="break-words">
                                <span className="text-[#727494]">
                                  Source:
                                </span>{' '}
                                {material.source}
                              </p>

                              <p>
                                <span className="text-[#727494]">
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
                              className="inline-flex items-center gap-2 rounded-lg border border-[#3a2860] bg-[#120928] px-4 py-2.5 text-sm font-medium text-[#c9b4ff] transition hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/10"
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
                                className={`h-4 w-4 transition-transform ${
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
                              disabled={isDeleting}
                              onClick={() =>
                                handleDeleteMaterial(
                                  material
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                            >

                              {isDeleting ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-300/30 border-t-red-300" />
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
                      {isExpanded && (
                        <div
                          id={contentId}
                          className="border-t border-[#2a1b4d] bg-[#120928]/20 p-5 sm:p-6"
                        >

                          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                            <div>

                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a97cff]">
                                Saved Content
                              </p>

                              <h3 className="mt-1 text-lg font-semibold text-[#f3f0ff]">
                                {material.type}
                              </h3>

                            </div>

                            <span className="w-fit rounded-full border border-[#2a1b4d] bg-[#160b32] px-3 py-1 text-xs text-[#898cc0]">
                              {formatDate(
                                material.createdAt
                              )}
                            </span>

                          </div>

                          {renderMaterialContent(
                            material
                          )}

                          {material.isAiGenerated && (
                            <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-500/10 p-5">

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

                                  <h4 className="font-semibold text-amber-200">
                                    AI-Generated Content
                                  </h4>

                                  <p className="mt-1 text-sm leading-6 text-amber-200/80">
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
                      )}

                    </article>
                  )
                }
              )}

            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-[#3a2860] bg-[#160b32] p-10 text-center">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#7a44ff]/10 text-[#a97cff]">

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

              <h2 className="mt-4 text-xl font-semibold text-[#f3f0ff]">
                No saved materials found
              </h2>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#898cc0]">
                {materials.length === 0
                  ? 'Generate a summary, flashcard set, quiz or explanation to see it here.'
                  : 'Try changing your search or filter selection.'}
              </p>

            </div>
          )}

        </>
      )}

    </div>
  )
}

const getMaterialTypeLabel = (outputType) => {
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
    getMaterialTypeLabel(outputType)

  const baseName = fileName.replace(
    /\.[^/.]+$/,
    ''
  )

  return `${baseName} — ${typeLabel}`
}

export default SavedMaterials