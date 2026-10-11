import {
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  useNavigate,
} from 'react-router'
import {
  getStudySessionNotifications,
  markAllStudySessionNotificationsRead,
  markStudySessionNotificationRead,
} from '../services/notificationService'


const formatNotificationDate = (
  value
) => {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      String(value || '')
    )

  if (!match) {
    return String(value || '')
  }

  const date =
    new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    )

  return date.toLocaleDateString(
    undefined,
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  )
}


function StudySessionNotifications({
  isLight,
  onOpen,
}) {
  const navigate =
    useNavigate()

  const menuRef =
    useRef(null)

  const [
    open,
    setOpen,
  ] = useState(false)

  const [
    notifications,
    setNotifications,
  ] = useState([])

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')


  const loadNotifications =
    async ({
      showLoading = false,
    } = {}) => {
      if (showLoading) {
        setLoading(true)
      }

      try {
        const response =
          await getStudySessionNotifications()

        if (!response.ok) {
          setError(
            response.data?.message ||
              'Unable to load notifications.'
          )

          return
        }

        setNotifications(
          Array.isArray(
            response.data?.notifications
          )
            ? response.data.notifications
            : []
        )

        setUnreadCount(
          Number(
            response.data
              ?.unread_count || 0
          )
        )

        setError('')
      } catch (loadError) {
        console.error(
          'Notification load error:',
          loadError
        )

        setError(
          'Unable to connect to the server.'
        )
      } finally {
        if (showLoading) {
          setLoading(false)
        }
      }
    }


  /*
   * Load immediately, then refresh every minute.
   *
   * Regaining browser focus also refreshes the list,
   * so a reminder generated while the tab is in the
   * background appears without a full page reload.
   */
  useEffect(() => {
    let active = true

    const refresh =
      async () => {
        if (!active) {
          return
        }

        await loadNotifications()
      }

    loadNotifications({
      showLoading: true,
    })

    const timer =
      window.setInterval(
        refresh,
        60000
      )

    const handleFocus = () => {
      refresh()
    }

    window.addEventListener(
      'focus',
      handleFocus
    )

    return () => {
      active = false

      window.clearInterval(
        timer
      )

      window.removeEventListener(
        'focus',
        handleFocus
      )
    }
  }, [])


  /*
   * This component owns its own click-outside and
   * Escape behaviour. AppLayout's profile menu does
   * not need to know about these internal states.
   */
  useEffect(() => {
    const handleOutsideClick =
      (event) => {
        if (
          menuRef.current &&
          !menuRef.current.contains(
            event.target
          )
        ) {
          setOpen(false)
        }
      }

    const handleEscape =
      (event) => {
        if (
          event.key === 'Escape'
        ) {
          setOpen(false)
        }
      }

    document.addEventListener(
      'mousedown',
      handleOutsideClick
    )

    document.addEventListener(
      'keydown',
      handleEscape
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      )

      document.removeEventListener(
        'keydown',
        handleEscape
      )
    }
  }, [])


  const handleToggle = () => {
    const nextOpen =
      !open

    if (nextOpen) {
      onOpen?.()

      loadNotifications()
    }

    setOpen(
      nextOpen
    )
  }


  const handleOpenNotification =
    async (notification) => {
      setOpen(false)

      if (!notification.read_at) {
        const optimisticReadTime =
          new Date().toISOString()

        setNotifications(
          (current) =>
            current.map(
              (item) =>
                item.notification_id ===
                notification.notification_id
                  ? {
                      ...item,
                      read_at:
                        optimisticReadTime,
                    }
                  : item
            )
        )

        setUnreadCount(
          (current) =>
            Math.max(
              0,
              current - 1
            )
        )

        try {
          const response =
            await markStudySessionNotificationRead(
              notification.notification_id
            )

          if (!response.ok) {
            await loadNotifications()
          }
        } catch (readError) {
          console.error(
            'Notification read error:',
            readError
          )

          await loadNotifications()
        }
      }

      navigate(
        `/study-plan/${notification.plan_id}`
      )
    }


  const handleMarkAllRead =
    async () => {
      try {
        const response =
          await markAllStudySessionNotificationsRead()

        if (!response.ok) {
          setError(
            response.data?.message ||
              'Unable to mark notifications as read.'
          )

          return
        }

        const readTime =
          new Date().toISOString()

        setNotifications(
          (current) =>
            current.map(
              (item) => ({
                ...item,

                read_at:
                  item.read_at ||
                  readTime,
              })
            )
        )

        setUnreadCount(0)
        setError('')
      } catch (readError) {
        console.error(
          'Mark-all notification error:',
          readError
        )

        setError(
          'Unable to connect to the server.'
        )
      }
    }


  return (
    <div
      ref={menuRef}
      className="relative shrink-0"
    >
      {/* Bell */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread study session notifications`
            : 'Study session notifications'
        }
        aria-haspopup="menu"
        aria-expanded={open}
        title="Study session notifications"
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#7a44ff]/40 ${
          unreadCount > 0
            ? isLight
              ? 'border-[#7a44ff]/35 bg-[#7a44ff]/10 text-[#7a44ff] shadow-[0_0_18px_rgba(122,68,255,0.12)]'
              : 'border-[#7a44ff]/40 bg-[#7a44ff]/10 text-[#c9b4ff] shadow-[0_0_20px_rgba(122,68,255,0.22)]'
            : isLight
              ? 'border-transparent text-[#65676b] hover:border-[#7a44ff]/20 hover:bg-[#7a44ff]/[0.06] hover:text-[#7a44ff]'
              : 'border-transparent text-[#898cc0] hover:border-[#7a44ff]/20 hover:bg-white/[0.04] hover:text-[#c9b4ff]'
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
            d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"
          />
        </svg>

        {unreadCount > 0 && (
          <>
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-ping rounded-full bg-[#d83dff]/45"
            />

            <span
              className={`absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 bg-gradient-to-br from-[#7a44ff] to-[#d83dff] px-1 text-[10px] font-bold leading-none text-white ${
                isLight
                  ? 'border-white'
                  : 'border-[#120928]'
              }`}
            >
              {unreadCount > 9
                ? '9+'
                : unreadCount}
            </span>
          </>
        )}
      </button>


      {/* Dropdown */}
      <div
        role="menu"
        aria-hidden={!open}
        className={`absolute right-0 top-[calc(100%+10px)] z-50 w-[min(370px,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-xl border shadow-[0_20px_50px_rgba(0,0,0,0.28)] transition-all duration-300 ease-out ${
          isLight
            ? 'border-[#dfdfdf] bg-white'
            : 'border-[#39245f] bg-[#160b32]'
        } ${
          open
            ? 'visible translate-y-0 scale-100 opacity-100'
            : 'invisible pointer-events-none -translate-y-2 scale-95 opacity-0'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between gap-3 border-b px-4 py-3.5 ${
            isLight
              ? 'border-[#e7e5eb]'
              : 'border-[#2a1b4d]'
          }`}
        >
          <div>
            <p
              className={`text-sm font-semibold ${
                isLight
                  ? 'text-[#171717]'
                  : 'text-[#f3f0ff]'
              }`}
            >
              Notifications
            </p>

            <p
              className={`mt-0.5 text-xs ${
                isLight
                  ? 'text-[#7a7575]'
                  : 'text-[#727494]'
              }`}
            >
              Upcoming study sessions
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={
                handleMarkAllRead
              }
              className={`text-xs font-medium transition duration-300 ${
                isLight
                  ? 'text-[#7a44ff] hover:text-[#5f30d4]'
                  : 'text-[#a97cff] hover:text-[#c9b4ff]'
              }`}
            >
              Mark all read
            </button>
          )}
        </div>


        {/* Content */}
        <div className="max-h-[390px] overflow-y-auto">
          {loading && (
            <div
              className="flex items-center justify-center gap-3 px-4 py-8"
              role="status"
            >
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

              <span
                className={`text-sm ${
                  isLight
                    ? 'text-[#65676b]'
                    : 'text-[#898cc0]'
                }`}
              >
                Loading notifications...
              </span>
            </div>
          )}


          {!loading &&
            error && (
              <div className="px-4 py-6 text-center">
                <p
                  className={`text-sm ${
                    isLight
                      ? 'text-[#b42318]'
                      : 'text-red-300'
                  }`}
                >
                  {error}
                </p>
              </div>
            )}


          {!loading &&
            !error &&
            notifications.length ===
              0 && (
              <div className="px-5 py-9 text-center">
                <div
                  className={`mx-auto flex h-10 w-10 items-center justify-center rounded-xl ${
                    isLight
                      ? 'bg-[#f2edff] text-[#7a44ff]'
                      : 'bg-[#7a44ff]/10 text-[#a97cff]'
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
                      d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"
                    />
                  </svg>
                </div>

                <p
                  className={`mt-3 text-sm font-medium ${
                    isLight
                      ? 'text-[#45424d]'
                      : 'text-[#d9d4eb]'
                  }`}
                >
                  No session reminders
                </p>

                <p
                  className={`mt-1 text-xs leading-5 ${
                    isLight
                      ? 'text-[#7a7575]'
                      : 'text-[#727494]'
                  }`}
                >
                  Upcoming Study Planner sessions will appear here.
                </p>
              </div>
            )}


          {!loading &&
            !error &&
            notifications.map(
              (notification) => (
                <button
                  key={
                    notification.notification_id
                  }
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    handleOpenNotification(
                      notification
                    )
                  }
                  className={`group relative flex w-full gap-3 border-b px-4 py-4 text-left transition duration-300 last:border-b-0 ${
                    isLight
                      ? notification.read_at
                        ? 'border-[#eceaf0] bg-white hover:bg-[#faf8ff]'
                        : 'border-[#eceaf0] bg-[#f8f4ff] hover:bg-[#f3edff]'
                      : notification.read_at
                        ? 'border-[#2a1b4d] bg-[#160b32] hover:bg-white/[0.04]'
                        : 'border-[#2a1b4d] bg-[#7a44ff]/[0.08] hover:bg-[#7a44ff]/[0.13]'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isLight
                        ? 'bg-[#f2edff] text-[#7a44ff]'
                        : 'bg-[#7a44ff]/10 text-[#a97cff]'
                    }`}
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
                        d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"
                      />
                    </svg>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`truncate text-sm font-semibold ${
                          isLight
                            ? 'text-[#171717]'
                            : 'text-[#f3f0ff]'
                        }`}
                      >
                        {notification.subject}
                      </p>

                      {!notification.read_at && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#a97cff]" />
                      )}
                    </div>

                    <p
                      className={`mt-1 text-xs font-medium ${
                        isLight
                          ? 'text-[#6f42c1]'
                          : 'text-[#c9b4ff]'
                      }`}
                    >
                      {notification.session_label}
                      {' • '}
                      {formatNotificationDate(
                        notification.session_date
                      )}
                    </p>

                    <p
                      className={`mt-1.5 line-clamp-2 text-xs leading-5 ${
                        isLight
                          ? 'text-[#65676b]'
                          : 'text-[#898cc0]'
                      }`}
                    >
                      {notification.activity ||
                        notification.topic}
                    </p>

                    {notification.duration && (
                      <p
                        className={`mt-1 text-[11px] ${
                          isLight
                            ? 'text-[#8a8491]'
                            : 'text-[#727494]'
                        }`}
                      >
                        {notification.duration}
                      </p>
                    )}
                  </div>
                </button>
              )
            )}
        </div>
      </div>
    </div>
  )
}


export default StudySessionNotifications