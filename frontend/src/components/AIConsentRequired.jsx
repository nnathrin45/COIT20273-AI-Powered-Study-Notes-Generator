import { Link } from 'react-router'

function AIConsentRequired({
  featureName = 'this AI-powered feature',
}) {
  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.07] p-5 sm:p-6">
      <div className="flex items-start gap-4">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
          >
            <rect
              x="5"
              y="10"
              width="14"
              height="10"
              rx="2"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10V7a4 4 0 0 1 8 0v3"
            />
          </svg>
        </div>

        <div className="min-w-0">

          <p className="font-semibold text-amber-200">
            AI Processing Consent Required
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-100/70">
            You can continue using StudyA, but {featureName} is
            unavailable while AI processing consent is declined.
          </p>

          <p className="mt-2 text-sm leading-6 text-[#a6a8c7]">
            Your uploads, Study Planner, Saved Materials, Progress
            and other non-AI features remain available.
          </p>

          <Link
            to="/privacy"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#7a44ff]/30 bg-[#7a44ff]/10 px-4 py-2 text-sm font-semibold text-[#c9b4ff] transition-all duration-300 hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/15"
          >
            Manage AI Consent

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
          </Link>

        </div>
      </div>
    </div>
  )
}

export default AIConsentRequired