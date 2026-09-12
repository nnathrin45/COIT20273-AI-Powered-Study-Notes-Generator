import { useEffect, useState } from 'react'
import {
  createStudyPlan,
  getStudyPlans,
  deleteStudyPlan,
} from '../services/studyPlanService'

function StudyPlanner() {
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
  const loadStudyPlans = async () => {
    setPlansLoading(true)
    setPlansError('')

    try {
      const response = await getStudyPlans()

      if (!response.ok) {
        setPlansError(
          response.data?.message ||
            'Unable to load your saved study plans.'
        )
        return
      }

      setSavedPlans(response.data?.plans || [])
    } catch (loadError) {
      console.error('Study plans load error:', loadError)

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

  const days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ]

  // Default suggested study sessions stored with each study plan.
  const mockPlan = [
    {
      id: 1,
      session: 'Session 1',
      activity: 'Review key concepts and definitions',
      duration: '45 minutes',
    },
    {
      id: 2,
      session: 'Session 2',
      activity: 'Study detailed notes and important examples',
      duration: '60 minutes',
    },
    {
      id: 3,
      session: 'Session 3',
      activity: 'Review generated flashcards',
      duration: '30 minutes',
    },
    {
      id: 4,
      session: 'Session 4',
      activity: 'Complete a practice quiz and review mistakes',
      duration: '45 minutes',
    },
  ]

  const handleDayChange = (day) => {
    if (studyDays.includes(day)) {
      setStudyDays(
        studyDays.filter(
          (selectedDay) => selectedDay !== day
        )
      )
    } else {
      setStudyDays([...studyDays, day])
    }

    setGenerated(false)
    setError('')
  }

  const handleGeneratePlan = async (event) => {
  event.preventDefault()

  setError('')
  setSuccess('')
  setSavedPlanId(null)

  if (!subject.trim()) {
    setError('Please enter a subject.')
    setGenerated(false)
    return
  }

  if (!topic.trim()) {
    setError('Please enter a topic or study goal.')
    setGenerated(false)
    return
  }

  if (!deadline) {
    setError('Please select a deadline.')
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

  if (studyDays.length === 0) {
    setError(
      'Please select at least one available study day.'
    )
    setGenerated(false)
    return
  }

  const planData = {
    sessions: mockPlan,
    recommendation:
      'Spread your study sessions across your available days rather than completing all sessions at once. Review difficult concepts again after completing practice questions.',
  }

  try {
    setIsSaving(true)

    const response = await createStudyPlan({
        subject: subject.trim(),
        topic: topic.trim(),
        deadline,
        available_hours: Number(availableHours),
        study_days: studyDays,
        plan_data: planData,
      })

      if (!response.ok) {
        if (response.status === 401) {
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

      setSavedPlanId(response.data?.plan_id ?? null)
      setGenerated(true)
      setSuccess('Study plan created and saved successfully.')

      await loadStudyPlans()

    } catch (saveError) {
      console.error('Study plan save error:', saveError)

      setError(
        'Unable to connect to the server. Please try again.'
      )
      setGenerated(false)
    } finally {
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

    const handleDeletePlan = async (planId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this study plan?'
    )

    if (!confirmed) {
      return
    }

    setPlansError('')
    setPlansSuccess('')
    setDeletingPlanId(planId)

    try {
      const response = await deleteStudyPlan(planId)

      if (!response.ok) {
        if (response.status === 401) {
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

      setSavedPlans((currentPlans) =>
        currentPlans.filter(
          (plan) => plan.plan_id !== planId
        )
      )

      if (savedPlanId === planId) {
        setSavedPlanId(null)
        setGenerated(false)
      }

      setPlansSuccess('Study plan deleted successfully.')
    } catch (deleteError) {
      console.error('Study plan delete error:', deleteError)

      setPlansError(
        'Unable to connect to the server. Please try again.'
      )
    } finally {
      setDeletingPlanId(null)
    }
  }

  const formatStoredDeadline = (storedDeadline) => {
    if (!storedDeadline) {
      return ''
    }

    return new Date(storedDeadline).toLocaleDateString()
  }

  return (
    <div className="mx-auto max-w-5xl">

      {/* Page Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Study Planner
        </h1>

        <p className="mt-2 text-gray-600">
          Create a personalised study schedule based on your
          subject, topics, available time and deadline.
        </p>
      </div>

      {/* Planner Form */}
      <form
        onSubmit={handleGeneratePlan}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-xl font-semibold text-gray-900">
          Study Plan Details
        </h2>

        <div className="mt-6 grid gap-6 md:grid-cols-2">

          {/* Subject */}
          <div>
            <label
              htmlFor="subject"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Subject
            </label>

            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value)
                setGenerated(false)
                setError('')
              }}
              placeholder="e.g. Software Engineering"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Topic */}
          <div>
            <label
              htmlFor="topic"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Topic or Study Goal
            </label>

            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(event) => {
                setTopic(event.target.value)
                setGenerated(false)
                setError('')
              }}
              placeholder="e.g. System Architecture"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Deadline */}
          <div>
            <label
              htmlFor="deadline"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Deadline
            </label>

            <input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(event) => {
                setDeadline(event.target.value)
                setGenerated(false)
                setError('')
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Available Hours */}
          <div>
            <label
              htmlFor="available-hours"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Available Study Hours per Week
            </label>

            <input
              id="available-hours"
              type="number"
              min="1"
              max="168"
              value={availableHours}
              onChange={(event) => {
                setAvailableHours(event.target.value)
                setGenerated(false)
                setError('')
              }}
              placeholder="e.g. 8"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

        </div>

        {/* Available Days */}
        <div className="mt-6">

          <p className="mb-3 block text-sm font-medium text-gray-700">
            Available Study Days
          </p>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">

            {days.map((day) => (
              <label
                key={day}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                  studyDays.includes(day)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={studyDays.includes(day)}
                  onChange={() => handleDayChange(day)}
                  className="h-4 w-4"
                />

                <span className="text-sm font-medium text-gray-700">
                  {day}
                </span>
              </label>
            ))}

          </div>

        </div>

        {/* Planner Error */}
        {error && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* Planner Success */}
        {success && (
          <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-700">
              {success}
              {savedPlanId && (
                <span> Plan ID: {savedPlanId}</span>
              )}
            </p>
          </div>
        )}

        {/* Generate Button */}
        <div className="mt-6 flex justify-end">

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isSaving ? 'Creating...' : 'Create Study Plan'}
          </button>

        </div>

      </form>

      {/* Newly Created Study Plan */}
      {generated && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

          <div className="border-b border-gray-200 pb-5">

            <div className="flex flex-wrap items-center gap-2">

              <h2 className="text-2xl font-semibold text-gray-900">
                Your Saved Study Plan
              </h2>

              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                Saved
              </span>

            </div>

            <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">

              <p>
                <span className="font-medium text-gray-800">
                  Subject:
                </span>{' '}
                {subject}
              </p>

              <p>
                <span className="font-medium text-gray-800">
                  Topic:
                </span>{' '}
                {topic}
              </p>

              <p>
                <span className="font-medium text-gray-800">
                  Deadline:
                </span>{' '}
                {formatDeadline()}
              </p>

              <p>
                <span className="font-medium text-gray-800">
                  Available time:
                </span>{' '}
                {availableHours} hours per week
              </p>

            </div>

          </div>

          {/* Selected Days */}
          <div className="mt-6">

            <h3 className="font-semibold text-gray-900">
              Available Study Days
            </h3>

            <div className="mt-3 flex flex-wrap gap-2">

              {studyDays.map((day) => (
                <span
                  key={day}
                  className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700"
                >
                  {day}
                </span>
              ))}

            </div>

          </div>

          {/* Suggested Schedule */}
          <div className="mt-7">

            <h3 className="text-lg font-semibold text-gray-900">
              Suggested Sessions
            </h3>

            <div className="mt-4 space-y-4">

              {mockPlan.map((session) => (
                <div
                  key={session.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-5"
                >

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                    <div>
                      <p className="font-semibold text-gray-900">
                        {session.session}
                      </p>

                      <p className="mt-1 text-sm text-gray-700">
                        {session.activity}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-white px-3 py-1 text-sm font-medium text-gray-600 shadow-sm">
                      {session.duration}
                    </span>

                  </div>

                </div>
              ))}

            </div>

          </div>

          {/* Study Advice */}
          <div className="mt-7 rounded-lg border border-blue-200 bg-blue-50 p-5">

            <h3 className="font-semibold text-blue-900">
              Study Recommendation
            </h3>

            <p className="mt-2 text-sm leading-6 text-blue-800">
              Spread your study sessions across your available
              days rather than completing all sessions at once.
              Review difficult concepts again after completing
              practice questions.
            </p>

          </div>

        </div>
      )}

      {/* Saved Study Plans */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

        <h2 className="text-2xl font-semibold text-gray-900">
          Saved Study Plans
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          Review study plans saved to your account.
        </p>

        {plansLoading && (
          <p className="mt-5 text-sm text-gray-600">
            Loading saved study plans...
          </p>
        )}

        {plansError && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {plansError}
            </p>
          </div>
        )}

        {plansSuccess && (
          <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-700">
              {plansSuccess}
            </p>
          </div>
        )}

        {!plansLoading &&
          !plansError &&
          savedPlans.length === 0 && (
            <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-5">
              <p className="text-sm text-gray-600">
                You do not have any saved study plans yet.
              </p>
            </div>
          )}

        {!plansLoading &&
          savedPlans.length > 0 && (
            <div className="mt-6 space-y-4">

              {savedPlans.map((plan) => (
                <div
                  key={plan.plan_id}
                  className="rounded-lg border border-gray-200 p-5"
                >

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {plan.subject}
                      </h3>

                      <p className="mt-1 text-sm text-gray-600">
                        {plan.topic}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">

                      <span className="w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Saved
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDeletePlan(plan.plan_id)}
                        disabled={deletingPlanId === plan.plan_id}
                        className="text-sm font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400"
                      >
                        {deletingPlanId === plan.plan_id
                          ? 'Deleting...'
                          : 'Delete'}
                      </button>

                    </div>

                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">

                    <p>
                      <span className="font-medium text-gray-800">
                        Deadline:
                      </span>{' '}
                      {formatStoredDeadline(plan.deadline)}
                    </p>

                    <p>
                      <span className="font-medium text-gray-800">
                        Available time:
                      </span>{' '}
                      {plan.available_hours} hours per week
                    </p>

                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">

                    {(plan.study_days || []).map((day) => (
                      <span
                        key={`${plan.plan_id}-${day}`}
                        className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700"
                      >
                        {day}
                      </span>
                    ))}

                  </div>

                </div>
              ))}

            </div>
          )}

      </div>
    </div>
  )
}

export default StudyPlanner