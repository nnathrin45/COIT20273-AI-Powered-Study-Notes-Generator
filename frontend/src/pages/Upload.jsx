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
  const [uploadedMaterialsOpen, setUploadedMaterialsOpen] =
    useState(false)

  const MAX_FILE_SIZE = 15 * 1024 * 1024
  const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt']

  const loadUploadedFiles = useCallback(async () => {
    setIsLoadingFiles(true)
    setFilesError('')

    try {
      const response = await getUploadedFiles()

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

      setUploadedFiles(response.data?.files || [])
    } catch (loadError) {
      console.error(
        'Uploaded materials load error:',
        loadError
      )

      setFilesError(
        'Unable to connect to the server while loading uploaded materials.'
      )
    } finally {
      setIsLoadingFiles(false)
    }
  }, [])

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

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
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
      document.getElementById('study-file')

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

    setError('')
    setStatus('')
    setIsUploading(true)

    try {
      const response =
        await uploadStudyMaterial(selectedFile)

      if (!response.ok) {
        const errorCode = response.data?.code

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

      const textLength = response.data?.text_length

      if (typeof textLength === 'number') {
        setStatus(
          `${uploadedFileName} uploaded successfully. ${textLength.toLocaleString()} characters of readable text were extracted.`
        )
      } else {
        setStatus(
          `${uploadedFileName} uploaded successfully.`
        )
      }

      setSelectedFile(null)

      const fileInput =
        document.getElementById('study-file')

      if (fileInput) {
        fileInput.value = ''
      }

      await loadUploadedFiles()
    } catch (uploadError) {
      console.error('Upload error:', uploadError)

      setError(
        'Unable to connect to the server. Please check that the backend is running and try again.'
      )
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteUploadedFile = async (file) => {
    const confirmed = window.confirm(
      `Delete "${file.file_name}"?\n\nThis will also remove study content generated from this uploaded document. This action cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    setFilesError('')
    setFilesStatus('')
    setDeletingFileId(file.file_id)

    try {
      const response =
        await deleteUploadedFile(file.file_id)

      if (!response.ok) {
        if (
          response.status === 404 ||
          response.data?.code === 'FILE_NOT_FOUND'
        ) {
          setUploadedFiles((currentFiles) =>
            currentFiles.filter(
              (uploadedFile) =>
                uploadedFile.file_id !== file.file_id
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

      setUploadedFiles((currentFiles) =>
        currentFiles.filter(
          (uploadedFile) =>
            uploadedFile.file_id !== file.file_id
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
      return `${(bytes / 1024).toFixed(1)} KB`
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatUploadedDate = (value) => {
    if (!value) {
      return 'Unknown date'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return 'Unknown date'
    }

    return date.toLocaleString()
  }

  return (
    <div className="mx-auto max-w-5xl">

      {/* Page Heading */}
      <div className="mb-8">

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
          Study Materials
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-[#f3f0ff]">
          Upload Study Material
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#898cc0]">
          Upload your study material so it can later be used
          to generate summaries, flashcards, quizzes and
          concept explanations.
        </p>

      </div>

      {/* Upload Card */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6 sm:p-7"
      >

        {/* File Selection */}
        <div>

          <label
            htmlFor="study-file"
            className="block text-sm font-semibold text-[#f3f0ff]"
          >
            Study Material
          </label>

          <p className="mt-1 text-sm text-[#898cc0]">
            Supported formats: PDF, DOCX and TXT. Maximum
            file size: 15 MB.
          </p>

          {/* Drop Area */}
          <div className="mt-5 rounded-xl border-2 border-dashed border-[#3a2860] bg-[#120928]/60 px-6 py-10 text-center transition hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/5">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">

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

            <p className="mt-4 font-medium text-[#d9d4eb]">
              Select a study document from your computer
            </p>

            <p className="mt-1 text-sm text-[#727494]">
              PDF, DOCX or TXT up to 15 MB
            </p>

            <label
              htmlFor="study-file"
              className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#9c46ff] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(122,68,255,0.18)] transition hover:brightness-110"
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
          <div className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4">

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

                  <p className="break-words font-medium text-emerald-200">
                    {selectedFile.name}
                  </p>

                  <p className="mt-1 text-sm text-emerald-300/70">
                    {formatFileSize(selectedFile.size)}
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={handleRemoveFile}
                className="shrink-0 text-sm font-medium text-red-300 transition hover:text-red-200 hover:underline"
              >
                Remove
              </button>

            </div>

          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
            role="alert"
          >
            <p className="text-sm leading-6 text-red-300">
              {error}
            </p>
          </div>
        )}

        {/* AI Information */}
        <div className="mt-6 rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 p-5">

          <div className="flex items-start gap-3">

            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#7a44ff]/15 text-[#a97cff]">

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

              <h2 className="font-semibold text-[#e6ddff]">
                About AI Processing
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#a6a8c7]">
                Uploading a document does not automatically send
                it to the Generative AI service. Your consent will
                be requested separately before your study material
                is used to generate AI content.
              </p>

            </div>

          </div>

        </div>

        {/* Privacy Notice */}
        <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-500/[0.07] p-5">

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

              <h2 className="font-semibold text-amber-200">
                Document Privacy
              </h2>

              <p className="mt-2 text-sm leading-6 text-amber-100/70">
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
            className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4"
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

              <p className="text-sm leading-6 text-emerald-300">
                {status}
              </p>

            </div>
          </div>
        )}

        {/* Upload Button */}
        <div className="mt-6 flex justify-end">

          <button
            type="submit"
            disabled={!selectedFile || isUploading}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#9c46ff] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(122,68,255,0.18)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-[#3a3150] disabled:to-[#3a3150] disabled:text-[#77718d] disabled:shadow-none"
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
      <section className="group mt-8 rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6 transition-all duration-300 hover:border-[#7a44ff] hover:shadow-[0_0_24px_rgba(122,68,255,0.28)] sm:p-7">

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
          aria-expanded={uploadedMaterialsOpen}
          aria-controls="uploaded-materials-content"
          className="flex cursor-pointer flex-wrap items-center justify-between gap-4 text-left focus:outline-none"
        >
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
              Library
            </p>

            <h2 className="text-xl font-bold text-[#f3f0ff]">
              Your Uploaded Materials
            </h2>

            <p className="mt-1 text-sm text-[#898cc0]">
              Review or delete study documents you previously uploaded.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                loadUploadedFiles()
              }}
              onKeyDown={(event) =>
                event.stopPropagation()
              }
              disabled={isLoadingFiles}
              className="inline-flex items-center gap-2 rounded-lg border border-[#3a2860] bg-[#19103a] px-4 py-2 text-sm font-medium text-[#c9b4ff] transition hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/10 disabled:cursor-not-allowed disabled:opacity-50"
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

              Refresh
            </button>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#392461] bg-[#251149] text-[#a97cff]">
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
          className={`grid transition-all duration-300 ease-in-out ${uploadedMaterialsOpen
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0'
            }`}
        >
          <div className="min-h-0 overflow-hidden">

            {/* Uploaded Files Error */}
            {filesError && (
              <div
                className="mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
                role="alert"
              >
                <p className="text-sm leading-6 text-red-300">
                  {filesError}
                </p>
              </div>
            )}

            {/* Uploaded Files Success */}
            {filesStatus && (
              <div
                className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4"
                role="status"
              >
                <p className="text-sm text-emerald-300">
                  {filesStatus}
                </p>
              </div>
            )}

            {/* Loading */}
            {isLoadingFiles ? (
              <div className="mt-6 flex items-center gap-3">

                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

                <p className="text-sm text-[#898cc0]">
                  Loading uploaded materials...
                </p>

              </div>
            ) : uploadedFiles.length === 0 ? (

              /* Empty */
              <div className="mt-6 rounded-lg border border-[#2a1b4d] bg-[#120928]/50 p-6 text-center">

                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#7a44ff]/10 text-[#a97cff]">
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

                <p className="mt-3 text-sm text-[#898cc0]">
                  You have not uploaded any study materials yet.
                </p>

              </div>
            ) : (

              /* File List */
              <div className="mt-6 space-y-3">

                {uploadedFiles.map((file) => (
                  <div
                    key={file.file_id}
                    className="group flex flex-col gap-4 rounded-lg border border-[#2a1b4d] bg-[#120928]/40 p-4 transition hover:border-[#7a44ff]/40 hover:bg-[#19103a] sm:flex-row sm:items-center sm:justify-between"
                  >

                    <div className="flex min-w-0 items-start gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#7a44ff]/20 bg-[#7a44ff]/10 text-[#a97cff]">

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

                        <p className="break-words font-medium text-[#e7e2f5]">
                          {file.file_name}
                        </p>

                        <p className="mt-1 text-sm text-[#727494]">
                          Uploaded:{' '}
                          {formatUploadedDate(file.uploaded_at)}
                        </p>

                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteUploadedFile(file)
                      }
                      disabled={
                        deletingFileId === file.file_id
                      }
                      className="self-start rounded-lg border border-red-400/25 bg-red-500/[0.05] px-4 py-2 text-sm font-medium text-red-300 transition hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
                    >
                      {deletingFileId === file.file_id
                        ? 'Deleting...'
                        : 'Delete'}
                    </button>

                  </div>
                ))}

              </div>
            )}
          </div>
        </div>
      </section>

    </div>
  )
}

export default Upload