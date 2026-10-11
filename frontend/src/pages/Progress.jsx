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

import AnimatedSelect from '../components/AnimatedSelect'


function Progress() {
  const [period, setPeriod] =
    useState('all')

  const [progress, setProgress] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  const [
    contentVisible,
    setContentVisible,
  ] = useState(true)

  const [error, setError] =
    useState('')

  const [
    selectedActivityIds,
    setSelectedActivityIds,
  ] = useState([])

  const [
    activityActionLoading,
    setActivityActionLoading,
  ] = useState(false)

  const [
    activityActionType,
    setActivityActionType,
  ] = useState(null)

  const [
    activityError,
    setActivityError,
  ] = useState('')

  const [
    activityStatus,
    setActivityStatus,
  ] = useState('')

  const [
    quizHistoryPage,
    setQuizHistoryPage,
  ] = useState(1)

  const QUIZ_HISTORY_PER_PAGE =
    3

  const [
    recentActivityOpen,
    setRecentActivityOpen,
  ] = useState(false)


  const loadProgress = useCallback(
    async (
      {
        showLoading = true,
      } = {}
    ) => {
      if (showLoading) {
        setLoading(true)
      }

      setError('')

      try {
        const response =
          await getProgress(period)

        if (!response.ok) {
          if (
            response.status === 401
          ) {
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
          response.data?.progress ||
            null
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

        window.setTimeout(
          () => {
            setContentVisible(
              true
            )
          },
          50
        )
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

    const timer =
      window.setTimeout(
        () => {
          setActivityStatus('')
        },
        4000
      )

    return () => {
      window.clearTimeout(timer)
    }
  }, [activityStatus])


  const handlePeriodChange = (
    newPeriod
  ) => {
    if (
      newPeriod === period
    ) {
      return
    }

    setContentVisible(false)
    setQuizHistoryPage(1)

    window.setTimeout(
      () => {
        setPeriod(newPeriod)
      },
      200
    )
  }


  const stats = {
    uploadedMaterials:
      progress?.total_files ??
      0,

    summariesGenerated:
      progress
        ?.summaries_generated ??
      0,

    flashcardsGenerated:
      progress
        ?.flashcards_generated ??
      0,

    quizzesGenerated:
      progress
        ?.quizzes_generated ??
      0,

    explanationsGenerated:
      progress
        ?.explanations_generated ??
      0,

    quizzesCompleted:
      progress
        ?.total_quiz_attempts ??
      0,

    averageScore:
      progress
        ?.average_percentage ??
      0,

    studyPlansCreated:
      progress
        ?.total_study_plans ??
      0,
  }


  const quizHistory =
    progress?.recent_attempts ??
    []


  const totalQuizHistoryPages =
    Math.max(
      1,
      Math.ceil(
        quizHistory.length /
          QUIZ_HISTORY_PER_PAGE
      )
    )


  const currentQuizHistoryPage =
    Math.min(
      quizHistoryPage,
      totalQuizHistoryPages
    )


  const firstQuizHistoryIndex =
    (
      currentQuizHistoryPage - 1
    ) * QUIZ_HISTORY_PER_PAGE


  const paginatedQuizHistory =
    quizHistory.slice(
      firstQuizHistoryIndex,
      firstQuizHistoryIndex +
        QUIZ_HISTORY_PER_PAGE
    )


  const firstVisibleQuizAttempt =
    quizHistory.length === 0
      ? 0
      : firstQuizHistoryIndex + 1


  const lastVisibleQuizAttempt =
    Math.min(
      firstQuizHistoryIndex +
        QUIZ_HISTORY_PER_PAGE,
      quizHistory.length
    )


  const recentActivity =
    progress?.recent_activity ??
    []


  const selectableActivityIds =
    recentActivity
      .map((activity) =>
        Number(
          activity.activity_id
        )
      )
      .filter(
        (activityId) =>
          Number.isInteger(
            activityId
          ) &&
          activityId > 0
      )


  const allVisibleActivitiesSelected =
    selectableActivityIds.length >
      0 &&
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


  const getScoreStyle = (
    percentage
  ) => {
    if (percentage >= 80) {
      return 'progress-score-good border-green-500/30 bg-green-500/10 text-green-300'
    }

    if (percentage >= 60) {
      return 'progress-score-mid border-amber-500/30 bg-amber-500/10 text-amber-300'
    }

    return 'progress-score-low border-red-500/30 bg-red-500/10 text-red-300'
  }


  const formatDate = (
    dateValue
  ) => {
    if (!dateValue) {
      return ''
    }

    const date =
      new Date(dateValue)

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return ''
    }

    return date.toLocaleDateString()
  }


  const formatDateTime = (
    dateValue
  ) => {
    if (!dateValue) {
      return ''
    }

    const date =
      new Date(dateValue)

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
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
              id !==
              numericActivityId
          )
        }

        return [
          ...currentIds,
          numericActivityId,
        ]
      }
    )
  }


  const handleSelectAllVisible =
    () => {
      if (
        allVisibleActivitiesSelected
      ) {
        setSelectedActivityIds(
          []
        )

        return
      }

      setSelectedActivityIds(
        selectableActivityIds
      )
    }


  const handleDeleteSelectedActivities =
    async () => {
      if (
        selectedActivityIds.length ===
        0
      ) {
        setActivityError(
          'Select at least one activity to delete.'
        )

        return
      }

      const activityWord =
        selectedActivityIds.length ===
        1
          ? 'entry'
          : 'entries'

      const confirmed =
        window.confirm(
          `Delete ${selectedActivityIds.length} selected activity ${activityWord} from your history?\n\nYour study materials, AI outputs, quiz results and study plans will not be deleted.`
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

      setActivityActionType(
        'delete-selected'
      )

      setActivityActionLoading(
        true
      )

      setActivityError('')
      setActivityStatus('')

      try {
        const response =
          await deleteSelectedActivities(
            selectedActivityIds
          )

        if (!response.ok) {
          if (
            response.status === 401
          ) {
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

        const deletedCount =
          Number(
            response.data
              ?.deleted_count ?? 0
          )

        await waitForMinimumFeedback()

        setActivityActionLoading(
          false
        )

        setActivityActionType(
          null
        )

        setSelectedActivityIds(
          []
        )

        await loadProgress({
          showLoading: false,
        })

        if (
          deletedCount === 1
        ) {
          setActivityStatus(
            '1 activity entry was removed from your history.'
          )
        } else {
          setActivityStatus(
            `${deletedCount} activity entries were removed from your history.`
          )
        }

        setSelectedActivityIds(
          []
        )

        if (
          deletedCount === 1
        ) {
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
        await waitForMinimumFeedback()

        setActivityActionLoading(
          false
        )

        setActivityActionType(
          null
        )
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

      setActivityActionType(
        'clear-history'
      )

      setActivityActionLoading(
        true
      )

      setActivityError('')
      setActivityStatus('')

      try {
        const response =
          await clearActivityHistory()

        if (!response.ok) {
          if (
            response.status === 401
          ) {
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

        const deletedCount =
          Number(
            response.data
              ?.deleted_count ?? 0
          )

        await waitForMinimumFeedback()

        setActivityActionLoading(
          false
        )

        setActivityActionType(
          null
        )

        setSelectedActivityIds(
          []
        )

        await loadProgress({
          showLoading: false,
        })

        if (
          deletedCount === 0
        ) {
          setActivityStatus(
            'Your activity history is already clear.'
          )
        } else {
          setActivityStatus(
            'Activity history cleared successfully.'
          )
        }

        setSelectedActivityIds(
          []
        )

        if (
          deletedCount === 0
        ) {
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
        await waitForMinimumFeedback()

        setActivityActionLoading(
          false
        )

        setActivityActionType(
          null
        )
      }
    }


  const cardClass =
    'progress-theme-surface progress-card rounded-xl border border-[#2A1B4D] bg-[#160B32] p-5'


  const smallCardClass =
    'progress-theme-surface progress-small-card rounded-lg border border-[#2A1B4D] bg-[#120928] p-4'


  return (
    <div className="progress-theme mx-auto w-full max-w-[1660px]">
      <style>
        {`
          .progress-theme-surface {
            transition:
              background-color 500ms ease,
              border-color 500ms ease,
              box-shadow 300ms ease;
          }

          .progress-theme-interactive {
            transition:
              color 100ms ease,
              background-color 300ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease,
              opacity 300ms ease;
          }

          .progress-theme
          [class~="text-white"],
          .progress-theme
          [class~="text-[#C2C4E4]"],
          .progress-theme
          [class~="text-[#c2c4e4]"],
          .progress-theme
          [class~="text-[#AEB1D1]"],
          .progress-theme
          [class~="text-[#898CC0]"],
          .progress-theme
          [class~="text-[#898cc0]"],
          .progress-theme
          [class~="text-[#595C90]"],
          .progress-theme
          [class~="text-[#727494]"],
          .progress-theme
          [class~="text-[#A77BFF]"],
          .progress-theme
          [class~="text-[#a97cff]"] {
            transition:
              color 100ms ease;
          }


          /*
           * Main text
           */
          [data-theme-mode='light']
          .progress-theme
          [class~="text-white"] {
            color:
              #171717 !important;
          }

          [data-theme-mode='light']
          .progress-theme
          [class~="text-[#C2C4E4]"],
          [data-theme-mode='light']
          .progress-theme
          [class~="text-[#c2c4e4]"],
          [data-theme-mode='light']
          .progress-theme
          [class~="text-[#AEB1D1]"] {
            color:
              #45424d !important;
          }

          [data-theme-mode='light']
          .progress-theme
          [class~="text-[#898CC0]"],
          [data-theme-mode='light']
          .progress-theme
          [class~="text-[#898cc0]"] {
            color:
              #65676b !important;
          }

          [data-theme-mode='light']
          .progress-theme
          [class~="text-[#595C90]"],
          [data-theme-mode='light']
          .progress-theme
          [class~="text-[#727494]"] {
            color:
              #7a7575 !important;
          }

          [data-theme-mode='light']
          .progress-theme
          [class~="text-[#A77BFF]"],
          [data-theme-mode='light']
          .progress-theme
          [class~="text-[#a97cff]"] {
            color:
              #7a44ff !important;
          }


          /*
           * Main cards
           */
          [data-theme-mode='light']
          .progress-card,
          [data-theme-mode='light']
          .progress-accordion {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;
          }


          /*
           * Secondary cards
           */
          [data-theme-mode='light']
          .progress-small-card,
          [data-theme-mode='light']
          .progress-subtle-surface,
          [data-theme-mode='light']
          .progress-table-head {
            background-color:
              #f7f7fb !important;

            border-color:
              #dfdfdf !important;
          }


          /*
           * Icons / accordion arrows
           */
          [data-theme-mode='light']
          .progress-icon,
          [data-theme-mode='light']
          .progress-chevron {
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
           * Accordions
           */
          [data-theme-mode='light']
          .progress-accordion:hover {
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
          .progress-accordion-header {
            background-color:
              #ffffff !important;
          }


          /*
           * Borders
           */
          [data-theme-mode='light']
          .progress-theme
          [class~="border-[#2A1B4D]"],
          [data-theme-mode='light']
          .progress-theme
          [class~="border-[#2a1b4d]"],
          [data-theme-mode='light']
          .progress-theme
          [class~="border-[#392461]"],
          [data-theme-mode='light']
          .progress-theme
          [class~="border-[#3A2763]"] {
            border-color:
              #dfdfdf !important;
          }

          [data-theme-mode='light']
          .progress-theme
          [class~="divide-[#2A1B4D]"] {
            border-color:
              #dfdfdf !important;
          }

          [data-theme-mode='light']
          .progress-table-body
          > :not([hidden])
          ~ :not([hidden]) {
            border-color:
              #dfdfdf !important;
          }


          /*
           * Accuracy progress bar
           */
          [data-theme-mode='light']
          .progress-track {
            background-color:
              #e5e1ec !important;
          }


          /*
           * Quiz table hover
           */
          [data-theme-mode='light']
          .progress-table-row:hover {
            background-color:
              rgba(
                122,
                68,
                255,
                0.06
              ) !important;
          }


          /*
           * Quiz score badges
           */
          [data-theme-mode='light']
          .progress-score-good {
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
                0.28
              ) !important;
          }

          [data-theme-mode='light']
          .progress-score-mid {
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
                0.28
              ) !important;
          }

          [data-theme-mode='light']
          .progress-score-low {
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
                0.28
              ) !important;
          }


          /*
           * Status colours
           */
          [data-theme-mode='light']
          .progress-theme
          [class~="text-red-300"] {
            color:
              #b91c1c !important;
          }

          [data-theme-mode='light']
          .progress-theme
          [class~="text-emerald-300"] {
            color:
              #047857 !important;
          }


          /*
           * Activity destructive buttons
           */
          [data-theme-mode='light']
          .progress-delete-button,
          [data-theme-mode='light']
          .progress-clear-button {
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
          .progress-delete-button:hover:not(:disabled),
          [data-theme-mode='light']
          .progress-clear-button:hover:not(:disabled) {
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


          /*
           * Disabled buttons
           */
          [data-theme-mode='light']
          .progress-theme
          button:disabled {
            background-image:
              none !important;

            background-color:
              #e6e3eb !important;

            border-color:
              #dfdfdf !important;

            color:
              #9a96a6 !important;

            box-shadow:
              none !important;
          }


          /*
           * Loading status
           */
          [data-theme-mode='light']
          .progress-loading {
            background-color:
              rgba(
                122,
                68,
                255,
                0.07
              ) !important;

            border-color:
              rgba(
                122,
                68,
                255,
                0.20
              ) !important;
          }

          /*
           * Quiz Performance pagination — light mode
           */
          [data-theme-mode='light']
          .progress-quiz-panel {
            background-color: #ffffff !important;
            border-color: #dfdfdf !important;
            box-shadow: none !important;
          }

          [data-theme-mode='light']
          .progress-quiz-header {
            background-color: #ffffff !important;
            border-color: #e5e1ec !important;
          }

          [data-theme-mode='light']
          .progress-quiz-header h2 {
            color: #171717 !important;
          }

          [data-theme-mode='light']
          .progress-quiz-header p:last-child {
            color: #65676b !important;
          }

          [data-theme-mode='light']
          .progress-quiz-table-head {
            background-color: #f7f7fb !important;
            border-color: #e5e1ec !important;
          }

          [data-theme-mode='light']
          .progress-quiz-table-head th {
            color: #7a7575 !important;
          }

          [data-theme-mode='light']
          .progress-quiz-table-body {
            background-color: #ffffff !important;
          }

          [data-theme-mode='light']
          .progress-quiz-table-body > tr {
            border-color: #e5e1ec !important;
            background-color: #ffffff !important;
          }

          [data-theme-mode='light']
          .progress-quiz-table-row:hover {
            background-color: #f7f3ff !important;
          }

          [data-theme-mode='light']
          .progress-quiz-table-row td:first-child {
            color: #2b2b33 !important;
          }

          [data-theme-mode='light']
          .progress-quiz-table-row td:nth-child(2),
          [data-theme-mode='light']
          .progress-quiz-table-row td:nth-child(4) {
            color: #65676b !important;
          }

          [data-theme-mode='light']
          .progress-quiz-pagination {
            background-color: #ffffff !important;
            border-color: #e5e1ec !important;
          }

          [data-theme-mode='light']
          .progress-quiz-pagination > p {
            color: #7a7575 !important;
          }

          [data-theme-mode='light']
          .progress-quiz-nav-button,
          [data-theme-mode='light']
          .progress-quiz-page-button {
            background-color: #ffffff !important;
            border-color: #d7d3df !important;
            color: #6f42c1 !important;
            box-shadow: none !important;
          }

          [data-theme-mode='light']
          .progress-quiz-nav-button:hover:not(:disabled),
          [data-theme-mode='light']
          .progress-quiz-page-button:hover {
            background-color:
              rgba(122, 68, 255, 0.08) !important;
            border-color:
              rgba(122, 68, 255, 0.55) !important;
            color: #5f30d4 !important;
          }

          [data-theme-mode='light']
          .progress-quiz-page-button[aria-current='page'] {
            background-color: #7a44ff !important;
            border-color: #7a44ff !important;
            color: #ffffff !important;
          }

          [data-theme-mode='light']
          .progress-quiz-nav-button:disabled {
            background-color: #f3f2f6 !important;
            border-color: #e2dfe8 !important;
            color: #aaa5b2 !important;
            opacity: 1 !important;
          }

          /*
           * STUDYA PROGRESS ILLUMINATED SURFACE
           *
           * Major Progress panels only.
           * Quiz pagination, activity controls, filtering,
           * deletion and API behaviour remain unchanged.
           */
          .progress-quiz-panel,
          .progress-accordion {
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
              0 12px 34px rgba(3, 0, 15, 0.24) !important;

            transition:
              background-color 500ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease;
          }


          /*
           * Allow the illumination to show through the
           * major panel headers.
           */
          .progress-quiz-panel >
          .progress-quiz-header,
          .progress-accordion >
          .progress-accordion-header {
            background:
              transparent !important;
          }


          /*
           * Reflective upper edge.
           */
          .progress-quiz-panel::after,
          .progress-accordion::after {
            content: '';
            position: absolute;
            pointer-events: none;
            z-index: 2;

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


          .progress-quiz-panel:hover,
          .progress-accordion:hover {
            border-color:
              rgba(122, 68, 255, 0.34) !important;

            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.085),
              inset 0 0 30px rgba(122, 68, 255, 0.04),
              0 14px 38px rgba(30, 10, 62, 0.28),
              0 0 22px rgba(122, 68, 255, 0.06) !important;
          }


          /*
           * Light mode
           */
          [data-theme-mode='light']
          .progress-quiz-panel,
          [data-theme-mode='light']
          .progress-accordion {
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
              0 10px 28px rgba(61, 44, 92, 0.075) !important;
          }


          [data-theme-mode='light']
          .progress-quiz-panel::after,
          [data-theme-mode='light']
          .progress-accordion::after {
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
          .progress-quiz-panel:hover,
          [data-theme-mode='light']
          .progress-accordion:hover {
            border-color:
              rgba(122, 68, 255, 0.28) !important;

            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 1),
              0 13px 32px rgba(91, 60, 145, 0.10),
              0 0 18px rgba(122, 68, 255, 0.04) !important;
          }
        `}
      </style>


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

          <AnimatedSelect
            id="progress-period"
            value={period}
            disabled={
              loading ||
              !contentVisible
            }
            options={[
              {
                value: 'all',
                label: 'All Time',
              },
              {
                value: 'week',
                label:
                  'This Week',
              },
              {
                value: 'month',
                label:
                  'This Month',
              },
            ]}
            onChange={
              handlePeriodChange
            }
          />
        </div>
      </div>


      {/* Loading */}
      {loading && (
        <div
          className="progress-theme-surface progress-loading mb-5 rounded-lg border border-[#3A2763] bg-[#2A1F46] p-4"
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


      <div
        className={`transition-all duration-300 ease-out ${
          contentVisible
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-2 opacity-0'
        }`}
      >
        {/* Main Statistics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className={cardClass}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#898CC0]">
                  Study Materials
                </p>

                <p className="mt-2 text-3xl font-bold text-white">
                  {
                    stats.uploadedMaterials
                  }
                </p>
              </div>

              <div className="progress-theme-interactive progress-icon flex h-10 w-10 items-center justify-center rounded-lg border border-[#392461] bg-[#251149] text-[#A77BFF]">
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
                  {
                    stats.flashcardsGenerated
                  }
                </p>
              </div>

              <div className="progress-theme-interactive progress-icon flex h-10 w-10 items-center justify-center rounded-lg border border-[#392461] bg-[#251149] text-[#A77BFF]">
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
                  {
                    stats.quizzesCompleted
                  }
                </p>
              </div>

              <div className="progress-theme-interactive progress-icon flex h-10 w-10 items-center justify-center rounded-lg border border-[#392461] bg-[#251149] text-[#A77BFF]">
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

              <div className="progress-theme-interactive progress-icon flex h-10 w-10 items-center justify-center rounded-lg border border-[#392461] bg-[#251149] text-[#A77BFF]">
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
                  {
                    stats.summariesGenerated
                  }
                </p>
              </div>


              <div className={smallCardClass}>
                <p className="text-xs uppercase tracking-wide text-[#595C90]">
                  Study Plans
                </p>

                <p className="mt-1 text-xl font-semibold text-white">
                  {
                    stats.studyPlansCreated
                  }
                </p>
              </div>


              <div className={smallCardClass}>
                <p className="text-xs uppercase tracking-wide text-[#595C90]">
                  Quizzes
                </p>

                <p className="mt-1 text-xl font-semibold text-white">
                  {
                    stats.quizzesGenerated
                  }
                </p>
              </div>


              <div className={smallCardClass}>
                <p className="text-xs uppercase tracking-wide text-[#595C90]">
                  Explanations
                </p>

                <p className="mt-1 text-xl font-semibold text-white">
                  {
                    stats.explanationsGenerated
                  }
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

              <div className="progress-theme-surface progress-track mt-3 h-2 overflow-hidden rounded-full bg-[#120928]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#7A44FF] to-[#D83DFF] transition-all duration-500"
                  style={{
                    width:
                      `${questionAccuracy}%`,
                  }}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className={smallCardClass}>
                  <p className="text-xs uppercase tracking-wide text-[#595C90]">
                    Correct
                  </p>

                  <p className="mt-1 text-xl font-semibold text-white">
                    {progress
                      ?.total_correct ??
                      0}
                  </p>
                </div>

                <div className={smallCardClass}>
                  <p className="text-xs uppercase tracking-wide text-[#595C90]">
                    Questions
                  </p>

                  <p className="mt-1 text-xl font-semibold text-white">
                    {progress
                      ?.total_questions ??
                      0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Quiz Performance */}
        <section className="progress-theme-surface progress-quiz-panel mt-5 overflow-hidden rounded-xl border border-[#2A1B4D] bg-[#160B32]">
          {/* Header */}
          <div className="progress-theme-surface progress-quiz-header border-b border-[#2A1B4D] px-5 py-5">
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


          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="progress-theme-surface progress-table-head progress-quiz-table-head bg-[#120928]/60">
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


              <tbody className="progress-table-body progress-quiz-table-body divide-y divide-[#2A1B4D]">
                {!loading &&
                  quizHistory.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-5 py-8 text-center text-sm text-[#898CC0]"
                      >
                        No quiz attempts found for this time period.
                      </td>
                    </tr>
                  )}


                {paginatedQuizHistory.map(
                  (quiz) => (
                    <tr
                      key={
                        quiz.attempt_id
                      }
                      className="progress-theme-interactive progress-table-row progress-quiz-table-row transition hover:bg-[#211044]"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-[#C2C4E4]">
                        {
                          quiz.quiz_title
                        }
                      </td>

                      <td className="px-5 py-4 text-sm text-[#898CC0]">
                        {
                          quiz.score
                        }
                        /
                        {
                          quiz.total
                        }
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getScoreStyle(
                            quiz.percentage
                          )}`}
                        >
                          {
                            quiz.percentage
                          }
                          %
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-[#898CC0]">
                        {formatDate(
                          quiz.attempted_at
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>


          {/* Pagination */}
          {quizHistory.length > 0 && (
            <div className="progress-theme-surface progress-quiz-pagination flex flex-col gap-3 border-t border-[#2A1B4D] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#898CC0]">
                Showing{' '}
                {
                  firstVisibleQuizAttempt
                }{' '}
                to{' '}
                {
                  lastVisibleQuizAttempt
                }{' '}
                of{' '}
                {
                  quizHistory.length
                }{' '}
                attempts
              </p>


              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setQuizHistoryPage(
                      (
                        current
                      ) =>
                        Math.max(
                          1,
                          current - 1
                        )
                    )
                  }
                  disabled={
                    currentQuizHistoryPage ===
                    1
                  }
                  className="progress-theme-interactive progress-quiz-nav-button rounded-lg border border-[#392461] bg-[#251149] px-3 py-2 text-xs font-medium text-[#C2C4E4] transition duration-300 hover:border-[#7A44FF] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>


                {Array.from(
                  {
                    length:
                      totalQuizHistoryPages,
                  },
                  (
                    _,
                    index
                  ) =>
                    index + 1
                ).map(
                  (pageNumber) => (
                    <button
                      key={
                        pageNumber
                      }
                      type="button"
                      onClick={() =>
                        setQuizHistoryPage(
                          pageNumber
                        )
                      }
                      aria-label={`Go to quiz history page ${pageNumber}`}
                      aria-current={
                        currentQuizHistoryPage ===
                        pageNumber
                          ? 'page'
                          : undefined
                      }
                      className={`progress-theme-interactive progress-quiz-page-button flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition duration-300 ${
                        currentQuizHistoryPage ===
                        pageNumber
                          ? 'border-[#7A44FF] bg-[#7A44FF] text-white'
                          : 'border-[#392461] bg-[#251149] text-[#C2C4E4] hover:border-[#7A44FF] hover:text-white'
                      }`}
                    >
                      {
                        pageNumber
                      }
                    </button>
                  )
                )}


                <button
                  type="button"
                  onClick={() =>
                    setQuizHistoryPage(
                      (
                        current
                      ) =>
                        Math.min(
                          totalQuizHistoryPages,
                          current + 1
                        )
                    )
                  }
                  disabled={
                    currentQuizHistoryPage ===
                    totalQuizHistoryPages
                  }
                  className="progress-theme-interactive progress-quiz-nav-button rounded-lg border border-[#392461] bg-[#251149] px-3 py-2 text-xs font-medium text-[#C2C4E4] transition duration-300 hover:border-[#7A44FF] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Recent Activity */}
        <section className="progress-theme-surface progress-accordion group mt-5 overflow-hidden rounded-xl border border-[#2A1B4D] bg-[#160B32] transition-all duration-300 hover:border-[#7A44FF] hover:shadow-[0_0_24px_rgba(122,68,255,0.28)]">
          <button
            type="button"
            onClick={() =>
              setRecentActivityOpen(
                (current) =>
                  !current
              )
            }
            aria-expanded={
              recentActivityOpen
            }
            aria-controls="recent-activity-content"
            style={{
              backgroundColor:
                '#160B32',
            }}
            className="progress-theme-surface progress-accordion-header relative flex w-full items-center justify-between gap-4 overflow-hidden px-5 py-5 text-left transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-[#7A44FF] after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-[#7A44FF] after:to-[#D83DFF] after:transition-all after:duration-300 group-hover:after:w-full"
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

            <div className="progress-theme-interactive progress-chevron flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[#392461] bg-[#251149] text-[#A77BFF]">
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
            aria-hidden={
              !recentActivityOpen
            }
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
                      selectedActivityIds.length ===
                        0
                    }
                    className="progress-theme-interactive progress-delete-button inline-flex min-w-[150px] items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-300 transition-all duration-300 hover:border-red-400/50 hover:bg-red-500/10 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#3a3150] disabled:text-[#77718d] disabled:shadow-none"
                  >
                    {activityActionLoading &&
                    activityActionType ===
                      'delete-selected' ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="h-4 w-4 animate-spin rounded-full border-2 border-[#77718d]/40 border-t-[#c2c4e4]"
                        />

                        Deleting...
                      </>
                    ) : (
                      `Delete Selected${
                        selectedActivityIds.length >
                        0
                          ? ` (${selectedActivityIds.length})`
                          : ''
                      }`
                    )}
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
                    className="progress-theme-interactive progress-clear-button inline-flex min-w-[170px] items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-[#301127] px-4 py-2 text-sm font-medium text-red-300 transition-all duration-300 hover:bg-[#40142F] focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#3a3150] disabled:text-[#77718d] disabled:shadow-none"
                  >
                    {activityActionLoading &&
                    activityActionType ===
                      'clear-history' ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="h-4 w-4 animate-spin rounded-full border-2 border-[#77718d]/40 border-t-[#c2c4e4]"
                        />

                        Clearing...
                      </>
                    ) : (
                      'Clear Activity History'
                    )}
                  </button>
                </div>


                {activityStatus && (
                  <div
                    className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4"
                    role="status"
                    aria-live="polite"
                  >
                    <p className="text-sm text-emerald-300">
                      {
                        activityStatus
                      }
                    </p>
                  </div>
                )}


                {activityError && (
                  <div
                    className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4"
                    role="alert"
                  >
                    <p className="text-sm text-red-300">
                      {
                        activityError
                      }
                    </p>
                  </div>
                )}


                {recentActivity.length >
                  0 && (
                  <div className="progress-theme-surface progress-subtle-surface mt-4 flex flex-col gap-2 rounded-lg border border-[#2A1B4D] bg-[#120928] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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
                      {
                        selectedActivityIds.length
                      }{' '}
                      selected
                    </span>
                  </div>
                )}


                <div className="mt-3 divide-y divide-[#2A1B4D]">
                  {!loading &&
                    recentActivity.length ===
                      0 && (
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
                          key={
                            activity.activity_id
                          }
                          className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-start gap-3">
                            <input
                              id={`activity-${activityId}`}
                              type="checkbox"
                              checked={
                                isSelected
                              }
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
                                {
                                  activity.detail
                                }
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


                <div className="progress-theme-surface progress-subtle-surface mt-4 rounded-lg border border-[#2A1B4D] bg-[#120928] px-4 py-3">
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
    </div>
  )
}


export default Progress