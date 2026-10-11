import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'
import { jsPDF } from 'jspdf'
import { getConsentStatus } from '../services/consentService'
import { getUploadedFiles } from '../services/uploadedService'
import {
  deleteAIOutput,
  generateAIContent,
  getAIOutputs,
  getQuizAttempts,
  submitQuizAttempt,
} from '../services/aiService'
import AnimatedSelect from '../components/AnimatedSelect'
import AIConsentRequired from '../components/AIConsentRequired'


function Quiz() {
  const [documents, setDocuments] = useState([])
  const [selectedDocument, setSelectedDocument] = useState('')

  const [documentsLoading, setDocumentsLoading] =
    useState(true)

  const [documentsError, setDocumentsError] =
    useState('')

  const [questions, setQuestions] = useState([])

  const [
    generatedOutput,
    setGeneratedOutput,
  ] = useState(null)

  const [savedQuizzes, setSavedQuizzes] =
    useState([])

  const [
    savedQuizzesLoading,
    setSavedQuizzesLoading,
  ] = useState(false)

  const [
    savedQuizzesError,
    setSavedQuizzesError,
  ] = useState('')


  const [disclaimer, setDisclaimer] =
    useState('')

  const [
    currentQuestion,
    setCurrentQuestion,
  ] = useState(0)

  const [answers, setAnswers] =
    useState({})

  const [attempt, setAttempt] =
    useState(null)

  const [isRetaking, setIsRetaking] =
    useState(false)


  const [
    generationLoading,
    setGenerationLoading,
  ] = useState(false)

  const [
    submitLoading,
    setSubmitLoading,
  ] = useState(false)

  const [
    quizActionLoading,
    setQuizActionLoading,
  ] = useState(false)


  const [error, setError] =
    useState('')

  const [
    retryableError,
    setRetryableError,
  ] = useState(false)

  const [
    consentStatus,
    setConsentStatus,
  ] = useState(null)

  const [
    consentInitialLoading,
    setConsentInitialLoading,
  ] = useState(true)

  const [
    consentError,
    setConsentError,
  ] = useState('')


  useEffect(() => {
    const loadConsent = async () => {
      setConsentInitialLoading(true)
      setConsentError('')

      try {
        const response =
          await getConsentStatus()

        if (!response.ok) {
          if (response.status === 401) {
            setConsentError(
              'Your login session is missing or invalid. Please sign in again.'
            )
          } else {
            setConsentError(
              response.data?.message ||
                'Unable to retrieve your AI consent preference.'
            )
          }

          return
        }

        setConsentStatus(
          response.data?.consent?.status ??
            null
        )
      } catch (consentFetchError) {
        console.error(
          'Consent fetch error:',
          consentFetchError
        )

        setConsentError(
          'Unable to connect to the server to retrieve your AI consent preference.'
        )
      } finally {
        setConsentInitialLoading(false)
      }
    }

    loadConsent()
  }, [])


  useEffect(() => {
    const loadDocuments = async () => {
      setDocumentsLoading(true)
      setDocumentsError('')

      try {
        const response =
          await getUploadedFiles()

        if (!response.ok) {
          if (response.status === 401) {
            setDocumentsError(
              'Your login session is missing or invalid. Please sign in again.'
            )
          } else {
            setDocumentsError(
              response.data?.message ||
                'Unable to retrieve your uploaded study materials.'
            )
          }

          return
        }

        setDocuments(
          response.data?.files ?? []
        )
      } catch (documentFetchError) {
        console.error(
          'Uploaded files fetch error:',
          documentFetchError
        )

        setDocumentsError(
          'Unable to connect to the server to retrieve your uploaded study materials.'
        )
      } finally {
        setDocumentsLoading(false)
      }
    }

    loadDocuments()
  }, [])


  useEffect(() => {
    let cancelled = false

    const loadSavedQuizzes = async () => {
      if (!selectedDocument) {
        setSavedQuizzes([])
        setSavedQuizzesError('')
        setSavedQuizzesLoading(false)

        return
      }

      setSavedQuizzesLoading(true)
      setSavedQuizzesError('')

      try {
        const response =
          await getAIOutputs(
            Number(selectedDocument)
          )

        if (cancelled) {
          return
        }

        if (!response.ok) {
          setSavedQuizzes([])

          if (response.status === 401) {
            setSavedQuizzesError(
              'Your login session is missing or invalid. Please sign in again.'
            )
          } else {
            setSavedQuizzesError(
              response.data?.message ||
                'Unable to retrieve your saved quizzes.'
            )
          }

          return
        }

        const quizOutputs = (
          response.data?.outputs ?? []
        )
          .filter(
            (output) =>
              output.output_type === 'quiz' &&
              Array.isArray(output.content)
          )
          .sort((a, b) => {
            const aTime =
              new Date(
                a.generated_at ?? 0
              ).getTime()

            const bTime =
              new Date(
                b.generated_at ?? 0
              ).getTime()

            if (bTime !== aTime) {
              return bTime - aTime
            }

            return (
              Number(b.output_id ?? 0) -
              Number(a.output_id ?? 0)
            )
          })

        const quizzesWithAttempts =
          await Promise.all(
            quizOutputs.map(
              async (quizOutput) => {
                try {
                  const attemptsResponse =
                    await getQuizAttempts(
                      quizOutput.output_id
                    )

                  if (!attemptsResponse.ok) {
                    return {
                      ...quizOutput,
                      attempts: [],
                      attemptsLoadFailed: true,
                    }
                  }

                  return {
                    ...quizOutput,

                    attempts:
                      attemptsResponse.data
                        ?.attempts ?? [],

                    attemptsLoadFailed:
                      false,
                  }
                } catch (
                  attemptsFetchError
                ) {
                  console.error(
                    'Quiz attempts fetch error:',
                    attemptsFetchError
                  )

                  return {
                    ...quizOutput,
                    attempts: [],
                    attemptsLoadFailed: true,
                  }
                }
              }
            )
          )

        if (cancelled) {
          return
        }

        setSavedQuizzes(
          quizzesWithAttempts
        )

        if (
          quizzesWithAttempts.some(
            (quiz) =>
              quiz.attemptsLoadFailed
          )
        ) {
          setSavedQuizzesError(
            'Some quiz attempt history could not be loaded. The available quizzes are still shown.'
          )
        }

      } catch (savedQuizFetchError) {
        if (cancelled) {
          return
        }

        console.error(
          'Saved quizzes fetch error:',
          savedQuizFetchError
        )

        setSavedQuizzes([])

        setSavedQuizzesError(
          'Unable to connect to the server to retrieve your saved quizzes.'
        )
      } finally {
        if (!cancelled) {
          setSavedQuizzesLoading(false)
        }
      }
    }

    loadSavedQuizzes()

    return () => {
      cancelled = true
    }
  }, [selectedDocument])

  const clearQuiz = () => {
    setQuestions([])
    setGeneratedOutput(null)
    setDisclaimer('')
    setCurrentQuestion(0)
    setAnswers({})
    setAttempt(null)
    setIsRetaking(false)
  }


  const handleSelectSavedQuiz = (
    savedQuiz
  ) => {
    const savedQuestions =
      Array.isArray(savedQuiz?.content)
        ? savedQuiz.content
        : []

    const savedAttempts =
      Array.isArray(savedQuiz?.attempts)
        ? savedQuiz.attempts
        : []

    const latestAttempt =
      savedAttempts.length > 0
        ? savedAttempts[0]
        : null

    const restoredAnswers = {}

    if (
      latestAttempt &&
      Array.isArray(
        latestAttempt.answers
      )
    ) {
      latestAttempt.answers.forEach(
        (answer, index) => {
          if (
            typeof answer === 'string'
          ) {
            restoredAnswers[index] =
              answer
          }
        }
      )
    }

    setGeneratedOutput(savedQuiz)
    setQuestions(savedQuestions)
    setDisclaimer('')
    setCurrentQuestion(0)
    setAnswers(restoredAnswers)
    setAttempt(latestAttempt)
    setIsRetaking(false)
    setError('')
    setRetryableError(false)
  }


  const handleGenerateQuiz =
    async () => {
      if (!selectedDocument) {
        setError(
          'Please select a study material first.'
        )

        setRetryableError(false)
        clearQuiz()

        return
      }

      if (
        consentStatus !== 'granted'
      ) {
        setError(
          'Please grant AI processing consent before generating a practice quiz.'
        )

        setRetryableError(false)
        clearQuiz()

        return
      }

      setGenerationLoading(true)
      setError('')
      setRetryableError(false)
      clearQuiz()

      try {
        const response =
          await generateAIContent({
            fileId:
              Number(selectedDocument),

            outputType: 'quiz',
          })

        if (!response.ok) {
          if (
            response.status === 403 &&
            response.data?.code ===
              'CONSENT_REQUIRED'
          ) {
            setConsentStatus(
              'revoked'
            )

            setError(
              'AI processing consent is required. Please manage your consent from the Privacy & Consent page.'
            )

            setRetryableError(false)

            return
          }

          if (
            response.status === 401
          ) {
            setError(
              'Your login session is missing or invalid. Please sign in again.'
            )

            setRetryableError(false)

            return
          }

          if (
            response.status === 404
          ) {
            setError(
              'The selected study material could not be found. Please select another document.'
            )

            setRetryableError(false)

            return
          }

          setError(
            response.data?.message ||
              'Unable to generate the practice quiz. Please try again.'
          )

          setRetryableError(
            response.data?.retryable ===
              true
          )

          return
        }

        const output =
          response.data?.output

        const generatedQuestions =
          output?.content

        if (
          !Array.isArray(
            generatedQuestions
          )
        ) {
          setError(
            'The server returned the quiz in an unexpected format.'
          )

          setRetryableError(false)

          return
        }

        if (
          generatedQuestions.length ===
          0
        ) {
          setError(
            'No usable quiz questions could be generated from this study material.'
          )

          setRetryableError(false)

          return
        }

        setGeneratedOutput(output)

        setSavedQuizzes(
          (currentQuizzes) => [
            {
              ...output,
              attempts: [],
              attemptsLoadFailed: false,
            },

            ...currentQuizzes.filter(
              (quiz) =>
                quiz.output_id !==
                output.output_id
            ),
          ]
        )

        setIsRetaking(false)

        setQuestions(
          generatedQuestions
        )

        setDisclaimer(
          response.data?.disclaimer ??
            ''
        )

        setCurrentQuestion(0)
        setAnswers({})
        setAttempt(null)
        setRetryableError(false)
      } catch (generationError) {
        console.error(
          'Quiz generation error:',
          generationError
        )

        setError(
          'Unable to connect to the server. Please try again.'
        )

        setRetryableError(true)
      } finally {
        setGenerationLoading(false)
      }
    }


  const handleAnswer = (option) => {
    if (attempt) {
      return
    }

    setAnswers(
      (currentAnswers) => ({
        ...currentAnswers,

        [currentQuestion]:
          option,
      })
    )
  }


  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(
        currentQuestion - 1
      )
    }
  }


  const handleNext = () => {
    if (
      currentQuestion <
      questions.length - 1
    ) {
      setCurrentQuestion(
        currentQuestion + 1
      )
    }
  }


  const handleSubmitQuiz =
    async () => {
      if (
        !generatedOutput?.output_id
      ) {
        setError(
          'The generated quiz could not be identified. Please generate it again.'
        )

        setRetryableError(false)

        return
      }

      const submittedAnswers =
        questions.map(
          (_, index) =>
            answers[index] ?? null
        )

      setSubmitLoading(true)
      setError('')
      setRetryableError(false)

      try {
        const response =
          await submitQuizAttempt({
            outputId:
              generatedOutput.output_id,

            answers:
              submittedAnswers,
          })

        if (!response.ok) {
          if (
            response.status === 401
          ) {
            setError(
              'Your login session is missing or invalid. Please sign in again.'
            )

            return
          }

          if (
            response.status === 404
          ) {
            setError(
              'The generated quiz could not be found. Please generate a new quiz.'
            )

            return
          }

          setError(
            response.data?.message ||
              'Unable to submit the quiz. Please try again.'
          )

          return
        }

        const savedAttempt =
          response.data?.attempt

        if (!savedAttempt) {
          setError(
            'The server returned the quiz result in an unexpected format.'
          )

          return
        }

        const completedAttempt = {
          ...savedAttempt,
          answers: submittedAnswers,
        }

        setAttempt(
          completedAttempt
        )

        setSavedQuizzes(
          (currentQuizzes) =>
            currentQuizzes.map(
              (quiz) => {
                if (
                  String(quiz.output_id) !==
                  String(
                    generatedOutput.output_id
                  )
                ) {
                  return quiz
                }

                const existingAttempts =
                  Array.isArray(
                    quiz.attempts
                  )
                    ? quiz.attempts
                    : []

                return {
                  ...quiz,

                  attempts: [
                    completedAttempt,

                    ...existingAttempts.filter(
                      (existingAttempt) =>
                        String(
                          existingAttempt.attempt_id
                        ) !==
                        String(
                          completedAttempt.attempt_id
                        )
                    ),
                  ],

                  attemptsLoadFailed:
                    false,
                }
              }
            )
        )

        setIsRetaking(false)
      } catch (submitError) {
        console.error(
          'Quiz submission error:',
          submitError
        )

        setError(
          'Unable to connect to the server while submitting the quiz. Please try again.'
        )
      } finally {
        setSubmitLoading(false)
      }
    }


  const handleRetake = () => {
    setAnswers({})
    setAttempt(null)
    setIsRetaking(true)
    setCurrentQuestion(0)
    setError('')
    setRetryableError(false)
  }


  const buildQuizFileName = (
    extension
  ) => {
    const sourceName =
      generatedOutput?.file_name ||
      selectedDocumentName ||
      'study-material'

    const baseName =
      sourceName.replace(
        /\.[^/.]+$/,
        ''
      )

    const safeName =
      baseName
        .replace(
          /[^a-z0-9_-]+/gi,
          '-'
        )
        .replace(
          /^-+|-+$/g,
          ''
        )
        .toLowerCase() ||
      'study-material'

    return `${safeName}-quiz.${extension}`
  }


  const handleExportWord =
    async () => {
      if (
        !generatedOutput ||
        !Array.isArray(questions) ||
        questions.length === 0
      ) {
        return
      }

      setQuizActionLoading(true)
      setError('')

      try {
        const sourceName =
          generatedOutput.file_name ||
          selectedDocumentName ||
          'Study material'

        const generatedDate =
          generatedOutput.generated_at
            ? new Date(
                generatedOutput.generated_at
              ).toLocaleString()
            : 'Date unavailable'

        const includeResults =
          !selectedQuizAttemptHistoryFailed &&
          quizCompleted &&
          Boolean(
            latestCompletedAttempt
          )

        const latestResults =
          includeResults &&
          Array.isArray(
            latestCompletedAttempt
              ?.results
          )
            ? latestCompletedAttempt
                .results
            : []

        const latestAnswers =
          includeResults &&
          Array.isArray(
            latestCompletedAttempt
              ?.answers
          )
            ? latestCompletedAttempt
                .answers
            : []

        const questionParagraphs = []

        questions.forEach(
          (question, index) => {
            questionParagraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text:
                      `Question ${
                        index + 1
                      }`,
                    bold: true,
                    size: 24,
                  }),
                ],
                spacing: {
                  before: 240,
                  after: 100,
                },
              })
            )

            questionParagraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text:
                      question.question ||
                      'Question text unavailable',
                    size: 22,
                  }),
                ],
                spacing: {
                  after: 120,
                },
              })
            )

            const options =
              Array.isArray(
                question.options
              )
                ? question.options
                : []

            options.forEach(
              (option, optionIndex) => {
                const optionLabel =
                  String.fromCharCode(
                    65 + optionIndex
                  )

                questionParagraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text:
                          `${optionLabel}. ${option}`,
                        size: 20,
                      }),
                    ],
                    spacing: {
                      after: 70,
                    },
                  })
                )
              }
            )

            if (includeResults) {
              const result =
                latestResults[index] ||
                null

              const submitted =
                result?.submitted ??
                latestAnswers[index] ??
                null

              const correctAnswer =
                result
                  ?.correct_answer ??
                question
                  .correct_answer ??
                'Unavailable'

              questionParagraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text:
                        'Your answer: ',
                      bold: true,
                      size: 20,
                    }),

                    new TextRun({
                      text:
                        submitted ===
                        null
                          ? 'Not answered'
                          : String(
                              submitted
                            ),
                      size: 20,
                    }),
                  ],
                  spacing: {
                    before: 100,
                    after: 70,
                  },
                })
              )

              questionParagraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text:
                        'Correct answer: ',
                      bold: true,
                      size: 20,
                    }),

                    new TextRun({
                      text:
                        String(
                          correctAnswer
                        ),
                      size: 20,
                    }),
                  ],
                  spacing: {
                    after: 70,
                  },
                })
              )

              questionParagraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text:
                        result?.is_correct
                          ? 'Result: Correct'
                          : submitted ===
                              null
                            ? 'Result: Not answered'
                            : 'Result: Incorrect',
                      bold: true,
                      size: 20,
                    }),
                  ],
                  spacing: {
                    after: 120,
                  },
                })
              )
            }
          }
        )

        const summaryParagraphs =
          includeResults
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text:
                        `Points: ${
                          latestCompletedAttempt
                            .score
                        } / ${
                          latestCompletedAttempt
                            .total
                        }`,
                      bold: true,
                      size: 22,
                    }),
                  ],
                  spacing: {
                    after: 80,
                  },
                }),

                new Paragraph({
                  children: [
                    new TextRun({
                      text:
                        `Score Percentage: ${
                          latestCompletedAttempt
                            .percentage
                        }%`,
                      bold: true,
                      size: 22,
                    }),
                  ],
                  spacing: {
                    after: 160,
                  },
                }),
              ]
            : []

        const wordDocument =
          new DocxDocument({
            sections: [
              {
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text:
                          'Generated Quiz',
                        bold: true,
                        size: 32,
                      }),
                    ],
                    spacing: {
                      after: 180,
                    },
                  }),

                  new Paragraph({
                    children: [
                      new TextRun({
                        text:
                          'Source: ',
                        bold: true,
                        size: 20,
                      }),

                      new TextRun({
                        text:
                          sourceName,
                        size: 20,
                      }),
                    ],
                    spacing: {
                      after: 80,
                    },
                  }),

                  new Paragraph({
                    children: [
                      new TextRun({
                        text:
                          'Generated: ',
                        bold: true,
                        size: 20,
                      }),

                      new TextRun({
                        text:
                          generatedDate,
                        size: 20,
                      }),
                    ],
                    spacing: {
                      after: 80,
                    },
                  }),

                  new Paragraph({
                    children: [
                      new TextRun({
                        text:
                          `Questions: ${
                            questions.length
                          }`,
                        bold: true,
                        size: 20,
                      }),
                    ],
                    spacing: {
                      after: 80,
                    },
                  }),

                  new Paragraph({
                    children: [
                      new TextRun({
                        text:
                          selectedQuizAttemptHistoryFailed
                            ? 'Attempts: unavailable'
                            : `Attempts: ${
                                selectedQuizAttempts
                                  .length
                              }`,
                        bold: true,
                        size: 20,
                      }),
                    ],
                    spacing: {
                      after:
                        includeResults
                          ? 80
                          : 180,
                    },
                  }),

                  ...summaryParagraphs,

                  ...questionParagraphs,

                  new Paragraph({
                    children: [
                      new TextRun({
                        text:
                          'AI-generated study content should be reviewed against your original study material.',
                        italics: true,
                        size: 18,
                      }),
                    ],
                    spacing: {
                      before: 240,
                    },
                  }),
                ],
              },
            ],
          })

        const blob =
          await Packer.toBlob(
            wordDocument
          )

        const downloadUrl =
          URL.createObjectURL(blob)

        const anchor =
          window.document.createElement(
            'a'
          )

        anchor.href = downloadUrl

        anchor.download =
          buildQuizFileName(
            'docx'
          )

        window.document.body.appendChild(
          anchor
        )

        anchor.click()
        anchor.remove()

        URL.revokeObjectURL(
          downloadUrl
        )
      } catch (exportError) {
        console.error(
          'Quiz Word export error:',
          exportError
        )

        setError(
          'Unable to export this quiz to Word. Please try again.'
        )
      } finally {
        setQuizActionLoading(false)
      }
    }


  const handleExportPdf = () => {
    if (
      !generatedOutput ||
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return
    }

    setQuizActionLoading(true)
    setError('')

    try {
      const sourceName =
        generatedOutput.file_name ||
        selectedDocumentName ||
        'Study material'

      const generatedDate =
        generatedOutput.generated_at
          ? new Date(
              generatedOutput.generated_at
            ).toLocaleString()
          : 'Date unavailable'

      const includeResults =
        !selectedQuizAttemptHistoryFailed &&
        quizCompleted &&
        Boolean(
          latestCompletedAttempt
        )

      const latestResults =
        includeResults &&
        Array.isArray(
          latestCompletedAttempt
            ?.results
        )
          ? latestCompletedAttempt
              .results
          : []

      const latestAnswers =
        includeResults &&
        Array.isArray(
          latestCompletedAttempt
            ?.answers
        )
          ? latestCompletedAttempt
              .answers
          : []

      const pdf = new jsPDF({
        unit: 'pt',
        format: 'a4',
      })

      const margin = 48

      const pageWidth =
        pdf.internal.pageSize.getWidth()

      const pageHeight =
        pdf.internal.pageSize.getHeight()

      const contentWidth =
        pageWidth - margin * 2

      let y = margin


      const ensureSpace = (
        requiredHeight
      ) => {
        if (
          y + requiredHeight >
          pageHeight - margin
        ) {
          pdf.addPage()
          y = margin
        }
      }


      const addWrappedText = (
        text,
        {
          size = 11,
          style = 'normal',
          after = 8,
          indent = 0,
        } = {}
      ) => {
        const safeText =
          text === null ||
          text === undefined
            ? ''
            : String(text)

        pdf.setFont(
          'helvetica',
          style
        )

        pdf.setFontSize(size)

        const availableWidth =
          contentWidth - indent

        const wrappedLines =
          pdf.splitTextToSize(
            safeText,
            availableWidth
          )

        const lineHeight =
          size * 1.35

        const requiredHeight =
          Math.max(
            lineHeight,
            wrappedLines.length *
              lineHeight
          )

        ensureSpace(
          requiredHeight + after
        )

        pdf.text(
          wrappedLines,
          margin + indent,
          y
        )

        y +=
          requiredHeight +
          after
      }


      addWrappedText(
        'Generated Quiz',
        {
          size: 18,
          style: 'bold',
          after: 16,
        }
      )

      addWrappedText(
        `Source: ${sourceName}`,
        {
          size: 10,
          after: 6,
        }
      )

      addWrappedText(
        `Generated: ${generatedDate}`,
        {
          size: 10,
          after: 6,
        }
      )

      addWrappedText(
        `Questions: ${
          questions.length
        }`,
        {
          size: 10,
          style: 'bold',
          after: 6,
        }
      )

      addWrappedText(
        selectedQuizAttemptHistoryFailed
          ? 'Attempts: unavailable'
          : `Attempts: ${
              selectedQuizAttempts
                .length
            }`,
        {
          size: 10,
          style: 'bold',
          after:
            includeResults
              ? 6
              : 18,
        }
      )


      if (includeResults) {
        addWrappedText(
          `Points: ${
            latestCompletedAttempt
              .score
          } / ${
            latestCompletedAttempt
              .total
          }`,
          {
            size: 10,
            style: 'bold',
            after: 6,
          }
        )

        addWrappedText(
          `Score Percentage: ${
            latestCompletedAttempt
              .percentage
          }%`,
          {
            size: 10,
            style: 'bold',
            after: 18,
          }
        )
      }


      questions.forEach(
        (question, index) => {
          ensureSpace(80)

          addWrappedText(
            `Question ${
              index + 1
            }`,
            {
              size: 12,
              style: 'bold',
              after: 6,
            }
          )

          addWrappedText(
            question.question ||
              'Question text unavailable',
            {
              size: 11,
              after: 8,
            }
          )

          const options =
            Array.isArray(
              question.options
            )
              ? question.options
              : []

          options.forEach(
            (
              option,
              optionIndex
            ) => {
              const optionLabel =
                String.fromCharCode(
                  65 + optionIndex
                )

              addWrappedText(
                `${optionLabel}. ${option}`,
                {
                  size: 10,
                  after: 5,
                  indent: 12,
                }
              )
            }
          )


          if (includeResults) {
            const result =
              latestResults[index] ||
              null

            const submitted =
              result?.submitted ??
              latestAnswers[index] ??
              null

            const correctAnswer =
              result
                ?.correct_answer ??
              question
                .correct_answer ??
              'Unavailable'

            const isCorrect =
              typeof result
                ?.is_correct ===
              'boolean'
                ? result.is_correct
                : submitted !==
                    null &&
                  submitted ===
                    correctAnswer

            addWrappedText(
              `Your answer: ${
                submitted === null
                  ? 'Not answered'
                  : String(
                      submitted
                    )
              }`,
              {
                size: 10,
                style: 'bold',
                after: 5,
              }
            )

            addWrappedText(
              `Correct answer: ${
                correctAnswer
              }`,
              {
                size: 10,
                after: 5,
              }
            )

            addWrappedText(
              isCorrect
                ? 'Result: Correct'
                : submitted === null
                  ? 'Result: Not answered'
                  : 'Result: Incorrect',
              {
                size: 10,
                style: 'bold',
                after: 12,
              }
            )
          } else {
            y += 8
          }
        }
      )


      addWrappedText(
        'AI-generated study content should be reviewed against your original study material.',
        {
          size: 9,
          style: 'italic',
          after: 0,
        }
      )

      pdf.save(
        buildQuizFileName(
          'pdf'
        )
      )
    } catch (exportError) {
      console.error(
        'Quiz PDF export error:',
        exportError
      )

      setError(
        'Unable to export this quiz to PDF. Please try again.'
      )
    } finally {
      setQuizActionLoading(false)
    }
  }


  const handleDeleteQuiz = async () => {
    if (!generatedOutput?.output_id) {
      return
    }

    const shouldDelete =
      window.confirm(
        'Delete this generated quiz? All attempts for this quiz will also be removed. This action cannot be undone.'
      )

    if (!shouldDelete) {
      return
    }

    setQuizActionLoading(true)
    setError('')

    try {
      const deletedOutputId =
        generatedOutput.output_id

      const response =
        await deleteAIOutput(
          deletedOutputId
        )

      if (!response.ok) {
        setError(
          response.data?.message ||
            'Unable to delete this quiz. Please try again.'
        )

        return
      }

      const remainingQuizzes =
        savedQuizzes.filter(
          (quiz) =>
            String(
              quiz.output_id
            ) !==
            String(
              deletedOutputId
            )
        )

      setSavedQuizzes(
        remainingQuizzes
      )

      const deletingCurrentQuiz =
        String(
          generatedOutput.output_id
        ) ===
        String(
          deletedOutputId
        )

      if (deletingCurrentQuiz) {
        if (
          remainingQuizzes.length > 0
        ) {
          handleSelectSavedQuiz(
            remainingQuizzes[0]
          )
        } else {
          clearQuiz()
          setError('')
          setRetryableError(false)
        }
      }
    } catch (deleteError) {
      console.error(
        'Quiz delete error:',
        deleteError
      )

      setError(
        'Unable to connect to the server. Please try again.'
      )
    } finally {
      setQuizActionLoading(false)
    }
  }


  const selectedDocumentName =
    documents.find(
      (document) =>
        String(
          document.file_id
        ) === selectedDocument
    )?.file_name || ''


  const answeredCount =
    Object.keys(answers).length


  const currentQuestionData =
    questions[currentQuestion]


  const currentResult =
    attempt?.results?.[
      currentQuestion
    ]


  const activeSavedQuiz =
    generatedOutput?.output_id
      ? savedQuizzes.find(
          (quiz) =>
            String(
              quiz.output_id
            ) ===
            String(
              generatedOutput.output_id
            )
        ) ?? generatedOutput
      : null


  const selectedQuizAttempts =
    Array.isArray(
      activeSavedQuiz?.attempts
    )
      ? activeSavedQuiz.attempts
      : []


  const selectedQuizAttemptHistoryFailed =
    Boolean(
      activeSavedQuiz
        ?.attemptsLoadFailed
    )


  const quizCompleted =
    selectedQuizAttempts.length > 0


  const latestCompletedAttempt =
    quizCompleted
      ? selectedQuizAttempts[0]
      : null


  const statsAttempt =
    attempt ||
    latestCompletedAttempt


  return (
    <div className="quiz-theme mx-auto w-full max-w-[1660px]">
      <style>
        {`
          .quiz-theme-text {
            transition:
              color 100ms ease;
          }

          .quiz-theme-surface {
            transition:
              background-color 500ms ease,
              border-color 500ms ease,
              box-shadow 300ms ease;
          }

          .quiz-theme-interactive {
            transition:
              color 100ms ease,
              background-color 300ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease,
              opacity 300ms ease,
              filter 300ms ease;
          }

          .quiz-theme-border {
            transition:
              border-color 500ms ease;
          }


          [data-theme-mode='light']
          .quiz-heading {
            color: #171717 !important;
          }

          [data-theme-mode='light']
          .quiz-body {
            color: #65676b !important;
          }

          [data-theme-mode='light']
          .quiz-muted {
            color: #7a7575 !important;
          }

          [data-theme-mode='light']
          .quiz-accent {
            color: #7a44ff !important;
          }

          [data-theme-mode='light']
          .quiz-accent-soft {
            color: #6f42c1 !important;
          }


          [data-theme-mode='light']
          .quiz-surface {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;
          }


          [data-theme-mode='light']
          .quiz-loading-text {
            color: #6f42c1 !important;
          }


          [data-theme-mode='light']
          .quiz-error-text {
            color: #b91c1c !important;
          }


          [data-theme-mode='light']
          .quiz-warning-heading {
            color: #92400e !important;
          }

          [data-theme-mode='light']
          .quiz-warning-body {
            color: #a16207 !important;
          }


          [data-theme-mode='light']
          .quiz-consent-badge {
            color: #047857 !important;

            background-color:
              rgba(
                16,
                185,
                129,
                0.08
              ) !important;

            border-color:
              rgba(
                16,
                185,
                129,
                0.25
              ) !important;
          }


          [data-theme-mode='light']
          .quiz-ai-badge {
            color: #6f42c1 !important;

            background-color:
              rgba(
                122,
                68,
                255,
                0.08
              ) !important;

            border-color:
              rgba(
                122,
                68,
                255,
                0.22
              ) !important;
          }


          [data-theme-mode='light']
          .quiz-link:hover {
            color: #6634e8 !important;
          }


          [data-theme-mode='light']
          .quiz-generate-button:disabled,
          [data-theme-mode='light']
          .quiz-submit-button:disabled {
            background-image:
              none !important;

            background-color:
              #e6e3eb !important;

            color:
              #9a96a6 !important;

            box-shadow:
              none !important;

            opacity: 1 !important;
          }


          [data-theme-mode='light']
          .quiz-retry-button:disabled {
            background-color:
              #e6e3eb !important;

            border-color:
              transparent !important;

            color:
              #9a96a6 !important;
          }


          [data-theme-mode='light']
          .quiz-export-action {
            background-color:
              #ffffff !important;

            border-color:
              rgba(
                122,
                68,
                255,
                0.30
              ) !important;

            color:
              #5420b8 !important;
          }


          [data-theme-mode='light']
          .quiz-export-action:hover:not(:disabled) {
            background-color:
              rgba(
                122,
                68,
                255,
                0.08
              ) !important;

            border-color:
              rgba(
                122,
                68,
                255,
                0.58
              ) !important;

            color:
              #5420b8 !important;
          }


          [data-theme-mode='light']
          .quiz-delete-action {
            background-color:
              #ffffff !important;

            border-color:
              rgba(
                220,
                38,
                38,
                0.30
              ) !important;

            color:
              #dc2626 !important;
          }


          [data-theme-mode='light']
          .quiz-delete-action:hover:not(:disabled) {
            background-color:
              rgba(
                220,
                38,
                38,
                0.08
              ) !important;

            border-color:
              rgba(
                220,
                38,
                38,
                0.58
              ) !important;

            color:
              #b91c1c !important;
          }


          [data-theme-mode='light']
          .quiz-export-action svg,
          [data-theme-mode='light']
          .quiz-delete-action svg {
            opacity:
              1 !important;
          }


          [data-theme-mode='light']
          .quiz-status-badge {
            font-weight:
              700 !important;
          }


          [data-theme-mode='light']
          .quiz-status-completed {
            color:
              #047857 !important;

            background-color:
              #ecfdf5 !important;

            border-color:
              #34d399 !important;
          }


          [data-theme-mode='light']
          .quiz-status-pending {
            color:
              #6d28d9 !important;

            background-color:
              #f3edff !important;

            border-color:
              #a78bfa !important;
          }


          [data-theme-mode='light']
          .quiz-status-unavailable {
            color:
              #92400e !important;

            background-color:
              #fff7ed !important;

            border-color:
              #f59e0b !important;
          }


          [data-theme-mode='light']
          .quiz-history-panel,
          [data-theme-mode='light']
          .quiz-generated-header,
          [data-theme-mode='light']
          .quiz-empty-state {
            background-color:
              #ffffff !important;

            border-color:
              #ded9e8 !important;
          }


          [data-theme-mode='light']
          .quiz-history-message {
            background-color:
              #f8f7fb !important;

            border-color:
              #e3dfeb !important;
          }


          [data-theme-mode='light']
          .quiz-history-loading {
            background-color:
              rgba(
                122,
                68,
                255,
                0.07
              ) !important;

            border-color:
              rgba(
                122,
                68,
                255,
                0.22
              ) !important;
          }


          [data-theme-mode='light']
          .quiz-history-warning {
            background-color:
              rgba(
                245,
                158,
                11,
                0.07
              ) !important;
          }


          [data-theme-mode='light']
          .quiz-history-item {
            background-color:
              #ffffff !important;

            border-color:
              #ded9e8 !important;
          }


          [data-theme-mode='light']
          .quiz-history-item:hover {
            background-color:
              rgba(
                122,
                68,
                255,
                0.05
              ) !important;

            border-color:
              rgba(
                122,
                68,
                255,
                0.30
              ) !important;
          }


          [data-theme-mode='light']
          .quiz-history-item[aria-pressed='true'] {
            background-color:
              rgba(
                122,
                68,
                255,
                0.08
              ) !important;

            border-color:
              rgba(
                122,
                68,
                255,
                0.48
              ) !important;
          }


          [data-theme-mode='light']
          .quiz-stat-card {
            background-color:
              #f8f7fb !important;

            border-color:
              #e3dfeb !important;
          }


          [data-theme-mode='light']
          .quiz-source {
            color: #5f5b78 !important;
          }


          [data-theme-mode='light']
          .quiz-counter {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;

            color:
              #65676b !important;
          }


          [data-theme-mode='light']
          .quiz-progress-track {
            background-color:
              #e5e1ec !important;
          }


          [data-theme-mode='light']
          .quiz-question-card {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;

            box-shadow:
              0 18px 50px
              rgba(
                50,
                39,
                75,
                0.06
              ) !important;
          }


          /*
           * Default Answer Option
           */
          [data-theme-mode='light']
          .quiz-option-default {
            background-color:
              #f7f7fb !important;

            border-color:
              #dfdfdf !important;
          }

          [data-theme-mode='light']
          .quiz-option-default:hover {
            background-color:
              rgba(
                122,
                68,
                255,
                0.06
              ) !important;

            border-color:
              rgba(
                122,
                68,
                255,
                0.5
              ) !important;
          }

          [data-theme-mode='light']
          .quiz-option-circle-default {
            background-color:
              #ffffff !important;

            border-color:
              #c9c9d3 !important;

            color:
              #65676b !important;
          }

          [data-theme-mode='light']
          .quiz-option-text-default {
            color: #2b2b33 !important;
          }


          /*
           * Selected Answer Option
           */
          [data-theme-mode='light']
          .quiz-option-selected {
            background-color:
              rgba(
                122,
                68,
                255,
                0.09
              ) !important;

            border-color:
              #7a44ff !important;

            box-shadow:
              0 0 0 1px
              rgba(
                122,
                68,
                255,
                0.10
              ) !important;
          }

          [data-theme-mode='light']
          .quiz-option-circle-selected {
            background-color:
              #7a44ff !important;

            border-color:
              #7a44ff !important;

            color:
              #ffffff !important;
          }

          [data-theme-mode='light']
          .quiz-option-text-selected {
            color: #4c248f !important;
          }


          /*
           * Correct Answer
           */
          [data-theme-mode='light']
          .quiz-option-correct {
            background-color:
              rgba(
                16,
                185,
                129,
                0.08
              ) !important;

            border-color:
              rgba(
                16,
                185,
                129,
                0.45
              ) !important;
          }

          [data-theme-mode='light']
          .quiz-option-circle-correct {
            background-color:
              rgba(
                16,
                185,
                129,
                0.12
              ) !important;

            border-color:
              rgba(
                16,
                185,
                129,
                0.45
              ) !important;

            color:
              #047857 !important;
          }

          [data-theme-mode='light']
          .quiz-option-text-correct {
            color:
              #047857 !important;
          }


          /*
           * Incorrect Answer
           */
          [data-theme-mode='light']
          .quiz-option-incorrect {
            background-color:
              rgba(
                239,
                68,
                68,
                0.07
              ) !important;

            border-color:
              rgba(
                239,
                68,
                68,
                0.4
              ) !important;
          }

          [data-theme-mode='light']
          .quiz-option-circle-incorrect {
            background-color:
              rgba(
                239,
                68,
                68,
                0.10
              ) !important;

            border-color:
              rgba(
                239,
                68,
                68,
                0.4
              ) !important;

            color:
              #b91c1c !important;
          }

          [data-theme-mode='light']
          .quiz-option-text-incorrect {
            color:
              #b91c1c !important;
          }


          /*
           * Submission Feedback
           */
          [data-theme-mode='light']
          .quiz-correct-text {
            color:
              #047857 !important;
          }

          [data-theme-mode='light']
          .quiz-incorrect-text {
            color:
              #b91c1c !important;
          }

          [data-theme-mode='light']
          .quiz-incorrect-detail {
            color:
              #991b1b !important;
          }


          /*
           * Question Navigation
           */
          [data-theme-mode='light']
          .quiz-navigation-button {
            background-color:
              #ffffff !important;

            border-color:
              #d7d3df !important;

            color:
              #6f42c1 !important;
          }

          [data-theme-mode='light']
          .quiz-navigation-button:hover:not(:disabled) {
            background-color:
              rgba(
                122,
                68,
                255,
                0.08
              ) !important;

            border-color:
              rgba(
                122,
                68,
                255,
                0.55
              ) !important;

            color:
              #7a44ff !important;
          }

          [data-theme-mode='light']
          .quiz-navigation-button:disabled {
            background-color:
              #f1eff4 !important;

            border-color:
              #dfdfdf !important;

            color:
              #aaa6b1 !important;

            opacity:
              1 !important;
          }


          /*
           * Submission Card
           */
          [data-theme-mode='light']
          .quiz-submit-card {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;
          }


          /*
           * Result Card
           */
          [data-theme-mode='light']
          .quiz-result-card {
            background:
              linear-gradient(
                135deg,
                #f8f5ff,
                #ffffff
              ) !important;

            border-color:
              rgba(
                122,
                68,
                255,
                0.28
              ) !important;
          }


          [data-theme-mode='light']
          .quiz-retake-button {
            color:
              #6f42c1 !important;

            background-color:
              rgba(
                122,
                68,
                255,
                0.07
              ) !important;

            border-color:
              rgba(
                122,
                68,
                255,
                0.4
              ) !important;
          }

          [data-theme-mode='light']
          .quiz-retake-button:hover {
            color:
              #7a44ff !important;

            background-color:
              rgba(
                122,
                68,
                255,
                0.12
              ) !important;
          }

          /*
           * STUDYA QUIZ ILLUMINATED SURFACE
           *
           * Visual enhancement only.
           * Quiz generation, attempts, scoring, answers,
           * navigation, export, delete and retake behaviour
           * remain unchanged.
           */
          .quiz-history-panel,
          .quiz-surface,
          .quiz-generated-header {
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
              box-shadow 300ms ease;
          }


          /*
           * Reflective upper edge.
           */
          .quiz-history-panel::after,
          .quiz-surface::after,
          .quiz-generated-header::after {
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


          .quiz-history-panel:hover,
          .quiz-surface:hover,
          .quiz-generated-header:hover {
            border-color:
              rgba(122, 68, 255, 0.34) !important;

            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.085),
              inset 0 0 30px rgba(122, 68, 255, 0.04),
              0 14px 38px rgba(30, 10, 62, 0.28),
              0 0 22px rgba(122, 68, 255, 0.06);
          }


          /*
           * Light mode
           */
          [data-theme-mode='light']
          .quiz-history-panel,
          [data-theme-mode='light']
          .quiz-surface,
          [data-theme-mode='light']
          .quiz-generated-header {
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
          .quiz-history-panel::after,
          [data-theme-mode='light']
          .quiz-surface::after,
          [data-theme-mode='light']
          .quiz-generated-header::after {
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
          .quiz-history-panel:hover,
          [data-theme-mode='light']
          .quiz-surface:hover,
          [data-theme-mode='light']
          .quiz-generated-header:hover {
            border-color:
              rgba(122, 68, 255, 0.28) !important;

            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 1),
              0 13px 32px rgba(91, 60, 145, 0.10),
              0 0 18px rgba(122, 68, 255, 0.04);
          }
        `}
      </style>


      {/* Page Heading */}
      <div className="mb-8">
        <p className="quiz-theme-text quiz-accent mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
          AI Study Tools
        </p>

        <h1 className="quiz-theme-text quiz-heading text-3xl font-bold tracking-tight text-[#f3f0ff]">
          Practice Quiz
        </h1>

        <p className="quiz-theme-text quiz-body mt-2 max-w-3xl text-sm leading-6 text-[#898cc0]">
          Generate a practice quiz from your uploaded study
          materials and test your understanding.
        </p>
      </div>


      {/* Quiz Generator */}
      <div className="mb-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)] lg:gap-6">
          {/* Study Material Selector */}
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <label
                htmlFor="quiz-document"
                className="quiz-theme-text quiz-heading block text-sm font-medium text-[#d9d4eb]"
              >
                Select a document
              </label>

              {!consentInitialLoading &&
                consentStatus ===
                  'granted' && (
                  <Link
                    to="/privacy"
                    title="AI processing consent is granted. Manage consent."
                    className="quiz-theme-interactive quiz-consent-badge inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:border-emerald-400/40 hover:bg-emerald-500/15"
                  >
                    <svg
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      className="h-3.5 w-3.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m5 12 4 4L19 6"
                      />
                    </svg>

                    AI Consent On
                  </Link>
                )}
            </div>

            {documentsLoading ? (
              <div
                className="quiz-theme-surface flex min-h-[48px] items-center gap-3 rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 px-4 py-3"
                role="status"
              >
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

                <p className="quiz-theme-text quiz-loading-text text-sm text-[#c9b4ff]">
                  Loading your uploaded study materials...
                </p>
              </div>
            ) : documents.length ===
                0 &&
              !documentsError ? (
              <div className="quiz-theme-surface rounded-lg border border-amber-400/20 bg-amber-500/[0.07] p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
                    <svg
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-4 w-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v4m0 4h.01M10.3 4.6 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"
                      />
                    </svg>
                  </div>

                  <div>
                    <p className="quiz-theme-text quiz-warning-heading font-medium text-amber-200">
                      No uploaded study materials
                    </p>

                    <p className="quiz-theme-text quiz-warning-body mt-1 text-sm leading-6 text-amber-100/70">
                      Upload a PDF, DOCX or TXT document before
                      generating a practice quiz.
                    </p>

                    <Link
                      to="/upload"
                      className="quiz-theme-text quiz-accent quiz-link mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#a97cff]"
                    >
                      Upload Study Material

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
            ) : (
              <AnimatedSelect
                id="quiz-document"
                value={
                  selectedDocument
                }
                placeholder="Select a document"
                options={documents.map(
                  (document) => ({
                    value:
                      document.file_id,

                    label:
                      document.file_name,
                  })
                )}
                onChange={(
                  newValue
                ) => {
                  setSelectedDocument(
                    newValue
                  )

                  clearQuiz()

                  setError('')

                  setRetryableError(
                    false
                  )
                }}
              />
            )}
          </div>

          {/* Generate New Quiz */}
          <div className="flex items-end lg:justify-end">
            <button
              type="button"
              onClick={
                handleGenerateQuiz
              }
              disabled={
                documentsLoading ||
                documents.length ===
                  0 ||
                consentInitialLoading ||
                consentStatus !==
                  'granted' ||
                generationLoading
              }
              className="quiz-generate-button inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#9c46ff] px-5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(122,68,255,0.18)] transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:from-[#3a3150] disabled:to-[#3a3150] disabled:text-[#77718d] disabled:shadow-none sm:w-auto"
            >
              {generationLoading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}

              {!generationLoading && (                 <svg                   aria-hidden="true"                   xmlns="http://www.w3.org/2000/svg"                   viewBox="0 0 24 24"                   fill="none"                   stroke="currentColor"                   strokeWidth="2"                   className="h-4 w-4"                 >                   <path                     strokeLinecap="round"                     strokeLinejoin="round"                     d="M12 5v14M5 12h14"                   />                 </svg>               )}
              {generationLoading
                ? 'Generating Quiz...'
                : 'Generate New Quiz'}
            </button>
          </div>
        </div>

        {/* Document Error */}
        {documentsError && (
          <div
            className="quiz-theme-surface mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
            role="alert"
          >
            <p className="quiz-theme-text quiz-error-text text-sm leading-6 text-red-300">
              {documentsError}
            </p>
          </div>
        )}

        {/* AI Consent Status */}
        <div className="mt-5">
          {consentInitialLoading ? (
            <div
              className="quiz-theme-surface flex items-center gap-3 rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 p-4"
              role="status"
            >
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

              <p className="quiz-theme-text quiz-loading-text text-sm text-[#c9b4ff]">
                Checking your AI processing consent...
              </p>
            </div>
          ) : consentStatus !==
            'granted' ? (
            <AIConsentRequired
              featureName="AI-generated practice quizzes"
            />
          ) : null}
        </div>

        {/* Consent Error */}
        {consentError && (
          <div
            className="quiz-theme-surface mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
            role="alert"
          >
            <p className="quiz-theme-text quiz-error-text text-sm leading-6 text-red-300">
              {consentError}
            </p>
          </div>
        )}

        {/* Quiz Error */}
        {error && (
          <div
            className="quiz-theme-surface mt-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-400/10 text-red-300">
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
                    d="M12 9v4m0 4h.01M10.3 4.6 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"
                  />
                </svg>
              </div>

              <div>
                <p className="quiz-theme-text quiz-error-text text-sm leading-6 text-red-300">
                  {error}
                </p>

                {retryableError && (
                  <button
                    type="button"
                    onClick={
                      handleGenerateQuiz
                    }
                    disabled={
                      generationLoading
                    }
                    className="quiz-theme-interactive quiz-retry-button mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#3a3150] disabled:text-[#77718d]"
                  >
                    {generationLoading && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#77718d]/40 border-t-[#c2c4e4]" />
                    )}

                    {generationLoading
                      ? 'Retrying...'
                      : 'Retry'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Quiz Workspace */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)]">

        {/* Previous Quizzes */}
        <aside className="quiz-theme-surface quiz-surface overflow-hidden rounded-xl border border-[#2a1b4d] bg-[#160b32]">
          <div className="quiz-theme-border border-b border-[#2a1b4d] px-5 py-4">
            <p className="quiz-theme-text quiz-accent text-xs font-semibold uppercase tracking-[0.14em] text-[#a97cff]">
              Previous Quizzes
            </p>
          </div>
          <div className="p-3">
            {!selectedDocument ? (
              <div>
                <p className="quiz-theme-text quiz-body text-sm leading-6 text-[#898cc0]">
                  Select a document to view its previous quizzes.
                </p>
              </div>
            ) : savedQuizzesLoading ? (
              <div
                className="flex items-center gap-3 px-2 py-5"
                role="status"
              >
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

                <p className="quiz-theme-text quiz-loading-text text-sm text-[#c9b4ff]">
                  Loading previous quizzes...
                </p>
              </div>
            ) : savedQuizzes.length === 0 ? (
              <div>
                <p className="quiz-theme-text quiz-body text-sm leading-6 text-[#898cc0]">
                  No quizzes have been generated for this document yet.
                </p>
              </div>
            ) : (
              savedQuizzes.map(
                (quiz, index) => {
                  const quizAttempts =
                    Array.isArray(
                      quiz.attempts
                    )
                      ? quiz.attempts
                      : []

                  const completed =
                    quizAttempts.length > 0

                  const latestAttempt =
                    completed
                      ? quizAttempts[0]
                      : null

                  const selected =
                    String(
                      generatedOutput?.output_id
                    ) ===
                    String(
                      quiz.output_id
                    )

                  return (
                    <button
                      key={quiz.output_id}
                      type="button"
                      onClick={() =>
                        handleSelectSavedQuiz(
                          quiz
                        )
                      }
                      aria-pressed={selected}
                      className={`quiz-theme-interactive quiz-history-item w-full rounded-lg border px-4 py-3 text-left transition duration-300 ${
                        selected
                          ? 'border-[#7a44ff]/40 bg-[#7a44ff]/10'
                          : 'border-transparent hover:border-[#7a44ff]/20 hover:bg-[#7a44ff]/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="quiz-theme-text quiz-heading truncate text-sm font-semibold text-[#f3f0ff]">
                            Quiz {index + 1}
                          </p>

                          <p className="quiz-theme-text quiz-muted mt-1 text-xs text-[#727494]">
                            {quiz.generated_at
                              ? new Date(
                                  quiz.generated_at
                                ).toLocaleString()
                              : 'Saved quiz'}
                          </p>
                        </div>

                        <span
                          className={`quiz-theme-interactive quiz-status-badge shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            quiz.attemptsLoadFailed
                              ? 'quiz-status-unavailable border-amber-400/25 bg-amber-500/10 text-amber-300'
                              : completed
                                ? 'quiz-status-completed border-emerald-400/25 bg-emerald-500/10 text-emerald-300'
                                : 'quiz-status-pending border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#c9b4ff]'
                          }`}
                        >
                          {quiz.attemptsLoadFailed
                            ? 'Status unavailable'
                            : completed
                              ? 'Completed Quiz'
                              : 'Not Completed Quiz'}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <p className="quiz-theme-text quiz-body text-xs text-[#898cc0]">
                          {quiz.attemptsLoadFailed
                            ? 'Attempts unavailable'
                            : `Attempts: ${quizAttempts.length}`}
                        </p>

                        {!quiz.attemptsLoadFailed &&
                          latestAttempt && (
                            <p className="quiz-theme-text quiz-accent-soft text-xs font-semibold text-[#c9b4ff]">
                              {latestAttempt.score} /{' '}
                              {latestAttempt.total} ·{' '}
                              {latestAttempt.percentage}%
                            </p>
                          )}
                      </div>
                    </button>
                  )
                }
              )
            )}
          </div>

          {savedQuizzesError && (
            <div
              className="quiz-theme-surface quiz-history-warning mt-4 rounded-lg border border-amber-400/20 bg-amber-500/[0.07] p-3"
              role="status"
            >
              <p className="quiz-theme-text quiz-warning-body text-xs leading-5 text-amber-100/70">
                {savedQuizzesError}
              </p>
            </div>
          )}
        </aside>

        {/* Generated Quiz Workspace */}
        <section className="quiz-theme-surface quiz-surface min-h-[360px] overflow-hidden rounded-xl border border-[#2a1b4d] bg-[#160b32]">
      {/* Generated Quiz */}
      {questions.length > 0 &&
        currentQuestionData && (
          <div>
            {/* Quiz Heading */}
            <div className="quiz-theme-border border-b border-[#2a1b4d] px-6 py-5 sm:px-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="quiz-theme-text quiz-heading text-2xl font-semibold text-[#f3f0ff]">
                      Generated Quiz
                    </h2>

                    {generatedOutput?.is_ai_generated && (
                      <span className="quiz-theme-interactive quiz-ai-badge rounded-full border border-[#7a44ff]/25 bg-[#7a44ff]/10 px-3 py-1 text-xs font-semibold text-[#c9b4ff]">
                        AI Generated
                      </span>
                    )}

                    <span
                      className={`quiz-theme-interactive quiz-status-badge rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        selectedQuizAttemptHistoryFailed
                          ? 'quiz-status-unavailable border-amber-400/25 bg-amber-500/10 text-amber-300'
                          : quizCompleted
                            ? 'quiz-status-completed border-emerald-400/25 bg-emerald-500/10 text-emerald-300'
                            : 'quiz-status-pending border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#c9b4ff]'
                      }`}
                    >
                      {selectedQuizAttemptHistoryFailed
                        ? 'Status unavailable'
                        : quizCompleted
                          ? 'Completed Quiz'
                          : 'Not Completed Quiz'}
                    </span>
                  </div>

                  <p className="quiz-theme-text quiz-muted mt-3 text-sm text-[#727494]">
                    Source:{' '}

                    <span className="quiz-theme-text quiz-source text-[#a6a8c7]">
                      {generatedOutput?.file_name ||
                        selectedDocumentName}
                    </span>
                  </p>

                  <p className="quiz-theme-text quiz-muted mt-1 text-sm text-[#727494]">
                    Generated:{' '}

                    <span className="quiz-theme-text quiz-source text-[#a6a8c7]">
                      {generatedOutput?.generated_at
                        ? new Date(
                            generatedOutput.generated_at
                          ).toLocaleString()
                        : 'Current session'}
                    </span>
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
                  {generatedOutput && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportWord}
                        disabled={quizActionLoading}
                        title="Export quiz to Word"
                        aria-label="Export quiz to Word"
                        className="quiz-theme-interactive quiz-export-action inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#c9b4ff] transition duration-300 hover:border-[#a97cff]/50 hover:bg-[#7a44ff]/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
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
                            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                          />

                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14 2v6h6M8 13l1.2 5L12 14l2.8 4L16 13"
                          />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportPdf}
                        disabled={quizActionLoading}
                        title="Export quiz to PDF"
                        aria-label="Export quiz to PDF"
                        className="quiz-theme-interactive quiz-export-action inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#c9b4ff] transition duration-300 hover:border-[#a97cff]/50 hover:bg-[#7a44ff]/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
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
                            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                          />

                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14 2v6h6"
                          />

                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 17v-5h1.5a1.5 1.5 0 0 1 0 3H8m5-3v5m0-5h1.25a2.5 2.5 0 0 1 0 5H13m5-5h3m-3 2h2"
                          />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={handleDeleteQuiz}
                        disabled={quizActionLoading}
                        title="Delete quiz"
                        aria-label="Delete quiz"
                        className="quiz-theme-interactive quiz-delete-action inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-400/25 bg-red-500/10 text-red-300 transition duration-300 hover:border-red-400/50 hover:bg-red-500/20 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
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
                            d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5M14 11v5"
                          />
                        </svg>
                      </button>
                    </div>
                  )}

                  <div className="quiz-theme-surface quiz-counter rounded-full border border-[#2a1b4d] bg-[#120928]/45 px-4 py-2 text-sm font-medium text-[#a6a8c7]">
                    Question{' '}

                    <span className="quiz-theme-text quiz-accent-soft font-semibold text-[#c9b4ff]">
                      {currentQuestion + 1}
                    </span>{' '}

                    of {questions.length}
                  </div>
                </div>
              </div>
            </div>              <div className="px-6 py-7 sm:px-7">


              {/* Quiz Statistics */}
              <div
                className={`mt-5 grid gap-3 ${
                  quizCompleted && statsAttempt
                    ? 'grid-cols-2 xl:grid-cols-4'
                    : 'grid-cols-2'
                }`}
              >
                <div className="quiz-theme-surface quiz-stat-card rounded-lg border border-[#2a1b4d] bg-[#120928]/45 p-4">
                  <p className="quiz-theme-text quiz-muted text-xs font-medium uppercase tracking-[0.12em] text-[#727494]">
                    Questions
                  </p>

                  <p className="quiz-theme-text quiz-heading mt-2 text-xl font-semibold text-[#f3f0ff]">
                    {questions.length}
                  </p>
                </div>

                <div className="quiz-theme-surface quiz-stat-card rounded-lg border border-[#2a1b4d] bg-[#120928]/45 p-4">
                  <p className="quiz-theme-text quiz-muted text-xs font-medium uppercase tracking-[0.12em] text-[#727494]">
                    Attempts
                  </p>

                  <p className="quiz-theme-text quiz-heading mt-2 text-xl font-semibold text-[#f3f0ff]">
                    {selectedQuizAttemptHistoryFailed
                      ? '—'
                      : selectedQuizAttempts.length}
                  </p>
                </div>

                {quizCompleted &&
                  statsAttempt && (
                    <>
                      <div className="quiz-theme-surface quiz-stat-card rounded-lg border border-[#2a1b4d] bg-[#120928]/45 p-4">
                        <p className="quiz-theme-text quiz-muted text-xs font-medium uppercase tracking-[0.12em] text-[#727494]">
                          Points
                        </p>

                        <p className="quiz-theme-text quiz-heading mt-2 text-xl font-semibold text-[#f3f0ff]">
                          {statsAttempt.score} /{' '}
                          {statsAttempt.total}
                        </p>
                      </div>

                      <div className="quiz-theme-surface quiz-stat-card rounded-lg border border-[#2a1b4d] bg-[#120928]/45 p-4">
                        <p className="quiz-theme-text quiz-muted text-xs font-medium uppercase tracking-[0.12em] text-[#727494]">
                          Score Percentage
                        </p>

                        <p className="quiz-theme-text quiz-accent-soft mt-2 text-xl font-semibold text-[#c9b4ff]">
                          {statsAttempt.percentage}%
                        </p>
                      </div>
                    </>
                  )}
              </div>


              {/* Question Progress */}
              <div className="quiz-theme-surface quiz-progress-track mt-5 h-1.5 overflow-hidden rounded-full bg-[#241743]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#7a44ff] to-[#d83dff] transition-all duration-300"
                  style={{
                    width: `${(
                      (currentQuestion +
                        1) /
                      questions.length
                    ) * 100}%`,
                  }}
                />
              </div>


            {/* Questions Section */}             <div className="quiz-theme-surface quiz-surface mt-6 rounded-xl border border-[#2a1b4d] bg-[#160b32] p-5 sm:p-6">               <div className="mb-5 flex flex-wrap items-center justify-between gap-4">                 <h3 className="quiz-theme-text quiz-heading text-lg font-semibold text-[#f3f0ff]">                   Questions                 </h3>                  {attempt && (                   <button                     type="button"                     onClick={handleRetake}                     className="quiz-theme-interactive quiz-retake-button inline-flex items-center gap-2 rounded-lg border border-[#7a44ff]/50 bg-[#7a44ff]/10 px-4 py-2 text-sm font-semibold text-[#c9b4ff] transition duration-300 hover:border-[#7a44ff]/70 hover:bg-[#7a44ff]/20"                   >                     <svg                       aria-hidden="true"                       xmlns="http://www.w3.org/2000/svg"                       viewBox="0 0 24 24"                       fill="none"                       stroke="currentColor"                       strokeWidth="1.8"                       className="h-4 w-4"                     >                       <path                         strokeLinecap="round"                         strokeLinejoin="round"                         d="M4 4v6h6M20 20v-6h-6M5.5 15a7 7 0 0 0 12 2M18.5 9A7 7 0 0 0 6.5 7"                       />                     </svg>                      Retake Quiz                   </button>                 )}               </div>
            {/* Question Card */}
            <div className="quiz-theme-surface quiz-question-card relative overflow-hidden rounded-2xl border border-[#2a1b4d] bg-[#160b32] p-6 sm:p-7">
              <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#7a44ff]/10 blur-3xl" />

              <div className="relative">
                <p className="quiz-theme-text quiz-accent text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
                  {currentQuestionData.type ===
                  'true_false'
                    ? 'True or False'
                    : 'Multiple Choice'}
                </p>

                <h3 className="quiz-theme-text quiz-heading mt-4 max-w-4xl text-xl font-semibold leading-relaxed text-[#f3f0ff]">
                  {
                    currentQuestionData.question
                  }
                </h3>


                {/* Options */}
                <div className="mt-6 space-y-3">
                  {currentQuestionData.options.map(
                    (
                      option,
                      optionIndex
                    ) => {
                      const selected =
                        answers[
                          currentQuestion
                        ] === option

                      const correctAfterSubmission =
                        attempt &&
                        currentResult
                          ?.correct_answer ===
                          option

                      const incorrectSelected =
                        attempt &&
                        selected &&
                        !currentResult
                          ?.is_correct

                      let optionStyle =
                        'quiz-option-default border-[#2a1b4d] bg-[#120928]/45 hover:border-[#7a44ff]/50 hover:bg-[#7a44ff]/10'

                      let circleStyle =
                        'quiz-option-circle-default border-[#4a3a68] bg-[#160b32] text-[#898cc0]'

                      let optionTextStyle =
                        'quiz-option-text-default text-[#d9d4eb]'

                      if (
                        selected &&
                        !attempt
                      ) {
                        optionStyle =
                          'quiz-option-selected border-[#7a44ff] bg-[#7a44ff]/15 shadow-[0_0_0_1px_rgba(122,68,255,0.15)]'

                        circleStyle =
                          'quiz-option-circle-selected border-[#7a44ff] bg-[#7a44ff] text-white'

                        optionTextStyle =
                          'quiz-option-text-selected text-[#f3f0ff]'
                      }

                      if (
                        correctAfterSubmission
                      ) {
                        optionStyle =
                          'quiz-option-correct border-emerald-400/50 bg-emerald-500/10'

                        circleStyle =
                          'quiz-option-circle-correct border-emerald-400/50 bg-emerald-400/15 text-emerald-300'

                        optionTextStyle =
                          'quiz-option-text-correct text-emerald-200'
                      }

                      if (
                        incorrectSelected
                      ) {
                        optionStyle =
                          'quiz-option-incorrect border-red-400/50 bg-red-500/10'

                        circleStyle =
                          'quiz-option-circle-incorrect border-red-400/50 bg-red-400/15 text-red-300'

                        optionTextStyle =
                          'quiz-option-text-incorrect text-red-200'
                      }

                      return (
                        <button
                          key={`${currentQuestion}-${optionIndex}`}
                          type="button"
                          onClick={() =>
                            handleAnswer(
                              option
                            )
                          }
                          disabled={Boolean(
                            attempt
                          )}
                          className={`quiz-theme-interactive flex w-full items-start gap-3 rounded-lg border p-4 text-left disabled:cursor-default ${optionStyle}`}
                        >
                          <div
                            className={`quiz-theme-interactive mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${circleStyle}`}
                          >
                            {String.fromCharCode(
                              65 +
                                optionIndex
                            )}
                          </div>

                          <span
                            className={`quiz-theme-text leading-6 ${optionTextStyle}`}
                          >
                            {option}
                          </span>
                        </button>
                      )
                    }
                  )}
                </div>


                {/* Answer Feedback */}
                {attempt &&
                  currentResult && (
                    <div
                      className={`quiz-theme-surface mt-6 rounded-lg border p-4 ${
                        currentResult.is_correct
                          ? 'border-emerald-400/20 bg-emerald-500/10'
                          : 'border-red-400/20 bg-red-500/10'
                      }`}
                    >
                      {currentResult.is_correct ? (
                        <div className="flex items-start gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
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

                          <p className="quiz-theme-text quiz-correct-text font-medium text-emerald-300">
                            Correct answer.
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-400/10 text-red-300">
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
                                d="M6 6l12 12M18 6 6 18"
                              />
                            </svg>
                          </div>

                          <div>
                            <p className="quiz-theme-text quiz-incorrect-text font-medium text-red-300">
                              {currentResult.submitted ===
                              null
                                ? 'Not answered.'
                                : 'Incorrect answer.'}
                            </p>

                            <p className="quiz-theme-text quiz-incorrect-detail mt-1 text-sm text-red-100/70">
                              Correct answer:{' '}

                              <span className="font-medium text-red-200">
                                {
                                  currentResult.correct_answer
                                }
                              </span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>


            {/* Question Navigation */}
            <div className="mt-5 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={
                  handlePrevious
                }
                disabled={
                  currentQuestion ===
                  0
                }
                className="quiz-theme-interactive quiz-navigation-button inline-flex items-center gap-2 rounded-lg border border-[#3a2860] bg-[#160b32] px-5 py-2.5 text-sm font-medium text-[#c9b4ff] hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/10 disabled:cursor-not-allowed disabled:opacity-35"
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
                    d="m15 18-6-6 6-6"
                  />
                </svg>

                Previous
              </button>


              <button
                type="button"
                onClick={
                  handleNext
                }
                disabled={
                  currentQuestion ===
                  questions.length -
                    1
                }
                className="quiz-theme-interactive quiz-navigation-button inline-flex items-center gap-2 rounded-lg border border-[#3a2860] bg-[#160b32] px-5 py-2.5 text-sm font-medium text-[#c9b4ff] hover:border-[#7a44ff]/60 hover:bg-[#7a44ff]/10 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Next

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
              </button>
            </div>




</div>

            {/* Quiz Submission */}
            {!attempt && (
              <div className="quiz-theme-surface quiz-submit-card mt-6 rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="quiz-theme-text quiz-heading font-medium text-[#d9d4eb]">
                      Ready to submit?
                    </p>

                    <p className="quiz-theme-text quiz-body mt-1 text-sm leading-6 text-[#898cc0]">
                      You have answered{' '}

                      <span className="quiz-theme-text quiz-accent-soft font-semibold text-[#c9b4ff]">
                        {answeredCount}
                      </span>{' '}

                      of {questions.length} questions. Unanswered
                      questions will be scored as incorrect.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleSubmitQuiz
                    }
                    disabled={
                      submitLoading
                    }
                    className="quiz-submit-button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#9c46ff] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(122,68,255,0.18)] transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitLoading && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    )}

                    {submitLoading
                      ? 'Submitting Quiz...'
                      : 'Submit Quiz'}
                  </button>
                </div>
              </div>
            )}
            {/* Responsible AI Warning */}
            <div className="quiz-theme-surface mt-6 rounded-lg border border-amber-400/20 bg-amber-500/[0.07] p-5">
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
                      d="M12 9v4m0 4h.01M10.3 4.6 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"
                    />
                  </svg>
                </div>

                <div>
                  <h3 className="quiz-theme-text quiz-warning-heading font-semibold text-amber-200">
                    AI-Generated Content
                  </h3>

                  <p className="quiz-theme-text quiz-warning-body mt-1 text-sm leading-6 text-amber-100/70">
                    {disclaimer ||
                      'This content was generated by AI and may contain errors or omissions. Please check it against your original study material.'}
                  </p>
                </div>
              </div>
            </div>
            </div>
          </div>
        )}

          {!(
            questions.length > 0 &&
            currentQuestionData
          ) && (
            <div>
              <div className="quiz-theme-border border-b border-[#2a1b4d] px-6 py-5 sm:px-7">                 <h2 className="quiz-theme-text quiz-heading text-2xl font-semibold text-[#f3f0ff]">                   Generated Quiz                 </h2>               </div>                <div className="flex min-h-[280px] items-center justify-center px-6 py-10 text-center sm:px-7">
              <div className="max-w-md">

                <h2 className="quiz-theme-text quiz-heading font-semibold text-[#f3f0ff]">
                  No quiz selected
                </h2>

                <p className="quiz-theme-text quiz-body mt-2 text-sm leading-6 text-[#898cc0]">
                  {selectedDocument
                    ? 'Choose a previous quiz from the left or generate a new quiz for this document.'
                    : 'Select a document above to view or generate a quiz.'}
                </p>
              </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}


export default Quiz
