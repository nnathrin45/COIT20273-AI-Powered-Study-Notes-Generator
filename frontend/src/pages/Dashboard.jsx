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

  const [progressError, setProgressError] = useState('')

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

  const quizTrendData = (
    progress?.recent_attempts ?? []
  )
    .slice()
    .reverse()
    .map((attempt) => {
      const attemptDate = new Date(
        attempt.attempted_at
      )

      return {
        attemptId: attempt.attempt_id,

        dateKey: attemptDate.toLocaleDateString(
          'en-CA'
        ),

        dateOnly: attemptDate.toLocaleDateString(
          'en-AU',
          {
            day: 'numeric',
            month: 'short',
          }
        ),

        timeOnly: attemptDate.toLocaleTimeString(
          'en-AU',
          {
            hour: 'numeric',
            minute: '2-digit',
          }
),

        fullDate: attemptDate.toLocaleString(
          'en-AU',
          {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }
        ),

        percentage: Number(
          attempt.percentage ?? 0
        ),

        score: Number(
          attempt.score ?? 0
        ),

        total: Number(
          attempt.total ?? 0
        ),

        title:
          attempt.quiz_title ||
          'Practice Quiz',
      }
    })
  
  const quizDateCounts =
    quizTrendData.reduce((counts, attempt) => {
      counts[attempt.dateKey] =
        (counts[attempt.dateKey] || 0) + 1

      return counts
    }, {})

  const quizChartData =
    quizTrendData.map((attempt) => ({
      ...attempt,

      date:
        quizDateCounts[attempt.dateKey] > 1
          ? `${attempt.dateOnly} ${attempt.timeOnly}`
          : attempt.dateOnly,
    }))

  const latestQuizAttempt =
    quizChartData.length > 0
      ? quizChartData[quizChartData.length - 1]
      : null
  
  const previousQuizAttempt =
    quizChartData.length > 1
      ? quizChartData[quizChartData.length - 2]
      : null

  const quizPerformanceChange =
    latestQuizAttempt && previousQuizAttempt
      ? latestQuizAttempt.percentage -
        previousQuizAttempt.percentage
      : null
      
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
      
      {/* Quiz Performance Trend */}
      <section className="mt-8">

        <div className="overflow-hidden rounded-xl border border-[#2a1b4d] bg-[#160b32]">

          {/* Header */}
          <div className="flex flex-col gap-4 border-b border-[#2a1b4d] px-6 py-5 sm:flex-row sm:items-start sm:justify-between">

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
                Performance
              </p>

              <h2 className="text-xl font-bold text-[#f3f0ff]">
                Quiz Performance Trend
              </h2>

              <p className="mt-1 text-sm text-[#898cc0]">
                Track your quiz scores across your most recent attempts.
              </p>
            </div>

            {latestQuizAttempt && (
              <div className="flex shrink-0 items-center gap-2">

                {quizPerformanceChange !== null && (
                  <div
                    className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                      quizPerformanceChange > 0
                        ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                        : quizPerformanceChange < 0
                          ? 'border-red-400/20 bg-red-400/10 text-red-300'
                          : 'border-[#2a1b4d] bg-[#191426] text-[#898cc0]'
                    }`}
                  >
                    {quizPerformanceChange > 0
                      ? '↑ '
                      : quizPerformanceChange < 0
                        ? '↓ '
                        : ''}

                    {Math.abs(quizPerformanceChange)} pts
                  </div>
                )}

                <div className="rounded-full border border-[#7a44ff]/30 bg-[#7a44ff]/10 px-4 py-2">
                  <span className="text-xs text-[#898cc0]">
                    Latest
                  </span>

                  <span className="ml-2 text-sm font-bold text-[#c9b4ff]">
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
                        stroke="#2A1B4D"
                        strokeDasharray="3 6"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: '#898CC0',
                          fontSize: 12,
                        }}
                        dy={10}
                      />

                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: '#898CC0',
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
                            <div className="min-w-[190px] rounded-lg border border-[#3a2860] bg-[#120928] p-4 shadow-xl">

                              <p className="text-xs font-medium text-[#898cc0]">
                                {attempt.fullDate}
                              </p>

                              <p className="mt-2 text-sm font-semibold text-[#f3f0ff]">
                                {attempt.title}
                              </p>

                              <div className="mt-3 flex items-end justify-between gap-6">

                                <div>
                                  <p className="text-xs text-[#898cc0]">
                                    Score
                                  </p>

                                  <p className="mt-1 text-lg font-bold text-[#c9b4ff]">
                                    {attempt.percentage}%
                                  </p>
                                </div>

                                <div className="text-right">
                                  <p className="text-xs text-[#898cc0]">
                                    Correct
                                  </p>

                                  <p className="mt-1 text-sm font-semibold text-[#f3f0ff]">
                                    {attempt.score} / {attempt.total}
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
                          stroke: '#160B32',
                          strokeWidth: 2,
                        }}
                      />

                    </AreaChart>
                  </ResponsiveContainer>

                </div>

                {quizChartData.length === 1 && (
                  <p className="mt-2 text-center text-xs text-[#727494]">
                    Complete another practice quiz to start
                    building your performance trend.
                  </p>
                )}
              </>
            ) : (
              <div className="flex min-h-[250px] flex-col items-center justify-center text-center">

                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">

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

                <h3 className="font-semibold text-[#f3f0ff]">
                  No quiz performance yet
                </h3>

                <p className="mt-2 max-w-md text-sm text-[#898cc0]">
                  Complete a practice quiz and your score
                  history will appear here.
                </p>

                <Link
                  to="/quiz"
                  className="mt-5 text-sm font-semibold text-[#a97cff] transition hover:text-[#d6c7ff]"
                >
                  Start a Practice Quiz →
                </Link>

              </div>
            )}

          </div>

          {/* Footer */}
          {quizChartData.length > 0 && (
            <div className="flex justify-end border-t border-[#2a1b4d] px-6 py-4">

              <Link
                to="/progress"
                className="text-sm font-semibold text-[#a97cff] transition hover:text-[#d6c7ff]"
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