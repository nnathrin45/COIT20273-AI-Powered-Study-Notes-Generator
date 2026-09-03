import { useState } from 'react'

function Progress() {
  const [period, setPeriod] = useState('all')

  // Temporary mock data.
  // This will later come from the backend/database.
  const stats = {
    uploadedMaterials: 6,
    summariesGenerated: 8,
    flashcardsReviewed: 42,
    quizzesCompleted: 7,
    averageScore: 81,
    studyPlansCreated: 3,
  }

  const quizHistory = [
    {
      id: 1,
      title: 'Artificial Intelligence Fundamentals',
      score: 9,
      total: 10,
      percentage: 90,
      date: '11 Aug 2026',
    },
    {
      id: 2,
      title: 'Database Normalisation',
      score: 7,
      total: 10,
      percentage: 70,
      date: '10 Aug 2026',
    },
    {
      id: 3,
      title: 'Software Architecture',
      score: 8,
      total: 10,
      percentage: 80,
      date: '9 Aug 2026',
    },
    {
      id: 4,
      title: 'Machine Learning Basics',
      score: 17,
      total: 20,
      percentage: 85,
      date: '8 Aug 2026',
    },
  ]

  const recentActivity = [
    {
      id: 1,
      action: 'Completed a practice quiz',
      detail: 'Artificial Intelligence Fundamentals',
      time: 'Today',
    },
    {
      id: 2,
      action: 'Reviewed flashcards',
      detail: 'AI Fundamentals Flashcards',
      time: 'Today',
    },
    {
      id: 3,
      action: 'Generated a summary',
      detail: 'Database Systems Week 4',
      time: 'Yesterday',
    },
    {
      id: 4,
      action: 'Created a study plan',
      detail: 'Software Engineering',
      time: '2 days ago',
    },
  ]

  const getScoreStyle = (percentage) => {
    if (percentage >= 80) {
      return 'bg-green-100 text-green-700'
    }

    if (percentage >= 60) {
      return 'bg-amber-100 text-amber-700'
    }

    return 'bg-red-100 text-red-700'
  }

  return (
    <div className="mx-auto max-w-7xl">

      {/* Page Heading */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Progress
          </h1>

          <p className="mt-2 text-gray-600">
            Review your study activity, quiz performance and generated study
            resources.
          </p>
        </div>

        <div className="w-full sm:w-48">
          <label
            htmlFor="progress-period"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Time Period
          </label>

          <select
            id="progress-period"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">
              All Time
            </option>

            <option value="week">
              This Week
            </option>

            <option value="month">
              This Month
            </option>
          </select>
        </div>

      </div>

      {/* Main Statistics */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Uploaded Materials
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {stats.uploadedMaterials}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Study documents
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Flashcards Reviewed
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {stats.flashcardsReviewed}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Active recall reviews
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Quizzes Completed
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {stats.quizzesCompleted}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Practice attempts
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Average Quiz Score
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {stats.averageScore}%
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Overall performance
          </p>
        </div>

      </div>

      {/* Additional Activity Stats */}
      <div className="mt-5 grid gap-5 md:grid-cols-2">

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-semibold text-gray-900">
            Generated Study Resources
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-4">

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Summaries
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.summariesGenerated}
              </p>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Study Plans
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.studyPlansCreated}
              </p>
            </div>

          </div>

        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-semibold text-gray-900">
            Overall Progress
          </h2>

          <div className="mt-5">

            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">
                Study Activity
              </span>

              <span className="font-semibold text-gray-900">
                72%
              </span>
            </div>

            <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: '72%' }}
              />
            </div>

            <p className="mt-3 text-sm text-gray-500">
              Progress is currently based on temporary sample activity data.
            </p>

          </div>

        </div>

      </div>

      {/* Quiz Performance */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm">

        <div className="border-b border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Quiz Performance
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Review your recent practice quiz results.
          </p>
        </div>

        <div className="overflow-x-auto">

          <table className="min-w-full">

            <thead className="bg-gray-50">
              <tr>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Quiz
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Score
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Result
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Date
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">

              {quizHistory.map((quiz) => (
                <tr
                  key={quiz.id}
                  className="hover:bg-gray-50"
                >

                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {quiz.title}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-600">
                    {quiz.score}/{quiz.total}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getScoreStyle(
                        quiz.percentage
                      )}`}
                    >
                      {quiz.percentage}%
                    </span>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500">
                    {quiz.date}
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </div>

      {/* Recent Activity */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

        <h2 className="text-xl font-semibold text-gray-900">
          Recent Activity
        </h2>

        <div className="mt-5 divide-y divide-gray-200">

          {recentActivity.map((activity) => (
            <div
              key={activity.id}
              className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >

              <div>
                <p className="font-medium text-gray-900">
                  {activity.action}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {activity.detail}
                </p>
              </div>

              <p className="text-sm text-gray-600">
                {activity.time}
              </p>

            </div>
          ))}

        </div>

      </div>

      {/* Development Notice */}
      <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-5">

        <h3 className="font-semibold text-blue-900">
          Development Preview
        </h3>

        <p className="mt-1 text-sm leading-6 text-blue-800">
          The progress information displayed on this page currently uses
          temporary sample data. The final version will retrieve the logged-in
          student's quiz results, reviewed materials and study activity from
          the backend and database.
        </p>

      </div>

    </div>
  )
}

export default Progress