import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router'
import { logoutUser } from '../services/authService'
import {
  getProfilePicture,
  getUserProfile,
} from '../services/profileService'
import FirstLoginConsentModal from './FirstLoginConsentModal'
import { getConsentStatus } from '../services/consentService'
import StudyALogo from './StudyALogo'
import StudyAOrbitDecoration from './StudyAOrbitDecoration'
import StudyABackgroundVideo from './StudyABackgroundVideo'


const THEME_STORAGE_KEY = 'studya-theme'


const surfaceThemeTransition = {
  transition:
    'background-color 500ms ease, border-color 500ms ease, box-shadow 500ms ease',
}


const textThemeTransition = {
  transition: 'color 100ms ease',
}


const interactiveThemeTransition = {
  transition:
    'color 100ms ease, background-color 300ms ease, border-color 300ms ease, box-shadow 300ms ease',
}


const dropdownThemeTransition = {
  transition:
    'opacity 300ms ease, transform 300ms ease, visibility 300ms ease, background-color 500ms ease, border-color 500ms ease, box-shadow 500ms ease, color 100ms ease',
}


import StudySessionNotifications from './StudySessionNotifications'
import { getProgress } from '../services/progressService'

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'

const menuItems = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13h8V3H3v10Zm10 8h8V11h-8v10ZM3 21h8v-6H3v6Zm10-12h8V3h-8v6Z"
      />
    ),
  },
  {
    name: 'Upload Material',
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
    name: 'Summaries',
    path: '/summaries',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 4h12M6 8h12M6 12h8M6 16h10M6 20h7"
      />
    ),
  },
  {
    name: 'Flashcards',
    path: '/flashcards',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 5h12a2 2 0 0 1 2 2v10H7a2 2 0 0 1-2-2V5Zm2 12v2h12"
      />
    ),
  },
  {
    name: 'Practice Quiz',
    path: '/quiz',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 9a3 3 0 1 1 5.5 1.7c-.9 1.2-2.5 1.5-2.5 3.3m0 4h.01M4 4h16v16H4V4Z"
      />
    ),
  },
  {
    name: 'Concept Explanation',
    path: '/explanation',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 18h6m-5 3h4m-5-6c-1.8-1.1-3-3.1-3-5.3A6 6 0 0 1 18 9.7c0 2.2-1.2 4.2-3 5.3-.7.4-1 1-1 1.5h-4c0-.5-.3-1.1-1-1.5Z"
      />
    ),
  },
  {
    name: 'Study Planner',
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
    name: 'Saved Materials',
    path: '/saved-materials',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 4h12v17l-6-4-6 4V4Z"
      />
    ),
  },
  {
    name: 'Progress',
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


const SIDEBAR_SECTIONS_STORAGE_KEY =
  'studya-sidebar-sections'


const DEFAULT_SIDEBAR_SECTIONS = {
  main: true,
  studyTools: true,
  organise: true,
  insights: true,
}


const sidebarSections = [
  {
    key: 'main',
    label: 'Main',
    paths: [
      '/dashboard',
    ],
  },
  {
    key: 'studyTools',
    label: 'Study Tools',
    paths: [
      '/upload',
      '/summaries',
      '/flashcards',
      '/quiz',
      '/explanation',
    ],
  },
  {
    key: 'organise',
    label: 'Organise',
    paths: [
      '/study-plan',
      '/saved-materials',
    ],
  },
  {
    key: 'insights',
    label: 'Insights',
    paths: [
      '/progress',
    ],
  },
]

function MenuIcon({ children }) {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-[18px] w-[18px] shrink-0"
    >
      {children}
    </svg>
  )
}


