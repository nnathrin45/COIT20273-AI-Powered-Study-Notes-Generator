import { useState } from 'react'

function SavedMaterials() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [materials, setMaterials] = useState([
    {
      id: 1,
      title: 'Artificial Intelligence Summary',
      type: 'Summary',
      source: 'Introduction to Artificial Intelligence.pdf',
      createdAt: '10 Aug 2026',
    },
    {
      id: 2,
      title: 'AI Fundamentals Flashcards',
      type: 'Flashcards',
      source: 'Introduction to Artificial Intelligence.pdf',
      createdAt: '10 Aug 2026',
    },
    {
      id: 3,
      title: 'Database Systems Practice Quiz',
      type: 'Quiz',
      source: 'Database Systems Week 4.docx',
      createdAt: '9 Aug 2026',
    },
    {
      id: 4,
      title: 'Software Engineering Study Plan',
      type: 'Study Plan',
      source: 'Software Engineering Notes.txt',
      createdAt: '8 Aug 2026',
    },
    {
      id: 5,
      title: 'Machine Learning Explanation',
      type: 'Explanation',
      source: 'Introduction to Artificial Intelligence.pdf',
      createdAt: '8 Aug 2026',
    },
  ])

  const filteredMaterials = materials.filter((material) => {
    const matchesFilter =
      filter === 'all' ||
      material.type.toLowerCase().replace(' ', '-') === filter

    const matchesSearch =
      material.title.toLowerCase().includes(search.toLowerCase()) ||
      material.source.toLowerCase().includes(search.toLowerCase())

    return matchesFilter && matchesSearch
  })

  const handleDelete = (id) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this saved material?'
    )

    if (!confirmed) {
      return
    }

    setMaterials(
      materials.filter((material) => material.id !== id)
    )
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

      case 'Study Plan':
        return 'bg-pink-100 text-pink-700'

      default:
        return 'bg-gray-100 text-gray-700'
    }
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

          {/* Search */}
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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title or source document..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          {/* Filter */}
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
              onChange={(event) => setFilter(event.target.value)}
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

              <option value="study-plan">
                Study Plans
              </option>

            </select>

          </div>

        </div>

      </div>

      {/* Material Count */}
      <div className="mt-6 flex items-center justify-between">

        <p className="text-sm text-gray-600">
          Showing{' '}
          <span className="font-semibold text-gray-900">
            {filteredMaterials.length}
          </span>{' '}
          saved material
          {filteredMaterials.length !== 1 ? 's' : ''}
        </p>

      </div>

      {/* Saved Materials */}
      {filteredMaterials.length > 0 ? (

        <div className="mt-4 grid gap-5 lg:grid-cols-2">

          {filteredMaterials.map((material) => (

            <div
              key={material.id}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >

              <div className="flex items-start justify-between gap-4">

                <div className="min-w-0">

                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getTypeStyle(
                      material.type
                    )}`}
                  >
                    {material.type}
                  </span>

                  <h2 className="mt-3 text-lg font-semibold text-gray-900">
                    {material.title}
                  </h2>

                  <p className="mt-2 break-words text-sm text-gray-500">
                    Source: {material.source}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Saved: {material.createdAt}
                  </p>

                </div>

              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-wrap gap-3">

                <button
                  type="button"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  Open
                </button>

                <button
                  type="button"
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Download
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(material.id)}
                  className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  Delete
                </button>

              </div>

            </div>

          ))}

        </div>

      ) : (

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">

          <h2 className="text-xl font-semibold text-gray-900">
            No saved materials found
          </h2>

          <p className="mt-2 text-gray-600">
            Try changing your search or filter selection.
          </p>

        </div>

      )}

      {/* Temporary Development Notice */}
      <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-5">

        <h3 className="font-semibold text-blue-900">
          Development Preview
        </h3>

        <p className="mt-1 text-sm leading-6 text-blue-800">
          The materials shown on this page are temporary sample data. The final
          version will retrieve the logged-in student's saved materials from
          the backend and database.
        </p>

      </div>

    </div>
  )
}

export default SavedMaterials