import {
  useLayoutEffect,
  useState,
} from 'react'


const THEME_STORAGE_KEY =
  'studya-theme'


function ThemeToggle() {
  const [theme, setTheme] =
    useState(() => {
      const savedTheme =
        localStorage.getItem(
          THEME_STORAGE_KEY
        )

      return savedTheme ===
        'light'
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
    setTheme(
      (currentTheme) =>
        currentTheme === 'dark'
          ? 'light'
          : 'dark'
    )
  }


  const isLight =
    theme === 'light'


  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        isLight
          ? 'Switch to dark mode'
          : 'Switch to light mode'
      }
      title={
        isLight
          ? 'Switch to dark mode'
          : 'Switch to light mode'
      }
      className={`fixed right-0 top-1/2 z-[100] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-l-xl border border-r-0 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur transition-all duration-300 ${
        isLight
          ? 'border-[#dfdfdf] bg-white text-[#7a44ff] hover:bg-[#f7f7fb]'
          : 'border-[#392461] bg-[#160b32]/95 text-[#a97cff] hover:border-[#7a44ff] hover:bg-[#211044]'
      }`}
    >
      <span
        className={`transition-all duration-300 ${
          isLight
            ? 'rotate-0'
            : 'rotate-0'
        }`}
      >
        {isLight ? (
          /* Moon — click to switch to dark */
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.2 15.2A8.5 8.5 0 0 1 8.8 3.8 8.5 8.5 0 1 0 20.2 15.2Z"
            />
          </svg>
        ) : (
          /* Sun — click to switch to light */
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            className="h-5 w-5"
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
        )}
      </span>
    </button>
  )
}


export default ThemeToggle