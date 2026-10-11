import {
  useEffect,
  useState,
} from 'react'
import {
  Link,
  useParams,
} from 'react-router'
import {
  getStudyPlanById,
} from '../services/studyPlanService'


const parseStoredValue = (
  value,
  fallback
) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return fallback
  }

  if (typeof value === 'object') {
    return value
  }

  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}


const normalizeStudyPlan = (
  rawPlan
) => {
  if (!rawPlan) {
    return null
  }

  const planData =
    parseStoredValue(
      rawPlan.plan_data,
      {}
    )

  const parsedStudyDays =
    parseStoredValue(
      rawPlan.study_days,
      []
    )

  return {
    ...rawPlan,

    study_days:
      Array.isArray(
        parsedStudyDays
      )
        ? parsedStudyDays
        : [],

    sessions:
      Array.isArray(
        rawPlan.sessions
      )
        ? rawPlan.sessions
        : Array.isArray(
            planData?.sessions
          )
          ? planData.sessions
          : [],

    recommendation:
      rawPlan.recommendation ||
      planData?.recommendation ||
      '',
  }
}


const formatDate = (
  value,
  dateOnly = false
) => {
  if (!value) {
    return '—'
  }

  const normalizedValue =
    String(value).trim()

  let parsedDate

  /*
   * Only a genuine YYYY-MM-DD string should be
   * treated as a timezone-free calendar date.
   *
   * If the API returned an ISO timestamp, keep
   * the timestamp intact instead of slicing off
   * its timezone information.
   */
  if (
    dateOnly &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      normalizedValue
    )
  ) {
    const [
      year,
      month,
      day,
    ] =
      normalizedValue
        .split('-')
        .map(Number)

    parsedDate =
      new Date(
        year,
        month - 1,
        day
      )
  } else {
    parsedDate =
      new Date(
        normalizedValue
      )
  }

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return '—'
  }

  return parsedDate.toLocaleDateString(
    undefined,
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  )
}


const formatDateTime = (
  value
) => {
  if (!value) {
    return '—'
  }

  const parsedDate =
    new Date(value)

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return '—'
  }

  return parsedDate.toLocaleString(
    undefined,
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }
  )
}


const getDurationLabel = (
  session
) => {
  if (
    session?.duration
  ) {
    return session.duration
  }

  if (
    session?.duration_minutes !==
      undefined &&
    session?.duration_minutes !==
      null
  ) {
    return `${session.duration_minutes} min`
  }

  return '—'
}


