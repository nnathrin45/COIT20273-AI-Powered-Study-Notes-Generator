import { useEffect, useRef } from 'react'

function StudyABackgroundVideo({
  containerClassName = '',
  fixedToViewport = false,
  videoClassName = 'absolute left-1/2 top-[105px] h-auto w-[340px] max-w-none -translate-x-1/2 opacity-55 sm:w-[440px] lg:left-[15%] lg:top-[230px] lg:w-[560px] lg:translate-x-0'
}) {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current

    if (!video) return undefined

    const motionPreference = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    )

    const syncPlayback = () => {
      if (motionPreference.matches) {
        video.pause()
        return
      }

      const playPromise = video.play()

      if (playPromise?.catch) {
        playPromise.catch(() => {})
      }
    }

    syncPlayback()

    motionPreference.addEventListener('change', syncPlayback)

    return () => {
      motionPreference.removeEventListener('change', syncPlayback)
    }
  }, [])

  return (
    <div
      aria-hidden="true"
      className={`studya-background-video pointer-events-none ${fixedToViewport ? 'fixed' : 'absolute'} inset-0 z-0 overflow-hidden ${containerClassName}`.trim()}
    >
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        tabIndex={-1}
        className={videoClassName}
      >
        <source src="/illustration-loop-transparent.webm" type="video/webm" />
      </video>
    </div>
  )
}

export default StudyABackgroundVideo