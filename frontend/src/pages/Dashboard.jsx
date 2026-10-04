import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getProgress } from '../services/progressService'

import {
  Area,
  AreaChart,
  CartesianGrid,
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


  return (
    <div className="dashboard-theme mx-auto max-w-7xl">
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


      {/* Quick Actions */}
      <section className="mt-10">
        <div className="mb-5">
          <p className="dashboard-theme-text dashboard-accent mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
            Shortcuts
          </p>

          <h2 className="dashboard-theme-text dashboard-heading text-xl font-bold text-[#f3f0ff]">
            Quick Actions
          </h2>
        </div>


        <div className="grid gap-5 md:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              className="dashboard-theme-surface dashboard-action-card group rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6 hover:-translate-y-1 hover:border-[#7a44ff]/50 hover:bg-[#19103a] hover:shadow-[0_12px_35px_rgba(122,68,255,0.12)]"
            >
              <div className="dashboard-accent mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-[#7a44ff]/20 bg-[#7a44ff]/10 text-[#a97cff]">
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

              <h3 className="dashboard-theme-text dashboard-heading text-base font-bold text-[#f3f0ff]">
                {action.title}
              </h3>

              <p className="dashboard-theme-text dashboard-body mt-2 min-h-10 text-sm leading-6 text-[#898cc0]">
                {action.description}
              </p>

              <div className="dashboard-theme-text dashboard-accent mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#a97cff]">
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


      {/* Quiz Performance Trend */}
      <section className="mt-8">
        <div className="dashboard-theme-surface dashboard-surface overflow-hidden rounded-xl border border-[#2a1b4d] bg-[#160b32]">
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
      </section>
    </div>
  )
}


export default Dashboard