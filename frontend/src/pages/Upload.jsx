import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { useNavigate } from 'react-router'

import AnimatedSelect from '../components/AnimatedSelect'
import { uploadStudyMaterial } from '../services/uploadService'
import {
  deleteUploadedFile,
  getUploadedFiles,
} from '../services/uploadedService'


const FILE_TYPE_OPTIONS = [
  { value: 'all', label: 'All file types' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX' },
  { value: 'txt', label: 'TXT' },
]

const FILE_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
]


function Upload() {
  const navigate = useNavigate()

  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(true)
  const [deletingFileId, setDeletingFileId] = useState(null)
  const [filesError, setFilesError] = useState('')
  const [filesStatus, setFilesStatus] = useState('')

  const [fileSearch, setFileSearch] = useState('')
  const [fileTypeFilter, setFileTypeFilter] = useState('all')
  const [fileSortOrder, setFileSortOrder] = useState('newest')

  const [
    uploadedFilesPage,
    setUploadedFilesPage,
  ] = useState(1)

  const UPLOADED_FILES_PER_PAGE =
    5
  const MAX_FILE_SIZE = 15 * 1024 * 1024
  const ALLOWED_EXTENSIONS = [
    'pdf',
    'docx',
    'txt',
  ]


  const loadUploadedFiles = useCallback(
    async ({ minimumFeedbackMs = 0 } = {}) => {
      const actionStartedAt = Date.now()

      setIsLoadingFiles(true)
      setFilesError('')

      try {
        const response =
          await getUploadedFiles()

        if (
          !response.ok ||
          response.data?.status !== 'success'
        ) {
          setFilesError(
            response.data?.message ||
            'Unable to load uploaded materials.'
          )

          return
        }

        setUploadedFiles(
          response.data?.files || []
        )
      } catch (loadError) {
        console.error(
          'Uploaded materials load error:',
          loadError
        )

        setFilesError(
          'Unable to connect to the server while loading uploaded materials.'
        )
      } finally {
        const elapsedTime =
          Date.now() - actionStartedAt

        const remainingFeedbackTime =
          Math.max(
            0,
            minimumFeedbackMs - elapsedTime
          )

        if (remainingFeedbackTime > 0) {
          await new Promise((resolve) => {
            window.setTimeout(
              resolve,
              remainingFeedbackTime
            )
          })
        }

        setIsLoadingFiles(false)
      }
    },
    []
  )


  useEffect(() => {
    loadUploadedFiles()
  }, [loadUploadedFiles])


  useEffect(() => {
    if (!status) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      setStatus('')
    }, 4000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [status])


  useEffect(() => {
    if (!filesStatus) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      setFilesStatus('')
    }, 4000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [filesStatus])


  const resetFileInput = () => {
    const fileInput = document.getElementById('study-file')

    if (fileInput) {
      fileInput.value = ''
    }
  }


  const handleFileChange = async (event) => {
    const file = event.target.files[0]

    setError('')
    setStatus('')

    if (!file) {
      return
    }

    const extension = file.name
      .split('.')
      .pop()
      ?.toLowerCase()

    if (
      !ALLOWED_EXTENSIONS.includes(
        extension
      )
    ) {
      setError(
        'Unsupported file type. Please select a PDF, DOCX or TXT file.'
      )

      event.target.value = ''

      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(
        'The selected file is larger than the 15 MB limit.'
      )

      event.target.value = ''

      return
    }

    await uploadFile(file)
  }


  const uploadFile = async (file) => {
    if (!file) {
      return
    }

    const actionStartedAt = Date.now()

    setError('')
    setStatus('')
    setIsUploading(true)

    try {
      const response =
        await uploadStudyMaterial(
          file
        )

      if (!response.ok) {
        const errorCode =
          response.data?.code

        switch (errorCode) {
          case 'NO_FILE':
            setError(
              'No file was received by the server. Please select the file again.'
            )
            break

          case 'FILE_TOO_LARGE':
            setError(
              'The selected file exceeds the maximum size of 15 MB.'
            )
            break

          case 'UNSUPPORTED_FILE_TYPE':
            setError(
              'Unsupported file type. Please upload a PDF, DOCX or TXT file.'
            )
            break

          case 'NO_READABLE_TEXT':
            setError(
              'No readable text could be extracted from this document. Scanned or image-only documents are not supported.'
            )
            break

          case 'PROCESSING_FAILED':
            setError(
              'The document could not be processed. Please try again.'
            )
            break

          case 'UPLOAD_ERROR':
            setError(
              'The document could not be uploaded. Please check the file and try again.'
            )
            break

          default:
            if (response.status === 401) {
              setError(
                'Your login session is missing or invalid. Please sign in again before uploading a document.'
              )
            } else {
              setError(
                response.data?.message ||
                'The document could not be uploaded.'
              )
            }
        }

        resetFileInput()
        return
      }

      const uploadedFileName =
        response.data?.file?.file_name ||
        file.name

      const textLength =
        response.data?.text_length

      const successMessage =
        typeof textLength === 'number'
          ? `${uploadedFileName} uploaded successfully. ${textLength.toLocaleString()} characters of readable text were extracted.`
          : `${uploadedFileName} uploaded successfully.`

      resetFileInput()

      await loadUploadedFiles()

      const elapsedTime =
        Date.now() - actionStartedAt

      const remainingFeedbackTime =
        Math.max(
          0,
          2000 - elapsedTime
        )

      if (remainingFeedbackTime > 0) {
        await new Promise((resolve) => {
          window.setTimeout(
            resolve,
            remainingFeedbackTime
          )
        })
      }

      setIsUploading(false)
      setStatus(successMessage)
    } catch (uploadError) {
      console.error(
        'Upload error:',
        uploadError
      )

      setError(
        'Unable to connect to the server. Please check that the backend is running and try again.'
      )
      resetFileInput()
    } finally {
      const elapsedTime =
        Date.now() - actionStartedAt

      const remainingFeedbackTime =
        Math.max(
          0,
          2000 - elapsedTime
        )

      if (remainingFeedbackTime > 0) {
        await new Promise((resolve) => {
          window.setTimeout(
            resolve,
            remainingFeedbackTime
          )
        })
      }

      setIsUploading(false)
    }
  }


  const handleDeleteUploadedFile =
    async (file) => {
      const confirmed =
        window.confirm(
          `Delete "${file.file_name}"?\n\nThis will also remove study content generated from this uploaded document. This action cannot be undone.`
        )

      if (!confirmed) {
        return
      }

      const actionStartedAt =
        Date.now()

      setFilesError('')
      setFilesStatus('')
      setDeletingFileId(
        file.file_id
      )

      try {
        const response =
          await deleteUploadedFile(
            file.file_id
          )

        if (!response.ok) {
          if (
            response.status === 404 ||
            response.data?.code ===
            'FILE_NOT_FOUND'
          ) {
            setUploadedFiles(
              (currentFiles) =>
                currentFiles.filter(
                  (uploadedFile) =>
                    uploadedFile.file_id !==
                    file.file_id
                )
            )

            await loadUploadedFiles()

            setFilesError(
              'This uploaded file could not be found. The uploaded-material list has been refreshed.'
            )

            return
          }

          setFilesError(
            response.data?.message ||
            'Unable to delete the uploaded file.'
          )

          return
        }

        const elapsedTime =
          Date.now() -
          actionStartedAt

        const remainingFeedbackTime =
          Math.max(
            0,
            2000 - elapsedTime
          )

        if (
          remainingFeedbackTime > 0
        ) {
          await new Promise(
            (resolve) => {
              window.setTimeout(
                resolve,
                remainingFeedbackTime
              )
            }
          )
        }

        setUploadedFiles(
          (currentFiles) =>
            currentFiles.filter(
              (uploadedFile) =>
                uploadedFile.file_id !==
                file.file_id
            )
        )

        setFilesStatus(
          `${file.file_name} deleted successfully.`
        )
      } catch (deleteError) {
        console.error(
          'Uploaded file delete error:',
          deleteError
        )

        setFilesError(
          'Unable to connect to the server while deleting the uploaded file.'
        )
      } finally {
        setDeletingFileId(null)
      }
    }



  const formatUploadedDate = (
    value
  ) => {
    if (!value) {
      return 'Unknown date'
    }

    const date =
      new Date(value)

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return 'Unknown date'
    }

    return date.toLocaleString()
  }


  useEffect(() => {
    setUploadedFilesPage(1)
  }, [
    fileSearch,
    fileTypeFilter,
    fileSortOrder,
  ])

  const getFileExtension = (fileName = '') =>
    fileName.split('.').pop()?.toLowerCase() || ''

  const fileStatistics = {
    total: uploadedFiles.length,
    pdf: uploadedFiles.filter(
      (file) => getFileExtension(file.file_name) === 'pdf'
    ).length,
    docx: uploadedFiles.filter(
      (file) => getFileExtension(file.file_name) === 'docx'
    ).length,
    txt: uploadedFiles.filter(
      (file) => getFileExtension(file.file_name) === 'txt'
    ).length,
  }

  const filteredUploadedFiles = uploadedFiles
    .filter((file) => {
      const matchesSearch = file.file_name
        .toLowerCase()
        .includes(fileSearch.trim().toLowerCase())

      const matchesType =
        fileTypeFilter === 'all' ||
        getFileExtension(file.file_name) === fileTypeFilter

      return matchesSearch && matchesType
    })
    .sort((firstFile, secondFile) => {
      if (fileSortOrder === 'oldest') {
        return (
          new Date(firstFile.uploaded_at).getTime() -
          new Date(secondFile.uploaded_at).getTime()
        )
      }

      if (fileSortOrder === 'name-asc') {
        return firstFile.file_name.localeCompare(
          secondFile.file_name
        )
      }

      if (fileSortOrder === 'name-desc') {
        return secondFile.file_name.localeCompare(
          firstFile.file_name
        )
      }

      return (
        new Date(secondFile.uploaded_at).getTime() -
        new Date(firstFile.uploaded_at).getTime()
      )
    })

  const totalUploadedFilePages =
    Math.max(
      1,
      Math.ceil(
        filteredUploadedFiles.length /
          UPLOADED_FILES_PER_PAGE
      )
    )


  const currentUploadedFilesPage =
    Math.min(
      uploadedFilesPage,
      totalUploadedFilePages
    )


  const firstUploadedFileIndex =
    (
      currentUploadedFilesPage - 1
    ) * UPLOADED_FILES_PER_PAGE


  const paginatedUploadedFiles =
    filteredUploadedFiles.slice(
      firstUploadedFileIndex,
      firstUploadedFileIndex +
        UPLOADED_FILES_PER_PAGE
    )


  const firstVisibleUploadedFile =
    filteredUploadedFiles.length === 0
      ? 0
      : firstUploadedFileIndex + 1


  const lastVisibleUploadedFile =
    Math.min(
      firstUploadedFileIndex +
        UPLOADED_FILES_PER_PAGE,
      filteredUploadedFiles.length
    )

  const resetFileFilters = () => {
    setFileSearch('')
    setFileTypeFilter('all')
    setFileSortOrder('newest')
  }


  return (
    <div className="upload-theme mx-auto w-full max-w-[1660px]">
      <style>
        {`
          .upload-theme-text {
            transition:
              color 100ms ease;
          }

          .upload-theme-surface {
            transition:
              background-color 500ms ease,
              border-color 500ms ease,
              box-shadow 300ms ease,
              transform 300ms ease;
          }

          .upload-theme-interactive {
            transition:
              color 100ms ease,
              background-color 300ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease,
              filter 300ms ease;
          }

          .upload-theme-border {
            transition:
              border-color 500ms ease;
          }


          [data-theme-mode='light']
          .upload-heading {
            color: #171717 !important;
          }

          [data-theme-mode='light']
          .upload-body {
            color: #65676b !important;
          }

          [data-theme-mode='light']
          .upload-muted {
            color: #7a7575 !important;
          }

          [data-theme-mode='light']
          .upload-accent {
            color: #7a44ff !important;
          }

          [data-theme-mode='light']
          .upload-accent-soft {
            color: #6f42c1 !important;
          }


          [data-theme-mode='light']
          .upload-surface {
            background-color: #ffffff !important;
            border-color: #dfdfdf !important;
          }


          [data-theme-mode='light']
          .upload-drop-area {
            background-color: #f7f7fb !important;
            border-color: #d7d3df !important;
          }

          [data-theme-mode='light']
          .upload-drop-area:hover {
            background-color:
              rgba(122, 68, 255, 0.04) !important;
            border-color:
              rgba(122, 68, 255, 0.6) !important;
          }


          [data-theme-mode='light']
          .upload-selected-file {
            background-color:
              rgba(16, 185, 129, 0.07) !important;
            border-color:
              rgba(16, 185, 129, 0.25) !important;
          }

          [data-theme-mode='light']
          .upload-selected-name {
            color: #047857 !important;
          }

          [data-theme-mode='light']
          .upload-selected-meta {
            color: #059669 !important;
          }


          [data-theme-mode='light']
          .upload-error-text {
            color: #b91c1c !important;
          }

          [data-theme-mode='light']
          .upload-success-text {
            color: #047857 !important;
          }


          [data-theme-mode='light']
          .upload-ai-heading {
            color: #5b21b6 !important;
          }

          [data-theme-mode='light']
          .upload-ai-body {
            color: #5f5b78 !important;
          }


          [data-theme-mode='light']
          .upload-privacy-heading {
            color: #92400e !important;
          }

          [data-theme-mode='light']
          .upload-privacy-body {
            color: #a16207 !important;
          }


          [data-theme-mode='light']
          .upload-filter-control {
            background-color: #ffffff !important;
            border-color: #d7d3df !important;
            color: #2b2b33 !important;
          }

          [data-theme-mode='light']
          .upload-filter-control::placeholder {
            color: #8a8793 !important;
          }

          [data-theme-mode='light']
          .upload-filter-control:hover {
            border-color:
              rgba(122, 68, 255, 0.55) !important;
          }

          [data-theme-mode='light']
          .upload-filter-control:focus {
            border-color: #7a44ff !important;
            box-shadow:
              0 0 0 2px rgba(122, 68, 255, 0.18) !important;
          }

          [data-theme-mode='light']
          .upload-filter-reset {
            background-color: #ffffff !important;
            border-color: #d7d3df !important;
            color: #6f42c1 !important;
          }

          [data-theme-mode='light']
          .upload-filter-reset:hover {
            background-color:
              rgba(122, 68, 255, 0.08) !important;
            border-color:
              rgba(122, 68, 255, 0.6) !important;
            color: #7a44ff !important;
          }


          [data-theme-mode='light']
          .upload-refresh-button {
            background-color: #f7f7fb !important;
            border-color: #d7d3df !important;
            color: #6f42c1 !important;
          }

          [data-theme-mode='light']
          .upload-refresh-button:hover {
            background-color:
              rgba(122, 68, 255, 0.08) !important;
            border-color:
              rgba(122, 68, 255, 0.6) !important;
            color: #7a44ff !important;
          }


          [data-theme-mode='light']
          .upload-chevron {
            background-color:
              rgba(122, 68, 255, 0.08) !important;
            border-color:
              rgba(122, 68, 255, 0.18) !important;
            color: #7a44ff !important;
          }


          [data-theme-mode='light']
          .upload-empty {
            background-color: #f7f7fb !important;
            border-color: #dfdfdf !important;
          }


          /* Smooth uploaded-material pagination */
          @keyframes studya-upload-page-enter {
            from {
              opacity: 0;
              transform: translateY(9px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .upload-file-row {
            animation:
              studya-upload-page-enter 240ms
              cubic-bezier(0.22, 1, 0.36, 1) both;
          }

          /* Staggered cascade for uploaded materials */
          .upload-file-row:nth-child(2) {
            animation-delay: 50ms;
          }

          .upload-file-row:nth-child(3) {
            animation-delay: 100ms;
          }

          .upload-file-row:nth-child(4) {
            animation-delay: 150ms;
          }

          .upload-file-row:nth-child(5) {
            animation-delay: 200ms;
          }

          @media (prefers-reduced-motion: reduce) {
            .upload-file-row {
              animation: none;
            }
          }
          [data-theme-mode='light']
          .upload-file-row {
            background-color: #f7f7fb !important;
            border-color: #dfdfdf !important;
          }

          [data-theme-mode='light']
          .upload-file-row:hover {
            background-color: #f3effa !important;
            border-color:
              rgba(122, 68, 255, 0.4) !important;
          }


          [data-theme-mode='light']
          .upload-file-name {
            color: #2b2b33 !important;
          }


          [data-theme-mode='light']
          .upload-delete-button {
            color: #b91c1c !important;
            background-color:
              rgba(239, 68, 68, 0.04) !important;
            border-color:
              rgba(239, 68, 68, 0.22) !important;
          }

          [data-theme-mode='light']
          .upload-delete-button:hover {
            color: #991b1b !important;
            background-color:
              rgba(239, 68, 68, 0.09) !important;
            border-color:
              rgba(239, 68, 68, 0.45) !important;
          }
          [data-theme-mode='light']
          .upload-submit-button:disabled {
            background-image: none !important;
            background-color: #e6e3eb !important;
            color: #9a96a6 !important;
            box-shadow: none !important;
          }

          [data-theme-mode='light']
          .upload-pagination {
            border-color: #e5e1ec !important;
          }

          [data-theme-mode='light']
          .upload-pagination-nav,
          [data-theme-mode='light']
          .upload-pagination-page {
            background-color: #ffffff !important;
            border-color: #d7d3df !important;
            color: #6f42c1 !important;
          }

          [data-theme-mode='light']
          .upload-pagination-nav:hover:not(:disabled),
          [data-theme-mode='light']
          .upload-pagination-page:hover {
            background-color:
              rgba(122, 68, 255, 0.08) !important;

            border-color:
              rgba(122, 68, 255, 0.55) !important;

            color: #5f30d4 !important;
          }

          [data-theme-mode='light']
          .upload-pagination-page[aria-current='page'] {
            background-color: #7a44ff !important;
            border-color: #7a44ff !important;
            color: #ffffff !important;
          }

          [data-theme-mode='light']
          .upload-pagination-nav:disabled {
            background-color: #f3f2f6 !important;
            border-color: #e2dfe8 !important;
            color: #aaa5b2 !important;
            opacity: 1 !important;
          }

          /*
           * Top Upload File button — light mode loading state
           */
          [data-theme-mode='light']
          .upload-picker-button:disabled {
            background-image: none !important;
            background-color: #eee7ff !important;
            border: 1px solid rgba(122, 68, 255, 0.28) !important;
            color: #6530d6 !important;
            box-shadow:
              0 4px 14px rgba(122, 68, 255, 0.08) !important;
            opacity: 1 !important;
          }

          [data-theme-mode='light']
          .upload-picker-spinner {
            border-color:
              rgba(101, 48, 214, 0.22) !important;
            border-top-color:
              #6530d6 !important;
          }

          /*
           * STUDYA UPLOAD ILLUMINATED SURFACE
           *
           * Styling only.
           * Upload, delete, search, filter, pagination
           * and navigation behaviour are unchanged.
           */
          .upload-surface {
            position: relative;

            background:
              radial-gradient(
                ellipse 75% 52% at 22% -8%,
                rgba(255, 255, 255, 0.075),
                rgba(255, 255, 255, 0.025) 34%,
                transparent 68%
              ),
              radial-gradient(
                ellipse 65% 48% at 88% -12%,
                rgba(122, 68, 255, 0.10),
                transparent 66%
              ),
              linear-gradient(
                180deg,
                rgba(255, 255, 255, 0.018),
                transparent 48%
              ),
              #160b32 !important;

            border-color:
              rgba(169, 124, 255, 0.16) !important;

            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.065),
              inset 0 0 26px rgba(122, 68, 255, 0.025),
              0 12px 34px rgba(3, 0, 15, 0.24);

            transition:
              background-color 500ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease,
              transform 300ms ease;
          }


          /*
           * Soft reflective line across the upper surface.
           */
          .upload-surface::after {
            content: '';
            position: absolute;
            pointer-events: none;

            top: 0;
            left: 9%;
            right: 9%;
            height: 1px;

            background:
              linear-gradient(
                90deg,
                transparent,
                rgba(255, 255, 255, 0.15) 28%,
                rgba(201, 180, 255, 0.15) 50%,
                rgba(255, 255, 255, 0.10) 72%,
                transparent
              );

            opacity: 0.72;
          }


          .upload-surface:hover {
            border-color:
              rgba(122, 68, 255, 0.38) !important;

            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.085),
              inset 0 0 30px rgba(122, 68, 255, 0.04),
              0 14px 38px rgba(30, 10, 62, 0.28),
              0 0 22px rgba(122, 68, 255, 0.065);
          }


          /*
           * Light mode:
           * same StudyA depth with softer lavender illumination.
           */
          [data-theme-mode='light']
          .upload-surface {
            background:
              radial-gradient(
                ellipse 75% 55% at 20% -10%,
                rgba(255, 255, 255, 0.96),
                rgba(255, 255, 255, 0.52) 38%,
                transparent 68%
              ),
              radial-gradient(
                ellipse 62% 48% at 88% -10%,
                rgba(122, 68, 255, 0.055),
                transparent 67%
              ),
              linear-gradient(
                180deg,
                rgba(122, 68, 255, 0.018),
                transparent 48%
              ),
              #ffffff !important;

            border-color:
              rgba(91, 72, 125, 0.14) !important;

            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 1),
              inset 0 0 20px rgba(122, 68, 255, 0.012),
              0 10px 28px rgba(61, 44, 92, 0.075);
          }


          [data-theme-mode='light']
          .upload-surface::after {
            background:
              linear-gradient(
                90deg,
                transparent,
                rgba(122, 68, 255, 0.075) 28%,
                rgba(122, 68, 255, 0.12) 50%,
                rgba(122, 68, 255, 0.06) 72%,
                transparent
              );

            opacity: 0.52;
          }


          [data-theme-mode='light']
          .upload-surface:hover {
            border-color:
              rgba(122, 68, 255, 0.30) !important;

            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 1),
              0 13px 32px rgba(91, 60, 145, 0.10),
              0 0 18px rgba(122, 68, 255, 0.04);
          }
        `}
      </style>


      {/* Page Heading */}
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="upload-theme-text upload-accent mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
            Study Materials
          </p>

          <h1 className="upload-theme-text upload-heading text-3xl font-bold tracking-tight text-[#f3f0ff]">
            Upload Study Material
          </h1>

          <p className="upload-theme-text upload-body mt-2 max-w-3xl text-sm leading-6 text-[#898cc0]">
            Upload your study material so it can later be used
            to generate summaries, flashcards, quizzes and
            concept explanations.
          </p>
        </div>

        <div className="shrink-0 self-start">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => {
              setError('')
              setStatus('')
              document.getElementById('study-file')?.click()
            }}
            className="upload-theme-interactive upload-picker-button inline-flex min-w-[132px] items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#9c46ff] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(122,68,255,0.18)] hover:brightness-110 disabled:cursor-not-allowed disabled:from-[#3a3150] disabled:to-[#3a3150] disabled:text-[#a9a3ba] disabled:shadow-none"
          >
            {isUploading ? (
              <span
                aria-hidden="true"
                className="upload-picker-spinner h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
              />
            ) : (
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
                  d="M12 5v14M5 12h14"
                />
              </svg>
            )}

            {isUploading ? 'Uploading...' : 'Upload File'}
          </button>

          <input
            id="study-file"
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
          />
        </div>
      </div>


      {/* File Statistics */}
      <section
        aria-label="Uploaded file statistics"
        className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          {
            label: 'Total Files',
            value: fileStatistics.total,
            type: 'ALL',
          },
          {
            label: 'PDF Files',
            value: fileStatistics.pdf,
            type: 'PDF',
          },
          {
            label: 'DOCX Files',
            value: fileStatistics.docx,
            type: 'DOCX',
          },
          {
            label: 'TXT Files',
            value: fileStatistics.txt,
            type: 'TXT',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="upload-theme-surface upload-surface rounded-xl border border-[#2a1b4d] bg-[#160b32] p-5 hover:-translate-y-0.5 hover:shadow-[0_8px_26px_rgba(122,68,255,0.12)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="upload-theme-text upload-body text-sm font-medium text-[#898cc0]">
                  {stat.label}
                </p>

                <p className="upload-theme-text upload-heading mt-3 text-3xl font-bold tracking-tight text-[#f3f0ff]">
                  {isLoadingFiles ? '—' : stat.value}
                </p>
              </div>

              <div className="upload-theme-surface upload-accent flex h-10 min-w-10 items-center justify-center rounded-lg border border-[#7a44ff]/20 bg-[#7a44ff]/10 px-2 text-[11px] font-bold tracking-wide text-[#a97cff]">
                {stat.type}
              </div>
            </div>
          </div>
        ))}
      </section>


      {/* Upload Feedback */}
      {error && (
        <div
          className="upload-theme-surface mb-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
          role="alert"
        >
          <p className="upload-theme-text upload-error-text text-sm leading-6 text-red-300">
            {error}
          </p>
        </div>
      )}

      {status && (
        <div
          className="upload-theme-surface mb-5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4"
          role="status"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
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
                  d="m5 12 4 4L19 6"
                />
              </svg>
            </div>

            <p className="upload-theme-text upload-success-text text-sm leading-6 text-emerald-300">
              {status}
            </p>
          </div>
        </div>
      )}


      {/* File Filters */}
      {!isLoadingFiles && uploadedFiles.length > 0 && (
        <section
          aria-label="Uploaded file filters"
          className="upload-theme-surface upload-surface rounded-xl border border-[#2a1b4d] bg-[#160b32] p-5 sm:p-6"
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_190px_200px_auto] lg:items-end">
            <div>
              <label
                className="upload-theme-text upload-heading mb-2 block text-xs font-semibold text-[#d9d4eb]"
                htmlFor="uploaded-file-search"
              >
                Search
              </label>

              <input
                id="uploaded-file-search"
                type="search"
                value={fileSearch}
                onChange={(event) =>
                  setFileSearch(event.target.value)
                }
                placeholder="Search files..."
                className="upload-theme-interactive upload-filter-control w-full min-w-0 rounded-lg border border-[#3a2860] bg-[#120928] px-4 py-3 text-sm text-[#e7e2f5] outline-none placeholder:text-[#727494] focus:border-[#7a44ff]/70 focus:shadow-[0_0_0_3px_rgba(122,68,255,0.12)]"
              />
            </div>

            <div>
              <label
                className="upload-theme-text upload-heading mb-2 block text-xs font-semibold text-[#d9d4eb]"
                htmlFor="uploaded-file-type"
              >
                File Type
              </label>

              <AnimatedSelect
                id="uploaded-file-type"
                value={fileTypeFilter}
                onChange={setFileTypeFilter}
                options={FILE_TYPE_OPTIONS}
              />
            </div>

            <div>
              <label
                className="upload-theme-text upload-heading mb-2 block text-xs font-semibold text-[#d9d4eb]"
                htmlFor="uploaded-file-sort"
              >
                Order
              </label>

              <AnimatedSelect
                id="uploaded-file-sort"
                value={fileSortOrder}
                onChange={setFileSortOrder}
                options={FILE_SORT_OPTIONS}
              />
            </div>

            <button
              type="button"
              onClick={resetFileFilters}
              className="upload-theme-interactive upload-filter-reset rounded-lg border border-[#3a2860] bg-[#19103a] px-4 py-3 text-sm font-medium text-[#c9b4ff] hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/10"
            >
              Reset
            </button>
          </div>
        </section>
      )}


      {/* Uploaded Materials */}
      <section className="upload-theme-surface upload-surface group mt-8 rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6 hover:border-[#7a44ff] hover:shadow-[0_0_24px_rgba(122,68,255,0.28)] sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4 text-left">
          <div>
            <p className="upload-theme-text upload-accent mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
              Library
            </p>

            <h2 className="upload-theme-text upload-heading text-xl font-bold text-[#f3f0ff]">
              Your Uploaded Materials
            </h2>

            <p className="upload-theme-text upload-body mt-1 text-sm text-[#898cc0]">
              Review or delete study documents you previously uploaded.
            </p>
          </div>


          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()

                loadUploadedFiles({
                  minimumFeedbackMs:
                    2000,
                })
              }}
              onKeyDown={(event) =>
                event.stopPropagation()
              }
              disabled={
                isLoadingFiles
              }
              className="upload-theme-interactive upload-refresh-button inline-flex min-w-[118px] items-center justify-center gap-2 rounded-lg border border-[#3a2860] bg-[#19103a] px-4 py-2 text-sm font-medium text-[#c9b4ff] hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/10 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#3a3150] disabled:text-[#77718d] disabled:shadow-none"
            >
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className={`h-4 w-4 ${isLoadingFiles
                  ? 'animate-spin'
                  : ''
                  }`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4m-4 4a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4"
                />
              </svg>

              {isLoadingFiles
                ? 'Refreshing...'
                : 'Refresh'}
            </button>



          </div>
        </div>


        <div>
          <div>
            {/* Uploaded Files Error */}
            {filesError && (
              <div
                className="upload-theme-surface mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
                role="alert"
              >
                <p className="upload-theme-text upload-error-text text-sm leading-6 text-red-300">
                  {filesError}
                </p>
              </div>
            )}


            {/* Uploaded Files Success */}
            {filesStatus && (
              <div
                className="upload-theme-surface mt-5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4"
                role="status"
              >
                <p className="upload-theme-text upload-success-text text-sm text-emerald-300">
                  {filesStatus}
                </p>
              </div>
            )}


            {/* Loading */}
            {isLoadingFiles ? (
              <div className="mt-6 flex items-center gap-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

                <p className="upload-theme-text upload-body text-sm text-[#898cc0]">
                  Loading uploaded materials...
                </p>
              </div>
            ) : uploadedFiles.length === 0 ? (
              /* Empty */
              <div className="upload-theme-surface upload-empty mt-6 rounded-lg border border-[#2a1b4d] bg-[#120928]/50 p-6 text-center">
                <div className="upload-accent mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#7a44ff]/10 text-[#a97cff]">
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
                      d="M6 3h9l3 3v15H6V3Zm9 0v4h4"
                    />
                  </svg>
                </div>

                <p className="upload-theme-text upload-body mt-3 text-sm text-[#898cc0]">
                  You have not uploaded any study materials yet.
                </p>
              </div>
            ) : filteredUploadedFiles.length === 0 ? (
              <div className="upload-theme-surface upload-empty mt-6 rounded-lg border border-[#2a1b4d] bg-[#120928]/50 p-6 text-center">
                <p className="upload-theme-text upload-body text-sm text-[#898cc0]">
                  No uploaded files match the current filters.
                </p>
              </div>
            ) : (
              /* File List */
              <div className="mt-6 space-y-3">
                {paginatedUploadedFiles.map(
                  (file) => (
                    <div
                      key={`${currentUploadedFilesPage}-${file.file_id}`}
                      className="upload-theme-surface upload-file-row group flex flex-col gap-4 rounded-lg border border-[#2a1b4d] bg-[#120928]/40 p-4 hover:border-[#7a44ff]/40 hover:bg-[#19103a] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/upload/${file.file_id}`)
                        }
                        aria-label={`Open details for ${file.file_name}`}
                        className="upload-theme-interactive flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a44ff]/60"
                      >
                        <div className="upload-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#7a44ff]/20 bg-[#7a44ff]/10 text-[#a97cff]">
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
                              d="M6 3h9l3 3v15H6V3Zm9 0v4h4M9 11h6M9 15h6"
                            />
                          </svg>
                        </div>

                        <div className="min-w-0">
                          <p className="upload-theme-text upload-file-name break-words font-medium text-[#e7e2f5]">
                            {
                              file.file_name
                            }
                          </p>

                          <p className="upload-theme-text upload-muted mt-1 text-sm text-[#727494]">
                            Uploaded:{' '}
                            {formatUploadedDate(
                              file.uploaded_at
                            )}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteUploadedFile(
                            file
                          )
                        }
                        disabled={
                          deletingFileId ===
                          file.file_id
                        }
                        className="upload-theme-interactive upload-delete-button inline-flex min-w-[104px] items-center justify-center gap-2 self-start rounded-lg border border-red-400/25 bg-red-500/[0.05] px-4 py-2 text-sm font-medium text-red-300 hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#3a3150] disabled:text-[#77718d] disabled:shadow-none sm:self-auto"
                      >
                        {deletingFileId ===
                          file.file_id && (
                            <span
                              aria-hidden="true"
                              className="h-4 w-4 animate-spin rounded-full border-2 border-[#77718d]/40 border-t-[#c2c4e4]"
                            />
                          )}

                        {deletingFileId ===
                          file.file_id
                          ? 'Deleting...'
                          : 'Delete'}
                      </button>
                    </div>
                  )
                )}

                {/* Uploaded Material Pagination */}
                {filteredUploadedFiles.length >
                  0 && (
                  <div className="upload-pagination mt-5 flex flex-col gap-3 border-t border-[#2a1b4d] pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="upload-theme-text upload-muted text-xs text-[#727494]">
                      Showing{' '}
                      {
                        firstVisibleUploadedFile
                      }{' '}
                      to{' '}
                      {
                        lastVisibleUploadedFile
                      }{' '}
                      of{' '}
                      {
                        filteredUploadedFiles.length
                      }{' '}
                      uploaded materials
                    </p>


                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setUploadedFilesPage(
                            (
                              current
                            ) =>
                              Math.max(
                                1,
                                current - 1
                              )
                          )
                        }
                        disabled={
                          currentUploadedFilesPage ===
                          1
                        }
                        className="upload-theme-interactive upload-pagination-nav rounded-lg border border-[#392461] bg-[#251149] px-3 py-2 text-xs font-medium text-[#c9b4ff] hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Previous
                      </button>


                      {Array.from(
                        {
                          length:
                            totalUploadedFilePages,
                        },
                        (
                          _,
                          index
                        ) =>
                          index + 1
                      ).map(
                        (
                          pageNumber
                        ) => (
                          <button
                            key={
                              pageNumber
                            }
                            type="button"
                            onClick={() =>
                              setUploadedFilesPage(
                                pageNumber
                              )
                            }
                            aria-label={`Go to uploaded materials page ${pageNumber}`}
                            aria-current={
                              currentUploadedFilesPage ===
                              pageNumber
                                ? 'page'
                                : undefined
                            }
                            className={`upload-theme-interactive upload-pagination-page flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-xs font-semibold ${
                              currentUploadedFilesPage ===
                              pageNumber
                                ? 'border-[#7a44ff] bg-[#7a44ff] text-white'
                                : 'border-[#392461] bg-[#251149] text-[#c9b4ff] hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/10'
                            }`}
                          >
                            {
                              pageNumber
                            }
                          </button>
                        )
                      )}


                      <button
                        type="button"
                        onClick={() =>
                          setUploadedFilesPage(
                            (
                              current
                            ) =>
                              Math.min(
                                totalUploadedFilePages,
                                current + 1
                              )
                          )
                        }
                        disabled={
                          currentUploadedFilesPage ===
                          totalUploadedFilePages
                        }
                        className="upload-theme-interactive upload-pagination-nav rounded-lg border border-[#392461] bg-[#251149] px-3 py-2 text-xs font-medium text-[#c9b4ff] hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}


export default Upload