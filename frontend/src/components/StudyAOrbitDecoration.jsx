function StudyAOrbitDecoration() {
  return (
    <div
      className="studya-orbit-decoration"
      aria-hidden="true"
    >
      <style>
        {`
          /*
           * ==================================================
           * STUDYA FIXED ORBIT DECORATION
           * ==================================================
           *
           * Inspired by the fixed concentric-circle movement
           * reviewed in the reference videos.
           *
           * Decorative only:
           * - fixed to viewport
           * - no pointer interaction
           * - dark + light theme support
           * - reduced-motion support
           */


          .studya-orbit-decoration {
            position: fixed;

            top: 96px;
            right: -210px;

            z-index: 5;

            width: 320px;
            height: 320px;

            pointer-events: none;

            opacity: 0.46;

            transition:
              opacity 500ms ease,
              filter 500ms ease,
              width 500ms ease,
              height 500ms ease,
              top 500ms ease,
              right 500ms ease;

            contain:
              layout paint;
          }


          /*
           * Very subtle atmospheric glow behind the rings.
           */
          .studya-orbit-glow {
            position: absolute;

            inset: 18.7%;

            border-radius: 9999px;

            background:
              radial-gradient(
                circle,
                rgba(122, 68, 255, 0.09),
                rgba(216, 61, 255, 0.035) 46%,
                transparent 72%
              );

            filter:
              blur(22px);

            transition:
              background 500ms ease,
              opacity 500ms ease;
          }


          /*
           * Shared ring styling.
           */
          .studya-orbit-ring {
            position: absolute;

            border-radius: 9999px;

            border:
              1px solid
              rgba(169, 124, 255, 0.18);

            box-shadow:
              inset 0 0 22px
                rgba(122, 68, 255, 0.018);

            transform-origin:
              center;

            transition:
              border-color 500ms ease,
              box-shadow 500ms ease;
          }


          /*
           * OUTER ORBIT
           */
          .studya-orbit-outer {
            inset: 0;

            border-color:
              rgba(169, 124, 255, 0.20);

            animation:
              studya-orbit-clockwise
              30s
              linear
              infinite;
          }


          /*
           * MIDDLE ORBIT
           */
          .studya-orbit-middle {
            inset: 13.2%;

            border-color:
              rgba(216, 61, 255, 0.17);

            animation:
              studya-orbit-counterclockwise
              22s
              linear
              infinite;
          }


          /*
           * INNER ORBIT
           */
          .studya-orbit-inner {
            inset: 27.2%;

            border-color:
              rgba(255, 255, 255, 0.09);

            animation:
              studya-orbit-clockwise
              17s
              linear
              infinite;
          }


          /*
           * Orbiting dots.
           */
          .studya-orbit-dot {
            position: absolute;

            width: 9px;
            height: 9px;

            border-radius: 9999px;

            transition:
              background-color 500ms ease,
              box-shadow 500ms ease,
              opacity 500ms ease;
          }


          /*
           * Outer ring — top dot.
           */
          .studya-orbit-dot-outer-primary {
            top: -5px;
            left: 50%;

            margin-left: -4.5px;

            background-color:
              #a97cff;

            box-shadow:
              0 0 7px
                rgba(169, 124, 255, 0.95),
              0 0 17px
                rgba(122, 68, 255, 0.42);
          }


          /*
           * Outer ring — secondary dot.
           */
          .studya-orbit-dot-outer-secondary {
            top: 50%;
            left: -5px;

            margin-top: -4.5px;

            width: 7px;
            height: 7px;

            background-color:
              rgba(255, 255, 255, 0.86);

            box-shadow:
              0 0 10px
                rgba(255, 255, 255, 0.24);
          }


          /*
           * Middle ring dot.
           */
          .studya-orbit-dot-middle {
            right: -5px;
            top: 50%;

            margin-top: -4.5px;

            background-color:
              #d83dff;

            box-shadow:
              0 0 7px
                rgba(216, 61, 255, 0.88),
              0 0 17px
                rgba(216, 61, 255, 0.34);
          }


          /*
           * Inner ring dot.
           */
          .studya-orbit-dot-inner {
            bottom: -4px;
            left: 50%;

            margin-left: -4px;

            width: 8px;
            height: 8px;

            background-color:
              #8f63ff;

            box-shadow:
              0 0 11px
                rgba(143, 99, 255, 0.68);
          }


          /*
           * DARK MODE — faint outer halo.
           */
          .studya-orbit-decoration::before {
            content: '';

            position: absolute;

            inset: -15px;

            border-radius: 9999px;

            border:
              1px solid
              rgba(122, 68, 255, 0.045);

            box-shadow:
              0 0 50px
                rgba(122, 68, 255, 0.025);

            transition:
              border-color 500ms ease,
              box-shadow 500ms ease;
          }


          /*
           * ==================================================
           * LIGHT MODE
           * ==================================================
           */

          [data-theme-mode='light']
          .studya-orbit-decoration {
            opacity: 0.36;
          }


          [data-theme-mode='light']
          .studya-orbit-glow {
            background:
              radial-gradient(
                circle,
                rgba(122, 68, 255, 0.045),
                rgba(216, 61, 255, 0.018) 46%,
                transparent 72%
              );
          }


          [data-theme-mode='light']
          .studya-orbit-outer {
            border-color:
              rgba(122, 68, 255, 0.15);

            box-shadow:
              inset 0 0 20px
                rgba(122, 68, 255, 0.012);
          }


          [data-theme-mode='light']
          .studya-orbit-middle {
            border-color:
              rgba(172, 72, 211, 0.12);
          }


          [data-theme-mode='light']
          .studya-orbit-inner {
            border-color:
              rgba(91, 72, 125, 0.11);
          }


          [data-theme-mode='light']
          .studya-orbit-dot-outer-primary {
            background-color:
              #7a44ff;

            box-shadow:
              0 0 6px
                rgba(122, 68, 255, 0.62),
              0 0 13px
                rgba(122, 68, 255, 0.18);
          }


          [data-theme-mode='light']
          .studya-orbit-dot-outer-secondary {
            background-color:
              #7d6d99;

            box-shadow:
              0 0 8px
                rgba(91, 72, 125, 0.13);
          }


          [data-theme-mode='light']
          .studya-orbit-dot-middle {
            background-color:
              #b329dc;

            box-shadow:
              0 0 6px
                rgba(179, 41, 220, 0.45),
              0 0 12px
                rgba(179, 41, 220, 0.14);
          }


          [data-theme-mode='light']
          .studya-orbit-dot-inner {
            background-color:
              #6530d6;

            box-shadow:
              0 0 9px
                rgba(101, 48, 214, 0.28);
          }


          [data-theme-mode='light']
          .studya-orbit-decoration::before {
            border-color:
              rgba(122, 68, 255, 0.055);

            box-shadow:
              0 0 38px
                rgba(122, 68, 255, 0.018);
          }


          /*
           * ==================================================
           * ANIMATION
           * ==================================================
           */

          @keyframes studya-orbit-clockwise {
            from {
              transform:
                rotate(0deg);
            }

            to {
              transform:
                rotate(360deg);
            }
          }


          @keyframes studya-orbit-counterclockwise {
            from {
              transform:
                rotate(0deg);
            }

            to {
              transform:
                rotate(-360deg);
            }
          }


                    /*
           * ==================================================
           * STUDYA RESPONSIVE ORBIT SIZING
           * ==================================================
           *
           * The orbit remains visible on mobile, tablet and
           * desktop while preserving the same fixed-on-scroll
           * behaviour.
           *
           * Mobile stays more subtle so the decoration does
           * not compete with StudyA content.
           */


          /*
           * Large phones / small tablets
           */
          @media (min-width: 640px) {
            .studya-orbit-decoration {
              top: 92px;
              right: -225px;

              width: 380px;
              height: 380px;

              opacity: 0.52;
            }


            [data-theme-mode='light']
            .studya-orbit-decoration {
              opacity: 0.43;
            }
          }


          /*
           * Tablet / compact desktop
           */
          @media (min-width: 1024px) {
            .studya-orbit-decoration {
              top: 86px;
              right: -235px;

              width: 470px;
              height: 470px;

              opacity: 0.68;
            }


            [data-theme-mode='light']
            .studya-orbit-decoration {
              opacity: 0.56;
            }
          }


          /*
           * Standard desktop
           *
           * Increased from the original 470px version.
           */
          @media (min-width: 1280px) {
            .studya-orbit-decoration {
              top: 76px;
              right: -255px;

              width: 560px;
              height: 560px;

              opacity: 0.84;
            }


            [data-theme-mode='light']
            .studya-orbit-decoration {
              opacity: 0.70;
            }
          }


          /*
           * Wide / ultrawide desktop
           */
          @media (min-width: 1800px) {
            .studya-orbit-decoration {
              right: -270px;

              width: 590px;
              height: 590px;
            }
          }


          /*
           * Accessibility:
           * stop orbital movement when the operating system
           * requests reduced motion.
           */
          @media (prefers-reduced-motion: reduce) {
            .studya-orbit-outer,
            .studya-orbit-middle,
            .studya-orbit-inner {
              animation:
                none !important;
            }
          }
        `}
      </style>


      <div className="studya-orbit-glow" />


      <div className="studya-orbit-ring studya-orbit-outer">
        <span className="studya-orbit-dot studya-orbit-dot-outer-primary" />

        <span className="studya-orbit-dot studya-orbit-dot-outer-secondary" />
      </div>


      <div className="studya-orbit-ring studya-orbit-middle">
        <span className="studya-orbit-dot studya-orbit-dot-middle" />
      </div>


      <div className="studya-orbit-ring studya-orbit-inner">
        <span className="studya-orbit-dot studya-orbit-dot-inner" />
      </div>
    </div>
  )
}


export default StudyAOrbitDecoration