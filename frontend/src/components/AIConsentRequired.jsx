import { Link } from 'react-router'


function AIConsentRequired({
  featureName = 'AI-generated study content',
}) {
  return (
    <div className="ai-consent-required rounded-xl border border-amber-400/20 bg-amber-500/[0.07] p-5">
      <style>
        {`
          .ai-consent-required {
            transition:
              background-color 500ms ease,
              border-color 500ms ease;
          }

          .ai-consent-required-icon {
            transition:
              background-color 500ms ease,
              color 100ms ease;
          }

          .ai-consent-required-title,
          .ai-consent-required-copy,
          .ai-consent-required-note,
          .ai-consent-required-link {
            transition:
              color 100ms ease;
          }


          /*
           * Light mode
           */
          [data-theme-mode='light']
          .ai-consent-required {
            background-color: #fff9e8 !important;
            border-color: #f0cf72 !important;
          }

          [data-theme-mode='light']
          .ai-consent-required-icon {
            background-color: #fff0bd !important;
            color: #b66a00 !important;
          }

          [data-theme-mode='light']
          .ai-consent-required-title {
            color: #7a4700 !important;
          }

          [data-theme-mode='light']
          .ai-consent-required-copy {
            color: #704d12 !important;
          }

          [data-theme-mode='light']
          .ai-consent-required-note {
            color: #6b7280 !important;
          }

          [data-theme-mode='light']
          .ai-consent-required-link {
            background-color: #ffffff !important;
            border-color: rgba(122, 68, 255, 0.32) !important;
            color: #6530d6 !important;
            box-shadow: 0 1px 2px rgba(31, 20, 50, 0.04);
          }

          [data-theme-mode='light']
          .ai-consent-required-link:hover {
            background-color: rgba(122, 68, 255, 0.08) !important;
            border-color: rgba(122, 68, 255, 0.58) !important;
            color: #5420b8 !important;
          }
        `}
      </style>


      <div className="flex items-start gap-4">
        {/* Warning Icon */}
        <div className="ai-consent-required-icon mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
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
              d="M8 10V8a4 4 0 1 1 8 0v2m-9 0h10a1 1 0 0 1 1 1v8H6v-8a1 1 0 0 1 1-1Zm5 4v2"
            />
          </svg>
        </div>


        <div className="min-w-0 flex-1">
          <p className="ai-consent-required-title font-semibold text-amber-200">
            AI Processing Consent Required
          </p>

          <p className="ai-consent-required-copy mt-1 text-sm leading-6 text-amber-100/80">
            You need to grant AI processing consent before using{' '}
            {featureName}.
          </p>

          <p className="ai-consent-required-note mt-2 text-sm leading-6 text-[#898cc0]">
            Your uploads, Study Planner, Progress
            and other non-AI features remain available.
          </p>


          <Link
            to="/privacy"
            className="ai-consent-required-link mt-4 inline-flex items-center gap-2 rounded-lg border border-[#7a44ff]/30 bg-[#7a44ff]/10 px-4 py-2.5 text-sm font-semibold text-[#c9b4ff] transition duration-300 hover:border-[#a97cff]/60 hover:bg-[#7a44ff]/20 hover:text-white"
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
