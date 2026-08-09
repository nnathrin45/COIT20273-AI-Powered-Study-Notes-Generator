import { NavLink, Outlet } from 'react-router'

function AppLayout() {
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

        {/* Sidebar */}
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
              className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Sign Out
            </NavLink>
          </div>
        </aside>

        {/* Main area */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Header */}
          <header className="flex items-center justify-between border-b bg-white px-6 py-4 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                AI-Powered Study Notes Generator
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-gray-800">
                  Student
                </p>
                <p className="text-xs text-gray-500">
                  student@example.com
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
                S
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-6">
            <Outlet />
          </main>

        </div>
      </div>
    </div>
  )
}

export default AppLayout