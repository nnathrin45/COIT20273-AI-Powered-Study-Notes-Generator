import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  clearActivityHistory,
  deleteSelectedActivities,
  getProgress,
} from '../services/progressService'

function Progress() {
  const [period, setPeriod] = useState('all')
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedActivityIds, setSelectedActivityIds] =
    useState([])

  const [activityActionLoading, setActivityActionLoading] =
    useState(false)

  const [activityError, setActivityError] =
    useState('')

  const [activityStatus, setActivityStatus] =
    useState('')

  const [quizPerformanceOpen, setQuizPerformanceOpen] =
    useState(false)

  const [recentActivityOpen, setRecentActivityOpen] =
    useState(false)

  const loadProgress = useCallback(
    async ({ showLoading = true } = {}) => {
      if (showLoading) {
        setLoading(true)
      }

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

        setProgress(
          response.data?.progress || null
        )
      } catch (loadError) {
        console.error(
          'Progress load error:',
          loadError
        )

        setError(
          'Unable to connect to the server. Please try again.'
        )
      } finally {
        if (showLoading) {
          setLoading(false)
        }
      }
    },
    [period]
  )

  useEffect(() => {
    setSelectedActivityIds([])
    setActivityError('')
    setActivityStatus('')

    loadProgress()
  }, [loadProgress])

  useEffect(() => {
    if (!activityStatus) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      setActivityStatus('')
    }, 4000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [activityStatus])

  const stats = {
    uploadedMaterials:
      progress?.total_files ?? 0,

    summariesGenerated:
      progress?.summaries_generated ?? 0,

    flashcardsGenerated:
      progress?.flashcards_generated ?? 0,

    quizzesGenerated:
      progress?.quizzes_generated ?? 0,

    explanationsGenerated:
      progress?.explanations_generated ?? 0,

    quizzesCompleted:
      progress?.total_quiz_attempts ?? 0,

    averageScore:
      progress?.average_percentage ?? 0,

    studyPlansCreated:
      progress?.total_study_plans ?? 0,
  }

  const quizHistory =
    progress?.recent_attempts ?? []

  const recentActivity =
    progress?.recent_activity ?? []

  const selectableActivityIds =
    recentActivity
      .map((activity) =>
        Number(activity.activity_id)
      )
      .filter(
        (activityId) =>
          Number.isInteger(activityId) &&
          activityId > 0
      )

  const allVisibleActivitiesSelected =
    selectableActivityIds.length > 0 &&
    selectableActivityIds.every(
      (activityId) =>
        selectedActivityIds.includes(
          activityId
        )
    )

  const questionAccuracy =
    progress?.total_questions > 0
      ? Math.round(
          (
            progress.total_correct /
            progress.total_questions
          ) * 100
        )
      : 0

  const getScoreStyle = (percentage) => {
    if (percentage >= 80) {
      return 'border-green-500/30 bg-green-500/10 text-green-300'
    }

    if (percentage >= 60) {
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    }

    return 'border-red-500/30 bg-red-500/10 text-red-300'
  }

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return ''
    }

    const date = new Date(dateValue)

    if (Number.isNaN(date.getTime())) {
      return ''
    }

    return date.toLocaleDateString()
  }

  const formatDateTime = (dateValue) => {
    if (!dateValue) {
      return ''
    }

    const date = new Date(dateValue)

    if (Number.isNaN(date.getTime())) {
      return ''
    }

    return date.toLocaleString()
  }

  const getActivityLabel = (
    activityType
  ) => {
    const labels = {
      quiz_attempt:
        'Completed a practice quiz',

      ai_summary:
        'Generated a summary',

      ai_flashcards:
        'Generated flashcards',

      ai_quiz:
        'Generated a quiz',

      ai_explanation:
        'Generated an explanation',

      ai_summary_deleted:
        'Deleted a saved summary',

      ai_flashcards_deleted:
        'Deleted saved flashcards',

      ai_quiz_deleted:
        'Deleted a saved quiz',

      ai_explanation_deleted:
        'Deleted a saved explanation',

      upload:
        'Uploaded study material',

      upload_deleted:
        'Deleted study material',

      study_plan:
        'Created a study plan',

      study_plan_deleted:
        'Deleted a study plan',
    }

    return (
      labels[activityType] ||
      'Study activity'
    )
  }

  const handleActivitySelection = (
    activityId
  ) => {
    const numericActivityId =
      Number(activityId)

    if (
      !Number.isInteger(
        numericActivityId
      ) ||
      numericActivityId <= 0
    ) {
      return
    }

    setSelectedActivityIds(
      (currentIds) => {
        if (
          currentIds.includes(
            numericActivityId
          )
        ) {
          return currentIds.filter(
            (id) =>
              id !== numericActivityId
          )
        }

        return [
          ...currentIds,
          numericActivityId,
        ]
      }
    )
  }

  const handleSelectAllVisible = () => {
    if (allVisibleActivitiesSelected) {
      setSelectedActivityIds([])
      return
    }

    setSelectedActivityIds(
      selectableActivityIds
    )
  }

  const handleDeleteSelectedActivities =
    async () => {
      if (
        selectedActivityIds.length === 0
      ) {
        setActivityError(
          'Select at least one activity to delete.'
        )
        return
      }

      const activityWord =
        selectedActivityIds.length === 1
          ? 'entry'
          : 'entries'

      const confirmed =
        window.confirm(
          `Delete ${selectedActivityIds.length} selected activity ${activityWord} from your history?\n\nYour study materials, AI outputs, quiz results and study plans will not be deleted.`
        )

      if (!confirmed) {
        return
      }

      setActivityActionLoading(true)
      setActivityError('')
      setActivityStatus('')

      try {
        const response =
          await deleteSelectedActivities(
            selectedActivityIds
          )

        if (!response.ok) {
          if (response.status === 401) {
            setActivityError(
              'Your login session is missing or invalid. Please sign in again.'
            )
          } else {
            setActivityError(
              response.data?.message ||
                'Unable to delete the selected activity history.'
            )
          }

          return
        }

        const deletedCount = Number(
          response.data?.deleted_count ?? 0
        )

        setSelectedActivityIds([])

        if (deletedCount === 1) {
          setActivityStatus(
            '1 activity entry was removed from your history.'
          )
        } else {
          setActivityStatus(
            `${deletedCount} activity entries were removed from your history.`
          )
        }

        await loadProgress({
          showLoading: false,
        })
      } catch (deleteError) {
        console.error(
          'Selected activity deletion error:',
          deleteError
        )

        setActivityError(
          'Unable to connect to the server while deleting activity history.'
        )
      } finally {
        setActivityActionLoading(false)
      }
    }

  const handleClearActivityHistory =
    async () => {
      const confirmed =
        window.confirm(
          'Clear your entire activity history?\n\nThis removes the activity log only. Your uploaded study materials, generated AI content, quiz attempts and study plans will remain available.'
        )

      if (!confirmed) {
        return
      }

      setActivityActionLoading(true)
      setActivityError('')
      setActivityStatus('')

      try {
        const response =
          await clearActivityHistory()

        if (!response.ok) {
          if (response.status === 401) {
            setActivityError(
              'Your login session is missing or invalid. Please sign in again.'
            )
          } else {
            setActivityError(
              response.data?.message ||
                'Unable to clear your activity history.'
            )
          }

          return
        }

        const deletedCount = Number(
          response.data?.deleted_count ?? 0
        )

        setSelectedActivityIds([])

        if (deletedCount === 0) {
          setActivityStatus(
            'Your activity history is already clear.'
          )
        } else {
          setActivityStatus(
            'Activity history cleared successfully.'
          )
        }

        await loadProgress({
          showLoading: false,
        })
      } catch (clearError) {
        console.error(
          'Activity history clear error:',
          clearError
        )

        setActivityError(
          'Unable to connect to the server while clearing activity history.'
        )
      } finally {
        setActivityActionLoading(false)
      }
    }

  const cardClass =
    'rounded-xl border border-[#2A1B4D] bg-[#160B32] p-5'

  const smallCardClass =
    'rounded-lg border border-[#2A1B4D] bg-[#120928] p-4'

  return (
    <div className="mx-auto max-w-4xl">

      {/* Page Heading */}
      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

        <div>

          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#A77BFF]">
            Study Analytics
          </p>

          <h1 className="text-3xl font-bold text-white">
            Progress
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#898CC0]">
            Review your study activity, quiz performance and generated
            study resources.
          </p>

        </div>

        <div className="w-full sm:w-44">

          <label
            htmlFor="progress-period"
            className="mb-2 block text-sm font-medium text-[#C2C4E4]"
          >
            Time Period
          </label>

          <select
            id="progress-period"
            value={period}
            onChange={(event) =>
              setPeriod(event.target.value)
            }
            disabled={loading}
            className="w-full rounded-lg border border-[#2A1B4D] bg-[#120928] px-3 py-2.5 text-sm text-[#C2C4E4] outline-none transition focus:border-[#7A44FF] focus:ring-1 focus:ring-[#7A44FF] disabled:cursor-not-allowed disabled:opacity-50"
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
        <div
          className="mb-5 rounded-lg border border-[#3A2763] bg-[#2A1F46] p-4"
          role="status"
        >
          <p className="text-sm text-[#C2C4E4]">
            Loading your progress...
          </p>
        </div>
      )}

      {/* Main Error */}
      {error && (
        <div
          className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 p-4"
          role="alert"
        >
          <p className="text-sm text-red-300">
            {error}
          </p>
        </div>
      )}

      {/* Main Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className={cardClass}>

          <div className="flex items-start justify-between gap-3">

            <div>
              <p className="text-sm font-medium text-[#898CC0]">
                Study Materials
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {stats.uploadedMaterials}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#392461] bg-[#251149] text-[#A77BFF]">

              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  d="M7 3.75h7l3 3V20.25H7V3.75Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />

                <path
                  d="M14 3.75v3h3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>

            </div>

          </div>

          <p className="mt-2 text-xs text-[#595C90]">
            Uploaded documents
          </p>

        </div>

        <div className={cardClass}>

          <div className="flex items-start justify-between gap-3">

            <div>
              <p className="text-sm font-medium text-[#898CC0]">
                Flashcards
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {stats.flashcardsGenerated}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#392461] bg-[#251149] text-[#A77BFF]">

              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <rect
                  x="5"
                  y="6"
                  width="14"
                  height="12"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />

                <path
                  d="M8 9h8M8 12h5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>

            </div>

          </div>

          <p className="mt-2 text-xs text-[#595C90]">
            Generated study sets
          </p>

        </div>

        <div className={cardClass}>

          <div className="flex items-start justify-between gap-3">

            <div>
              <p className="text-sm font-medium text-[#898CC0]">
                Quizzes Completed
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {stats.quizzesCompleted}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#392461] bg-[#251149] text-[#A77BFF]">

              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <rect
                  x="6"
                  y="4"
                  width="12"
                  height="16"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />

                <path
                  d="m9 12 2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

            </div>

          </div>

          <p className="mt-2 text-xs text-[#595C90]">
            Practice attempts
          </p>

        </div>

        <div className={cardClass}>

          <div className="flex items-start justify-between gap-3">

            <div>
              <p className="text-sm font-medium text-[#898CC0]">
                Average Score
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {stats.averageScore}%
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#392461] bg-[#251149] text-[#A77BFF]">

              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  d="M6 18V12M12 18V7M18 18V4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>

            </div>

          </div>

          <p className="mt-2 text-xs text-[#595C90]">
            Quiz performance
          </p>

        </div>

      </div>

      {/* Generated Resources / Accuracy */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">

        <div className={cardClass}>

          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#A77BFF]">
            Resources
          </p>

          <h2 className="text-xl font-semibold text-white">
            Generated Study Resources
          </h2>

          <p className="mt-1 text-sm text-[#898CC0]">
            AI-generated resources for the selected period.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">

            <div className={smallCardClass}>
              <p className="text-xs uppercase tracking-wide text-[#595C90]">
                Summaries
              </p>

              <p className="mt-1 text-xl font-semibold text-white">
                {stats.summariesGenerated}
              </p>
            </div>

            <div className={smallCardClass}>
              <p className="text-xs uppercase tracking-wide text-[#595C90]">
                Study Plans
              </p>

              <p className="mt-1 text-xl font-semibold text-white">
                {stats.studyPlansCreated}
              </p>
            </div>

            <div className={smallCardClass}>
              <p className="text-xs uppercase tracking-wide text-[#595C90]">
                Quizzes
              </p>

              <p className="mt-1 text-xl font-semibold text-white">
                {stats.quizzesGenerated}
              </p>
            </div>

            <div className={smallCardClass}>
              <p className="text-xs uppercase tracking-wide text-[#595C90]">
                Explanations
              </p>

              <p className="mt-1 text-xl font-semibold text-white">
                {stats.explanationsGenerated}
              </p>
            </div>

          </div>

        </div>

        <div className={cardClass}>

          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#A77BFF]">
            Performance
          </p>

          <h2 className="text-xl font-semibold text-white">
            Quiz Question Accuracy
          </h2>

          <p className="mt-1 text-sm text-[#898CC0]">
            Correct answers across your practice attempts.
          </p>

          <div className="mt-5">

            <div className="flex items-center justify-between">

              <span className="text-sm text-[#C2C4E4]">
                Correct Answers
              </span>

              <span className="text-sm font-semibold text-white">
                {questionAccuracy}%
              </span>

            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#120928]">

              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7A44FF] to-[#D83DFF] transition-all duration-500"
                style={{
                  width: `${questionAccuracy}%`,
                }}
              />

            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">

              <div className={smallCardClass}>
                <p className="text-xs uppercase tracking-wide text-[#595C90]">
                  Correct
                </p>

                <p className="mt-1 text-xl font-semibold text-white">
                  {progress?.total_correct ?? 0}
                </p>
              </div>

              <div className={smallCardClass}>
                <p className="text-xs uppercase tracking-wide text-[#595C90]">
                  Questions
                </p>

                <p className="mt-1 text-xl font-semibold text-white">
                  {progress?.total_questions ?? 0}
                </p>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* Quiz Performance */}
      <section className="group mt-5 overflow-hidden rounded-xl border border-[#2A1B4D] bg-[#160B32] transition-all duration-300 hover:border-[#7A44FF] hover:shadow-[0_0_24px_rgba(122,68,255,0.28)]">

        <button
          type="button"
          onClick={() =>
            setQuizPerformanceOpen(
              (current) => !current
            )
          }
          aria-expanded={quizPerformanceOpen}
          aria-controls="quiz-performance-content"
          style={{
            backgroundColor: '#160B32',
          }}
          className="relative flex w-full items-center justify-between gap-4 overflow-hidden px-5 py-5 text-left transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-[#7A44FF] after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-[#7A44FF] after:to-[#D83DFF] after:transition-all after:duration-300 group-hover:after:w-full"
        >

          <div>

            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#A77BFF]">
              Quiz History
            </p>

            <h2 className="text-xl font-semibold text-white">
              Quiz Performance
            </h2>

            <p className="mt-1 text-sm text-[#898CC0]">
              Review your recent practice quiz results.
            </p>

          </div>

          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[#392461] bg-[#251149] text-[#A77BFF]">

            <svg
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className={`h-4 w-4 transition-transform duration-300 ${
                quizPerformanceOpen
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

          </div>

        </button>

        <div
          id="quiz-performance-content"
          aria-hidden={!quizPerformanceOpen}
          className={`grid transition-all duration-300 ease-in-out ${
            quizPerformanceOpen
              ? 'visible grid-rows-[1fr] opacity-100'
              : 'invisible grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="min-h-0 overflow-hidden">

            <div className="border-t border-[#2A1B4D]">

              <div className="overflow-x-auto">

                <table className="min-w-full">

                  <thead className="bg-[#120928]/60">

                    <tr>

                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#595C90]">
                        Quiz
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#595C90]">
                        Score
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#595C90]">
                        Result
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#595C90]">
                        Date
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-[#2A1B4D]">

                    {!loading &&
                      quizHistory.length === 0 && (
                        <tr>

                          <td
                            colSpan="4"
                            className="px-5 py-8 text-center text-sm text-[#898CC0]"
                          >
                            No quiz attempts found for this time period.
                          </td>

                        </tr>
                      )}

                    {quizHistory.map((quiz) => (
                      <tr
                        key={quiz.attempt_id}
                        className="transition hover:bg-[#211044]"
                      >

                        <td className="px-5 py-4 text-sm font-medium text-[#C2C4E4]">
                          {quiz.quiz_title}
                        </td>

                        <td className="px-5 py-4 text-sm text-[#898CC0]">
                          {quiz.score}/{quiz.total}
                        </td>

                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getScoreStyle(
                              quiz.percentage
                            )}`}
                          >
                            {quiz.percentage}%
                          </span>

                        </td>

                        <td className="px-5 py-4 text-sm text-[#898CC0]">
                          {formatDate(
                            quiz.attempted_at
                          )}
                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>

            </div>

          </div>
        </div>

      </section>

      {/* Recent Activity */}
      <section className="group mt-5 overflow-hidden rounded-xl border border-[#2A1B4D] bg-[#160B32] transition-all duration-300 hover:border-[#7A44FF] hover:shadow-[0_0_24px_rgba(122,68,255,0.28)]">

        <button
          type="button"
          onClick={() =>
            setRecentActivityOpen(
              (current) => !current
            )
          }
          aria-expanded={recentActivityOpen}
          aria-controls="recent-activity-content"
          style={{
            backgroundColor: '#160B32',
          }}
          className="relative flex w-full items-center justify-between gap-4 overflow-hidden px-5 py-5 text-left transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-[#7A44FF] after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-[#7A44FF] after:to-[#D83DFF] after:transition-all after:duration-300 group-hover:after:w-full"
        >

          <div>

            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#A77BFF]">
              Activity
            </p>

            <h2 className="text-xl font-semibold text-white">
              Recent Activity
            </h2>

            <p className="mt-1 text-sm text-[#898CC0]">
              Your latest study actions for the selected time period.
            </p>

          </div>

          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[#392461] bg-[#251149] text-[#A77BFF]">

            <svg
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className={`h-4 w-4 transition-transform duration-300 ${
                recentActivityOpen
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

          </div>

        </button>

        <div
          id="recent-activity-content"
          aria-hidden={!recentActivityOpen}
          className={`grid transition-all duration-300 ease-in-out ${
            recentActivityOpen
              ? 'visible grid-rows-[1fr] opacity-100'
              : 'invisible grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="min-h-0 overflow-hidden">

            <div className="border-t border-[#2A1B4D] p-5">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">

                <button
                  type="button"
                  onClick={
                    handleDeleteSelectedActivities
                  }
                  disabled={
                    activityActionLoading ||
                    selectedActivityIds.length === 0
                  }
                  className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {activityActionLoading
                    ? 'Please wait...'
                    : `Delete Selected${
                        selectedActivityIds.length > 0
                          ? ` (${selectedActivityIds.length})`
                          : ''
                      }`}
                </button>

                <button
                  type="button"
                  onClick={
                    handleClearActivityHistory
                  }
                  disabled={
                    activityActionLoading ||
                    loading
                  }
                  className="rounded-lg border border-red-500/40 bg-[#301127] px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-[#40142F] focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {activityActionLoading
                    ? 'Please wait...'
                    : 'Clear Activity History'}
                </button>

              </div>

              {activityStatus && (
                <div
                  className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4"
                  role="status"
                  aria-live="polite"
                >
                  <p className="text-sm text-emerald-300">
                    {activityStatus}
                  </p>
                </div>
              )}

              {activityError && (
                <div
                  className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4"
                  role="alert"
                >
                  <p className="text-sm text-red-300">
                    {activityError}
                  </p>
                </div>
              )}

              {recentActivity.length > 0 && (
                <div className="mt-4 flex flex-col gap-2 rounded-lg border border-[#2A1B4D] bg-[#120928] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

                  <label className="flex cursor-pointer items-center gap-3 text-sm text-[#C2C4E4]">

                    <input
                      type="checkbox"
                      checked={
                        allVisibleActivitiesSelected
                      }
                      onChange={
                        handleSelectAllVisible
                      }
                      disabled={
                        activityActionLoading
                      }
                      className="h-4 w-4 rounded accent-[#7A44FF]"
                    />

                    Select all visible

                  </label>

                  <span className="text-xs text-[#898CC0]">
                    {selectedActivityIds.length}{' '}
                    selected
                  </span>

                </div>
              )}

              <div className="mt-3 divide-y divide-[#2A1B4D]">

                {!loading &&
                  recentActivity.length === 0 && (
                    <p className="py-8 text-center text-sm text-[#898CC0]">
                      No recent activity found for this time period.
                    </p>
                  )}

                {recentActivity.map(
                  (activity) => {
                    const activityId =
                      Number(
                        activity.activity_id
                      )

                    const isSelected =
                      selectedActivityIds.includes(
                        activityId
                      )

                    return (
                      <div
                        key={activity.activity_id}
                        className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >

                        <div className="flex items-start gap-3">

                          <input
                            id={`activity-${activityId}`}
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              handleActivitySelection(
                                activityId
                              )
                            }
                            disabled={
                              activityActionLoading
                            }
                            aria-label={`Select ${getActivityLabel(
                              activity.activity_type
                            )}`}
                            className="mt-1 h-4 w-4 flex-shrink-0 rounded accent-[#7A44FF]"
                          />

                          <div>

                            <label
                              htmlFor={`activity-${activityId}`}
                              className="cursor-pointer text-sm font-medium text-[#C2C4E4]"
                            >
                              {getActivityLabel(
                                activity.activity_type
                              )}
                            </label>

                            <p className="mt-1 text-sm text-[#898CC0]">
                              {activity.detail}
                            </p>

                          </div>

                        </div>

                        <p className="text-sm text-[#AEB1D1] sm:flex-shrink-0">
                          {formatDateTime(
                            activity.occurred_at
                          )}
                        </p>

                      </div>
                    )
                  }
                )}

              </div>

              <div className="mt-4 rounded-lg border border-[#2A1B4D] bg-[#120928] px-4 py-3">

                <p className="text-xs leading-5 text-[#898CC0]">
                  Removing activity history only removes entries from this
                  list. Your uploaded study materials, generated AI content,
                  quiz attempts and study plans are not deleted.
                </p>

              </div>

            </div>

          </div>
        </div>

      </section>

    </div>
  )
}

export default Progress