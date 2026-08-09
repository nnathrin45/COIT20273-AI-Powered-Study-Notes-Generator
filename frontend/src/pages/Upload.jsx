import { useState } from 'react'

function Upload() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [error, setError] = useState('')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState('')

  const MAX_FILE_SIZE = 15 * 1024 * 1024
  const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt']

  const handleFileChange = (event) => {
    const file = event.target.files[0]

    setError('')
    setStatus('')
    setSelectedFile(null)

    if (!file) {
      return
    }

    const extension = file.name.split('.').pop()?.toLowerCase()

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setError('Unsupported file type. Please select a PDF, DOCX or TXT file.')
      event.target.value = ''
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('The selected file is larger than the 15 MB limit.')
      event.target.value = ''
      return
    }

    setSelectedFile(file)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setError('')
    setStatus('')

    const fileInput = document.getElementById('study-file')

    if (fileInput) {
      fileInput.value = ''
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!selectedFile) {
      setError('Please select a study material before continuing.')
      return
    }

    if (!consent) {
      setError('Please provide consent before the document can be processed.')
      return
    }

    setError('')
    setStatus(
      'File validated successfully. Backend upload integration will be added in the next development stage.'
    )
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

  return (
    <div className="mx-auto max-w-4xl">

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Upload Study Material
        </h1>

        <p className="mt-2 text-gray-600">
          Upload your study material so it can later be used to generate
          summaries, flashcards, quizzes and concept explanations.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >

        <div>
          <label
            htmlFor="study-file"
            className="block text-sm font-semibold text-gray-800"
          >
            Study Material
          </label>

          <p className="mt-1 text-sm text-gray-500">
            Supported formats: PDF, DOCX and TXT. Maximum file size: 15 MB.
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

        {error && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-900">
            AI Processing Notice
          </h2>

          <p className="mt-2 text-sm text-amber-800">
            Your document may be sent to an external Generative AI service to
            generate study materials. Do not upload sensitive, confidential or
            private information.
          </p>

          <label className="mt-4 flex items-start gap-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 h-4 w-4"
            />

            <span className="text-sm text-amber-900">
              I understand and consent to my uploaded study material being
              processed by the external AI service.
            </span>
          </label>
        </div>

        {status && (
          <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-700">
              {status}
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={!selectedFile || !consent}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Upload and Continue
          </button>
        </div>

      </form>
    </div>
  )
}

export default Upload