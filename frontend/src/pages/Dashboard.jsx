import { Link } from 'react-router'

function Dashboard() {
  const stats = [
    {
      title: 'Study Materials',
      value: '0',
      description: 'Uploaded documents',
    },
    {
      title: 'Flashcards',
      value: '0',
      description: 'Generated cards',
    },
    {
      title: 'Quizzes Completed',
      value: '0',
      description: 'Practice attempts',
    },
    {
      title: 'Average Score',
      value: '0%',
      description: 'Quiz performance',
    },
  ]

  return (
    <div className="mx-auto max-w-7xl">

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Dashboard
        </h1>

        <p className="mt-2 text-gray-600">
          Welcome back. Start by uploading your study material.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-gray-500">
              {stat.title}
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {stat.value}
            </p>

            <p className="mt-1 text-sm text-gray-500">
              {stat.description}
            </p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Quick Actions
        </h2>

        <div className="grid gap-5 md:grid-cols-3">

          <Link
            to="/upload"
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-gray-900">
              Upload Study Material
            </h3>

            <p className="mt-2 text-sm text-gray-600">
              Upload PDF, DOCX or TXT study materials.
            </p>

            <p className="mt-4 text-sm font-medium text-blue-600">
              Upload material →
            </p>
          </Link>

          <Link
            to="/study-plan"
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-gray-900">
              Study Planner
            </h3>

            <p className="mt-2 text-sm text-gray-600">
              Organise your available study time and upcoming topics.
            </p>

            <p className="mt-4 text-sm font-medium text-blue-600">
              Create plan →
            </p>
          </Link>

          <Link
            to="/progress"
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-gray-900">
              View Progress
            </h3>

            <p className="mt-2 text-sm text-gray-600">
              Review quiz scores and study activity.
            </p>

            <p className="mt-4 text-sm font-medium text-blue-600">
              View progress →
            </p>
          </Link>

        </div>
      </div>

      {/* Responsible AI notice */}
      <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-semibold text-amber-900">
          Responsible AI Reminder
        </h2>

        <p className="mt-1 text-sm text-amber-800">
          AI-generated study materials may contain inaccuracies or omissions.
          Always verify generated information against your original study
          material.
        </p>
      </div>

    </div>
  )
}

export default Dashboard