import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import { uploadStudyMaterial } from '../services/uploadService'
import {
  deleteUploadedFile,
  getUploadedFiles,
} from '../services/uploadedService'


function Upload() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(true)
  const [deletingFileId, setDeletingFileId] = useState(null)
  const [filesError, setFilesError] = useState('')
  const [filesStatus, setFilesStatus] = useState('')

  const [
    uploadedMaterialsOpen,
    setUploadedMaterialsOpen,
  ] = useState(false)

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


  const handleFileChange = (event) => {
    const file = event.target.files[0]

    setError('')
    setStatus('')
    setSelectedFile(null)

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

    setSelectedFile(file)
  }


  const handleRemoveFile = () => {
    setSelectedFile(null)
    setError('')
    setStatus('')

    const fileInput =
      document.getElementById(
        'study-file'
      )

    if (fileInput) {
      fileInput.value = ''
    }
  }


  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!selectedFile) {
      setError(
        'Please select a study material before continuing.'
      )

      return
    }

    const actionStartedAt = Date.now()

    setError('')
    setStatus('')
    setIsUploading(true)

    try {
      const response =
        await uploadStudyMaterial(
          selectedFile
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

        return
      }

      const uploadedFileName =
        response.data?.file?.file_name ||
        selectedFile.name

      const textLength =
        response.data?.text_length

      const successMessage =
        typeof textLength === 'number'
          ? `${uploadedFileName} uploaded successfully. ${textLength.toLocaleString()} characters of readable text were extracted.`
          : `${uploadedFileName} uploaded successfully.`

      setSelectedFile(null)

      const fileInput =
        document.getElementById(
          'study-file'
        )

      if (fileInput) {
        fileInput.value = ''
      }

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


  const formatFileSize = (bytes) => {
    if (bytes < 1024) {
      return `${bytes} bytes`
    }

    if (bytes < 1024 * 1024) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`
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


  return (
    <div className="upload-theme mx-auto max-w-5xl">
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
        `}
      </style>


      {/* Page Heading */}
      <div className="mb-8">
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


      {/* Upload Card */}
      <form
        onSubmit={handleSubmit}
        className="upload-theme-surface upload-surface rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6 sm:p-7"
      >
        {/* File Selection */}
        <div>
          <label
            htmlFor="study-file"
            className="upload-theme-text upload-heading block text-sm font-semibold text-[#f3f0ff]"
          >
            Study Material
          </label>

          <p className="upload-theme-text upload-body mt-1 text-sm text-[#898cc0]">
            Supported formats: PDF, DOCX and TXT. Maximum
            file size: 15 MB.
          </p>


          {/* Drop Area */}
          <div className="upload-theme-surface upload-drop-area mt-5 rounded-xl border-2 border-dashed border-[#3a2860] bg-[#120928]/60 px-6 py-10 text-center hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/5">
            <div className="upload-accent mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-7 w-7"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16V4m0 0L7 9m5-5 5 5M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4"
                />
              </svg>
            </div>

            <p className="upload-theme-text upload-heading mt-4 font-medium text-[#d9d4eb]">
              Select a study document from your computer
            </p>

            <p className="upload-theme-text upload-muted mt-1 text-sm text-[#727494]">
              PDF, DOCX or TXT up to 15 MB
            </p>

            <label
              htmlFor="study-file"
              className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#9c46ff] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(122,68,255,0.18)] transition duration-300 hover:brightness-110"
            >
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
                  d="M12 16V4m0 0L7 9m5-5 5 5"
                />
              </svg>

              Choose File
            </label>

            <input
              id="study-file"
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>


        {/* Selected File */}
        {selectedFile && (
          <div className="upload-theme-surface upload-selected-file mt-5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
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

                <div className="min-w-0">
                  <p className="upload-theme-text upload-selected-name break-words font-medium text-emerald-200">
                    {selectedFile.name}
                  </p>

                  <p className="upload-theme-text upload-selected-meta mt-1 text-sm text-emerald-300/70">
                    {formatFileSize(
                      selectedFile.size
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRemoveFile}
                className="upload-theme-interactive shrink-0 text-sm font-medium text-red-300 hover:text-red-200 hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        )}


        {/* Error */}
        {error && (
          <div
            className="upload-theme-surface mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
            role="alert"
          >
            <p className="upload-theme-text upload-error-text text-sm leading-6 text-red-300">
              {error}
            </p>
          </div>
        )}


        {/* AI Information */}
        <div className="upload-theme-surface mt-6 rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 p-5">
          <div className="flex items-start gap-3">
            <div className="upload-accent mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#7a44ff]/15 text-[#a97cff]">
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
                  d="M12 8h.01M11 12h1v4h1m8-4a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>

            <div>
              <h2 className="upload-theme-text upload-ai-heading font-semibold text-[#e6ddff]">
                About AI Processing
              </h2>

              <p className="upload-theme-text upload-ai-body mt-2 text-sm leading-6 text-[#a6a8c7]">
                Uploading a document does not automatically send
                it to the Generative AI service. Your consent will
                be requested separately before your study material
                is used to generate AI content.
              </p>
            </div>
          </div>
        </div>


        {/* Privacy Notice */}
        <div className="upload-theme-surface mt-4 rounded-lg border border-amber-400/20 bg-amber-500/[0.07] p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
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
                  d="M12 3 4 7v5c0 4.5 3.2 7.6 8 9 4.8-1.4 8-4.5 8-9V7l-8-4Z"
                />
              </svg>
            </div>

            <div>
              <h2 className="upload-theme-text upload-privacy-heading font-semibold text-amber-200">
                Document Privacy
              </h2>

              <p className="upload-theme-text upload-privacy-body mt-2 text-sm leading-6 text-amber-100/70">
                Only upload study materials that you are authorised
                to use. Avoid uploading sensitive, confidential or
                private information.
              </p>
            </div>
          </div>
        </div>


        {/* Success */}
        {status && (
          <div
            className="upload-theme-surface mt-5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4"
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


        {/* Upload Button */}
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={
              !selectedFile ||
              isUploading
            }
            className="upload-submit-button inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#9c46ff] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(122,68,255,0.18)] transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:from-[#3a3150] disabled:to-[#3a3150] disabled:text-[#77718d] disabled:shadow-none"
          >
            {isUploading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}

            {isUploading
              ? 'Uploading...'
              : 'Upload Material'}
          </button>
        </div>
      </form>


      {/* Uploaded Materials */}
      <section className="upload-theme-surface upload-surface group mt-8 rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6 hover:border-[#7a44ff] hover:shadow-[0_0_24px_rgba(122,68,255,0.28)] sm:p-7">
        <div
          role="button"
          tabIndex={0}
          onClick={() =>
            setUploadedMaterialsOpen(
              (current) => !current
            )
          }
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' ||
              event.key === ' '
            ) {
              event.preventDefault()

              setUploadedMaterialsOpen(
                (current) => !current
              )
            }
          }}
          aria-expanded={
            uploadedMaterialsOpen
          }
          aria-controls="uploaded-materials-content"
          className="flex cursor-pointer flex-wrap items-center justify-between gap-4 text-left focus:outline-none"
        >
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


            <div className="upload-theme-surface upload-chevron flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#392461] bg-[#251149] text-[#a97cff]">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
                className={`h-4 w-4 transition-transform duration-300 ${uploadedMaterialsOpen
                  ? 'rotate-180'
                  : ''
                  }`}
              >
                <path
                  d="M5 7.5L10 12.5L15 7.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>


        <div
          id="uploaded-materials-content"
          aria-hidden={
            !uploadedMaterialsOpen
          }
          className={`grid transition-all duration-300 ease-in-out ${uploadedMaterialsOpen
            ? 'visible grid-rows-[1fr] opacity-100'
            : 'invisible grid-rows-[0fr] opacity-0'
            }`}
        >
          <div className="min-h-0 overflow-hidden">
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
            ) : (
              /* File List */
              <div className="mt-6 space-y-3">
                {uploadedFiles.map(
                  (file) => (
                    <div
                      key={file.file_id}
                      className="upload-theme-surface upload-file-row group flex flex-col gap-4 rounded-lg border border-[#2a1b4d] bg-[#120928]/40 p-4 hover:border-[#7a44ff]/40 hover:bg-[#19103a] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
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
                      </div>

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
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}


export default Upload