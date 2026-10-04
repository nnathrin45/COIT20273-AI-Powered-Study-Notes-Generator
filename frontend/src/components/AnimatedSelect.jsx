import {
  useEffect,
  useRef,
  useState,
} from 'react'


function AnimatedSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
}) {
  const [isOpen, setIsOpen] =
    useState(false)

  const [activeIndex, setActiveIndex] =
    useState(-1)

  const containerRef = useRef(null)
  const buttonRef = useRef(null)

  const normalisedValue =
    String(value ?? '')

  const selectedOption =
    options.find(
      (option) =>
        String(option.value) ===
        normalisedValue
    )


  useEffect(() => {
    const handleClickOutside = (
      event
    ) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target
        )
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener(
      'mousedown',
      handleClickOutside
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      )
    }
  }, [])


  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(-1)
      return
    }

    const selectedIndex =
      options.findIndex(
        (option) =>
          String(option.value) ===
          normalisedValue
      )

    setActiveIndex(
      selectedIndex >= 0
        ? selectedIndex
        : 0
    )
  }, [
    isOpen,
    normalisedValue,
    options,
  ])


  const selectOption = (option) => {
    onChange(
      String(option.value)
    )

    setIsOpen(false)

    requestAnimationFrame(() => {
      buttonRef.current?.focus()
    })
  }


  const handleKeyDown = (event) => {
    if (disabled) {
      return
    }

    if (event.key === 'Escape') {
      setIsOpen(false)
      return
    }

    if (event.key === 'Tab') {
      setIsOpen(false)
      return
    }

    if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp'
    ) {
      event.preventDefault()

      if (!isOpen) {
        setIsOpen(true)
        return
      }

      const direction =
        event.key === 'ArrowDown'
          ? 1
          : -1

      setActiveIndex((current) => {
        if (options.length === 0) {
          return -1
        }

        const startingIndex =
          current >= 0
            ? current
            : 0

        return (
          startingIndex +
          direction +
          options.length
        ) % options.length
      })

      return
    }

    if (
      event.key === 'Home' &&
      isOpen
    ) {
      event.preventDefault()
      setActiveIndex(0)
      return
    }

    if (
      event.key === 'End' &&
      isOpen
    ) {
      event.preventDefault()

      setActiveIndex(
        options.length - 1
      )

      return
    }

    if (
      (event.key === 'Enter' ||
        event.key === ' ') &&
      isOpen &&
      activeIndex >= 0 &&
      options[activeIndex]
    ) {
      event.preventDefault()

      selectOption(
        options[activeIndex]
      )
    }
  }


  return (
    <div
      ref={containerRef}
      className="animated-select-theme relative w-full"
      onKeyDown={handleKeyDown}
    >
      <style>
        {`
          /*
           * AnimatedSelect theme timing:
           * Text = 100ms
           * Surfaces = 500ms
           * Hover = 300ms
           * Open / close = 300ms
           */

          .animated-select-trigger {
            transition:
              color 100ms ease,
              background-color 500ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease;
          }

          .animated-select-value {
            transition:
              color 100ms ease;
          }

          .animated-select-chevron {
            transition:
              transform 300ms ease,
              color 100ms ease;
          }

          .animated-select-menu {
            transition:
              opacity 300ms ease,
              transform 300ms ease,
              visibility 300ms ease,
              background-color 500ms ease,
              border-color 500ms ease,
              box-shadow 300ms ease;
          }

          .animated-select-option {
            transition:
              color 100ms ease,
              background-color 300ms ease;
          }

          .animated-select-check {
            transition:
              color 100ms ease;
          }


          /*
           * -----------------------------------------------
           * LIGHT THEME - TRIGGER
           * -----------------------------------------------
           */

          [data-theme-mode='light']
          .animated-select-trigger {
            background-color:
              #ffffff !important;

            border-color:
              #d7d3df !important;
          }

          [data-theme-mode='light']
          .animated-select-trigger:hover {
            border-color:
              rgba(
                122,
                68,
                255,
                0.55
              ) !important;
          }

          [data-theme-mode='light']
          .animated-select-trigger-open {
            border-color:
              #7a44ff !important;

            box-shadow:
              0 0 0 2px
                rgba(
                  122,
                  68,
                  255,
                  0.18
                ),
              0 0 20px
                rgba(
                  122,
                  68,
                  255,
                  0.08
                ) !important;
          }


          /*
           * Selected value
           */

          [data-theme-mode='light']
          .animated-select-selected {
            color:
              #2b2b33 !important;
          }


          /*
           * Placeholder
           */

          [data-theme-mode='light']
          .animated-select-placeholder {
            color:
              #8a8793 !important;
          }


          /*
           * Chevron
           */

          [data-theme-mode='light']
          .animated-select-chevron {
            color:
              #65676b !important;
          }

          [data-theme-mode='light']
          .animated-select-chevron-open {
            color:
              #7a44ff !important;
          }


          /*
           * -----------------------------------------------
           * LIGHT THEME - DROPDOWN MENU
           * -----------------------------------------------
           */

          [data-theme-mode='light']
          .animated-select-menu {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;

            box-shadow:
              0 18px 45px
              rgba(
                50,
                39,
                75,
                0.16
              ) !important;
          }


          /*
           * Normal option
           */

          [data-theme-mode='light']
          .animated-select-option-normal {
            color:
              #5f5b68 !important;
          }


          /*
           * Hover / keyboard active option
           */

          [data-theme-mode='light']
          .animated-select-option-active {
            color:
              #171717 !important;

            background-color:
              rgba(
                122,
                68,
                255,
                0.07
              ) !important;
          }

          [data-theme-mode='light']
          .animated-select-option-normal:hover {
            color:
              #171717 !important;

            background-color:
              rgba(
                122,
                68,
                255,
                0.07
              ) !important;
          }


          /*
           * Selected option
           */

          [data-theme-mode='light']
          .animated-select-option-selected {
            color:
              #6634e8 !important;

            background-color:
              rgba(
                122,
                68,
                255,
                0.10
              ) !important;
          }


          /*
           * Selected checkmark
           */

          [data-theme-mode='light']
          .animated-select-check {
            color:
              #7a44ff !important;
          }


          /*
           * Disabled trigger
           */

          [data-theme-mode='light']
          .animated-select-trigger:disabled {
            background-color:
              #f1eff4 !important;

            border-color:
              #dfdfdf !important;

            color:
              #9a96a6 !important;
          }
        `}
      </style>


      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-options`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(
              (current) => !current
            )
          }
        }}
        className={`animated-select-trigger flex w-full items-center justify-between gap-3 rounded-lg border bg-[#120928] px-4 py-3 text-left text-sm outline-none ${
          isOpen
            ? 'animated-select-trigger-open border-[#7a44ff] ring-2 ring-[#7a44ff]/25 shadow-[0_0_20px_rgba(122,68,255,0.10)]'
            : 'border-[#3a2860] hover:border-[#5a3a88]'
        } ${
          disabled
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer'
        }`}
      >
        <span
          className={`animated-select-value truncate ${
            selectedOption
              ? 'animated-select-selected text-[#d9d4eb]'
              : 'animated-select-placeholder text-[#727494]'
          }`}
        >
          {selectedOption
            ? selectedOption.label
            : placeholder}
        </span>


        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`animated-select-chevron h-4 w-4 shrink-0 text-[#898cc0] ${
            isOpen
              ? 'animated-select-chevron-open rotate-180 text-[#a97cff]'
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


      <div
        id={`${id}-options`}
        role="listbox"
        aria-hidden={!isOpen}
        className={`animated-select-menu absolute left-0 right-0 top-[calc(100%+8px)] z-50 origin-top overflow-hidden rounded-lg border border-[#39245f] bg-[#160b32] p-1.5 shadow-[0_18px_45px_rgba(0,0,0,0.45)] ease-out ${
          isOpen
            ? 'visible translate-y-0 scale-100 opacity-100'
            : 'invisible pointer-events-none -translate-y-2 scale-[0.98] opacity-0'
        }`}
      >
        <div className="max-h-64 overflow-y-auto">
          {options.map(
            (option, index) => {
              const optionValue =
                String(
                  option.value
                )

              const selected =
                optionValue ===
                normalisedValue

              const active =
                index ===
                activeIndex

              return (
                <button
                  key={optionValue}
                  type="button"
                  role="option"
                  aria-selected={
                    selected
                  }
                  onMouseEnter={() =>
                    setActiveIndex(
                      index
                    )
                  }
                  onClick={() =>
                    selectOption(
                      option
                    )
                  }
                  className={`animated-select-option flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm ${
                    selected
                      ? 'animated-select-option-selected bg-[#7a44ff]/15 text-[#c9b4ff]'
                      : active
                        ? 'animated-select-option-active bg-white/[0.05] text-[#f3f0ff]'
                        : 'animated-select-option-normal text-[#a6a8c7] hover:bg-white/[0.05] hover:text-[#f3f0ff]'
                  }`}
                >
                  <span className="truncate">
                    {option.label}
                  </span>


                  {selected && (
                    <svg
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      className="animated-select-check h-4 w-4 shrink-0 text-[#a97cff]"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m5 12 4 4L19 6"
                      />
                    </svg>
                  )}
                </button>
              )
            }
          )}
        </div>
      </div>
    </div>
  )
}


export default AnimatedSelect