import { useEffect, useMemo, useState } from 'react'
import { getUploadedFiles } from '../services/uploadedService'
import { getAIOutputs } from '../services/aiService'

function SavedMaterials() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState(null)

  useEffect(() => {
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
              isAiGenerated:
                Boolean(output.is_ai_generated),
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

    loadSavedMaterials()
  }, [])

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
        return 'bg-blue-100 text-blue-700'

      case 'Flashcards':
        return 'bg-purple-100 text-purple-700'

      case 'Quiz':
        return 'bg-green-100 text-green-700'

      case 'Explanation':
        return 'bg-orange-100 text-orange-700'

      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const renderMaterialContent = (material) => {
    if (
      material.outputType === 'summary' ||
      material.outputType === 'explanation'
    ) {
      return (
        <p className="whitespace-pre-wrap leading-7 text-gray-700">
          {material.content}
        </p>
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
              className="rounded-lg border border-gray-200 bg-gray-50 p-4"
            >
              <p className="font-semibold text-gray-900">
                {index + 1}. {card.question}
              </p>

              <p className="mt-2 text-gray-700">
                {card.answer}
              </p>
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
        <div className="space-y-5">
          {material.content.map((question, index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 bg-gray-50 p-4"
            >
              <p className="font-semibold text-gray-900">
                {index + 1}. {question.question}
              </p>

              {Array.isArray(question.options) && (
                <div className="mt-3 space-y-2">
                  {question.options.map(
                    (option, optionIndex) => (
                      <p
                        key={optionIndex}
                        className="text-sm text-gray-700"
                      >
                        {String.fromCharCode(
                          65 + optionIndex
                        )}
                        . {option}
                      </p>
                    )
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )
    }

    return (
      <p className="text-gray-600">
        This saved material could not be displayed.
      </p>
    )
  }

  return (
    <div className="mx-auto max-w-7xl">

      {/* Page Heading */}
      <div className="mb-8">

        <h1 className="text-3xl font-bold text-gray-900">
          Saved Materials
        </h1>

        <p className="mt-2 text-gray-600">
          View, organise and revisit your saved AI-generated study materials.
        </p>

      </div>

      {/* Search and Filter */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

        <div className="grid gap-5 md:grid-cols-2">

          <div>

            <label
              htmlFor="saved-search"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Search Materials
            </label>

            <input
              id="saved-search"
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by title or source document..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          <div>

            <label
              htmlFor="saved-filter"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Material Type
            </label>

            <select
              id="saved-filter"
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value)
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {loading && (
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm text-blue-700">
            Loading your saved materials...
          </p>
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-700">
            {error}
          </p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Material Count */}
          <div className="mt-6 flex items-center justify-between">

            <p className="text-sm text-gray-600">
              Showing{' '}
              <span className="font-semibold text-gray-900">
                {filteredMaterials.length}
              </span>{' '}
              saved material
              {filteredMaterials.length !== 1
                ? 's'
                : ''}
            </p>

          </div>

          {/* Saved Materials */}
          {filteredMaterials.length > 0 ? (

            <div className="mt-4 grid gap-5 lg:grid-cols-2">

              {filteredMaterials.map(
                (material) => (

                  <div
                    key={material.id}
                    className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <span
                            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getTypeStyle(
                              material.type
                            )}`}
                          >
                            {material.type}
                          </span>

                          {material.isAiGenerated && (
                            <span className="inline-block rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                              AI Generated
                            </span>
                          )}

                        </div>

                        <h2 className="mt-3 text-lg font-semibold text-gray-900">
                          {material.title}
                        </h2>

                        <p className="mt-2 break-words text-sm text-gray-500">
                          Source: {material.source}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          Saved:{' '}
                          {formatDate(
                            material.createdAt
                          )}
                        </p>

                      </div>

                    </div>

                    <div className="mt-6">

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedMaterial(
                            material
                          )
                        }
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                      >
                        Open
                      </button>

                    </div>

                  </div>

                )
              )}

            </div>

          ) : (

            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">

              <h2 className="text-xl font-semibold text-gray-900">
                No saved materials found
              </h2>

              <p className="mt-2 text-gray-600">
                {materials.length === 0
                  ? 'Generate a summary, flashcard set, quiz or explanation to see it here.'
                  : 'Try changing your search or filter selection.'}
              </p>

            </div>

          )}
        </>
      )}

      {/* Open Material */}
      {selectedMaterial && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-start sm:justify-between">

            <div>

              <div className="flex flex-wrap items-center gap-2">

                <h2 className="text-2xl font-semibold text-gray-900">
                  {selectedMaterial.title}
                </h2>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getTypeStyle(
                    selectedMaterial.type
                  )}`}
                >
                  {selectedMaterial.type}
                </span>

              </div>

              <p className="mt-2 text-sm text-gray-500">
                Source:{' '}
                {selectedMaterial.source}
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedMaterial(null)
              }
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Close
            </button>

          </div>

          <div className="mt-6">
            {renderMaterialContent(
              selectedMaterial
            )}
          </div>

          {selectedMaterial.isAiGenerated && (
            <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5">

              <h3 className="font-semibold text-amber-900">
                AI-Generated Content
              </h3>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                This content was generated by AI and may contain errors or omissions. Please check it against your original study material.
              </p>

            </div>
          )}

        </div>
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