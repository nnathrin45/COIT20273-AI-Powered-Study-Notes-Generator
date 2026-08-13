import { useState } from 'react'

function Quiz() {
  const [selectedDocument, setSelectedDocument] = useState('')
  const [generated, setGenerated] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  // Temporary mock documents.
  const documents = [
    {
      id: 1,
      name: 'Introduction to Artificial Intelligence.pdf',
    },
    {
      id: 2,
      name: 'Database Systems Week 4.docx',
    },
    {
      id: 3,
      name: 'Software Engineering Notes.txt',
    },
  ]

  // Temporary mock quiz data.
  // This will later come from the backend/Gemini.
  const questions = [
    {
      id: 1,
      type: 'multiple-choice',
      question: 'What is the main purpose of Artificial Intelligence?',
      options: [
        'To replace all computer hardware',
        'To enable systems to perform tasks requiring human-like intelligence',
        'To remove the need for data',
        'To only perform mathematical calculations',
      ],
      correctAnswer: 1,
    },
    {
      id: 2,
      type: 'multiple-choice',
      question: 'Which statement best describes machine learning?',
      options: [
        'A method for manually programming every possible outcome',
        'A method for storing files in a database',
        'A method that allows systems to learn patterns from data',
        'A method used only for designing websites',
      ],
      correctAnswer: 2,
    },
    {
      id: 3,
      type: 'true-false',
      question:
        'Supervised learning commonly uses labelled training examples.',
      options: ['True', 'False'],
      correctAnswer: 0,
    },
    {
      id: 4,
      type: 'true-false',
      question:
        'Artificial Intelligence systems never require data to perform useful tasks.',
      options: ['True', 'False'],
      correctAnswer: 1,
    },
  ]

  const selectedDocumentName =
    documents.find(
      (document) => document.id === Number(selectedDocument)
    )?.name || ''

  const handleGenerateQuiz = () => {
    if (!selectedDocument) {
      setError('Please select a study material first.')
      setGenerated(false)
      return
    }

    setError('')
    setGenerated(true)
    setCurrentQuestion(0)
    setAnswers({})
    setSubmitted(false)
  }

  const handleAnswer = (optionIndex) => {
    if (submitted) {
      return
    }

    setAnswers({
      ...answers,
      [currentQuestion]: optionIndex,
    })
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handleSubmitQuiz = () => {
    if (Object.keys(answers).length !== questions.length) {
      setError('Please answer all questions before submitting the quiz.')
      return
    }

    setError('')
    setSubmitted(true)
  }

  const calculateScore = () => {
    let score = 0

    questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        score += 1
      }
    })

    return score
  }

  const score = calculateScore()

  const percentage = Math.round(
    (score / questions.length) * 100
  )

  return (
    <div className="mx-auto max-w-5xl">

      {/* Page Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Practice Quiz
        </h1>

        <p className="mt-2 text-gray-600">
          Generate a practice quiz from your uploaded study materials and test
          your understanding.
        </p>
      </div>

      {/* Quiz Generator */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

        <h2 className="text-xl font-semibold text-gray-900">
          Generate Quiz
        </h2>

        <div className="mt-6">

          <label
            htmlFor="quiz-document"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Study Material
          </label>

          <select
            id="quiz-document"
            value={selectedDocument}
            onChange={(event) => {
              setSelectedDocument(event.target.value)
              setGenerated(false)
              setAnswers({})
              setSubmitted(false)
              setError('')
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">
              Select a document
            </option>

            {documents.map((document) => (
              <option
                key={document.id}
                value={document.id}
              >
                {document.name}
              </option>
            ))}
          </select>

        </div>

        {error && !generated && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleGenerateQuiz}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700"
          >
            Generate Quiz
          </button>
        </div>

      </div>

      {/* Generated Quiz */}
      {generated && (
        <div className="mt-8">

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

            <div>
              <div className="flex flex-wrap items-center gap-2">

                <h2 className="text-2xl font-semibold text-gray-900">
                  Practice Questions
                </h2>

                <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                  AI Generated
                </span>

              </div>

              <p className="mt-2 text-sm text-gray-500">
                Source: {selectedDocumentName}
              </p>
            </div>

            <p className="text-sm font-medium text-gray-500">
              Question {currentQuestion + 1} of {questions.length}
            </p>

          </div>

          {/* Question Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              {questions[currentQuestion].type === 'true-false'
                ? 'True or False'
                : 'Multiple Choice'}
            </p>

            <h3 className="mt-3 text-xl font-semibold leading-relaxed text-gray-900">
              {questions[currentQuestion].question}
            </h3>

            <div className="mt-6 space-y-3">

              {questions[currentQuestion].options.map(
                (option, optionIndex) => {
                  const selected =
                    answers[currentQuestion] === optionIndex

                  const correct =
                    questions[currentQuestion].correctAnswer === optionIndex

                  let optionStyle =
                    'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'

                  if (selected && !submitted) {
                    optionStyle =
                      'border-blue-500 bg-blue-50'
                  }

                  if (submitted && correct) {
                    optionStyle =
                      'border-green-500 bg-green-50'
                  }

                  if (
                    submitted &&
                    selected &&
                    !correct
                  ) {
                    optionStyle =
                      'border-red-500 bg-red-50'
                  }

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleAnswer(optionIndex)}
                      disabled={submitted}
                      className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition ${optionStyle}`}
                    >
                      <div
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                          selected
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-gray-300 text-gray-600'
                        }`}
                      >
                        {String.fromCharCode(65 + optionIndex)}
                      </div>

                      <span className="text-gray-800">
                        {option}
                      </span>
                    </button>
                  )
                }
              )}

            </div>

            {/* Answer feedback */}
            {submitted && (
              <div className="mt-6 rounded-lg bg-gray-50 p-4">

                {answers[currentQuestion] ===
                questions[currentQuestion].correctAnswer ? (
                  <p className="font-medium text-green-700">
                    Correct answer.
                  </p>
                ) : (
                  <div>
                    <p className="font-medium text-red-700">
                      Incorrect answer.
                    </p>

                    <p className="mt-1 text-sm text-gray-700">
                      Correct answer:{' '}
                      {
                        questions[currentQuestion].options[
                          questions[currentQuestion].correctAnswer
                        ]
                      }
                    </p>
                  </div>
                )}

              </div>
            )}

          </div>

          {/* Question Navigation */}
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Previous
            </button>

            <div className="flex flex-wrap justify-center gap-2">

              {questions.map((question, index) => {
                const answered =
                  answers[index] !== undefined

                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => setCurrentQuestion(index)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium ${
                      currentQuestion === index
                        ? 'bg-blue-600 text-white'
                        : answered
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </button>
                )
              })}

            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={
                currentQuestion === questions.length - 1
              }
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>

          </div>

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* Submit */}
          {!submitted && (
            <div className="mt-6 flex justify-end">

              <button
                type="button"
                onClick={handleSubmitQuiz}
                className="rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700"
              >
                Submit Quiz
              </button>

            </div>
          )}

          {/* Results */}
          {submitted && (
            <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

              <h2 className="text-2xl font-semibold text-gray-900">
                Quiz Results
              </h2>

              <div className="mt-6 grid gap-5 sm:grid-cols-3">

                <div className="rounded-lg bg-gray-50 p-5">
                  <p className="text-sm text-gray-500">
                    Score
                  </p>

                  <p className="mt-1 text-3xl font-bold text-gray-900">
                    {score}/{questions.length}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-5">
                  <p className="text-sm text-gray-500">
                    Percentage
                  </p>

                  <p className="mt-1 text-3xl font-bold text-gray-900">
                    {percentage}%
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-5">
                  <p className="text-sm text-gray-500">
                    Correct Answers
                  </p>

                  <p className="mt-1 text-3xl font-bold text-gray-900">
                    {score}
                  </p>
                </div>

              </div>

              <p className="mt-5 text-sm text-gray-600">
                Use the numbered question buttons above to review your answers
                and compare them with the correct responses.
              </p>

            </div>
          )}

          {/* Responsible AI Warning */}
          <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5">

            <h3 className="font-semibold text-amber-900">
              AI-Generated Content
            </h3>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              Quiz questions and answers generated by AI may contain
              inaccuracies or omissions. Verify important information against
              your original uploaded study material.
            </p>

          </div>

        </div>
      )}

    </div>
  )
}

export default Quiz