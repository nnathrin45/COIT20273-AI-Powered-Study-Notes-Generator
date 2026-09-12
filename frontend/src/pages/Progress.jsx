import { useEffect, useState } from 'react'
import { getProgress } from '../services/progressService'

function Progress() {
  const [period, setPeriod] = useState('all')
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadProgress = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await getProgress(period)

        if (!response.ok) {
          if (response.status === 401) {
            setError(
              'Your login session is missing or invalid. Please sign in again.'
            )
          } else {
            setError(
              response.data?.message ||
                'Unable to load your progress.'
            )
          }

          return
        }

        setProgress(response.data?.progress || null)
      } catch (loadError) {
        console.error('Progress load error:', loadError)

        setError(
          'Unable to connect to the server. Please try again.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadProgress()
  }, [period])

  const stats = {
    uploadedMaterials: progress?.total_files ?? 0,
    summariesGenerated: progress?.summaries_generated ?? 0,
    flashcardsGenerated: progress?.flashcards_generated ?? 0,
    quizzesGenerated: progress?.quizzes_generated ?? 0,
    explanationsGenerated: progress?.explanations_generated ?? 0,
    quizzesCompleted: progress?.total_quiz_attempts ?? 0,
    averageScore: progress?.average_percentage ?? 0,
    studyPlansCreated: progress?.total_study_plans ?? 0,
  }

  const quizHistory = progress?.recent_attempts ?? []
  const recentActivity = progress?.recent_activity ?? []

  const questionAccuracy =
    progress?.total_questions > 0
      ? Math.round(
          (progress.total_correct / progress.total_questions) * 100
        )
      : 0

  const getScoreStyle = (percentage) => {
    if (percentage >= 80) {
      return 'bg-green-100 text-green-700'
    }

    if (percentage >= 60) {
      return 'bg-amber-100 text-amber-700'
    }

    return 'bg-red-100 text-red-700'
  }

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return ''
    }

    return new Date(dateValue).toLocaleDateString()
  }

  const getActivityLabel = (activityType) => {
    const labels = {
      quiz_attempt: 'Completed a practice quiz',
      ai_summary: 'Generated a summary',
      ai_flashcards: 'Generated flashcards',
      ai_quiz: 'Generated a quiz',
      ai_explanation: 'Generated an explanation',
      upload: 'Uploaded study material',
      study_plan: 'Created a study plan',
    }

    return labels[activityType] || 'Study activity'
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
            disabled={loading}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
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

      {/* Loading */}
      {loading && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-700">
            Loading your progress...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* Main Statistics */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

        {/* Uploaded Materials */}
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

        {/* Flashcards Generated */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Flashcards Generated
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {stats.flashcardsGenerated}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Generated study sets
          </p>
        </div>

        {/* Quizzes Completed */}
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

        {/* Average Quiz Score */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Average Quiz Score
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {stats.averageScore}%
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Average attempt result
          </p>
        </div>

      </div>

      {/* Additional Activity Stats */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">

        {/* Generated Study Resources */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-semibold text-gray-900">
            Generated Study Resources
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-4">

            {/* Summaries */}
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Summaries
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.summariesGenerated}
              </p>
            </div>

            {/* Study Plans */}
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Study Plans
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.studyPlansCreated}
              </p>
            </div>

            {/* Quizzes Generated */}
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Quizzes Generated
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.quizzesGenerated}
              </p>
            </div>

            {/* Explanations */}
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Explanations
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.explanationsGenerated}
              </p>
            </div>

          </div>

        </div>

        {/* Quiz Accuracy */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-semibold text-gray-900">
            Quiz Question Accuracy
          </h2>

          <div className="mt-5">

            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">
                Correct Answers
              </span>

              <span className="font-semibold text-gray-900">
                {questionAccuracy}%
              </span>
            </div>

            <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{
                  width: `${questionAccuracy}%`,
                }}
              />
            </div>

            <p className="mt-3 text-sm text-gray-500">
              Correct answers across quiz attempts for the selected time
              period.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-4">

              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">
                  Correct
                </p>

                <p className="mt-1 text-xl font-bold text-gray-900">
                  {progress?.total_correct ?? 0}
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">
                  Questions
                </p>

                <p className="mt-1 text-xl font-bold text-gray-900">
                  {progress?.total_questions ?? 0}
                </p>
              </div>

            </div>

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

              {!loading && quizHistory.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-8 text-center text-sm text-gray-500"
                  >
                    No quiz attempts found for this time period.
                  </td>
                </tr>
              )}

              {quizHistory.map((quiz) => (
                <tr
                  key={quiz.attempt_id}
                  className="hover:bg-gray-50"
                >

                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {quiz.quiz_title}
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
                    {formatDate(quiz.attempted_at)}
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

        <p className="mt-1 text-sm text-gray-500">
          Your latest study actions for the selected time period.
        </p>

        <div className="mt-5 divide-y divide-gray-200">

          {!loading && recentActivity.length === 0 && (
            <p className="py-4 text-sm text-gray-500">
              No recent activity found for this time period.
            </p>
          )}

          {recentActivity.map((activity, index) => (
            <div
              key={`${activity.activity_type}-${activity.occurred_at}-${index}`}
              className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >

              <div>
                <p className="font-medium text-gray-900">
                  {getActivityLabel(activity.activity_type)}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {activity.detail}
                </p>
              </div>

              <p className="text-sm text-gray-600">
                {formatDate(activity.occurred_at)}
              </p>

            </div>
          ))}

        </div>

      </div>

    </div>
  )
}

export default Progress