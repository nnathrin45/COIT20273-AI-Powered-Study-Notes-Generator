import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  createStudyPlan,
  getStudyPlans,
  deleteStudyPlan,
} from '../services/studyPlanService'


function StudyPlanner() {
  const navigate = useNavigate()
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [deadline, setDeadline] = useState('')
  const [availableHours, setAvailableHours] = useState('')
  const [studyDays, setStudyDays] = useState([])
  const [generated, setGenerated] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [savedPlanId, setSavedPlanId] = useState(null)
  const [savedPlans, setSavedPlans] = useState([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [plansError, setPlansError] = useState('')
  const [plansSuccess, setPlansSuccess] = useState('')
  const [deletingPlanId, setDeletingPlanId] = useState(null)

  const [
    plansPage,
    setPlansPage,
  ] = useState(1)
  const [generatedPlan, setGeneratedPlan] = useState(null)



  /*
   * Keep the successful creation message visible
   * briefly, then remove it automatically.
   */
  useEffect(() => {
    if (!success) {
      return undefined
    }

    const studyPlanSuccessTimer =
      window.setTimeout(() => {
        setSuccess('')
      }, 5000)

    return () => {
      window.clearTimeout(
        studyPlanSuccessTimer
      )
    }
  }, [success])

  /*
   * Saved Study Plans success messages, such as
   * successful deletion, disappear after 5 seconds.
   */
  useEffect(() => {
    if (!plansSuccess) {
      return undefined
    }

    const studyPlansSuccessTimer =
      window.setTimeout(() => {
        setPlansSuccess('')
      }, 5000)

    return () => {
      window.clearTimeout(
        studyPlansSuccessTimer
      )
    }
  }, [plansSuccess])

  const loadStudyPlans = async () => {
    setPlansLoading(true)
    setPlansError('')

    try {
      const response =
        await getStudyPlans()

      if (!response.ok) {
        setPlansError(
          response.data?.message ||
            'Unable to load your saved study plans.'
        )

        return
      }

      setSavedPlans(
        response.data?.plans || []
      )
    } catch (loadError) {
      console.error(
        'Study plans load error:',
        loadError
      )

      setPlansError(
        'Unable to connect to the server to load your study plans.'
      )
    } finally {
      setPlansLoading(false)
    }
  }


  useEffect(() => {
    loadStudyPlans()
  }, [])


  /*
   * Keep the current pagination page valid after
   * a study plan is created or deleted.
   */
  useEffect(() => {
    const totalPages =
      Math.max(
        1,
        Math.ceil(
          savedPlans.length / 4
        )
      )

    setPlansPage(
      (currentPage) =>
        Math.min(
          currentPage,
          totalPages
        )
    )
  }, [savedPlans.length])


  const days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ]


  // Build suggested study sessions from the student's planner inputs.
  const buildStudyPlan = (
    topicValue,
    hoursValue,
    selectedDays,
    deadlineValue
  ) => {
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ]

    const startDate = new Date()
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(
      `${deadlineValue}T00:00:00`
    )

    const weeklyMinutes = Math.round(
      Number(hoursValue) * 60
    )

    const minutesPerSession = Math.max(
      1,
      Math.round(
        weeklyMinutes /
          selectedDays.length
      )
    )

    const activities = [
      `Review the key concepts and definitions for ${topicValue}`,
      `Study detailed notes and examples for ${topicValue}`,
      `Review flashcards and important terms for ${topicValue}`,
      `Complete practice questions for ${topicValue}`,
      `Review difficult concepts and mistakes for ${topicValue}`,
      `Complete a final revision of ${topicValue}`,
    ]

    const sessions = []

    const currentDate =
      new Date(startDate)

    while (
      currentDate <= endDate
    ) {
      const dayName =
        dayNames[
          currentDate.getDay()
        ]

      if (
        selectedDays.includes(
          dayName
        )
      ) {
        const sessionNumber =
          sessions.length + 1

        const localDate = [
          currentDate.getFullYear(),
          String(
            currentDate.getMonth() +
              1
          ).padStart(2, '0'),
          String(
            currentDate.getDate()
          ).padStart(2, '0'),
        ].join('-')

        sessions.push({
          id: sessionNumber,
          day: dayName,
          date: localDate,
          session:
            `Session ${sessionNumber}`,

          activity:
            activities[
              (sessionNumber - 1) %
                activities.length
            ],

          duration:
            `${minutesPerSession} minutes`,
        })
      }

      currentDate.setDate(
        currentDate.getDate() + 1
      )
    }

    return {
      sessions,

      recommendation:
        `Study ${topicValue} on your selected study days until ${endDate.toLocaleDateString()}. Aim for approximately ${minutesPerSession} minutes per session and revisit difficult concepts after completing practice questions.`,
    }
  }


  const handleDayChange = (day) => {
    if (
      studyDays.includes(day)
    ) {
      setStudyDays(
        studyDays.filter(
          (selectedDay) =>
            selectedDay !== day
        )
      )
    } else {
      setStudyDays([
        ...studyDays,
        day,
      ])
    }

    setGenerated(false)
    setError('')
  }


  const handleGeneratePlan =
    async (event) => {
      event.preventDefault()

      setError('')
      setSuccess('')
      setSavedPlanId(null)

      if (!subject.trim()) {
        setError(
          'Please enter a subject.'
        )

        setGenerated(false)

        return
      }

      if (!topic.trim()) {
        setError(
          'Please enter a topic or study goal.'
        )

        setGenerated(false)

        return
      }

      if (!deadline) {
        setError(
          'Please select a deadline.'
        )

        setGenerated(false)

        return
      }

      const selectedDeadline =
        new Date(
          `${deadline}T00:00:00`
        )

      const today = new Date()

      today.setHours(
        0,
        0,
        0,
        0
      )

      if (
        selectedDeadline < today
      ) {
        setError(
          'Please select today or a future date as your deadline.'
        )

        setGenerated(false)

        return
      }

      if (
        !availableHours ||
        Number(availableHours) <= 0
      ) {
        setError(
          'Please enter your available study hours.'
        )

        setGenerated(false)

        return
      }

      if (
        studyDays.length === 0
      ) {
        setError(
          'Please select at least one available study day.'
        )

        setGenerated(false)

        return
      }

      const planData =
        buildStudyPlan(
          topic.trim(),
          availableHours,
          studyDays,
          deadline
        )

      if (
        planData.sessions
          .length === 0
      ) {
        setError(
          'None of your selected study days occur before the deadline. Please choose a later deadline or different study days.'
        )

        setGenerated(false)

        return
      }

      const actionStartedAt =
        Date.now()

      try {
        setIsSaving(true)

        const response =
          await createStudyPlan({
            subject:
              subject.trim(),

            topic:
              topic.trim(),

            deadline,

            available_hours:
              Number(
                availableHours
              ),

            study_days:
              studyDays,

            plan_data:
              planData,
          })

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
                'Unable to create the study plan.'
            )
          }

          setGenerated(false)

          return
        }

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

        setIsSaving(false)

        setSavedPlanId(
          response.data?.plan_id ??
            null
        )

        setGeneratedPlan(
          planData
        )

        setGenerated(true)

        setSuccess(
          'Study plan created and saved successfully.'
        )

        await loadStudyPlans()
      } catch (saveError) {
        console.error(
          'Study plan save error:',
          saveError
        )

        setError(
          'Unable to connect to the server. Please try again.'
        )

        setGenerated(false)
      } finally {
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

        setIsSaving(false)
      }
    }


  const formatDeadline = () => {
    if (!deadline) {
      return ''
    }

    return new Date(
      `${deadline}T00:00:00`
    ).toLocaleDateString()
  }


  const handleDeletePlan =
    async (planId) => {
      const confirmed =
        window.confirm(
          'Are you sure you want to delete this study plan?'
        )

      if (!confirmed) {
        return
      }

      const actionStartedAt =
        Date.now()

      setPlansError('')
      setPlansSuccess('')
      setDeletingPlanId(
        planId
      )

      try {
        const response =
          await deleteStudyPlan(
            planId
          )

        if (!response.ok) {
          if (
            response.status === 401
          ) {
            setPlansError(
              'Your login session is missing or invalid. Please sign in again.'
            )
          } else {
            setPlansError(
              response.data?.message ||
                'Unable to delete the study plan.'
            )
          }

          return
        }

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

        setDeletingPlanId(null)

        setSavedPlans(
          (
            currentPlans
          ) =>
            currentPlans.filter(
              (plan) =>
                plan.plan_id !==
                planId
            )
        )

        if (
          savedPlanId === planId
        ) {
          setSavedPlanId(null)
          setGenerated(false)
        }


        setPlansSuccess(
          'Study plan deleted successfully.'
        )
      } catch (deleteError) {
        console.error(
          'Study plan delete error:',
          deleteError
        )

        setPlansError(
          'Unable to connect to the server. Please try again.'
        )
      } finally {
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

        setDeletingPlanId(null)
      }
    }


  const formatStoredDeadline = (
    storedDeadline
  ) => {
    if (!storedDeadline) {
      return ''
    }

    const value =
      String(
        storedDeadline
      ).trim()

    let parsedDate

    /*
     * A database DATE has no timezone.
     * Construct YYYY-MM-DD values from their
     * calendar components so JavaScript cannot
     * shift them into another day.
     */
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(
        value
      )
    ) {
      const [
        year,
        month,
        day,
      ] =
        value
          .split('-')
          .map(Number)

      parsedDate =
        new Date(
          year,
          month - 1,
          day
        )
    } else {
      /*
       * Some MySQL configurations return DATE
       * values as ISO timestamps. In that case,
       * preserve the instant and display its
       * correct local calendar date.
       */
      parsedDate =
        new Date(value)
    }

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return ''
    }

    return parsedDate.toLocaleDateString()
  }


  const renderDeadlineStatus = (storedDeadline) => {
    if (!storedDeadline) {
      return null
    }

    const value = String(storedDeadline).trim()

    const calendarMatch =
      /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

    const deadlineDate = calendarMatch
      ? new Date(
          Number(calendarMatch[1]),
          Number(calendarMatch[2]) - 1,
          Number(calendarMatch[3])
        )
      : new Date(value)

    if (Number.isNaN(deadlineDate.getTime())) {
      return null
    }

    // Compare calendar days, not hours or minutes.
    deadlineDate.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const overdue = deadlineDate < today

    return (
      <span
        data-overdue={overdue ? 'true' : 'false'}
        className={`study-planner-deadline-status ml-2 inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 align-middle text-[11px] font-semibold ${
          overdue
            ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
            : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
        }`}
      >
        {overdue ? 'Overdue' : 'Active'}
      </span>
    )
  }

  const parsePlanData = (
    planData
  ) => {
    if (!planData) {
      return null
    }

    if (
      typeof planData ===
      'object'
    ) {
      return planData
    }

    try {
      return JSON.parse(
        planData
      )
    } catch (parseError) {
      console.error(
        'Unable to parse saved study plan data:',
        parseError
      )

      return null
    }
  }


  const PLANS_PER_PAGE = 4

  const totalPlanPages =
    Math.max(
      1,
      Math.ceil(
        savedPlans.length /
          PLANS_PER_PAGE
      )
    )

  const currentPlanPage =
    Math.min(
      plansPage,
      totalPlanPages
    )

  const firstPlanIndex =
    (
      currentPlanPage - 1
    ) * PLANS_PER_PAGE

  const paginatedPlans =
    savedPlans.slice(
      firstPlanIndex,
      firstPlanIndex +
        PLANS_PER_PAGE
    )

  const firstPlanNumber =
    savedPlans.length === 0
      ? 0
      : firstPlanIndex + 1

  const lastPlanNumber =
    Math.min(
      firstPlanIndex +
        PLANS_PER_PAGE,
      savedPlans.length
    )

  return (
    <div className="study-planner-theme mx-auto w-full max-w-[1660px]">
      <style>
        {`
          .study-planner-theme-text {
            transition:
              color 100ms ease;
          }

          .study-planner-theme-surface {
            transition:
              background-color 500ms ease,
              border-color 500ms ease,
              box-shadow 300ms ease;
          }

          .study-planner-theme-interactive {
            transition:
              color 100ms ease,
              background-color 300ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease,
              opacity 300ms ease,
              filter 300ms ease;
          }

          .study-planner-theme-border {
            transition:
              border-color 500ms ease;
          }


          [data-theme-mode='light']
          .study-planner-heading {
            color:
              #171717 !important;
          }

          [data-theme-mode='light']
          .study-planner-body {
            color:
              #65676b !important;
          }

          [data-theme-mode='light']
          .study-planner-muted {
            color:
              #7a7575 !important;
          }

          [data-theme-mode='light']
          .study-planner-accent {
            color:
              #7a44ff !important;
          }

          [data-theme-mode='light']
          .study-planner-accent-soft {
            color:
              #6f42c1 !important;
          }


          /*
           * Main white surfaces
           */
          [data-theme-mode='light']
          .study-planner-surface {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;
          }


          /*
           * Inputs
           */
          [data-theme-mode='light']
          .study-planner-input {
            background-color:
              #ffffff !important;

            border-color:
              #d7d3df !important;

            color:
              #2b2b33 !important;
          }

          [data-theme-mode='light']
          .study-planner-input::placeholder {
            color:
              #8a8793 !important;
          }

          [data-theme-mode='light']
          .study-planner-input:hover {
            border-color:
              rgba(
                122,
                68,
                255,
                0.55
              ) !important;
          }

          [data-theme-mode='light']
          .study-planner-input:focus {
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
          .study-planner-date {
            color-scheme:
              light !important;
          }


          /*
           * Study day choices
           */
          [data-theme-mode='light']
          .study-planner-day-default {
            background-color:
              #f7f7fb !important;

            border-color:
              #dfdfdf !important;

            color:
              #65676b !important;
          }

          [data-theme-mode='light']
          .study-planner-day-default:hover {
            background-color:
              rgba(
                122,
                68,
                255,
                0.06
              ) !important;

            border-color:
              rgba(
                122,
                68,
                255,
                0.5
              ) !important;

            color:
              #171717 !important;
          }

          [data-theme-mode='light']
          .study-planner-day-selected {
            background-color:
              rgba(
                122,
                68,
                255,
                0.10
              ) !important;

            border-color:
              #7a44ff !important;

            color:
              #4c248f !important;
          }


          /*
           * Status messages
           */
          [data-theme-mode='light']
          .study-planner-error-text {
            color:
              #b91c1c !important;
          }

          [data-theme-mode='light']
          .study-planner-success-text {
            color:
              #047857 !important;
          }


          /*
           * Create button
           */
          [data-theme-mode='light']
          .study-planner-create-button:disabled {
            background-image:
              none !important;

            background-color:
              #e6e3eb !important;

            color:
              #9a96a6 !important;

            box-shadow:
              none !important;
          }


          /*
           * Saved / success badges
           */
          [data-theme-mode='light']
          .study-planner-saved-badge {
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


          /*
           * Detail panels
           */
          [data-theme-mode='light']
          .study-planner-detail-card {
            background-color:
              #f7f7fb !important;

            border-color:
              #dfdfdf !important;
          }


          [data-theme-mode='light']
          .study-planner-day-badge {
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
                0.18
              ) !important;
          }


          /*
           * Session count
           */
          [data-theme-mode='light']
          .study-planner-count-badge {
            background-color:
              #f7f7fb !important;

            border-color:
              #dfdfdf !important;

            color:
              #65676b !important;
          }


          /*
           * Session cards
           */
          [data-theme-mode='light']
          .study-planner-session-card {
            background-color:
              #f7f7fb !important;

            border-color:
              #dfdfdf !important;
          }

          [data-theme-mode='light']
          .study-planner-session-card:hover {
            border-color:
              rgba(
                122,
                68,
                255,
                0.4
              ) !important;
          }


          [data-theme-mode='light']
          .study-planner-duration {
            background-color:
              #ffffff !important;

            border-color:
              #d7d3df !important;

            color:
              #6f42c1 !important;
          }


          /*
           * Recommendation box
           */
          [data-theme-mode='light']
          .study-planner-recommendation {
            background-color:
              rgba(
                122,
                68,
                255,
                0.06
              ) !important;

            border-color:
              rgba(
                122,
                68,
                255,
                0.20
              ) !important;
          }

          [data-theme-mode='light']
          .study-planner-recommendation-heading {
            color:
              #6f42c1 !important;
          }

          [data-theme-mode='light']
          .study-planner-recommendation-body {
            color:
              #65676b !important;
          }


          /*
           * Saved Plans main accordion
           */
          [data-theme-mode='light']
          .study-planner-library {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;
          }

          [data-theme-mode='light']
          .study-planner-library:hover {
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
          .study-planner-chevron {
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
           * Empty state
           */
          [data-theme-mode='light']
          .study-planner-empty {
            background-color:
              #f7f7fb !important;

            border-color:
              #c9c9d3 !important;
          }


          /*
           * Stored plan card
           */
          [data-theme-mode='light']
          .study-planner-stored-plan {
            background-color:
              #f7f7fb !important;

            border-color:
              #dfdfdf !important;
          }


          /*
           * View plan button
           */
          [data-theme-mode='light']
          .study-planner-view-button {
            background-color:
              #ffffff !important;

            border-color:
              #d7d3df !important;

            color:
              #6f42c1 !important;
          }

          [data-theme-mode='light']
          .study-planner-view-button:hover {
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
           * Delete button
           */
          [data-theme-mode='light']
          .study-planner-delete-button {
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
          .study-planner-delete-button:hover:not(:disabled) {
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
          .study-planner-delete-button:disabled {
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
           * Expanded stored-plan content
           */
          [data-theme-mode='light']
          .study-planner-expanded {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;
          }


          [data-theme-mode='light']
          .study-planner-expanded-session {
            background-color:
              #f7f7fb !important;

            border-color:
              #dfdfdf !important;
          }

          /* Saved Study Plans staggered cascade */
          @keyframes studya-planner-page-enter {
            from {
              opacity: 0;
              transform: translateY(9px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .study-planner-plan-row {
            animation:
              studya-planner-page-enter 240ms
              cubic-bezier(0.22, 1, 0.36, 1) both;
          }

          .study-planner-plan-row:nth-child(2) {
            animation-delay: 50ms;
          }

          .study-planner-plan-row:nth-child(3) {
            animation-delay: 100ms;
          }

          .study-planner-plan-row:nth-child(4) {
            animation-delay: 150ms;
          }

          @media (prefers-reduced-motion: reduce) {
            .study-planner-plan-row {
              animation: none;
            }
          }
          [data-theme-mode='light']
          .study-planner-deadline-status[data-overdue='true'] {
            color: #92400e !important;
            background-color: #fffbeb !important;
            border-color: #fcd34d !important;
          }

          [data-theme-mode='light']
          .study-planner-deadline-status[data-overdue='false'] {
            color: #065f46 !important;
            background-color: #ecfdf5 !important;
            border-color: #a7f3d0 !important;
          }

          /*
           * Saved Study Plans table
           */
          [data-theme-mode='light']
          .study-planner-plan-table-header {
            background-color:
              #f7f7fb !important;

            border-color:
              #dfdfdf !important;
          }


          [data-theme-mode='light']
          .study-planner-plan-table-header th {
            color:
              #77717e !important;
          }


          [data-theme-mode='light']
          .study-planner-plan-row {
            border-color:
              #e7e5eb !important;

            transition:
              background-color 300ms ease;
          }


          [data-theme-mode='light']
          .study-planner-plan-row:hover {
            background-color:
              #faf8ff !important;
          }


          [data-theme-mode='light']
          .study-planner-plan-icon,
          [data-theme-mode='light']
          .study-planner-hours-badge {
            background-color:
              #f2edff !important;

            border-color:
              #d8caff !important;

            color:
              #6f42c1 !important;
          }


          [data-theme-mode='light']
          .study-planner-pagination {
            border-color:
              #dfdfdf !important;
          }


          [data-theme-mode='light']
          .study-planner-pagination-button {
            background-color:
              #ffffff !important;

            border-color:
              #d7d3df !important;

            color:
              #6f42c1 !important;
          }


          [data-theme-mode='light']
          .study-planner-pagination-button:hover:not(:disabled) {
            background-color:
              #f2edff !important;

            border-color:
              #9d7cff !important;
          }


          [data-theme-mode='light']
          .study-planner-pagination-button[aria-current='page'] {
            background-color:
              #7a44ff !important;

            border-color:
              #7a44ff !important;

            color:
              #ffffff !important;
          }


          /*
           * STUDYA STUDY PLANNER ILLUMINATED SURFACE
           *
           * Visual enhancement only.
           * Plan creation, validation, saved plans,
           * pagination, deletion and reminders are unchanged.
           */
          .study-planner-surface {
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
              box-shadow 300ms ease;
          }


          /*
           * Reflective upper edge.
           */
          .study-planner-surface::after {
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


          .study-planner-surface:hover {
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
          .study-planner-surface {
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
          .study-planner-surface::after {
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
          .study-planner-surface:hover {
            border-color:
              rgba(122, 68, 255, 0.28) !important;

            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 1),
              0 13px 32px rgba(91, 60, 145, 0.10),
              0 0 18px rgba(122, 68, 255, 0.04);
          }
`}
      </style>


      {/* Page Heading */}
      <div className="mb-8">
        <p className="study-planner-theme-text study-planner-accent mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
          Study Management
        </p>

        <h1 className="study-planner-theme-text study-planner-heading text-3xl font-bold tracking-tight text-[#f3f0ff]">
          Study Planner
        </h1>

        <p className="study-planner-theme-text study-planner-body mt-2 max-w-3xl text-sm leading-6 text-[#898cc0]">
          Create a personalised study schedule based on your
          subject, topics, available time and deadline.
        </p>
      </div>


      {/* Planner Form */}
      <form
        onSubmit={
          handleGeneratePlan
        }
        className="study-planner-theme-surface study-planner-surface rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6 sm:p-7"
      >
        <div className="flex items-start gap-3">
          <div className="study-planner-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">
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
                d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Zm3 8h3m2 0h3m-8 4h3m2 0h3"
              />
            </svg>
          </div>

          <div>
            <h2 className="study-planner-theme-text study-planner-heading text-xl font-semibold text-[#f3f0ff]">
              Study Plan Details
            </h2>

            <p className="study-planner-theme-text study-planner-body mt-1 text-sm text-[#898cc0]">
              Tell us what you need to study and when you are
              available.
            </p>
          </div>
        </div>


        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Subject */}
          <div>
            <label
              htmlFor="subject"
              className="study-planner-theme-text study-planner-heading mb-2 block text-sm font-medium text-[#d9d4eb]"
            >
              Subject
            </label>

            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(event) => {
                setSubject(
                  event.target.value
                )

                setGenerated(false)
                setError('')
              }}
              placeholder="e.g. Software Engineering"
              className="study-planner-input w-full rounded-lg border border-[#3a2860] bg-[#120928] px-4 py-3 text-[#d9d4eb] outline-none transition placeholder:text-[#5f5b78] focus:border-[#7a44ff] focus:ring-2 focus:ring-[#7a44ff]/25"
            />
          </div>


          {/* Topic */}
          <div>
            <label
              htmlFor="topic"
              className="study-planner-theme-text study-planner-heading mb-2 block text-sm font-medium text-[#d9d4eb]"
            >
              Topic or Study Goal
            </label>

            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(event) => {
                setTopic(
                  event.target.value
                )

                setGenerated(false)
                setError('')
              }}
              placeholder="e.g. System Architecture"
              className="study-planner-input w-full rounded-lg border border-[#3a2860] bg-[#120928] px-4 py-3 text-[#d9d4eb] outline-none transition placeholder:text-[#5f5b78] focus:border-[#7a44ff] focus:ring-2 focus:ring-[#7a44ff]/25"
            />
          </div>


          {/* Deadline */}
          <div>
            <label
              htmlFor="deadline"
              className="study-planner-theme-text study-planner-heading mb-2 block text-sm font-medium text-[#d9d4eb]"
            >
              Deadline
            </label>

            <input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(event) => {
                setDeadline(
                  event.target.value
                )

                setGenerated(false)
                setError('')
              }}
              className="study-planner-input study-planner-date w-full rounded-lg border border-[#3a2860] bg-[#120928] px-4 py-3 text-[#d9d4eb] outline-none transition [color-scheme:dark] focus:border-[#7a44ff] focus:ring-2 focus:ring-[#7a44ff]/25"
            />
          </div>


          {/* Available Hours */}
          <div>
            <label
              htmlFor="available-hours"
              className="study-planner-theme-text study-planner-heading mb-2 block text-sm font-medium text-[#d9d4eb]"
            >
              Available Study Hours per Week
            </label>

            <input
              id="available-hours"
              type="number"
              min="1"
              max="168"
              value={
                availableHours
              }
              onChange={(event) => {
                setAvailableHours(
                  event.target.value
                )

                setGenerated(false)
                setError('')
              }}
              placeholder="e.g. 8"
              className="study-planner-input w-full rounded-lg border border-[#3a2860] bg-[#120928] px-4 py-3 text-[#d9d4eb] outline-none transition placeholder:text-[#5f5b78] focus:border-[#7a44ff] focus:ring-2 focus:ring-[#7a44ff]/25"
            />

            <p className="study-planner-theme-text study-planner-muted mt-2 text-xs leading-5 text-[#727494]">
              Enter the total number of hours you can study each
              week.
            </p>
          </div>
        </div>


        {/* Available Days */}
        <fieldset className="mt-7">
          <legend className="study-planner-theme-text study-planner-heading mb-3 block text-sm font-medium text-[#d9d4eb]">
            Available Study Days
          </legend>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {days.map((day) => {
              const selected =
                studyDays.includes(
                  day
                )

              return (
                <label
                  key={day}
                  className={`study-planner-theme-interactive flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                    selected
                      ? 'study-planner-day-selected border-[#7a44ff] bg-[#7a44ff]/15 text-[#f3f0ff]'
                      : 'study-planner-day-default border-[#2a1b4d] bg-[#120928]/45 text-[#a6a8c7] hover:border-[#7a44ff]/50 hover:bg-[#7a44ff]/10'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={
                      selected
                    }
                    onChange={() =>
                      handleDayChange(
                        day
                      )
                    }
                    className="h-4 w-4 accent-[#7a44ff]"
                  />

                  <span className="text-sm font-medium">
                    {day}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>


        {/* Planner Error */}
        {error && (
          <div
            className="study-planner-theme-surface mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
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

              <p className="study-planner-theme-text study-planner-error-text text-sm leading-6 text-red-300">
                {error}
              </p>
            </div>
          </div>
        )}


        {/* Planner Success */}
        {success && (
          <div
            className="study-planner-theme-surface mt-5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4"
            role="status"
          >
            <div className="flex items-start gap-3">
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

              <p className="study-planner-theme-text study-planner-success-text text-sm leading-6 text-emerald-300">
                {success}

                {savedPlanId && (
                  <span>
                    {' '}
                    Plan ID:{' '}
                    {savedPlanId}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}


        {/* Generate Button */}
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="study-planner-create-button inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#9c46ff] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(122,68,255,0.18)] transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:from-[#3a3150] disabled:to-[#3a3150] disabled:text-[#77718d] disabled:shadow-none"
          >
            {isSaving && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}

            {isSaving
              ? 'Creating...'
              : 'Create Study Plan'}
          </button>
        </div>
      </form>


      {/* Saved Study Plans */}
      <section className="study-planner-theme-surface study-planner-surface study-planner-library mt-8 overflow-hidden rounded-xl border border-[#2a1b4d] bg-[#160b32]">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-[#2a1b4d] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <p className="study-planner-theme-text study-planner-accent mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
              Your Library
            </p>

            <h2 className="study-planner-theme-text study-planner-heading text-xl font-semibold text-[#f3f0ff]">
              Saved Study Plans
            </h2>

            <p className="study-planner-theme-text study-planner-body mt-1 text-sm text-[#898cc0]">
              Review and manage study plans saved to your account.
            </p>
          </div>

          {!plansLoading && (
            <span className="study-planner-theme-surface study-planner-count-badge w-fit rounded-full border border-[#2a1b4d] bg-[#120928]/45 px-3 py-1.5 text-xs font-medium text-[#898cc0]">
              {savedPlans.length}{' '}
              {savedPlans.length === 1
                ? 'plan'
                : 'plans'}
            </span>
          )}
        </div>


        {/* Loading */}
        {plansLoading && (
          <div
            className="m-6 flex items-center gap-3 rounded-lg border border-[#7a44ff]/20 bg-[#7a44ff]/10 p-4"
            role="status"
          >
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

            <p className="study-planner-theme-text study-planner-accent-soft text-sm text-[#c9b4ff]">
              Loading saved study plans...
            </p>
          </div>
        )}


        {/* Error */}
        {plansError && (
          <div
            className="m-6 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
            role="alert"
          >
            <p className="study-planner-theme-text study-planner-error-text text-sm leading-6 text-red-300">
              {plansError}
            </p>
          </div>
        )}


        {/* Success */}
        {plansSuccess && (
          <div
            className="m-6 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4"
            role="status"
          >
            <p className="study-planner-theme-text study-planner-success-text text-sm text-emerald-300">
              {plansSuccess}
            </p>
          </div>
        )}


        {/* Empty */}
        {!plansLoading &&
          !plansError &&
          savedPlans.length === 0 && (
            <div className="study-planner-empty m-6 rounded-xl border border-dashed border-[#3a2860] bg-[#120928]/35 p-8 text-center">
              <div className="study-planner-accent mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#7a44ff]/10 text-[#a97cff]">
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
                    d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"
                  />
                </svg>
              </div>

              <p className="study-planner-theme-text study-planner-heading mt-4 font-medium text-[#d9d4eb]">
                No saved study plans yet
              </p>

              <p className="study-planner-theme-text study-planner-muted mx-auto mt-2 max-w-md text-sm leading-6 text-[#727494]">
                Create your first plan above and it will appear here for future reference.
              </p>
            </div>
          )}


        {/* Table */}
        {!plansLoading &&
          !plansError &&
          savedPlans.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="study-planner-plan-table w-full min-w-[1000px] border-collapse text-left">
                  <thead>
                    <tr className="study-planner-plan-table-header border-b border-[#2a1b4d] bg-[#120928]/55">
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#727494]">
                        Subject
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#727494]">
                        Topic / Goal
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#727494]">
                        Deadline
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#727494]">
                        Hours / Week
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#727494]">
                        Created
                      </th>

                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-[#727494]">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedPlans.map(
                      (plan) => (
                        <tr
                          key={`${currentPlanPage}-${plan.plan_id}`}
                                                    onClick={() =>
                            navigate(
                              `/study-plan/${plan.plan_id}`
                            )
                          }
                          onKeyDown={(event) => {
                            if (
                              event.target !==
                              event.currentTarget
                            ) {
                              return
                            }

                            if (
                              event.key ===
                                'Enter' ||
                              event.key ===
                                ' '
                            ) {
                              event.preventDefault()

                              navigate(
                                `/study-plan/${plan.plan_id}`
                              )
                            }
                          }}
                          role="link"
                          tabIndex={0}
                          aria-label={`Open ${plan.subject} study plan`}
                          className="study-planner-plan-row cursor-pointer border-b border-[#2a1b4d]/70 outline-none last:border-b-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7a44ff]/60"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="study-planner-plan-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#7a44ff]/20 bg-[#7a44ff]/10 text-[#a97cff]">
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
                                    d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"
                                  />
                                </svg>
                              </div>

                              <div className="min-w-0">
                                <p className="study-planner-theme-text study-planner-heading max-w-[220px] truncate text-sm font-semibold text-[#f3f0ff]">
                                  {plan.subject}
                                </p>

                                <p className="study-planner-theme-text study-planner-muted mt-0.5 text-xs text-[#727494]">
                                  Plan #{plan.plan_id}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p
                              title={plan.topic}
                              className="study-planner-theme-text study-planner-body max-w-[280px] truncate text-sm text-[#a6a8c7]"
                            >
                              {plan.topic}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span className="study-planner-theme-text study-planner-heading whitespace-nowrap text-sm text-[#d9d4eb]">
                              {formatStoredDeadline(
                                plan.deadline
                              ) || '—'}
                            </span>
                            {renderDeadlineStatus(plan.deadline)}
                          </td>

                          <td className="px-5 py-4">
                            <span className="study-planner-hours-badge inline-flex rounded-full border border-[#7a44ff]/20 bg-[#7a44ff]/10 px-2.5 py-1 text-xs font-semibold text-[#c9b4ff]">
                              {plan.available_hours ??
                                '—'}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span className="study-planner-theme-text study-planner-body whitespace-nowrap text-sm text-[#a6a8c7]">
                              {plan.created_at
                                ? new Date(
                                    plan.created_at
                                  ).toLocaleDateString()
                                : '—'}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()

                                  handleDeletePlan(
                                    plan.plan_id
                                  )
                                }}
                                disabled={
                                  deletingPlanId ===
                                  plan.plan_id
                                }
                                title={`Delete ${plan.subject}`}
                                aria-label={`Delete ${plan.subject} study plan`}
                                className="study-planner-theme-interactive study-planner-delete-button inline-flex h-9 min-w-[96px] items-center justify-center gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 text-sm font-medium text-red-300 hover:border-red-400/50 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#3a3150] disabled:text-[#77718d] disabled:shadow-none"
                              >
                                {deletingPlanId ===
                                plan.plan_id ? (
                                  <>
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />

                                    Deleting
                                  </>
                                ) : (
                                  <>
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
                                        d="M6 7h12M9 7V5h6v2M8 7l1 13h6l1-13M10.5 11v5M13.5 11v5"
                                      />
                                    </svg>

                                    Delete
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>


              {/* Pagination */}
              <div className="study-planner-pagination flex flex-col gap-3 border-t border-[#2a1b4d] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="study-planner-theme-text study-planner-body text-sm text-[#898cc0]">
                  Showing{' '}
                  <span className="study-planner-theme-text study-planner-heading font-semibold text-[#d9d4eb]">
                    {firstPlanNumber}
                  </span>{' '}
                  to{' '}
                  <span className="study-planner-theme-text study-planner-heading font-semibold text-[#d9d4eb]">
                    {lastPlanNumber}
                  </span>{' '}
                  of{' '}
                  <span className="study-planner-theme-text study-planner-heading font-semibold text-[#d9d4eb]">
                    {savedPlans.length}
                  </span>{' '}
                  plans
                </p>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setPlansPage(
                        (currentPage) =>
                          Math.max(
                            1,
                            currentPage - 1
                          )
                      )
                    }
                    disabled={
                      currentPlanPage === 1
                    }
                    className="study-planner-pagination-button rounded-lg border border-[#3a2860] bg-[#120928]/60 px-3 py-2 text-xs font-medium text-[#c9b4ff] transition duration-300 hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  {Array.from(
                    {
                      length:
                        totalPlanPages,
                    },
                    (_, index) =>
                      index + 1
                  ).map(
                    (pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() =>
                          setPlansPage(
                            pageNumber
                          )
                        }
                        aria-current={
                          currentPlanPage ===
                          pageNumber
                            ? 'page'
                            : undefined
                        }
                        className={`study-planner-pagination-button flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition duration-300 ${
                          currentPlanPage ===
                          pageNumber
                            ? 'border-[#7a44ff] bg-[#7a44ff] text-white'
                            : 'border-[#3a2860] bg-[#120928]/60 text-[#c9b4ff] hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/10'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setPlansPage(
                        (currentPage) =>
                          Math.min(
                            totalPlanPages,
                            currentPage + 1
                          )
                      )
                    }
                    disabled={
                      currentPlanPage ===
                      totalPlanPages
                    }
                    className="study-planner-pagination-button rounded-lg border border-[#3a2860] bg-[#120928]/60 px-3 py-2 text-xs font-medium text-[#c9b4ff] transition duration-300 hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
      </section>

    </div>
  )
}


export default StudyPlanner