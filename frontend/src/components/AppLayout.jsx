import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'

function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Upload Material', path: '/upload' },
    { name: 'Summaries', path: '/summaries' },
    { name: 'Flashcards', path: '/flashcards' },
    { name: 'Practice Quiz', path: '/quiz' },
    { name: 'Concept Explanation', path: '/explanation' },
    { name: 'Study Planner', path: '/study-plan' },
    { name: 'Saved Materials', path: '/saved-materials' },
    { name: 'Progress', path: '/progress' },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex min-h-screen">

        {/* Desktop Sidebar */}
        <aside className="hidden w-64 flex-col bg-slate-900 text-white md:flex">
          <div className="border-b border-slate-700 px-6 py-6">
            <h1 className="text-xl font-bold">
              AI Study Notes
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Study smarter with AI
            </p>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `block rounded-lg px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-slate-700 p-4">
            <NavLink
              to="/login"
              className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Sign Out
            </NavLink>
          </div>
        </aside>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">

            {/* Background Overlay */}
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
            />

            {/* Mobile Sidebar */}
            <aside className="relative z-10 flex h-full w-72 flex-col bg-slate-900 text-white shadow-xl">

              <div className="flex items-center justify-between border-b border-slate-700 px-6 py-5">

                <div>
                  <h1 className="text-xl font-bold">
                    AI Study Notes
                  </h1>

                  <p className="mt-1 text-sm text-slate-400">
                    Study smarter with AI
                  </p>
                </div>

                {/* Close Menu Button */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  aria-label="Close navigation menu"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>

              </div>

              {/* Mobile Menu Links */}
              <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                {menuItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `block rounded-lg px-4 py-3 text-sm font-medium transition ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    {item.name}
                  </NavLink>
                ))}
              </nav>

              {/* Mobile Sign Out */}
              <div className="border-t border-slate-700 p-4">
                <NavLink
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  Sign Out
                </NavLink>
              </div>

            </aside>
          </div>
        )}

        {/* Main Area */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Header */}
          <header className="border-b bg-white px-4 py-4 shadow-sm sm:px-6">

            <div className="flex items-center justify-between">

              {/* Left Header Section */}
              <div className="flex items-center gap-3">

                {/* Mobile Menu Button */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 md:hidden"
                  aria-label="Open navigation menu"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>

                <h2 className="text-sm font-semibold text-gray-900 sm:text-lg">
                  AI-Powered Study Notes Generator
                </h2>

              </div>

              {/* User Information */}
              <div className="flex items-center gap-3">

                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium text-gray-800">
                    Student
                  </p>

                  <p className="text-xs text-gray-500">
                    student@example.com
                  </p>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
                  S
                </div>

              </div>

            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 sm:p-6">
            <Outlet />
          </main>

        </div>

      </div>
    </div>
  )
}

export default AppLayout