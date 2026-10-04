import studyaLogo from '../assets/studya-logo.png'
import studyaLogoLight from '../assets/studya-logo-light.png'


function StudyALogo({
  alt = 'StudyA',
  className = '',
}) {
  return (
    <>
      <style>
        {`
          .studya-logo-dark {
            display: block !important;
          }

          .studya-logo-light {
            display: none !important;
          }

          [data-theme-mode='light']
          .studya-logo-dark {
            display: none !important;
          }

          [data-theme-mode='light']
          .studya-logo-light {
            display: block !important;
          }
        `}
      </style>

      <img
        src={studyaLogo}
        alt={alt}
        className={`studya-logo-dark ${className}`}
      />

      <img
        src={studyaLogoLight}
        alt={alt}
        className={`studya-logo-light ${className}`}
      />
    </>
  )
}


export default StudyALogo