function SidebarContent({
  onNavigate,
  theme,
}) {
  const isLight =
    theme === 'light'


  const [
    sidebarProgress,
    setSidebarProgress,
  ] = useState(null)

  const [
    sidebarProgressLoading,
    setSidebarProgressLoading,
  ] = useState(true)

  const [
    sidebarProgressError,
    setSidebarProgressError,
  ] = useState('')


  useEffect(() => {
    let active = true

    const loadSidebarProgress =
      async () => {
        setSidebarProgressLoading(
          true
        )

        setSidebarProgressError(
          ''
        )

        try {
          const response =
            await getProgress(
              'week'
            )

          if (!active) {
            return
          }

          if (!response.ok) {
            setSidebarProgressError(
              response.data?.message ||
                'Unable to load study activity.'
            )

            return
          }

          setSidebarProgress(
            response.data?.progress ??
              null
          )
        } catch (
          sidebarProgressLoadError
        ) {
          if (!active) {
            return
          }

          console.error(
            'Sidebar study activity load error:',
            sidebarProgressLoadError
          )

          setSidebarProgressError(
            'Unable to load study activity.'
          )
        } finally {
          if (active) {
            setSidebarProgressLoading(
              false
            )
          }
        }
      }

    loadSidebarProgress()

    return () => {
      active = false
    }
  }, [])


  const sidebarActivityData =
    (
      sidebarProgress?.weekly_activity ??
      []
    ).map((entry) => {
      const dateMatch =
        /^(\d{4})-(\d{2})-(\d{2})$/.exec(
          String(
            entry.date || ''
          )
        )

      let dayLabel =
        String(
          entry.date || ''
        )

      let fullDateLabel =
        dayLabel

      if (dateMatch) {
        const activityDate =
          new Date(
            Number(
              dateMatch[1]
            ),
            Number(
              dateMatch[2]
            ) - 1,
            Number(
              dateMatch[3]
            )
          )

        dayLabel =
          activityDate
            .toLocaleDateString(
              'en-AU',
              {
                weekday: 'short',
              }
            )

        fullDateLabel =
          activityDate
            .toLocaleDateString(
              'en-AU',
              {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              }
            )
      }

      return {
        date:
          String(
            entry.date || ''
          ),

        day:
          dayLabel,

        fullDate:
          fullDateLabel,

        count:
          Number(
            entry.count ?? 0
          ),
      }
    })


  const weeklyActivityTotal =
    sidebarActivityData.reduce(
      (
        total,
        activity
      ) =>
        total +
        activity.count,
      0
    )


  const hasWeeklyActivity =
    weeklyActivityTotal > 0

  const [
    openSections,
    setOpenSections,
  ] = useState(() => {
    try {
      const stored =
        window.localStorage.getItem(
          SIDEBAR_SECTIONS_STORAGE_KEY
        )

      if (!stored) {
        return {
          ...DEFAULT_SIDEBAR_SECTIONS,
        }
      }

      const parsed =
        JSON.parse(stored)

      if (
        !parsed ||
        typeof parsed !== 'object'
      ) {
        return {
          ...DEFAULT_SIDEBAR_SECTIONS,
        }
      }

      return {
        ...DEFAULT_SIDEBAR_SECTIONS,
        ...parsed,
      }
    } catch {
      return {
        ...DEFAULT_SIDEBAR_SECTIONS,
      }
    }
  })


  useEffect(() => {
    try {
      window.localStorage.setItem(
        SIDEBAR_SECTIONS_STORAGE_KEY,
        JSON.stringify(
          openSections
        )
      )
    } catch {
      // Ignore storage errors.
    }
  }, [openSections])


  const toggleSection =
    (sectionKey) => {
      setOpenSections(
        (current) => ({
          ...current,

          [sectionKey]:
            !current[
              sectionKey
            ],
        })
      )
    }


  const getNavigationClass =
    (isActive) =>
      `group relative flex items-center gap-3 overflow-hidden rounded-lg px-4 py-3 text-sm font-medium ${
        isActive
          ? isLight
            ? 'bg-[#7a44ff]/10 text-[#7a44ff] shadow-[inset_0_0_20px_rgba(122,68,255,0.04)] before:absolute before:bottom-2 before:left-0 before:top-2 before:w-[3px] before:rounded-full before:bg-[#7a44ff] before:shadow-[0_0_12px_rgba(122,68,255,0.35)]'
            : 'bg-[#7a44ff]/15 text-[#b995ff] shadow-[inset_0_0_20px_rgba(122,68,255,0.05)] before:absolute before:bottom-2 before:left-0 before:top-2 before:w-[3px] before:rounded-full before:bg-[#a97cff] before:shadow-[0_0_12px_rgba(169,124,255,0.65)]'
          : isLight
            ? 'text-[#65676b] hover:bg-[#7a44ff]/[0.06] hover:text-[#171717]'
            : 'text-[#898cc0] hover:bg-white/[0.05] hover:text-[#d1cbea]'
      }`


  return (
    <>
      {/* Brand */}
      <div
        className={`flex h-20 items-center border-b px-4 ${
          isLight
            ? 'border-[#dfdfdf]'
            : 'border-[#2a1b4d]'
        }`}
        style={
          surfaceThemeTransition
        }
      >
        <StudyALogo
          alt="Study AI - AI-Powered Study Notes"
          className="h-auto w-full max-w-[220px] object-contain"
        />
      </div>


      {/* Grouped Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <nav
          className="space-y-4"
          aria-label="Main navigation"
        >
          {sidebarSections.map(
            (section) => {
              const isOpen =
                openSections[
                  section.key
                ] !== false

              const sectionItems =
                section.paths
                  .map(
                    (path) =>
                      menuItems.find(
                        (item) =>
                          item.path ===
                          path
                      )
                  )
                  .filter(Boolean)

              return (
                <div
                  key={
                    section.key
                  }
                >
                  {/* Section heading */}
                  <button
                    type="button"
                    onClick={() =>
                      toggleSection(
                        section.key
                      )
                    }
                    aria-expanded={
                      isOpen
                    }
                    aria-controls={`sidebar-section-${section.key}`}
                    style={
                      interactiveThemeTransition
                    }
                    className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] ${
                      isLight
                        ? 'text-[#6c757d] hover:bg-[#7a44ff]/[0.05] hover:text-[#7a44ff]'
                        : 'text-[#727494] hover:bg-white/[0.04] hover:text-[#b995ff]'
                    }`}
                  >
                    <span>
                      {
                        section.label
                      }
                    </span>

                    <svg
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`h-3.5 w-3.5 transition-transform duration-300 ${
                        isOpen
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


                  {/* Section links */}
                  <div
                    id={`sidebar-section-${section.key}`}
                    aria-hidden={
                      !isOpen
                    }
                    className={`grid transition-all duration-300 ease-in-out ${
                      isOpen
                        ? 'visible grid-rows-[1fr] opacity-100'
                        : 'invisible grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="mt-1 space-y-1.5">
                        {sectionItems.map(
                          (item) => (
                            <NavLink
                              key={
                                item.path
                              }
                              to={
                                item.path
                              }
                              onClick={
                                onNavigate
                              }
                              style={
                                interactiveThemeTransition
                              }
                              className={({
                                isActive,
                              }) =>
                                getNavigationClass(
                                  isActive
                                )
                              }
                            >
                              <span className="flex shrink-0 transition-transform duration-300 group-hover:scale-110">
                                <MenuIcon>
                                  {
                                    item.icon
                                  }
                                </MenuIcon>
                              </span>

                              <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                                {
                                  item.name
                                }
                              </span>
                            </NavLink>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
          )}
        </nav>
      </div>


      {/* Weekly Study Activity */}
      <div className="shrink-0 px-4 pb-5">
        <NavLink
          to="/progress"
          onClick={onNavigate}
          style={
            surfaceThemeTransition
          }
          className={`group block overflow-hidden rounded-xl border p-4 ${
            isLight
              ? 'border-[#ded8e8] bg-gradient-to-br from-white to-[#f7f3ff] shadow-[0_10px_30px_rgba(87,61,128,0.08)] hover:border-[#7a44ff]/40'
              : 'border-[#39245f] bg-gradient-to-br from-[#211044] to-[#160b32] shadow-[0_10px_30px_rgba(0,0,0,0.20)] hover:border-[#7a44ff]/50'
          }`}
          aria-label="View weekly study activity in Progress"
        >
          {/* Card Heading */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${
                  isLight
                    ? 'text-[#7a44ff]'
                    : 'text-[#a97cff]'
                }`}
                style={
                  textThemeTransition
                }
              >
                Study Activity
              </p>

              <div className="mt-1 flex items-end gap-2">
                <span
                  className={`text-2xl font-bold ${
                    isLight
                      ? 'text-[#171717]'
                      : 'text-[#f3f0ff]'
                  }`}
                  style={
                    textThemeTransition
                  }
                >
                  {sidebarProgressLoading
                    ? '—'
                    : weeklyActivityTotal}
                </span>

                <span
                  className={`pb-0.5 text-[11px] ${
                    isLight
                      ? 'text-[#747078]'
                      : 'text-[#898cc0]'
                  }`}
                  style={
                    textThemeTransition
                  }
                >
                  actions this week
                </span>
              </div>
            </div>


            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition duration-300 group-hover:translate-x-0.5 ${
                isLight
                  ? 'bg-[#7a44ff]/10 text-[#7a44ff]'
                  : 'bg-[#7a44ff]/15 text-[#b995ff]'
              }`}
            >
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
                  d="m9 18 6-6-6-6"
                />
              </svg>
            </div>
          </div>


          {/* Loading */}
          {sidebarProgressLoading && (
            <div className="mt-4 flex h-[92px] items-center justify-center">
              <div
                className={`h-5 w-5 animate-spin rounded-full border-2 ${
                  isLight
                    ? 'border-[#7a44ff]/20 border-t-[#7a44ff]'
                    : 'border-[#a97cff]/20 border-t-[#a97cff]'
                }`}
              />
            </div>
          )}


          {/* Error */}
          {!sidebarProgressLoading &&
            sidebarProgressError && (
              <div className="mt-4 flex h-[92px] items-center justify-center px-2 text-center">
                <p
                  className={`text-xs leading-5 ${
                    isLight
                      ? 'text-[#747078]'
                      : 'text-[#898cc0]'
                  }`}
                >
                  Study activity is currently unavailable.
                </p>
              </div>
            )}


          {/* Empty Week */}
          {!sidebarProgressLoading &&
            !sidebarProgressError &&
            !hasWeeklyActivity && (
              <div className="mt-4 flex h-[92px] flex-col items-center justify-center text-center">
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className={`mb-2 h-5 w-5 ${
                    isLight
                      ? 'text-[#9a83d4]'
                      : 'text-[#8b6bc5]'
                  }`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 18 9 13l3 3 7-8"
                  />
                </svg>

                <p
                  className={`text-xs ${
                    isLight
                      ? 'text-[#747078]'
                      : 'text-[#898cc0]'
                  }`}
                >
                  No activity recorded this week.
                </p>
              </div>
            )}


          {/* Seven-Day Area Chart */}
          {!sidebarProgressLoading &&
            !sidebarProgressError &&
            hasWeeklyActivity && (
              <div className="mt-3 h-[105px] w-full">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <AreaChart
                    data={
                      sidebarActivityData
                    }
                    margin={{
                      top: 8,
                      right: 3,
                      bottom: 0,
                      left: 3,
                    }}
                  >
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      tick={{
                        fill: isLight
                          ? '#8b8591'
                          : '#727494',

                        fontSize: 9,
                      }}
                      dy={5}
                    />

                    <Tooltip
                      cursor={{
                        stroke:
                          'rgba(122,68,255,0.20)',
                      }}
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

                        const activity =
                          payload[0]
                            .payload

                        return (
                          <div
                            className={`rounded-lg border px-3 py-2 shadow-xl ${
                              isLight
                                ? 'border-[#ded8e8] bg-white'
                                : 'border-[#39245f] bg-[#120928]'
                            }`}
                          >
                            <p
                              className={`text-[10px] ${
                                isLight
                                  ? 'text-[#747078]'
                                  : 'text-[#898cc0]'
                              }`}
                            >
                              {
                                activity.fullDate
                              }
                            </p>

                            <p
                              className={`mt-1 text-xs font-semibold ${
                                isLight
                                  ? 'text-[#6530d6]'
                                  : 'text-[#c9b4ff]'
                              }`}
                            >
                              {
                                activity.count
                              }{' '}
                              {activity.count ===
                              1
                                ? 'activity'
                                : 'activities'}
                            </p>
                          </div>
                        )
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#A77BFF"
                      strokeWidth={2.2}
                      fill="#7A44FF"
                      fillOpacity={
                        isLight
                          ? 0.12
                          : 0.20
                      }
                      dot={false}
                      activeDot={{
                        r: 3.5,
                        fill: '#D83DFF',
                        strokeWidth: 0,
                      }}
                      isAnimationActive
                      animationDuration={
                        600
                      }
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}


          <div
            className={`mt-3 border-t pt-3 ${
              isLight
                ? 'border-[#e5e1ec]'
                : 'border-[#39245f]'
            }`}
            style={{
              transition:
                'border-color 500ms ease',
            }}
          >
            <p
              className={`text-[10px] ${
                isLight
                  ? 'text-[#8a858e]'
                  : 'text-[#727494]'
              }`}
              style={
                textThemeTransition
              }
            >
              Uploads, AI resources, quizzes and study plans
            </p>
          </div>
        </NavLink>
      </div>
    </>
  )
}

function AppLayout() {
  const [theme, setTheme] = useState(() => {
    const savedTheme =
      localStorage.getItem(
        THEME_STORAGE_KEY
      )

    return savedTheme === 'light'
      ? 'light'
      : 'dark'
  })


  useLayoutEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute(
        'data-theme-mode',
        'light'
      )
    } else {
      document.documentElement.removeAttribute(
        'data-theme-mode'
      )
    }

    document.documentElement.style.colorScheme =
      theme

    localStorage.setItem(
      THEME_STORAGE_KEY,
      theme
    )
  }, [theme])


  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === 'dark'
        ? 'light'
        : 'dark'
    )
  }


  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false)

  const [profileMenuOpen, setProfileMenuOpen] =
    useState(false)

  const [
    firstLoginConsentOpen,
    setFirstLoginConsentOpen,
  ] = useState(false)

  const profileMenuRef = useRef(null)

  const navigate = useNavigate()

  const location = useLocation()

  const isLight = theme === 'light'


  useEffect(() => {
    let active = true

    const checkFirstLoginConsent = async () => {
      try {
        const response =
          await getConsentStatus()

        if (!active || !response.ok) {
          return
        }

        const currentConsent =
          response.data?.consent ?? null

        setFirstLoginConsentOpen(
          currentConsent === null
        )
      } catch (consentError) {
        console.error(
          'First-login consent check error:',
          consentError
        )
      }
    }

    checkFirstLoginConsent()

    return () => {
      active = false
    }
  }, [])


  const handleFirstLoginConsentResolved = (
    status
  ) => {
    setFirstLoginConsentOpen(false)

    window.dispatchEvent(
      new CustomEvent('consent-updated', {
        detail: {
          status,
        },
      })
    )
  }


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setProfileMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false)
      }
    }

    document.addEventListener(
      'mousedown',
      handleClickOutside
    )

    document.addEventListener(
      'keydown',
      handleEscape
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      )

      document.removeEventListener(
        'keydown',
        handleEscape
      )
    }
  }, [])


  const handleLogout = () => {
    logoutUser()

    setMobileMenuOpen(false)

    navigate('/login', {
      replace: true,
    })
  }


  const [userProfile, setUserProfile] =
    useState(null)

  const [
    headerProfilePicture,
    setHeaderProfilePicture,
  ] = useState(null)


  useEffect(() => {
    let active = true

    let currentPictureUrl = null

    const loadUserProfile = async () => {
      try {
        const response =
          await getUserProfile()

        if (
          !active ||
          !response.ok ||
          !response.data?.user
        ) {
          return
        }

        const user =
          response.data.user

        setUserProfile(user)

        if (currentPictureUrl) {
          URL.revokeObjectURL(
            currentPictureUrl
          )

          currentPictureUrl = null
        }

        if (user.profile_picture) {
          const pictureResponse =
            await getProfilePicture()

          if (
            active &&
            pictureResponse.ok &&
            pictureResponse.blob
          ) {
            currentPictureUrl =
              URL.createObjectURL(
                pictureResponse.blob
              )

            setHeaderProfilePicture(
              currentPictureUrl
            )
          } else if (active) {
            setHeaderProfilePicture(null)
          }
        } else {
          setHeaderProfilePicture(null)
        }
      } catch (error) {
        console.error(
          'Header profile fetch error:',
          error
        )
      }
    }

    loadUserProfile()

    window.addEventListener(
      'profile-updated',
      loadUserProfile
    )

    return () => {
      active = false

      window.removeEventListener(
        'profile-updated',
        loadUserProfile
      )

      if (currentPictureUrl) {
        URL.revokeObjectURL(
          currentPictureUrl
        )
      }
    }
  }, [])


  const profileDisplayName =
    userProfile?.full_name?.trim() ||
    'Student'

  const profileInitial =
    profileDisplayName
      .charAt(0)
      .toUpperCase()


  return (
    <div
      className={`min-h-screen ${isLight
          ? 'bg-[#eff1f5] text-[#171717]'
          : 'bg-[#120928] text-[#c2c4e4]'
        }`}
      style={{
        transition:
          'color 100ms ease, background-color 500ms ease',
      }}
    >
      {/* Desktop Sidebar */}
      <aside
        className={`studya-sidebar-surface fixed inset-y-0 left-0 z-40 hidden w-[280px] flex-col border-r lg:flex ${isLight
            ? 'border-[#dfdfdf] bg-white'
            : 'border-[#2a1b4d] bg-[#160b32]'
          }`}
        style={surfaceThemeTransition}
      >
        <SidebarContent
          theme={theme}
          onNavigate={() => { }}
        />
      </aside>


      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay */}
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() =>
              setMobileMenuOpen(false)
            }
            aria-label="Close navigation menu"
          />

          {/* Drawer */}
          <aside
            className={`studya-sidebar-surface relative z-10 flex h-full w-[280px] max-w-[85vw] flex-col border-r shadow-2xl ${isLight
                ? 'border-[#dfdfdf] bg-white'
                : 'border-[#2a1b4d] bg-[#160b32]'
              }`}
            style={surfaceThemeTransition}
          >
            {/* Close button */}
            <div className="absolute right-3 top-5 z-20">
              <button
                type="button"
                onClick={() =>
                  setMobileMenuOpen(false)
                }
                style={interactiveThemeTransition}
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${isLight
                    ? 'text-[#65676b] hover:bg-[#7a44ff]/[0.07] hover:text-[#171717]'
                    : 'text-[#898cc0] hover:bg-white/[0.05] hover:text-white'
                  }`}
                aria-label="Close navigation menu"
              >
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <SidebarContent
              theme={theme}
              onNavigate={() =>
                setMobileMenuOpen(false)
              }
            />
          </aside>
        </div>
      )}


      {/* Main Application Area */}
      <div
        className={`relative isolate min-h-screen lg:pl-[280px] ${isLight
            ? 'bg-[#eff1f5]'
            : 'bg-[#120928]'
          }`}
        style={surfaceThemeTransition}
      >
        {/* Shared animated workspace background */}
        <StudyABackgroundVideo />

        {/* Header */}
        <header
          className={`sticky top-0 z-30 h-20 border-b backdrop-blur ${isLight
              ? 'border-[#dfdfdf] bg-white/95'
              : 'border-[#2a1b4d] bg-[#120928]/95'
            }`}
          style={surfaceThemeTransition}
        >
          <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            {/* Left */}
            <div className="flex min-w-0 items-center gap-3">
              {/* Mobile Menu */}
              <button
                type="button"
                onClick={() =>
                  setMobileMenuOpen(true)
                }
                style={interactiveThemeTransition}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border lg:hidden ${isLight
                    ? 'border-[#dfdfdf] text-[#65676b] hover:border-[#7a44ff]/50 hover:bg-[#7a44ff]/10 hover:text-[#7a44ff]'
                    : 'border-[#2a1b4d] text-[#898cc0] hover:border-[#7a44ff]/50 hover:bg-[#7a44ff]/10 hover:text-[#a97cff]'
                  }`}
                aria-label="Open navigation menu"
              >
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              <div className="min-w-0">
                <p
                  className={`text-xs font-medium ${isLight
                      ? 'text-[#7a44ff]'
                      : 'text-[#a97cff]'
                    }`}
                  style={textThemeTransition}
                >
                  Student Workspace
                </p>

                <h2
                  className={`truncate text-sm font-semibold sm:text-base ${isLight
                      ? 'text-[#171717]'
                      : 'text-[#c2c4e4]'
                    }`}
                  style={textThemeTransition}
                >
                  AI-Powered Study Notes Generator
                </h2>
              </div>
            </div>


            {/* User Profile Menu + Notifications */}
            <div
              ref={profileMenuRef}
              className="relative flex shrink-0 items-center gap-2"
            >
              <StudySessionNotifications
                isLight={isLight}
                onOpen={() => {
                  setProfileMenuOpen(false)
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setProfileMenuOpen(
                    (current) => !current
                  )
                }
                style={interactiveThemeTransition}
                className={`group flex items-center gap-3 rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7a44ff]/40 ${profileMenuOpen
                    ? isLight
                      ? 'border-[#7a44ff]/30 bg-[#7a44ff]/10 shadow-[0_0_20px_rgba(122,68,255,0.08)]'
                      : 'border-[#7a44ff]/30 bg-[#7a44ff]/10 shadow-[0_0_20px_rgba(122,68,255,0.10)]'
                    : isLight
                      ? 'border-transparent hover:border-[#7a44ff]/15 hover:bg-[#7a44ff]/[0.05]'
                      : 'border-transparent hover:border-[#7a44ff]/15 hover:bg-white/[0.04]'
                  }`}
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
              >
                <div className="hidden text-right sm:block">
                  <p
                    className={`max-w-[180px] truncate text-sm font-semibold ${isLight
                        ? 'text-[#171717]'
                        : 'text-[#c2c4e4]'
                      }`}
                    style={textThemeTransition}
                    title={profileDisplayName}
                  >
                    {profileDisplayName}
                  </p>

                  <p
                    className={`text-xs ${isLight
                        ? 'text-[#65676b]'
                        : 'text-[#898cc0]'
                      }`}
                    style={textThemeTransition}
                  >
                    Learning workspace
                  </p>
                </div>

                <div className="relative">
                  <div
                    className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#7a44ff] to-[#d83dff] text-sm font-bold text-white ring-2 transition-all duration-300 ${profileMenuOpen
                        ? 'ring-[#a97cff]/50 shadow-[0_0_24px_rgba(122,68,255,0.45)]'
                        : 'ring-transparent shadow-[0_0_18px_rgba(122,68,255,0.3)] group-hover:ring-[#a97cff]/30'
                      }`}
                  >
                    {headerProfilePicture ? (
                      <img
                        src={headerProfilePicture}
                        alt={`${profileDisplayName} profile`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      profileInitial
                    )}
                  </div>

                  {/* Online indicator */}
                  <span
                    className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 bg-emerald-400 ${isLight
                        ? 'border-white'
                        : 'border-[#120928]'
                      }`}
                    style={{
                      transition:
                        'border-color 500ms ease',
                    }}
                  />
                </div>

                {/* Chevron */}
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`hidden h-4 w-4 transition-transform duration-300 sm:block ${profileMenuOpen
                      ? isLight
                        ? 'rotate-180 text-[#7a44ff]'
                        : 'rotate-180 text-[#a97cff]'
                      : isLight
                        ? 'text-[#65676b] group-hover:text-[#171717]'
                        : 'text-[#898cc0] group-hover:text-[#c2c4e4]'
                    }`}
                  style={textThemeTransition}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m6 9 6 6 6-6"
                  />
                </svg>
              </button>


              {/* Dropdown */}
              <div
                role="menu"
                aria-hidden={!profileMenuOpen}
                style={dropdownThemeTransition}
                className={`absolute right-0 top-[calc(100%+10px)] z-50 w-64 origin-top-right overflow-hidden rounded-xl border p-2 ${isLight
                    ? 'border-[#dfdfdf] bg-white shadow-[0_20px_50px_rgba(50,39,75,0.14)]'
                    : 'border-[#39245f] bg-[#160b32] shadow-[0_20px_50px_rgba(0,0,0,0.45)]'
                  } ${profileMenuOpen
                    ? 'visible translate-y-0 scale-100 opacity-100'
                    : 'invisible pointer-events-none -translate-y-2 scale-95 opacity-0'
                  }`}
              >
                {/* User information */}
                <div
                  className={`border-b px-3 py-3 ${isLight
                      ? 'border-[#dfdfdf]'
                      : 'border-[#2a1b4d]'
                    }`}
                  style={{
                    transition:
                      'border-color 500ms ease',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#7a44ff] to-[#d83dff] font-bold text-white">
                        {headerProfilePicture ? (
                          <img
                            src={headerProfilePicture}
                            alt={`${profileDisplayName} profile`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          profileInitial
                        )}
                      </div>

                      <span
                        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 bg-emerald-400 ${isLight
                            ? 'border-white'
                            : 'border-[#160b32]'
                          }`}
                        style={{
                          transition:
                            'border-color 500ms ease',
                        }}
                      />
                    </div>

                    <div className="min-w-0">
                      <p
                        className={`truncate text-sm font-semibold ${isLight
                            ? 'text-[#171717]'
                            : 'text-white'
                          }`}
                        style={textThemeTransition}
                        title={profileDisplayName}
                      >
                        {profileDisplayName}
                      </p>

                      <p
                        className={`text-xs ${isLight
                            ? 'text-[#65676b]'
                            : 'text-[#898cc0]'
                          }`}
                        style={textThemeTransition}
                      >
                        Learning workspace
                      </p>
                    </div>
                  </div>
                </div>


                <div className="py-2">
                  {/* Profile Settings */}
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false)
                      navigate('/profile')
                    }}
                    style={interactiveThemeTransition}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium ${isLight
                        ? 'text-[#404040] hover:bg-[#7a44ff]/10 hover:text-[#7a44ff]'
                        : 'text-[#c2c4e4] hover:bg-[#7a44ff]/10 hover:text-[#a97cff]'
                      }`}
                  >
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
                        d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Zm7-3.5a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.5 1a8 8 0 0 0-2-1.2L14 3h-4l-.4 2.6a8 8 0 0 0-2 1.2l-2.5-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.5-1a8 8 0 0 0 2 1.2L10 21h4l.4-2.6a8 8 0 0 0 2-1.2l2.5 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z"
                      />
                    </svg>

                    Profile Settings
                  </button>


                  {/* Privacy */}
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false)
                      navigate('/privacy')
                    }}
                    style={interactiveThemeTransition}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium ${isLight
                        ? 'text-[#404040] hover:bg-[#7a44ff]/10 hover:text-[#7a44ff]'
                        : 'text-[#c2c4e4] hover:bg-[#7a44ff]/10 hover:text-[#a97cff]'
                      }`}
                  >
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
                        d="M12 3 5 6v5c0 4.5 2.8 8.3 7 10 4.2-1.7 7-5.5 7-10V6l-7-3Zm0 5v4m0 4h.01"
                      />
                    </svg>

                    Privacy & Consent
                  </button>
                </div>


                <div
                  className={`border-t pt-2 ${isLight
                      ? 'border-[#dfdfdf]'
                      : 'border-[#2a1b4d]'
                    }`}
                  style={{
                    transition:
                      'border-color 500ms ease',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={interactiveThemeTransition}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-red-500/10 hover:text-red-400 ${isLight
                        ? 'text-[#404040]'
                        : 'text-[#c2c4e4]'
                      }`}
                  >
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
                        d="M10 5H5v14h5m4-4 4-3-4-3m4 3H9"
                      />
                    </svg>

                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>


        {/* Page Content */}
        <main className="relative z-10 p-4 sm:p-6 lg:p-8">
          <div
            className={`mx-auto w-full ${
              location.pathname.startsWith('/dashboard') ||
              location.pathname.startsWith('/upload') ||
              location.pathname.startsWith('/summaries') ||
              location.pathname.startsWith('/flashcards') ||
              location.pathname.startsWith('/quiz') ||
              location.pathname.startsWith('/explanation') ||
              location.pathname.startsWith('/study-plan') ||
              location.pathname.startsWith('/progress')
                ? 'max-w-[1660px]'
                : 'max-w-[1500px]'
            }`}
          >
            <div
              key={location.pathname}
              className="app-page-transition"
            >
              <Outlet />
            </div>
          </div>
        </main>
      </div>


      {/* Fixed decorative orbit */}
      <StudyAOrbitDecoration />

      {/* Theme Switch */}
      <button
        type="button"
        onClick={toggleTheme}
        style={{
          transition:
            'width 300ms ease, color 100ms ease, background-color 500ms ease, border-color 500ms ease, box-shadow 500ms ease',
        }}
        className={`fixed right-0 top-1/2 z-[60] flex h-12 w-11 -translate-y-1/2 items-center justify-center rounded-l-xl border border-r-0 backdrop-blur hover:w-12 ${isLight
            ? 'border-[#dfdfdf] bg-white text-[#7a44ff] shadow-[0_8px_24px_rgba(73,52,117,0.15)] hover:border-[#7a44ff]/60 hover:text-[#6634e8]'
            : 'border-[#39245f] bg-[#160b32] text-[#c9b4ff] shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:border-[#7a44ff]/60 hover:text-[#a97cff]'
          }`}
        aria-label={
          theme === 'dark'
            ? 'Switch to light mode'
            : 'Switch to dark mode'
        }
        title={
          theme === 'dark'
            ? 'Switch to light mode'
            : 'Switch to dark mode'
        }
      >
        {theme === 'dark' ? (
          /* Sun */
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5 transition-transform duration-300"
          >
            <circle
              cx="12"
              cy="12"
              r="4"
            />

            <path
              strokeLinecap="round"
              d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"
            />
          </svg>
        ) : (
          /* Moon */
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5 transition-transform duration-300"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z"
            />
          </svg>
        )}
      </button>


      {firstLoginConsentOpen && (
        <FirstLoginConsentModal
          onResolved={
            handleFirstLoginConsentResolved
          }
        />
      )}
    </div>
  )
}


export default AppLayout
