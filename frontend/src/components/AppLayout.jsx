import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { logoutUser } from '../services/authService'

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
  onLogout,
}) {
  return (
    <>
      {/* Brand */}
      <div className="flex h-20 items-center border-b border-[#2a1b4d] px-6">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7a44ff] to-[#d83dff] text-lg font-bold text-white shadow-[0_0_20px_rgba(122,68,255,0.25)]">
            AI
          </div>

          <div>
            <h1 className="text-[17px] font-bold tracking-tight text-[#c2c4e4]">
              AI Study Notes
            </h1>

            <p className="mt-0.5 text-xs text-[#898cc0]">
              Study smarter with AI
            </p>
          </div>

        </div>

      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-6">

        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#727494]">
          Main Menu
        </p>

        <nav className="space-y-1.5">

          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#7a44ff]/15 text-[#a97cff]'
                    : 'text-[#898cc0] hover:bg-white/[0.04] hover:text-[#c2c4e4]'
                }`
              }
            >
              <MenuIcon>
                {item.icon}
              </MenuIcon>

              <span>
                {item.name}
              </span>
            </NavLink>
          ))}

        </nav>

      </div>

      {/* Sign Out */}
      <div className="border-t border-[#2a1b4d] p-4">

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium text-[#898cc0] transition hover:bg-red-500/10 hover:text-red-400"
        >
          <MenuIcon>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 5H5v14h5m4-4 4-3-4-3m4 3H9"
            />
          </MenuIcon>

          Sign Out
        </button>

      </div>
    </>
  )
}

function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false)

  const navigate = useNavigate()

  const handleLogout = () => {
    logoutUser()
    setMobileMenuOpen(false)

    navigate('/login', {
      replace: true,
    })
  }

  return (
    <div className="min-h-screen bg-[#120928] text-[#c2c4e4]">

      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] flex-col border-r border-[#2a1b4d] bg-[#160b32] lg:flex">

        <SidebarContent
          onNavigate={() => {}}
          onLogout={handleLogout}
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
          <aside className="relative z-10 flex h-full w-[280px] max-w-[85vw] flex-col border-r border-[#2a1b4d] bg-[#160b32] shadow-2xl">

            {/* Close button */}
            <div className="absolute right-3 top-5 z-20">

              <button
                type="button"
                onClick={() =>
                  setMobileMenuOpen(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[#898cc0] transition hover:bg-white/[0.05] hover:text-white"
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
              onNavigate={() =>
                setMobileMenuOpen(false)
              }
              onLogout={handleLogout}
            />

          </aside>

        </div>
      )}

      {/* Main Application Area */}
      <div className="min-h-screen bg-[#120928] lg:pl-[280px]">

        {/* Header */}
        <header className="sticky top-0 z-30 h-20 border-b border-[#2a1b4d] bg-[#120928]/95 backdrop-blur">

          <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">

            {/* Left */}
            <div className="flex min-w-0 items-center gap-3">

              {/* Mobile Menu */}
              <button
                type="button"
                onClick={() =>
                  setMobileMenuOpen(true)
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#2a1b4d] text-[#898cc0] transition hover:border-[#7a44ff]/50 hover:bg-[#7a44ff]/10 hover:text-[#a97cff] lg:hidden"
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

                <p className="text-xs font-medium text-[#a97cff]">
                  Student Workspace
                </p>

                <h2 className="truncate text-sm font-semibold text-[#c2c4e4] sm:text-base">
                  AI-Powered Study Notes Generator
                </h2>

              </div>

            </div>

            {/* User */}
            <div className="flex shrink-0 items-center gap-3">

              <div className="hidden text-right sm:block">

                <p className="text-sm font-semibold text-[#c2c4e4]">
                  Student
                </p>

                <p className="text-xs text-[#898cc0]">
                  Learning workspace
                </p>

              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#7a44ff] to-[#d83dff] text-sm font-bold text-white shadow-[0_0_18px_rgba(122,68,255,0.3)]">
                S
              </div>

            </div>

          </div>

        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">

          <div className="mx-auto w-full max-w-[1500px]">
            <Outlet />
          </div>

        </main>

      </div>

    </div>
  )
}

export default AppLayout