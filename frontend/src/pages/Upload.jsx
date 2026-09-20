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
          setFilesError(
            'This uploaded file could not be found. The list will be refreshed.'
          )

          await loadUploadedFiles()
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
    <div className="mx-auto max-w-4xl">

      {/* Page Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Upload Study Material
        </h1>

        <p className="mt-2 text-gray-600">
          Upload your study material so it can later be used
          to generate summaries, flashcards, quizzes and
          concept explanations.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >

        {/* File Selection */}
        <div>
          <label
            htmlFor="study-file"
            className="block text-sm font-semibold text-gray-800"
          >
            Study Material
          </label>

          <p className="mt-1 text-sm text-gray-500">
            Supported formats: PDF, DOCX and TXT. Maximum
            file size: 15 MB.
          </p>

          <div className="mt-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">

            <p className="mb-4 text-gray-600">
              Select a study document from your computer.
            </p>

            <label
              htmlFor="study-file"
              className="inline-block cursor-pointer rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
            >
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
          <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4">

            <div className="flex items-start justify-between gap-4">

              <div>
                <p className="font-medium text-green-900">
                  {selectedFile.name}
                </p>

                <p className="mt-1 text-sm text-green-700">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>

              <button
                type="button"
                onClick={handleRemoveFile}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                Remove
              </button>

            </div>

          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">

            <p className="text-sm text-red-700">
              {error}
            </p>

          </div>
        )}

        {/* AI Information */}
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-5">

          <h2 className="font-semibold text-blue-900">
            About AI Processing
          </h2>

          <p className="mt-2 text-sm leading-6 text-blue-800">
            Uploading a document does not automatically send
            it to the Generative AI service. Your consent will
            be requested separately before your study material
            is used to generate AI content.
          </p>

        </div>

        {/* Privacy Notice */}
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-5">

          <h2 className="font-semibold text-amber-900">
            Document Privacy
          </h2>

          <p className="mt-2 text-sm leading-6 text-amber-800">
            Only upload study materials that you are authorised
            to use. Avoid uploading sensitive, confidential or
            private information.
          </p>

        </div>

        {/* Status Message */}
        {status && (
          <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4">

            <p className="text-sm text-green-700">
              {status}
            </p>

          </div>
        )}

        {/* Upload Button */}
        <div className="mt-6 flex justify-end">

          <button
            type="submit"
            disabled={!selectedFile || isUploading}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isUploading
              ? 'Uploading...'
              : 'Upload Material'}
          </button>

        </div>

      </form>

      {/* Uploaded Materials */}
      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Your Uploaded Materials
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Review or delete study documents you previously uploaded.
            </p>
          </div>

          <button
            type="button"
            onClick={loadUploadedFiles}
            disabled={isLoadingFiles}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoadingFiles ? 'Refreshing...' : 'Refresh'}
          </button>

        </div>

        {filesError && (
          <div
            className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4"
            role="alert"
          >
            <p className="text-sm text-red-700">
              {filesError}
            </p>
          </div>
        )}

        {filesStatus && (
          <div
            className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4"
            role="status"
          >
            <p className="text-sm text-green-700">
              {filesStatus}
            </p>
          </div>
        )}

        {isLoadingFiles ? (
          <p className="mt-6 text-sm text-gray-500">
            Loading uploaded materials...
          </p>
        ) : uploadedFiles.length === 0 ? (
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-5">

            <p className="text-sm text-gray-600">
              You have not uploaded any study materials yet.
            </p>

          </div>
        ) : (
          <div className="mt-6 space-y-3">

            {uploadedFiles.map((file) => (
              <div
                key={file.file_id}
                className="flex flex-col gap-4 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >

                <div className="min-w-0">

                  <p className="break-words font-medium text-gray-900">
                    {file.file_name}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Uploaded: {formatUploadedDate(file.uploaded_at)}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleDeleteUploadedFile(file)
                  }
                  disabled={deletingFileId === file.file_id}
                  className="self-start rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
                >
                  {deletingFileId === file.file_id
                    ? 'Deleting...'
                    : 'Delete'}
                </button>

              </div>
            ))}

          </div>
        )}

      </section>

    </div>
  )
}

export default Upload