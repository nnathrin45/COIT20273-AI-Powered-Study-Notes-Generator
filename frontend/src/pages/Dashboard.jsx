import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import AIConsent from '../components/AIConsent'
import {
  getConsentStatus,
  updateConsentStatus,
} from '../services/consentService'
import { getProgress } from '../services/progressService'

function Dashboard() {
  const [consentStatus, setConsentStatus] = useState(null)
  const [consentRecordedAt, setConsentRecordedAt] =
    useState(null)

  const [
    consentInitialLoading,
    setConsentInitialLoading,
  ] = useState(true)

  const [consentLoading, setConsentLoading] =
    useState(false)

  const [consentError, setConsentError] = useState('')

  const [progress, setProgress] = useState(null)
  const [progressLoading, setProgressLoading] =
    useState(true)

  const [progressError, setProgressError] = useState('')

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

        setConsentRecordedAt(
          response.data?.consent?.recorded_at ?? null
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

  useEffect(() => {
    const loadProgress = async () => {
      setProgressLoading(true)
      setProgressError('')

      try {
        const response = await getProgress('all')

        if (!response.ok) {
          if (response.status === 401) {
            setProgressError(
              'Your login session is missing or invalid. Please sign in again.'
            )
          } else {
            setProgressError(
              response.data?.message ||
                'Unable to load your dashboard statistics.'
            )
          }

          return
        }

        setProgress(
          response.data?.progress || null
        )
      } catch (progressLoadError) {
        console.error(
          'Dashboard progress load error:',
          progressLoadError
        )

        setProgressError(
          'Unable to connect to the server to load your dashboard statistics.'
        )
      } finally {
        setProgressLoading(false)
      }
    }

    loadProgress()
  }, [])

  const handleConsentChange = async (newStatus) => {
    setConsentLoading(true)
    setConsentError('')

    try {
      const response =
        await updateConsentStatus(newStatus)

      if (!response.ok) {
        if (response.status === 401) {
          setConsentError(
            'Your login session is missing or invalid. Please sign in again.'
          )
        } else {
          setConsentError(
            response.data?.message ||
              'Unable to update your AI consent preference.'
          )
        }

        return
      }

      setConsentStatus(
        response.data?.consent?.status ?? newStatus
      )

      const latestResponse =
        await getConsentStatus()

      if (
        latestResponse.ok &&
        latestResponse.data?.consent
      ) {
        setConsentStatus(
          latestResponse.data.consent.status
        )

        setConsentRecordedAt(
          latestResponse.data.consent.recorded_at ??
            null
        )
      }
    } catch (consentUpdateError) {
      console.error(
        'Consent update error:',
        consentUpdateError
      )

      setConsentError(
        'Unable to connect to the server to update your AI consent preference.'
      )
    } finally {
      setConsentLoading(false)
    }
  }

  const statsUnavailable =
    progressLoading || Boolean(progressError)

  const stats = [
    {
      title: 'Study Materials',
      value: statsUnavailable
        ? '-'
        : progress?.total_files ?? 0,
      description: 'Uploaded documents',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 3h9l3 3v15H6V3Zm9 0v4h4M9 11h6M9 15h6"
        />
      ),
    },
    {
      title: 'Flashcards',
      value: statsUnavailable
        ? '-'
        : progress?.flashcards_generated ?? 0,
      description: 'Generated study sets',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 5h12a2 2 0 0 1 2 2v10H7a2 2 0 0 1-2-2V5Zm2 12v2h12"
        />
      ),
    },
    {
      title: 'Quizzes Completed',
      value: statsUnavailable
        ? '-'
        : progress?.total_quiz_attempts ?? 0,
      description: 'Practice attempts',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 3h8a2 2 0 0 1 2 2v16H6V5a2 2 0 0 1 2-2Zm2 5h4m-4 4h4m-4 4h2"
        />
      ),
    },
    {
      title: 'Average Score',
      value: statsUnavailable
        ? '-'
        : `${progress?.average_percentage ?? 0}%`,
      description: 'Quiz performance',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 19V9m5 10V5m5 14v-7m5 7V3"
        />
      ),
    },
  ]

  const quickActions = [
    {
      title: 'Upload Study Material',
      description:
        'Upload PDF, DOCX or TXT study materials.',
      action: 'Upload material',
      path: '/upload',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 16V4m0 0L7 9m5-5 5 5M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4"
        />
      ),
    },
    {
      title: 'Study Planner',
      description:
        'Organise your available study time and upcoming topics.',
      action: 'Create plan',
      path: '/study-plan',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 3v3m12-3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Zm3 7h3m2 0h3m-8 4h3m2 0h3"
        />
      ),
    },
    {
      title: 'View Progress',
      description:
        'Review quiz scores and study activity.',
      action: 'View progress',
      path: '/progress',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 19V9m5 10V5m5 14v-7m5 7V3"
        />
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-7xl">

      {/* Page Heading */}
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

        <div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
            Overview
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-[#f3f0ff]">
            Dashboard
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#898cc0]">
            Welcome back. Review your study activity
            and continue learning.
          </p>

        </div>

      </div>

      {/* Statistics */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

        {stats.map((stat) => (
          <div
            key={stat.title}
            className="group relative overflow-hidden rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#7a44ff]/50 hover:shadow-[0_12px_35px_rgba(122,68,255,0.12)]"
          >

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-sm font-medium text-[#898cc0]">
                  {stat.title}
                </p>

                <p className="mt-3 text-3xl font-bold tracking-tight text-[#f3f0ff]">
                  {stat.value}
                </p>

              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff] transition group-hover:border-[#7a44ff]/60 group-hover:bg-[#7a44ff]/20">

                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  {stat.icon}
                </svg>

              </div>

            </div>

            <p className="mt-3 text-sm text-[#727494]">
              {stat.description}
            </p>

            <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-[#7a44ff] to-[#d83dff] transition-all duration-300 group-hover:w-full" />

          </div>
        ))}

      </div>

      {/* Progress Feedback */}
      {progressLoading && (
        <div
          className="mt-5 flex items-center gap-3 rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 p-4"
          role="status"
        >

          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

          <p className="text-sm font-medium text-[#c9b4ff]">
            Loading your dashboard statistics...
          </p>

        </div>
      )}

      {progressError && (
        <div
          className="mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
          role="alert"
        >
          <p className="text-sm text-red-300">
            {progressError}
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <section className="mt-10">

        <div className="mb-5">

          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
            Shortcuts
          </p>

          <h2 className="text-xl font-bold text-[#f3f0ff]">
            Quick Actions
          </h2>

        </div>

        <div className="grid gap-5 md:grid-cols-3">

          {quickActions.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              className="group rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#7a44ff]/50 hover:bg-[#19103a] hover:shadow-[0_12px_35px_rgba(122,68,255,0.12)]"
            >

              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-[#7a44ff]/20 bg-[#7a44ff]/10 text-[#a97cff]">

                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-6 w-6"
                >
                  {action.icon}
                </svg>

              </div>

              <h3 className="text-base font-bold text-[#f3f0ff]">
                {action.title}
              </h3>

              <p className="mt-2 min-h-10 text-sm leading-6 text-[#898cc0]">
                {action.description}
              </p>

              <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#a97cff]">

                {action.action}

                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m9 18 6-6-6-6"
                  />
                </svg>

              </div>

            </Link>
          ))}

        </div>

      </section>

      {/* AI Privacy and Consent */}
      <section className="mt-10">

        <div className="mb-5">

          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
            Privacy
          </p>

          <h2 className="text-xl font-bold text-[#f3f0ff]">
            AI Privacy & Consent
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#898cc0]">
            Manage whether your uploaded study material
            may be sent to the external Generative AI
            service when you request AI-generated study
            features.
          </p>

        </div>

        <div className="rounded-xl border border-[#2a1b4d] bg-[#160b32] p-1">

          {consentInitialLoading ? (
            <div
              className="flex items-center gap-3 rounded-lg bg-[#7a44ff]/10 p-5"
              role="status"
            >

              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

              <p className="text-sm font-medium text-[#c9b4ff]">
                Loading your AI consent preference...
              </p>

            </div>
          ) : (
            <AIConsent
              consentStatus={consentStatus}
              recordedAt={consentRecordedAt}
              loading={consentLoading}
              onConsentChange={
                handleConsentChange
              }
            />
          )}

        </div>

        {consentError && (
          <div
            className="mt-4 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
            role="alert"
          >
            <p className="text-sm text-red-300">
              {consentError}
            </p>
          </div>
        )}

      </section>

      {/* Responsible AI */}
      <section className="mt-8 rounded-xl border border-[#7a44ff]/25 bg-gradient-to-r from-[#7a44ff]/10 to-[#d83dff]/5 p-6">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">

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
                d="M12 3 4 7v5c0 4.5 3.2 7.6 8 9 4.8-1.4 8-4.5 8-9V7l-8-4Zm0 5v5m0 3h.01"
              />
            </svg>

          </div>

          <div>

            <h2 className="font-bold text-[#f3f0ff]">
              Responsible AI Reminder
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#a6a8c7]">
              AI-generated study materials may contain
              inaccuracies or omissions. Always verify
              generated information against your original
              study material.
            </p>

          </div>

        </div>

      </section>

    </div>
  )
}

export default Dashboard