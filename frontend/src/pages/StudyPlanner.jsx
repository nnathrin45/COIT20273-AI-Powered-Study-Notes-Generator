import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getConsentStatus } from '../services/consentService'

function StudyPlanner() {
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [deadline, setDeadline] = useState('')
  const [availableHours, setAvailableHours] = useState('')
  const [studyDays, setStudyDays] = useState([])
  const [generated, setGenerated] = useState(false)
  const [error, setError] = useState('')

  const [consentStatus, setConsentStatus] = useState(null)
  const [consentInitialLoading, setConsentInitialLoading] =
    useState(true)
  const [consentError, setConsentError] = useState('')

  useEffect(() => {
    const loadConsent = async () => {
      setConsentInitialLoading(true)
      setConsentError('')

      try {
        const response = await getConsentStatus()

        if (!response.ok) {
          if (response.status === 401) {
            setConsentError(
              'Your login session is missing or invalid. Please sign in again.'
            )
          } else {
            setConsentError(
              response.data?.message ||
                'Unable to retrieve your AI consent preference.'
            )
          }

          return
        }

        setConsentStatus(
          response.data?.consent?.status ?? null
        )
      } catch (consentFetchError) {
        console.error(
          'Consent fetch error:',
          consentFetchError
        )

        setConsentError(
          'Unable to connect to the server to retrieve your AI consent preference.'
        )
      } finally {
        setConsentInitialLoading(false)
      }
    }

    loadConsent()
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

  // Temporary mock study plan.
  // This will later be generated using backend/Gemini data.
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

  const handleGeneratePlan = (event) => {
    event.preventDefault()

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

    if (consentStatus !== 'granted') {
      setError(
        'Please grant AI processing consent before generating a study plan.'
      )
      setGenerated(false)
      return
    }

    setError('')
    setGenerated(true)
  }

  const formatDeadline = () => {
    if (!deadline) {
      return ''
    }

    return new Date(
      `${deadline}T00:00:00`
    ).toLocaleDateString()
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

        {/* AI Consent Status */}
        <div className="mt-6">
          {consentInitialLoading ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-700">
                Checking your AI processing consent...
              </p>
            </div>
          ) : consentStatus !== 'granted' ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">

              <p className="font-medium text-amber-900">
                AI processing consent required
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                Grant AI processing consent from your Dashboard
                before generating AI study content.
              </p>

              <Link
                to="/dashboard"
                className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Manage AI Consent
              </Link>

            </div>
          ) : null}
        </div>

        {/* Consent Error */}
        {consentError && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {consentError}
            </p>
          </div>
        )}

        {/* Planner Error */}
        {error && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* Generate Button */}
        <div className="mt-6 flex justify-end">

          <button
            type="submit"
            disabled={
              consentInitialLoading ||
              consentStatus !== 'granted'
            }
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Generate Study Plan
          </button>

        </div>

      </form>

      {/* Generated Study Plan */}
      {generated && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

          <div className="border-b border-gray-200 pb-5">

            <div className="flex flex-wrap items-center gap-2">

              <h2 className="text-2xl font-semibold text-gray-900">
                Your Study Plan
              </h2>

              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                AI Generated
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

          {/* Mock Schedule */}
          <div className="mt-7">

            <h3 className="text-lg font-semibold text-gray-900">
              Recommended Sessions
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

          {/* AI Warning */}
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5">

            <h3 className="font-semibold text-amber-900">
              AI-Generated Content
            </h3>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              This study plan is a recommendation and may not
              account for every academic requirement or personal
              circumstance. Review and adjust the schedule based
              on your actual course requirements and commitments.
            </p>

          </div>

        </div>
      )}

    </div>
  )
}

export default StudyPlanner