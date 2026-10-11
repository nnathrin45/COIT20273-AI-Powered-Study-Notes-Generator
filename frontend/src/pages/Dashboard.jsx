import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getProgress } from '../services/progressService'
import { getStudyPlans } from '../services/studyPlanService'

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'


function Dashboard() {
  const [progress, setProgress] = useState(null)

  const [progressLoading, setProgressLoading] =
    useState(true)

  const [progressError, setProgressError] =
    useState('')

  const [
    dashboardStudyPlans,
    setDashboardStudyPlans,
  ] = useState([])

  const [
    studyPlansLoading,
    setStudyPlansLoading,
  ] = useState(true)

  const [
    studyPlansError,
    setStudyPlansError,
  ] = useState('')


  useEffect(() => {
    const loadProgress = async () => {
      setProgressLoading(true)
      setProgressError('')

      try {
        const response =
          await getProgress('all')

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


  useEffect(() => {
    const loadDashboardStudyPlans =
      async () => {
        setStudyPlansLoading(true)
        setStudyPlansError('')

        try {
          const response =
            await getStudyPlans()

          if (!response.ok) {
            setStudyPlansError(
              response.data?.message ||
                'Unable to load your study plans.'
            )

            return
          }

          setDashboardStudyPlans(
            Array.isArray(
              response.data?.plans
            )
              ? response.data.plans
              : []
          )
        } catch (studyPlanLoadError) {
          console.error(
            'Dashboard study plans load error:',
            studyPlanLoadError
          )

          setStudyPlansError(
            'Unable to connect to the server to load your study plans.'
          )
        } finally {
          setStudyPlansLoading(false)
        }
      }

    loadDashboardStudyPlans()
  }, [])

  const statsUnavailable =
    progressLoading ||
    Boolean(progressError)


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


  const resourceMixData = [
    {
      name: 'Summaries',
      value: Number(
        progress?.summaries_generated ?? 0
      ),
      color: '#7A44FF',
    },
    {
      name: 'Flashcards',
      value: Number(
        progress?.flashcards_generated ?? 0
      ),
      color: '#A77BFF',
    },
    {
      name: 'Practice Quizzes',
      value: Number(
        progress?.quizzes_generated ?? 0
      ),
      color: '#D83DFF',
    },
    {
      name: 'Explanations',
      value: Number(
        progress?.explanations_generated ?? 0
      ),
      color: '#6D5CE7',
    },
  ]


  const generatedResourceTotal =
    resourceMixData.reduce(
      (
        total,
        resource
      ) =>
        total +
        resource.value,
      0
    )


  const resourceMixChartData =
    resourceMixData.filter(
      (resource) =>
        resource.value > 0
    )

  const quizTrendData = (
    progress?.recent_attempts ?? []
  )
    .slice()
    .reverse()
    .map((attempt) => {
      const attemptDate =
        new Date(
          attempt.attempted_at
        )

      return {
        attemptId:
          attempt.attempt_id,

        dateKey:
          attemptDate.toLocaleDateString(
            'en-CA'
          ),

        dateOnly:
          attemptDate.toLocaleDateString(
            'en-AU',
            {
              day: 'numeric',
              month: 'short',
            }
          ),

        timeOnly:
          attemptDate.toLocaleTimeString(
            'en-AU',
            {
              hour: 'numeric',
              minute: '2-digit',
            }
          ),

        fullDate:
          attemptDate.toLocaleString(
            'en-AU',
            {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }
          ),

        percentage:
          Number(
            attempt.percentage ?? 0
          ),

        score:
          Number(
            attempt.score ?? 0
          ),

        total:
          Number(
            attempt.total ?? 0
          ),

        title:
          attempt.quiz_title ||
          'Practice Quiz',
      }
    })


  const quizDateCounts =
    quizTrendData.reduce(
      (counts, attempt) => {
        counts[attempt.dateKey] =
          (counts[attempt.dateKey] || 0) + 1

        return counts
      },
      {}
    )


  const quizChartData =
    quizTrendData.map(
      (attempt) => ({
        ...attempt,

        date:
          quizDateCounts[
            attempt.dateKey
          ] > 1
            ? `${attempt.dateOnly} ${attempt.timeOnly}`
            : attempt.dateOnly,
      })
    )


  const latestQuizAttempt =
    quizChartData.length > 0
      ? quizChartData[
          quizChartData.length - 1
        ]
      : null


  const previousQuizAttempt =
    quizChartData.length > 1
      ? quizChartData[
          quizChartData.length - 2
        ]
      : null


  const quizPerformanceChange =
    latestQuizAttempt &&
    previousQuizAttempt
      ? latestQuizAttempt.percentage -
        previousQuizAttempt.percentage
      : null


  const recentDashboardActivity =
    (
      progress?.recent_activity ??
      []
    ).slice(0, 4)


  const getDashboardActivityLabel =
    (activityType) => {
      const labels = {
        quiz_attempt:
          'Completed a practice quiz',

        ai_summary:
          'Generated a summary',

        ai_flashcards:
          'Generated flashcards',

        ai_quiz:
          'Generated a practice quiz',

        ai_explanation:
          'Generated an explanation',

        upload:
          'Uploaded study material',

        study_plan:
          'Created a study plan',

        study_plan_delete:
          'Deleted a study plan',

        study_plan_deleted:
          'Deleted a study plan',
      }

      return (
        labels[activityType] ||
        'Study activity'
      )
    }


  const formatDashboardActivityDate =
    (value) => {
      if (!value) {
        return ''
      }

      const parsed =
        new Date(value)

      if (
        Number.isNaN(
          parsed.getTime()
        )
      ) {
        return ''
      }

      return parsed.toLocaleString(
        'en-AU',
        {
          day: 'numeric',
          month: 'short',
          hour: 'numeric',
          minute: '2-digit',
        }
      )
    }


  /*
   * Study-plan deadlines are calendar dates.
   * Read the YYYY-MM-DD portion directly so the
   * browser timezone cannot shift the displayed day.
   */
  const getDeadlineKey =
    (value) => {
      const match =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(
          String(value || '')
        )

      if (!match) {
        return ''
      }

      return `${match[1]}-${match[2]}-${match[3]}`
    }


  const formatPlanDeadline =
    (value) => {
      const key =
        getDeadlineKey(value)

      if (!key) {
        return ''
      }

      const [
        year,
        month,
        day,
      ] =
        key
          .split('-')
          .map(Number)

      const date =
        new Date(
          year,
          month - 1,
          day
        )

      return date.toLocaleDateString(
        'en-AU',
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }
      )
    }


  const today =
    new Date()

  const todayKey =
    [
      today.getFullYear(),

      String(
        today.getMonth() + 1
      ).padStart(2, '0'),

      String(
        today.getDate()
      ).padStart(2, '0'),
    ].join('-')


  const getDeadlineStatus =
    (deadlineValue) => {
      const deadlineKey =
        getDeadlineKey(
          deadlineValue
        )

      if (!deadlineKey) {
        return ''
      }

      const [
        deadlineYear,
        deadlineMonth,
        deadlineDay,
      ] =
        deadlineKey
          .split('-')
          .map(Number)

      const [
        todayYear,
        todayMonth,
        todayDay,
      ] =
        todayKey
          .split('-')
          .map(Number)

      const difference =
        Math.round(
          (
            Date.UTC(
              deadlineYear,
              deadlineMonth - 1,
              deadlineDay
            ) -
            Date.UTC(
              todayYear,
              todayMonth - 1,
              todayDay
            )
          ) /
            86400000
        )

      if (difference === 0) {
        return 'Due today'
      }

      if (difference === 1) {
        return 'Due tomorrow'
      }

      return `${difference} days remaining`
    }


  const upcomingStudyPlans =
    dashboardStudyPlans
      .filter((plan) => {
        const deadlineKey =
          getDeadlineKey(
            plan.deadline
          )

        return (
          deadlineKey &&
          deadlineKey >= todayKey
        )
      })
      .slice(0, 4)

  return (
    <div className="dashboard-theme mx-auto w-full max-w-[1660px]">
      <style>
        {`
          .dashboard-theme {
            --dashboard-grid: #2a1b4d;
            --dashboard-axis: #898cc0;
            --dashboard-dot-border: #160b32;
          }

          .dashboard-theme-text {
            transition:
              color 100ms ease;
          }

          .dashboard-theme-surface {
            transition:
              background-color 500ms ease,
              border-color 500ms ease,
              box-shadow 300ms ease,
              transform 300ms ease;
          }

          .dashboard-theme-border {
            transition:
              border-color 500ms ease;
          }

          .dashboard-theme-interactive {
            transition:
              color 100ms ease,
              background-color 300ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease,
              transform 300ms ease;
          }

          [data-theme-mode='light'] .dashboard-theme {
            --dashboard-grid: #dfdfdf;
            --dashboard-axis: #65676b;
            --dashboard-dot-border: #ffffff;
          }

          [data-theme-mode='light']
          .dashboard-heading {
            color: #171717 !important;
          }

          [data-theme-mode='light']
          .dashboard-body {
            color: #65676b !important;
          }

          [data-theme-mode='light']
          .dashboard-muted {
            color: #7a7575 !important;
          }

          [data-theme-mode='light']
          .dashboard-accent {
            color: #7a44ff !important;
          }

          [data-theme-mode='light']
          .dashboard-accent-soft {
            color: #6f42c1 !important;
          }

          [data-theme-mode='light']
          .dashboard-surface {
            background-color: #ffffff !important;
            border-color: #dfdfdf !important;
          }

          [data-theme-mode='light']
          .dashboard-action-card {
            background-color: #ffffff !important;
            border-color: #dfdfdf !important;
          }

          [data-theme-mode='light']
          .dashboard-action-card:hover {
            background-color: #f7f7fb !important;
            border-color:
              rgba(122, 68, 255, 0.5) !important;
          }

          [data-theme-mode='light']
          .dashboard-section-border {
            border-color: #dfdfdf !important;
          }

          [data-theme-mode='light']
          .dashboard-tooltip {
            background-color: #ffffff !important;
            border-color: #dfdfdf !important;

            box-shadow:
              0 12px 30px
              rgba(50, 39, 75, 0.14) !important;
          }

          [data-theme-mode='light']
          .dashboard-loading-text {
            color: #6f42c1 !important;
          }

          [data-theme-mode='light']
          .dashboard-error-text {
            color: #b91c1c !important;
          }

          [data-theme-mode='light']
          .dashboard-change-positive {
            color: #047857 !important;
            border-color:
              rgba(16, 185, 129, 0.25) !important;
            background-color:
              rgba(16, 185, 129, 0.08) !important;
          }

          [data-theme-mode='light']
          .dashboard-change-negative {
            color: #b91c1c !important;
            border-color:
              rgba(239, 68, 68, 0.24) !important;
            background-color:
              rgba(239, 68, 68, 0.08) !important;
          }

          [data-theme-mode='light']
          .dashboard-change-neutral {
            color: #65676b !important;
            border-color: #dfdfdf !important;
            background-color: #f7f7fb !important;
          }

          [data-theme-mode='light']
          .dashboard-link:hover {
            color: #6634e8 !important;
          }

          /*
           * STUDYA ILLUMINATED SURFACE
           *
           * Visual enhancement only.
           * No Dashboard functionality is affected.
           */
          .dashboard-surface {
            position: relative;
            isolation: isolate;

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
                rgba(255, 255, 255, 0) 48%
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
              box-shadow 300ms ease,
              transform 300ms ease;
          }


          /*
           * Thin reflective highlight along the top edge.
           */
          .dashboard-surface::after {
            content: '';
            position: absolute;
            z-index: -1;
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


          /*
           * Preserve StudyA purple interaction on hover.
           */
          .dashboard-surface:hover {
            border-color:
              rgba(122, 68, 255, 0.46) !important;

            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.085),
              inset 0 0 30px rgba(122, 68, 255, 0.045),
              0 14px 38px rgba(30, 10, 62, 0.30),
              0 0 24px rgba(122, 68, 255, 0.075);
          }


          /*
           * Light theme:
           * same dimensional effect, much more restrained.
           */
          [data-theme-mode='light']
          .dashboard-surface {
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
          .dashboard-surface::after {
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
          .dashboard-surface:hover {
            border-color:
              rgba(122, 68, 255, 0.34) !important;

            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 1),
              0 13px 32px rgba(91, 60, 145, 0.11),
              0 0 20px rgba(122, 68, 255, 0.045);
          }
        `}
      </style>


      {/* Page Heading */}
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="dashboard-theme-text dashboard-accent mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
            Overview
          </p>

          <h1 className="dashboard-theme-text dashboard-heading text-3xl font-bold tracking-tight text-[#f3f0ff]">
            Dashboard
          </h1>

          <p className="dashboard-theme-text dashboard-body mt-2 text-sm leading-6 text-[#898cc0]">
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
            className="dashboard-theme-surface dashboard-surface group relative overflow-hidden rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6 hover:-translate-y-1 hover:border-[#7a44ff]/50 hover:shadow-[0_12px_35px_rgba(122,68,255,0.12)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="dashboard-theme-text dashboard-body text-sm font-medium text-[#898cc0]">
                  {stat.title}
                </p>

                <p className="dashboard-theme-text dashboard-heading mt-3 text-3xl font-bold tracking-tight text-[#f3f0ff]">
                  {stat.value}
                </p>
              </div>

              <div className="dashboard-theme-interactive dashboard-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff] group-hover:border-[#7a44ff]/60 group-hover:bg-[#7a44ff]/20">
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

            <p className="dashboard-theme-text dashboard-muted mt-3 text-sm text-[#727494]">
              {stat.description}
            </p>

            <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-[#7a44ff] to-[#d83dff] transition-all duration-300 group-hover:w-full" />
          </div>
        ))}
      </div>


      {/* Progress Feedback */}
      {progressLoading && (
        <div
          className="dashboard-theme-surface mt-5 flex items-center gap-3 rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 p-4"
          role="status"
        >
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

          <p className="dashboard-theme-text dashboard-loading-text text-sm font-medium text-[#c9b4ff]">
            Loading your dashboard statistics...
          </p>
        </div>
      )}


      {progressError && (
        <div
          className="dashboard-theme-surface mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
          role="alert"
        >
          <p className="dashboard-theme-text dashboard-error-text text-sm text-red-300">
            {progressError}
          </p>
        </div>
      )}


      {/* Quiz Performance Trend */}
      <section className="mt-8 grid gap-5 xl:grid-cols-2">
        <div className="dashboard-theme-surface dashboard-surface min-w-0 overflow-hidden rounded-xl border border-[#2a1b4d] bg-[#160b32]">
          {/* Header */}
          <div className="dashboard-theme-border dashboard-section-border flex flex-col gap-4 border-b border-[#2a1b4d] px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="dashboard-theme-text dashboard-accent mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
                Performance
              </p>

              <h2 className="dashboard-theme-text dashboard-heading text-xl font-bold text-[#f3f0ff]">
                Quiz Performance Trend
              </h2>

              <p className="dashboard-theme-text dashboard-body mt-1 text-sm text-[#898cc0]">
                Track your quiz scores across your most recent attempts.
              </p>
            </div>


            {latestQuizAttempt && (
              <div className="flex shrink-0 items-center gap-2">
                {quizPerformanceChange !== null && (
                  <div
                    className={`dashboard-theme-interactive rounded-full border px-3 py-2 text-xs font-semibold ${
                      quizPerformanceChange > 0
                        ? 'dashboard-change-positive border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                        : quizPerformanceChange < 0
                          ? 'dashboard-change-negative border-red-400/20 bg-red-400/10 text-red-300'
                          : 'dashboard-change-neutral border-[#2a1b4d] bg-[#191426] text-[#898cc0]'
                    }`}
                  >
                    {quizPerformanceChange > 0
                      ? '↑ '
                      : quizPerformanceChange < 0
                        ? '↓ '
                        : ''}

                    {Math.abs(
                      quizPerformanceChange
                    )}{' '}
                    pts
                  </div>
                )}


                <div className="rounded-full border border-[#7a44ff]/30 bg-[#7a44ff]/10 px-4 py-2">
                  <span className="dashboard-theme-text dashboard-body text-xs text-[#898cc0]">
                    Latest
                  </span>

                  <span className="dashboard-theme-text dashboard-accent-soft ml-2 text-sm font-bold text-[#c9b4ff]">
                    {latestQuizAttempt.percentage}%
                  </span>
                </div>
              </div>
            )}
          </div>


          {/* Chart */}
          <div className="px-4 pb-4 pt-6 sm:px-6">
            {quizChartData.length > 0 ? (
              <>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <AreaChart
                      data={quizChartData}
                      margin={{
                        top: 10,
                        right: 10,
                        left: -10,
                        bottom: 0,
                      }}
                    >
                      <defs>
                        <linearGradient
                          id="quizPerformanceGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#7A44FF"
                            stopOpacity={0.4}
                          />

                          <stop
                            offset="100%"
                            stopColor="#7A44FF"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>


                      <CartesianGrid
                        stroke="var(--dashboard-grid)"
                        strokeDasharray="3 6"
                        vertical={false}
                      />


                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill:
                            'var(--dashboard-axis)',
                          fontSize: 12,
                        }}
                        dy={10}
                      />


                      <YAxis
                        domain={[0, 100]}
                        ticks={[
                          0,
                          25,
                          50,
                          75,
                          100,
                        ]}
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill:
                            'var(--dashboard-axis)',
                          fontSize: 12,
                        }}
                        tickFormatter={(value) =>
                          `${value}%`
                        }
                      />


                      <Tooltip
                        cursor={{
                          stroke: '#7A44FF',
                          strokeOpacity: 0.35,
                        }}
                        content={({
                          active,
                          payload,
                        }) => {
                          if (
                            !active ||
                            !payload ||
                            payload.length === 0
                          ) {
                            return null
                          }

                          const attempt =
                            payload[0].payload

                          return (
                            <div className="dashboard-theme-surface dashboard-tooltip min-w-[190px] rounded-lg border border-[#3a2860] bg-[#120928] p-4 shadow-xl">
                              <p className="dashboard-theme-text dashboard-body text-xs font-medium text-[#898cc0]">
                                {attempt.fullDate}
                              </p>

                              <p className="dashboard-theme-text dashboard-heading mt-2 text-sm font-semibold text-[#f3f0ff]">
                                {attempt.title}
                              </p>

                              <div className="mt-3 flex items-end justify-between gap-6">
                                <div>
                                  <p className="dashboard-theme-text dashboard-body text-xs text-[#898cc0]">
                                    Score
                                  </p>

                                  <p className="dashboard-theme-text dashboard-accent-soft mt-1 text-lg font-bold text-[#c9b4ff]">
                                    {
                                      attempt.percentage
                                    }
                                    %
                                  </p>
                                </div>

                                <div className="text-right">
                                  <p className="dashboard-theme-text dashboard-body text-xs text-[#898cc0]">
                                    Correct
                                  </p>

                                  <p className="dashboard-theme-text dashboard-heading mt-1 text-sm font-semibold text-[#f3f0ff]">
                                    {attempt.score} /{' '}
                                    {attempt.total}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        }}
                      />


                      <Area
                        type="monotone"
                        dataKey="percentage"
                        stroke="#8B5CFF"
                        strokeWidth={3}
                        fill="url(#quizPerformanceGradient)"
                        activeDot={{
                          r: 6,
                          fill: '#D83DFF',
                          stroke: '#ffffff',
                          strokeWidth: 2,
                        }}
                        dot={{
                          r: 4,
                          fill: '#8B5CFF',
                          stroke:
                            'var(--dashboard-dot-border)',
                          strokeWidth: 2,
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>


                {quizChartData.length === 1 && (
                  <p className="dashboard-theme-text dashboard-muted mt-2 text-center text-xs text-[#727494]">
                    Complete another practice quiz to start
                    building your performance trend.
                  </p>
                )}
              </>
            ) : (
              <div className="flex min-h-[250px] flex-col items-center justify-center text-center">
                <div className="dashboard-accent mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">
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
                      d="M4 19V9m5 10V5m5 14v-7m5 7V3"
                    />
                  </svg>
                </div>

                <h3 className="dashboard-theme-text dashboard-heading font-semibold text-[#f3f0ff]">
                  No quiz performance yet
                </h3>

                <p className="dashboard-theme-text dashboard-body mt-2 max-w-md text-sm text-[#898cc0]">
                  Complete a practice quiz and your score
                  history will appear here.
                </p>

                <Link
                  to="/quiz"
                  className="dashboard-theme-text dashboard-accent dashboard-link mt-5 text-sm font-semibold text-[#a97cff]"
                >
                  Start a Practice Quiz →
                </Link>
              </div>
            )}
          </div>


          {/* Footer */}
          {quizChartData.length > 0 && (
            <div className="dashboard-theme-border dashboard-section-border flex justify-end border-t border-[#2a1b4d] px-6 py-4">
              <Link
                to="/progress"
                className="dashboard-theme-text dashboard-accent dashboard-link text-sm font-semibold text-[#a97cff]"
              >
                View full progress →
              </Link>
            </div>
          )}
        </div>
        {/* Study Resource Mix */}
        <div className="dashboard-theme-surface dashboard-surface min-w-0 overflow-hidden rounded-xl border border-[#2a1b4d] bg-[#160b32]">
          {/* Header */}
          <div className="dashboard-theme-border dashboard-section-border border-b border-[#2a1b4d] px-6 py-5">
            <p className="dashboard-theme-text dashboard-accent mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
              Resources
            </p>

            <h2 className="dashboard-theme-text dashboard-heading text-xl font-bold text-[#f3f0ff]">
              Study Resource Mix
            </h2>

            <p className="dashboard-theme-text dashboard-body mt-1 text-sm text-[#898cc0]">
              See how your generated study resources are distributed.
            </p>
          </div>


          <div className="flex min-h-[360px] flex-col items-center justify-center gap-6 p-6 lg:flex-row">
            {generatedResourceTotal > 0 ? (
              <>
                {/* Donut */}
                <div className="relative h-[230px] w-full max-w-[260px] shrink-0">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <PieChart>
                      <Pie
                        data={
                          resourceMixChartData
                        }
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={92}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {resourceMixChartData.map(
                          (resource) => (
                            <Cell
                              key={
                                resource.name
                              }
                              fill={
                                resource.color
                              }
                            />
                          )
                        )}
                      </Pie>

                      <Tooltip
                        content={({
                          active,
                          payload,
                        }) => {
                          if (
                            !active ||
                            !payload ||
                            payload.length ===
                              0
                          ) {
                            return null
                          }

                          const resource =
                            payload[0]
                              .payload

                          const percentage =
                            generatedResourceTotal >
                            0
                              ? Math.round(
                                  (
                                    resource.value /
                                    generatedResourceTotal
                                  ) *
                                    100
                                )
                              : 0

                          return (
                            <div className="dashboard-theme-surface dashboard-tooltip min-w-[170px] rounded-lg border border-[#3a2860] bg-[#120928] p-4 shadow-xl">
                              <p className="dashboard-theme-text dashboard-heading text-sm font-semibold text-[#f3f0ff]">
                                {
                                  resource.name
                                }
                              </p>

                              <div className="mt-3 flex items-center justify-between gap-6">
                                <span className="dashboard-theme-text dashboard-body text-xs text-[#898cc0]">
                                  Generated
                                </span>

                                <span className="dashboard-theme-text dashboard-accent-soft text-sm font-bold text-[#c9b4ff]">
                                  {
                                    resource.value
                                  }
                                </span>
                              </div>

                              <div className="mt-2 flex items-center justify-between gap-6">
                                <span className="dashboard-theme-text dashboard-body text-xs text-[#898cc0]">
                                  Share
                                </span>

                                <span className="dashboard-theme-text dashboard-heading text-sm font-semibold text-[#f3f0ff]">
                                  {
                                    percentage
                                  }
                                  %
                                </span>
                              </div>
                            </div>
                          )
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>


                  {/* Donut Centre */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="dashboard-theme-text dashboard-heading text-3xl font-bold text-[#f3f0ff]">
                      {
                        generatedResourceTotal
                      }
                    </span>

                    <span className="dashboard-theme-text dashboard-muted mt-1 text-xs text-[#727494]">
                      Generated
                    </span>
                  </div>
                </div>


                {/* Resource Legend */}
                <div className="w-full min-w-0 flex-1 space-y-3">
                  {resourceMixData.map(
                    (resource) => {
                      const percentage =
                        generatedResourceTotal >
                        0
                          ? Math.round(
                              (
                                resource.value /
                                generatedResourceTotal
                              ) *
                                100
                            )
                          : 0

                      return (
                        <div
                          key={
                            resource.name
                          }
                          className="dashboard-theme-border flex items-center gap-3 border-b border-[#2a1b4d] py-3 last:border-b-0"
                        >
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{
                              backgroundColor:
                                resource.color,
                            }}
                          />

                          <div className="min-w-0 flex-1">
                            <p className="dashboard-theme-text dashboard-heading truncate text-sm font-semibold text-[#f3f0ff]">
                              {
                                resource.name
                              }
                            </p>

                            <p className="dashboard-theme-text dashboard-muted mt-0.5 text-xs text-[#727494]">
                              {
                                percentage
                              }
                              % of generated resources
                            </p>
                          </div>

                          <span className="dashboard-theme-text dashboard-accent-soft shrink-0 text-lg font-bold text-[#c9b4ff]">
                            {
                              resource.value
                            }
                          </span>
                        </div>
                      )
                    }
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="dashboard-accent mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">
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
                      d="M12 3a9 9 0 1 0 9 9h-9V3Zm3 0v6h6A9 9 0 0 0 15 3Z"
                    />
                  </svg>
                </div>

                <h3 className="dashboard-theme-text dashboard-heading font-semibold text-[#f3f0ff]">
                  No generated resources yet
                </h3>

                <p className="dashboard-theme-text dashboard-body mt-2 max-w-sm text-sm leading-6 text-[#898cc0]">
                  Generate summaries, flashcards, quizzes or explanations and their distribution will appear here.
                </p>
              </div>
            )}
          </div>


          {generatedResourceTotal > 0 && (
            <div className="dashboard-theme-border dashboard-section-border flex justify-end border-t border-[#2a1b4d] px-6 py-4">
              <Link
                to="/progress"
                className="dashboard-theme-text dashboard-accent dashboard-link text-sm font-semibold text-[#a97cff]"
              >
                View all resources →
              </Link>
            </div>
          )}
        </div>

      </section>

      {/* Dashboard Detail Panels */}
      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        {/* Recent Activity */}
        <div className="dashboard-theme-surface dashboard-surface flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#2a1b4d] bg-[#160b32]">
          <div className="dashboard-theme-border dashboard-section-border border-b border-[#2a1b4d] px-6 py-5">
            <p className="dashboard-theme-text dashboard-accent mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
              Activity
            </p>

            <h2 className="dashboard-theme-text dashboard-heading text-xl font-bold text-[#f3f0ff]">
              Recent Activity
            </h2>

            <p className="dashboard-theme-text dashboard-body mt-1 text-sm text-[#898cc0]">
              Your latest StudyA actions.
            </p>
          </div>


          <div className="flex-1 px-6">
            {progressLoading && (
              <div className="flex min-h-[270px] items-center justify-center gap-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

                <p className="dashboard-theme-text dashboard-body text-sm text-[#898cc0]">
                  Loading recent activity...
                </p>
              </div>
            )}


            {!progressLoading &&
              !progressError &&
              recentDashboardActivity.length ===
                0 && (
                <div className="flex min-h-[270px] flex-col items-center justify-center text-center">
                  <div className="dashboard-accent mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">
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
                        d="M12 6v6l4 2M12 3a9 9 0 1 0 9 9"
                      />
                    </svg>
                  </div>

                  <h3 className="dashboard-theme-text dashboard-heading font-semibold text-[#f3f0ff]">
                    No recent activity
                  </h3>

                  <p className="dashboard-theme-text dashboard-body mt-2 text-sm text-[#898cc0]">
                    Your latest study actions will appear here.
                  </p>
                </div>
              )}


            {!progressLoading &&
              !progressError &&
              recentDashboardActivity.map(
                (
                  activity,
                  index
                ) => (
                  <div
                    key={
                      activity.activity_id ||
                      `${activity.activity_type}-${activity.occurred_at}-${index}`
                    }
                    className="dashboard-theme-border flex min-h-[78px] items-center gap-4 border-b border-[#2a1b4d] py-4 last:border-b-0"
                  >
                    <div className="dashboard-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#7a44ff]/20 bg-[#7a44ff]/10 text-[#a97cff]">
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
                          d="M5 12h14M12 5v14"
                        />
                      </svg>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="dashboard-theme-text dashboard-heading truncate text-sm font-semibold text-[#f3f0ff]">
                        {getDashboardActivityLabel(
                          activity.activity_type
                        )}
                      </p>

                      <p className="dashboard-theme-text dashboard-muted mt-1 truncate text-xs text-[#727494]">
                        {activity.detail ||
                          'StudyA activity'}
                      </p>
                    </div>

                    <p className="dashboard-theme-text dashboard-body shrink-0 text-right text-xs text-[#898cc0]">
                      {formatDashboardActivityDate(
                        activity.occurred_at
                      )}
                    </p>
                  </div>
                )
              )}


            {!progressLoading &&
              progressError && (
                <div className="flex min-h-[270px] items-center justify-center text-center">
                  <p className="dashboard-theme-text dashboard-error-text max-w-sm text-sm text-red-300">
                    Recent activity is currently unavailable.
                  </p>
                </div>
              )}
          </div>


          <div className="dashboard-theme-border dashboard-section-border flex justify-end border-t border-[#2a1b4d] px-6 py-4">
            <Link
              to="/progress"
              className="dashboard-theme-text dashboard-accent dashboard-link text-sm font-semibold text-[#a97cff]"
            >
              View all activity →
            </Link>
          </div>
        </div>


        {/* Upcoming Study Plans */}
        <div className="dashboard-theme-surface dashboard-surface flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#2a1b4d] bg-[#160b32]">
          <div className="dashboard-theme-border dashboard-section-border border-b border-[#2a1b4d] px-6 py-5">
            <p className="dashboard-theme-text dashboard-accent mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
              Study Planner
            </p>

            <h2 className="dashboard-theme-text dashboard-heading text-xl font-bold text-[#f3f0ff]">
              Upcoming Study Plans
            </h2>

            <p className="dashboard-theme-text dashboard-body mt-1 text-sm text-[#898cc0]">
              Keep track of your nearest study deadlines.
            </p>
          </div>


          <div className="flex-1 px-6">
            {studyPlansLoading && (
              <div className="flex min-h-[270px] items-center justify-center gap-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

                <p className="dashboard-theme-text dashboard-body text-sm text-[#898cc0]">
                  Loading study plans...
                </p>
              </div>
            )}


            {!studyPlansLoading &&
              !studyPlansError &&
              upcomingStudyPlans.length ===
                0 && (
                <div className="flex min-h-[270px] flex-col items-center justify-center text-center">
                  <div className="dashboard-accent mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">
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
                        d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"
                      />
                    </svg>
                  </div>

                  <h3 className="dashboard-theme-text dashboard-heading font-semibold text-[#f3f0ff]">
                    No upcoming study plans
                  </h3>

                  <p className="dashboard-theme-text dashboard-body mt-2 max-w-sm text-sm text-[#898cc0]">
                    Create a study plan and its upcoming deadline will appear here.
                  </p>
                </div>
              )}


            {!studyPlansLoading &&
              !studyPlansError &&
              upcomingStudyPlans.map(
                (plan) => (
                  <Link
                    key={
                      plan.plan_id
                    }
                    to={`/study-plan/${plan.plan_id}`}
                    className="dashboard-theme-border dashboard-theme-interactive group flex min-h-[78px] items-center gap-4 border-b border-[#2a1b4d] py-4 last:border-b-0"
                  >
                    <div className="dashboard-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#7a44ff]/20 bg-[#7a44ff]/10 text-[#a97cff]">
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

                    <div className="min-w-0 flex-1">
                      <p className="dashboard-theme-text dashboard-heading truncate text-sm font-semibold text-[#f3f0ff] group-hover:text-[#c9b4ff]">
                        {plan.subject}
                      </p>

                      <p className="dashboard-theme-text dashboard-muted mt-1 truncate text-xs text-[#727494]">
                        {plan.topic}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="dashboard-theme-text dashboard-body text-xs font-medium text-[#898cc0]">
                        {formatPlanDeadline(
                          plan.deadline
                        )}
                      </p>

                      <p className="dashboard-theme-text dashboard-accent mt-1 text-xs font-semibold text-[#a97cff]">
                        {getDeadlineStatus(
                          plan.deadline
                        )}
                      </p>

                      <p className="dashboard-theme-text dashboard-muted mt-1 text-[11px] text-[#727494]">
                        {Number(
                          plan.available_hours ??
                            0
                        )}
                        {' '}hrs/week
                      </p>
                    </div>
                  </Link>
                )
              )}


            {!studyPlansLoading &&
              studyPlansError && (
                <div className="flex min-h-[270px] items-center justify-center text-center">
                  <p className="dashboard-theme-text dashboard-error-text max-w-sm text-sm text-red-300">
                    Upcoming study plans are currently unavailable.
                  </p>
                </div>
              )}
          </div>


          <div className="dashboard-theme-border dashboard-section-border flex justify-end border-t border-[#2a1b4d] px-6 py-4">
            <Link
              to="/study-plan"
              className="dashboard-theme-text dashboard-accent dashboard-link text-sm font-semibold text-[#a97cff]"
            >
              View study planner →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}


export default Dashboard