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
  const [expandedPlanId, setExpandedPlanId] = useState(null)
  const [generatedPlan, setGeneratedPlan] = useState(null)

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
        weeklyMinutes / selectedDays.length
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

    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dayName = dayNames[currentDate.getDay()]

      if (selectedDays.includes(dayName)) {
        const sessionNumber = sessions.length + 1

        const localDate = [
          currentDate.getFullYear(),
          String(currentDate.getMonth() + 1).padStart(2, '0'),
          String(currentDate.getDate()).padStart(2, '0'),
        ].join('-')

        sessions.push({
          id: sessionNumber,
          day: dayName,
          date: localDate,
          session: `Session ${sessionNumber}`,
          activity:
            activities[
              (sessionNumber - 1) % activities.length
            ],
          duration: `${minutesPerSession} minutes`,
        })
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return {
      sessions,
      recommendation:
        `Study ${topicValue} on your selected study days until ${endDate.toLocaleDateString()}. Aim for approximately ${minutesPerSession} minutes per session and revisit difficult concepts after completing practice questions.`,
    }
  }

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

    const selectedDeadline = new Date(
      `${deadline}T00:00:00`
    )

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDeadline < today) {
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

    if (studyDays.length === 0) {
      setError(
        'Please select at least one available study day.'
      )
      setGenerated(false)
      return
    }

    const planData = buildStudyPlan(
      topic.trim(),
      availableHours,
      studyDays,
      deadline
    )

    if (planData.sessions.length === 0) {
      setError(
        'None of your selected study days occur before the deadline. Please choose a later deadline or different study days.'
      )
      setGenerated(false)
      return
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
      setGeneratedPlan(planData)
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

      if (expandedPlanId === planId) {
        setExpandedPlanId(null)
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

  const parsePlanData = (planData) => {
    if (!planData) {
      return null
    }

    if (typeof planData === 'object') {
      return planData
    }

    try {
      return JSON.parse(planData)
    } catch (parseError) {
      console.error(
        'Unable to parse saved study plan data:',
        parseError
      )

      return null
    }
  }

  return (
    <div className="mx-auto max-w-5xl">

      {/* Page Heading */}
      <div className="mb-8">

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
          Study Management
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-[#f3f0ff]">
          Study Planner
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#898cc0]">
          Create a personalised study schedule based on your
          subject, topics, available time and deadline.
        </p>

      </div>

      {/* Planner Form */}
      <form
        onSubmit={handleGeneratePlan}
        className="rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6 sm:p-7"
      >

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
                d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Zm3 8h3m2 0h3m-8 4h3m2 0h3"
              />
            </svg>

          </div>

          <div>

            <h2 className="text-xl font-semibold text-[#f3f0ff]">
              Study Plan Details
            </h2>

            <p className="mt-1 text-sm text-[#898cc0]">
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
              className="mb-2 block text-sm font-medium text-[#d9d4eb]"
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
              className="w-full rounded-lg border border-[#3a2860] bg-[#120928] px-4 py-3 text-[#d9d4eb] outline-none transition placeholder:text-[#5f5b78] focus:border-[#7a44ff] focus:ring-2 focus:ring-[#7a44ff]/25"
            />

          </div>

          {/* Topic */}
          <div>

            <label
              htmlFor="topic"
              className="mb-2 block text-sm font-medium text-[#d9d4eb]"
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
              className="w-full rounded-lg border border-[#3a2860] bg-[#120928] px-4 py-3 text-[#d9d4eb] outline-none transition placeholder:text-[#5f5b78] focus:border-[#7a44ff] focus:ring-2 focus:ring-[#7a44ff]/25"
            />

          </div>

          {/* Deadline */}
          <div>

            <label
              htmlFor="deadline"
              className="mb-2 block text-sm font-medium text-[#d9d4eb]"
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
              className="w-full rounded-lg border border-[#3a2860] bg-[#120928] px-4 py-3 text-[#d9d4eb] outline-none transition [color-scheme:dark] focus:border-[#7a44ff] focus:ring-2 focus:ring-[#7a44ff]/25"
            />

          </div>

          {/* Available Hours */}
          <div>

            <label
              htmlFor="available-hours"
              className="mb-2 block text-sm font-medium text-[#d9d4eb]"
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
              className="w-full rounded-lg border border-[#3a2860] bg-[#120928] px-4 py-3 text-[#d9d4eb] outline-none transition placeholder:text-[#5f5b78] focus:border-[#7a44ff] focus:ring-2 focus:ring-[#7a44ff]/25"
            />

            <p className="mt-2 text-xs leading-5 text-[#727494]">
              Enter the total number of hours you can study each
              week.
            </p>

          </div>

        </div>

        {/* Available Days */}
        <fieldset className="mt-7">

          <legend className="mb-3 block text-sm font-medium text-[#d9d4eb]">
            Available Study Days
          </legend>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">

            {days.map((day) => {
              const selected = studyDays.includes(day)

              return (
                <label
                  key={day}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                    selected
                      ? 'border-[#7a44ff] bg-[#7a44ff]/15 text-[#f3f0ff]'
                      : 'border-[#2a1b4d] bg-[#120928]/45 text-[#a6a8c7] hover:border-[#7a44ff]/50 hover:bg-[#7a44ff]/10'
                  }`}
                >

                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => handleDayChange(day)}
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
            className="mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
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
                {error}
              </p>

            </div>

          </div>
        )}

        {/* Planner Success */}
        {success && (
          <div
            className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4"
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

              <p className="text-sm leading-6 text-emerald-300">
                {success}
                {savedPlanId && (
                  <span> Plan ID: {savedPlanId}</span>
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
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#9c46ff] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(122,68,255,0.18)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-[#3a3150] disabled:to-[#3a3150] disabled:text-[#77718d] disabled:shadow-none"
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

      {/* Newly Created Study Plan */}
      {generated && (
        <div className="mt-8 overflow-hidden rounded-xl border border-[#2a1b4d] bg-[#160b32]">

          <div className="border-b border-[#2a1b4d] px-6 py-5 sm:px-7">

            <div className="flex flex-wrap items-center gap-3">

              <h2 className="text-2xl font-semibold text-[#f3f0ff]">
                Your Saved Study Plan
              </h2>

              <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                Saved
              </span>

            </div>

            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">

              <div className="rounded-lg border border-[#2a1b4d] bg-[#120928]/45 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-[#727494]">
                  Subject
                </p>
                <p className="mt-1 font-medium text-[#d9d4eb]">
                  {subject}
                </p>
              </div>

              <div className="rounded-lg border border-[#2a1b4d] bg-[#120928]/45 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-[#727494]">
                  Topic
                </p>
                <p className="mt-1 font-medium text-[#d9d4eb]">
                  {topic}
                </p>
              </div>

              <div className="rounded-lg border border-[#2a1b4d] bg-[#120928]/45 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-[#727494]">
                  Deadline
                </p>
                <p className="mt-1 font-medium text-[#d9d4eb]">
                  {formatDeadline()}
                </p>
              </div>

              <div className="rounded-lg border border-[#2a1b4d] bg-[#120928]/45 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-[#727494]">
                  Available Time
                </p>
                <p className="mt-1 font-medium text-[#d9d4eb]">
                  {availableHours} hours per week
                </p>
              </div>

            </div>

          </div>

          <div className="px-6 py-7 sm:px-7">

            {/* Selected Days */}
            <div>

              <h3 className="font-semibold text-[#f3f0ff]">
                Available Study Days
              </h3>

              <div className="mt-3 flex flex-wrap gap-2">

                {studyDays.map((day) => (
                  <span
                    key={day}
                    className="rounded-full border border-[#7a44ff]/25 bg-[#7a44ff]/10 px-3 py-1 text-sm font-medium text-[#c9b4ff]"
                  >
                    {day}
                  </span>
                ))}

              </div>

            </div>

            {/* Suggested Schedule */}
            <div className="mt-7">

              <div className="flex items-center justify-between gap-3">

                <h3 className="text-lg font-semibold text-[#f3f0ff]">
                  Suggested Sessions
                </h3>

                <span className="rounded-full border border-[#2a1b4d] bg-[#120928]/45 px-3 py-1 text-xs font-medium text-[#898cc0]">
                  {generatedPlan?.sessions?.length || 0}{' '}
                  sessions
                </span>

              </div>

              <div className="mt-4 space-y-4">

                {generatedPlan?.sessions?.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-xl border border-[#2a1b4d] bg-[#120928]/45 p-5 transition hover:border-[#7a44ff]/40"
                  >

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <p className="font-semibold text-[#f3f0ff]">
                            {session.session}
                          </p>

                          <span className="rounded-full bg-[#7a44ff]/10 px-2.5 py-1 text-xs font-medium text-[#c9b4ff]">
                            {session.day}
                          </span>

                        </div>

                        <p className="mt-2 text-xs text-[#727494]">
                          {new Date(
                            `${session.date}T00:00:00`
                          ).toLocaleDateString()}
                        </p>

                        <p className="mt-3 text-sm leading-6 text-[#a6a8c7]">
                          {session.activity}
                        </p>

                      </div>

                      <span className="w-fit shrink-0 rounded-full border border-[#3a2860] bg-[#160b32] px-3 py-1.5 text-sm font-medium text-[#c9b4ff]">
                        {session.duration}
                      </span>

                    </div>

                  </div>
                ))}

              </div>

            </div>

            {/* Study Advice */}
            <div className="mt-7 rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 p-5">

              <div className="flex items-start gap-3">

                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#7a44ff]/15 text-[#a97cff]">

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
                      d="M9.5 18h5M10 22h4M8.5 14.5A7 7 0 1 1 15.5 14.5C14.6 15.2 14 16 14 17h-4c0-1-.6-1.8-1.5-2.5Z"
                    />
                  </svg>

                </div>

                <div>

                  <h3 className="font-semibold text-[#d9c9ff]">
                    Study Recommendation
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#b9acd5]">
                    {generatedPlan?.recommendation}
                  </p>

                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* Saved Study Plans */}
      <div className="mt-8 rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6 sm:p-7">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

          <div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
              Your Library
            </p>

            <h2 className="text-2xl font-semibold text-[#f3f0ff]">
              Saved Study Plans
            </h2>

            <p className="mt-2 text-sm text-[#898cc0]">
              Review study plans saved to your account.
            </p>

          </div>

          {!plansLoading && savedPlans.length > 0 && (
            <span className="w-fit rounded-full border border-[#2a1b4d] bg-[#120928]/45 px-3 py-1.5 text-xs font-medium text-[#898cc0]">
              {savedPlans.length}{' '}
              {savedPlans.length === 1 ? 'plan' : 'plans'}
            </span>
          )}

        </div>

        {plansLoading && (
          <div
            className="mt-5 flex items-center gap-3 rounded-lg border border-[#7a44ff]/20 bg-[#7a44ff]/10 p-4"
            role="status"
          >

            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

            <p className="text-sm text-[#c9b4ff]">
              Loading saved study plans...
            </p>

          </div>
        )}

        {plansError && (
          <div
            className="mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
            role="alert"
          >
            <p className="text-sm leading-6 text-red-300">
              {plansError}
            </p>
          </div>
        )}

        {plansSuccess && (
          <div
            className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4"
            role="status"
          >
            <p className="text-sm text-emerald-300">
              {plansSuccess}
            </p>
          </div>
        )}

        {!plansLoading &&
          !plansError &&
          savedPlans.length === 0 && (
            <div className="mt-5 rounded-xl border border-dashed border-[#3a2860] bg-[#120928]/35 p-8 text-center">

              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#7a44ff]/10 text-[#a97cff]">

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

              <p className="mt-4 font-medium text-[#d9d4eb]">
                No saved study plans yet
              </p>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#727494]">
                Create your first plan above and it will appear
                here for future reference.
              </p>

            </div>
          )}

        {!plansLoading &&
          savedPlans.length > 0 && (
            <div className="mt-6 space-y-4">

              {savedPlans.map((plan) => {
                const savedPlanData = parsePlanData(
                  plan.plan_data
                )

                const isExpanded =
                  expandedPlanId === plan.plan_id

                return (
                  <div
                    key={plan.plan_id}
                    className="overflow-hidden rounded-xl border border-[#2a1b4d] bg-[#120928]/35"
                  >

                    <div className="p-5">

                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <h3 className="font-semibold text-[#f3f0ff]">
                              {plan.subject}
                            </h3>

                            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                              Saved
                            </span>

                          </div>

                          <p className="mt-2 text-sm text-[#898cc0]">
                            {plan.topic}
                          </p>

                        </div>

                        <div className="flex flex-wrap items-center gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedPlanId((currentId) =>
                                currentId === plan.plan_id
                                  ? null
                                  : plan.plan_id
                              )
                            }
                            aria-expanded={isExpanded}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#3a2860] bg-[#160b32] px-4 py-2 text-sm font-medium text-[#c9b4ff] transition hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/10"
                          >

                            {isExpanded
                              ? 'Hide Plan'
                              : 'View Plan'}

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
                            onClick={() =>
                              handleDeletePlan(plan.plan_id)
                            }
                            disabled={
                              deletingPlanId === plan.plan_id
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                          >

                            {deletingPlanId === plan.plan_id && (
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-300/30 border-t-red-300" />
                            )}

                            {deletingPlanId === plan.plan_id
                              ? 'Deleting...'
                              : 'Delete'}

                          </button>

                        </div>

                      </div>

                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">

                        <div className="rounded-lg border border-[#2a1b4d] bg-[#160b32]/60 px-4 py-3">
                          <p className="text-xs uppercase tracking-wide text-[#727494]">
                            Deadline
                          </p>
                          <p className="mt-1 font-medium text-[#d9d4eb]">
                            {formatStoredDeadline(plan.deadline)}
                          </p>
                        </div>

                        <div className="rounded-lg border border-[#2a1b4d] bg-[#160b32]/60 px-4 py-3">
                          <p className="text-xs uppercase tracking-wide text-[#727494]">
                            Available Time
                          </p>
                          <p className="mt-1 font-medium text-[#d9d4eb]">
                            {plan.available_hours} hours per week
                          </p>
                        </div>

                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">

                        {(plan.study_days || []).map((day) => (
                          <span
                            key={`${plan.plan_id}-${day}`}
                            className="rounded-full border border-[#7a44ff]/20 bg-[#7a44ff]/10 px-3 py-1 text-sm font-medium text-[#c9b4ff]"
                          >
                            {day}
                          </span>
                        ))}

                      </div>

                    </div>

                    {isExpanded && (
                      <div className="border-t border-[#2a1b4d] bg-[#160b32]/40 p-5 sm:p-6">

                        {savedPlanData?.sessions?.length > 0 ? (
                          <>

                            <div className="flex items-center justify-between gap-3">

                              <h4 className="text-lg font-semibold text-[#f3f0ff]">
                                Suggested Sessions
                              </h4>

                              <span className="rounded-full border border-[#2a1b4d] bg-[#120928]/50 px-3 py-1 text-xs text-[#898cc0]">
                                {savedPlanData.sessions.length}{' '}
                                sessions
                              </span>

                            </div>

                            <div className="mt-4 space-y-4">

                              {savedPlanData.sessions.map((session) => (
                                <div
                                  key={`${plan.plan_id}-${session.id}`}
                                  className="rounded-lg border border-[#2a1b4d] bg-[#120928]/50 p-5"
                                >

                                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                                    <div>

                                      <div className="flex flex-wrap items-center gap-2">

                                        <p className="font-semibold text-[#f3f0ff]">
                                          {session.session}
                                        </p>

                                        {session.day && (
                                          <span className="rounded-full bg-[#7a44ff]/10 px-2.5 py-1 text-xs font-medium text-[#c9b4ff]">
                                            {session.day}
                                          </span>
                                        )}

                                      </div>

                                      {session.date && (
                                        <p className="mt-2 text-xs text-[#727494]">
                                          {new Date(
                                            `${session.date}T00:00:00`
                                          ).toLocaleDateString()}
                                        </p>
                                      )}

                                      <p className="mt-3 text-sm leading-6 text-[#a6a8c7]">
                                        {session.activity}
                                      </p>

                                    </div>

                                    <span className="w-fit shrink-0 rounded-full border border-[#3a2860] bg-[#160b32] px-3 py-1.5 text-sm font-medium text-[#c9b4ff]">
                                      {session.duration}
                                    </span>

                                  </div>

                                </div>
                              ))}

                            </div>

                            {savedPlanData.recommendation && (
                              <div className="mt-5 rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 p-5">

                                <h4 className="font-semibold text-[#d9c9ff]">
                                  Study Recommendation
                                </h4>

                                <p className="mt-2 text-sm leading-6 text-[#b9acd5]">
                                  {savedPlanData.recommendation}
                                </p>

                              </div>
                            )}

                          </>
                        ) : (
                          <p className="text-sm leading-6 text-[#898cc0]">
                            Detailed session information is not
                            available for this saved plan.
                          </p>
                        )}

                      </div>
                    )}

                  </div>
                )
              })}

            </div>
          )}

      </div>

    </div>
  )
}

export default StudyPlanner