function StudyPlanDetails() {
  const {
    planId,
  } = useParams()

  const [
    plan,
    setPlan,
  ] = useState(null)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')


  useEffect(() => {
    let active = true

    const loadPlan =
      async () => {
        const numericPlanId =
          Number(planId)

        if (
          !Number.isInteger(
            numericPlanId
          ) ||
          numericPlanId <= 0
        ) {
          setError(
            'This study plan link is invalid.'
          )

          setLoading(false)

          return
        }

        setLoading(true)
        setError('')

        try {
          const response =
            await getStudyPlanById(
              numericPlanId
            )

          if (!active) {
            return
          }

          if (!response.ok) {
            if (
              response.status ===
              404
            ) {
              setError(
                'This study plan could not be found.'
              )
            } else if (
              response.status ===
              401
            ) {
              setError(
                'Your login session is missing or invalid. Please sign in again.'
              )
            } else {
              setError(
                response.data?.message ||
                  'Unable to load this study plan.'
              )
            }

            return
          }

          /*
           * Support the project's current response
           * as well as the agreed API-contract name.
           */
          const rawPlan =
            response.data?.plan ||
            response.data?.study_plan ||
            response.data?.data ||
            (
              response.data?.plan_id
                ? response.data
                : null
            )

          const normalizedPlan =
            normalizeStudyPlan(
              rawPlan
            )

          if (
            !normalizedPlan?.plan_id
          ) {
            setError(
              'The study plan response was incomplete.'
            )

            return
          }

          setPlan(
            normalizedPlan
          )
        } catch (loadError) {
          if (!active) {
            return
          }

          console.error(
            'Study plan details load error:',
            loadError
          )

          setError(
            'Unable to connect to the server to load this study plan.'
          )
        } finally {
          if (active) {
            setLoading(false)
          }
        }
      }

    loadPlan()

    return () => {
      active = false
    }
  }, [planId])


  return (
    <div className="study-plan-details-theme mx-auto w-full max-w-[1660px]">
      <style>
        {`
          .study-plan-details-text {
            transition:
              color 100ms ease;
          }

          .study-plan-details-surface {
            transition:
              background-color 500ms ease,
              border-color 500ms ease,
              box-shadow 300ms ease;
          }

          .study-plan-details-interactive {
            transition:
              color 100ms ease,
              background-color 300ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease,
              transform 300ms ease;
          }

          [data-theme-mode='light']
          .study-plan-details-heading {
            color:
              #171717 !important;
          }

          [data-theme-mode='light']
          .study-plan-details-body {
            color:
              #65676b !important;
          }

          [data-theme-mode='light']
          .study-plan-details-muted {
            color:
              #7a7575 !important;
          }

          [data-theme-mode='light']
          .study-plan-details-accent {
            color:
              #7a44ff !important;
          }

          [data-theme-mode='light']
          .study-plan-details-card {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;
          }

          [data-theme-mode='light']
          .study-plan-details-subcard {
            background-color:
              #f8f7fb !important;

            border-color:
              #e2dfe7 !important;
          }

          [data-theme-mode='light']
          .study-plan-details-icon {
            background-color:
              #f2edff !important;

            border-color:
              #d8caff !important;

            color:
              #6f42c1 !important;
          }

          [data-theme-mode='light']
          .study-plan-details-chip {
            background-color:
              #f2edff !important;

            border-color:
              #d8caff !important;

            color:
              #6f42c1 !important;
          }

          [data-theme-mode='light']
          .study-plan-details-back {
            background-color:
              #ffffff !important;

            border-color:
              #d7d3df !important;

            color:
              #6f42c1 !important;
          }

          [data-theme-mode='light']
          .study-plan-details-back:hover {
            background-color:
              #f2edff !important;

            border-color:
              #9d7cff !important;

            color:
              #7a44ff !important;
          }

          [data-theme-mode='light']
          .study-plan-details-session:hover {
            background-color:
              #faf8ff !important;

            border-color:
              rgba(
                122,
                68,
                255,
                0.35
              ) !important;
          }

          [data-theme-mode='light']
          .study-plan-details-advice {
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

          /*
           * STUDYA STUDY PLAN DETAILS ILLUMINATED SURFACE
           *
           * Major outer cards only.
           * Plan data, session rendering, dates, navigation
           * and stored-plan functionality remain unchanged.
           */
          .study-plan-details-card {
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
          .study-plan-details-card::after {
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


          .study-plan-details-card:hover {
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
          .study-plan-details-card {
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
          .study-plan-details-card::after {
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
          .study-plan-details-card:hover {
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
      <div className="mb-7">
        <Link
          to="/study-plan"
          className="study-plan-details-interactive study-plan-details-back mb-5 inline-flex items-center gap-2 rounded-lg border border-[#3a2860] bg-[#160b32] px-3.5 py-2 text-sm font-medium text-[#c9b4ff] hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/10"
        >
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
              d="m15 18-6-6 6-6"
            />
          </svg>

          Back to Study Planner
        </Link>

        <p className="study-plan-details-text study-plan-details-accent mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
          Study Management
        </p>

        <h1 className="study-plan-details-text study-plan-details-heading text-3xl font-bold tracking-tight text-[#f3f0ff]">
          Study Plan Details
        </h1>

        <p className="study-plan-details-text study-plan-details-body mt-2 max-w-3xl text-sm leading-6 text-[#898cc0]">
          Review your saved study plan, schedule and study recommendations.
        </p>
      </div>


      {/* Loading */}
      {loading && (
        <div
          className="study-plan-details-surface study-plan-details-card flex min-h-[360px] items-center justify-center rounded-xl border border-[#2a1b4d] bg-[#160b32]"
          role="status"
        >
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

            <p className="study-plan-details-text study-plan-details-body mt-4 text-sm text-[#898cc0]">
              Loading study plan...
            </p>
          </div>
        </div>
      )}


      {/* Error */}
      {!loading &&
        error && (
          <div className="study-plan-details-surface study-plan-details-card rounded-xl border border-red-400/25 bg-[#160b32] p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-300">
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.3 3.8 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"
                />
              </svg>
            </div>

            <h2 className="study-plan-details-text study-plan-details-heading mt-4 text-lg font-semibold text-[#f3f0ff]">
              Unable to open study plan
            </h2>

            <p className="study-plan-details-text study-plan-details-body mx-auto mt-2 max-w-lg text-sm leading-6 text-[#898cc0]">
              {error}
            </p>
          </div>
        )}


      {!loading &&
        !error &&
        plan && (
          <div className="space-y-6">
            {/* Plan Identity */}
            <section className="study-plan-details-surface study-plan-details-card rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6 sm:p-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="study-plan-details-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">
                    <svg
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-6 w-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Zm3 4h3m2 0h3m-8 4h3m2 0h3"
                      />
                    </svg>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="study-plan-details-text study-plan-details-heading text-2xl font-semibold text-[#f3f0ff]">
                        {plan.subject}
                      </h2>

                      <span className="study-plan-details-chip rounded-full border border-[#7a44ff]/25 bg-[#7a44ff]/10 px-2.5 py-1 text-xs font-semibold text-[#c9b4ff]">
                        Plan #{plan.plan_id}
                      </span>
                    </div>

                    <p className="study-plan-details-text study-plan-details-body mt-2 text-sm leading-6 text-[#898cc0]">
                      {plan.topic}
                    </p>
                  </div>
                </div>

                <span className="study-plan-details-chip w-fit rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                  Saved Study Plan
                </span>
              </div>
            </section>


            {/* Summary Cards */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="study-plan-details-surface study-plan-details-card rounded-xl border border-[#2a1b4d] bg-[#160b32] p-5">
                <p className="study-plan-details-text study-plan-details-muted text-xs font-semibold uppercase tracking-[0.1em] text-[#727494]">
                  Deadline
                </p>

                <p className="study-plan-details-text study-plan-details-heading mt-2 text-lg font-semibold text-[#f3f0ff]">
                  {formatDate(
                    plan.deadline,
                    true
                  )}
                </p>
              </div>

              <div className="study-plan-details-surface study-plan-details-card rounded-xl border border-[#2a1b4d] bg-[#160b32] p-5">
                <p className="study-plan-details-text study-plan-details-muted text-xs font-semibold uppercase tracking-[0.1em] text-[#727494]">
                  Hours / Week
                </p>

                <p className="study-plan-details-text study-plan-details-heading mt-2 text-lg font-semibold text-[#f3f0ff]">
                  {plan.available_hours ??
                    '—'}
                </p>
              </div>

              <div className="study-plan-details-surface study-plan-details-card rounded-xl border border-[#2a1b4d] bg-[#160b32] p-5">
                <p className="study-plan-details-text study-plan-details-muted text-xs font-semibold uppercase tracking-[0.1em] text-[#727494]">
                  Study Days
                </p>

                <p className="study-plan-details-text study-plan-details-heading mt-2 text-lg font-semibold text-[#f3f0ff]">
                  {plan.study_days.length}
                </p>
              </div>

              <div className="study-plan-details-surface study-plan-details-card rounded-xl border border-[#2a1b4d] bg-[#160b32] p-5">
                <p className="study-plan-details-text study-plan-details-muted text-xs font-semibold uppercase tracking-[0.1em] text-[#727494]">
                  Created
                </p>

                <p className="study-plan-details-text study-plan-details-heading mt-2 text-lg font-semibold text-[#f3f0ff]">
                  {formatDate(
                    plan.created_at
                  )}
                </p>
              </div>
            </section>


            {/* Plan Information */}
            <section className="grid gap-6 lg:grid-cols-2">
              <div className="study-plan-details-surface study-plan-details-card rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6">
                <div className="flex items-center gap-3">
                  <div className="study-plan-details-icon flex h-9 w-9 items-center justify-center rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">
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
                        d="M4 5h16v14H4zM8 9h8M8 13h8M8 17h5"
                      />
                    </svg>
                  </div>

                  <h3 className="study-plan-details-text study-plan-details-heading text-lg font-semibold text-[#f3f0ff]">
                    Plan Overview
                  </h3>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="study-plan-details-surface study-plan-details-subcard rounded-lg border border-[#2a1b4d] bg-[#120928]/45 p-4">
                    <p className="study-plan-details-text study-plan-details-muted text-xs uppercase tracking-wide text-[#727494]">
                      Subject
                    </p>

                    <p className="study-plan-details-text study-plan-details-heading mt-1.5 font-medium text-[#d9d4eb]">
                      {plan.subject}
                    </p>
                  </div>

                  <div className="study-plan-details-surface study-plan-details-subcard rounded-lg border border-[#2a1b4d] bg-[#120928]/45 p-4">
                    <p className="study-plan-details-text study-plan-details-muted text-xs uppercase tracking-wide text-[#727494]">
                      Plan ID
                    </p>

                    <p className="study-plan-details-text study-plan-details-heading mt-1.5 font-medium text-[#d9d4eb]">
                      #{plan.plan_id}
                    </p>
                  </div>

                  <div className="study-plan-details-surface study-plan-details-subcard rounded-lg border border-[#2a1b4d] bg-[#120928]/45 p-4 sm:col-span-2">
                    <p className="study-plan-details-text study-plan-details-muted text-xs uppercase tracking-wide text-[#727494]">
                      Topic / Study Goal
                    </p>

                    <p className="study-plan-details-text study-plan-details-heading mt-1.5 leading-6 text-[#d9d4eb]">
                      {plan.topic}
                    </p>
                  </div>

                  <div className="study-plan-details-surface study-plan-details-subcard rounded-lg border border-[#2a1b4d] bg-[#120928]/45 p-4 sm:col-span-2">
                    <p className="study-plan-details-text study-plan-details-muted text-xs uppercase tracking-wide text-[#727494]">
                      Created Date / Time
                    </p>

                    <p className="study-plan-details-text study-plan-details-heading mt-1.5 font-medium text-[#d9d4eb]">
                      {formatDateTime(
                        plan.created_at
                      )}
                    </p>
                  </div>
                </div>
              </div>


              <div className="study-plan-details-surface study-plan-details-card rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6">
                <div className="flex items-center gap-3">
                  <div className="study-plan-details-icon flex h-9 w-9 items-center justify-center rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">
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

                  <h3 className="study-plan-details-text study-plan-details-heading text-lg font-semibold text-[#f3f0ff]">
                    Available Study Days
                  </h3>
                </div>

                {plan.study_days.length >
                0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {plan.study_days.map(
                      (day) => (
                        <span
                          key={day}
                          className="study-plan-details-chip rounded-full border border-[#7a44ff]/25 bg-[#7a44ff]/10 px-3 py-1.5 text-sm font-medium text-[#c9b4ff]"
                        >
                          {day}
                        </span>
                      )
                    )}
                  </div>
                ) : (
                  <p className="study-plan-details-text study-plan-details-muted mt-5 text-sm text-[#727494]">
                    No saved study days are available for this plan.
                  </p>
                )}

                <div className="study-plan-details-surface study-plan-details-subcard mt-6 rounded-lg border border-[#2a1b4d] bg-[#120928]/45 p-5">
                  <p className="study-plan-details-text study-plan-details-muted text-xs uppercase tracking-wide text-[#727494]">
                    Weekly Availability
                  </p>

                  <p className="study-plan-details-text study-plan-details-heading mt-2 text-2xl font-semibold text-[#f3f0ff]">
                    {plan.available_hours ??
                      '—'}
                    {plan.available_hours !==
                      null &&
                    plan.available_hours !==
                      undefined
                      ? ' hours'
                      : ''}
                  </p>
                </div>
              </div>
            </section>


            {/* Suggested Sessions */}
            <section className="study-plan-details-surface study-plan-details-card rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="study-plan-details-text study-plan-details-accent text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
                    Schedule
                  </p>

                  <h3 className="study-plan-details-text study-plan-details-heading mt-1 text-xl font-semibold text-[#f3f0ff]">
                    Suggested Sessions
                  </h3>
                </div>

                <span className="study-plan-details-chip rounded-full border border-[#7a44ff]/25 bg-[#7a44ff]/10 px-3 py-1.5 text-xs font-semibold text-[#c9b4ff]">
                  {plan.sessions.length}{' '}
                  {plan.sessions.length === 1
                    ? 'session'
                    : 'sessions'}
                </span>
              </div>

              {plan.sessions.length >
              0 ? (
                <div className="mt-5 space-y-3">
                  {plan.sessions.map(
                    (
                      session,
                      index
                    ) => (
                      <div
                        key={
                          session.id ||
                          session.session ||
                          `${session.day}-${index}`
                        }
                        className="study-plan-details-surface study-plan-details-subcard study-plan-details-session rounded-xl border border-[#2a1b4d] bg-[#120928]/45 p-5"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="study-plan-details-text study-plan-details-heading font-semibold text-[#f3f0ff]">
                                {session.session ||
                                  `Session ${index + 1}`}
                              </p>

                              {session.day && (
                                <span className="study-plan-details-chip rounded-full border border-[#7a44ff]/20 bg-[#7a44ff]/10 px-2.5 py-1 text-xs font-medium text-[#c9b4ff]">
                                  {session.day}
                                </span>
                              )}
                            </div>

                            {session.date && (
                              <p className="study-plan-details-text study-plan-details-muted mt-2 text-xs text-[#727494]">
                                {formatDate(
                                  session.date,
                                  true
                                )}
                              </p>
                            )}

                            <p className="study-plan-details-text study-plan-details-body mt-3 text-sm leading-6 text-[#a6a8c7]">
                              {session.activity ||
                                'No activity description is available.'}
                            </p>
                          </div>

                          <span className="study-plan-details-chip w-fit shrink-0 rounded-full border border-[#7a44ff]/20 bg-[#7a44ff]/10 px-3 py-1.5 text-sm font-medium text-[#c9b4ff]">
                            {getDurationLabel(
                              session
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="study-plan-details-subcard mt-5 rounded-xl border border-dashed border-[#3a2860] bg-[#120928]/35 p-7 text-center">
                  <p className="study-plan-details-text study-plan-details-heading font-medium text-[#d9d4eb]">
                    No session details available
                  </p>

                  <p className="study-plan-details-text study-plan-details-muted mt-2 text-sm text-[#727494]">
                    This saved plan does not contain a stored session schedule.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
    </div>
  )
}


export default StudyPlanDetails