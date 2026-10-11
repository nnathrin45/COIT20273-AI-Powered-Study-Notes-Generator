import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { getConsentStatus } from '../services/consentService'
import { getUploadedFiles } from '../services/uploadedService'
import {
  createExplanationChat,
  deleteExplanationChat,
  deleteExplanationChatSource,
  generateAIContent,
  getExplanationChatMessages,
  getExplanationChatSources,
  getExplanationChats,
  renameExplanationChat,
  uploadExplanationChatSource,
} from '../services/aiService'
import AnimatedSelect from '../components/AnimatedSelect'
import AIConsentRequired from '../components/AIConsentRequired'


const EXPLANATION_DOCUMENT_STORAGE_KEY =
  'studya-explanation-selected-document'

const EXPLANATION_CHAT_STORAGE_PREFIX =
  'studya-explanation-active-chat-'


function Explanation() {
  const [documents, setDocuments] = useState([])
  const [
    selectedDocument,
    setSelectedDocument,
  ] = useState(
    () =>
      window.localStorage.getItem(
        EXPLANATION_DOCUMENT_STORAGE_KEY
      ) || ''
  )
  const [concept, setConcept] = useState('')

  const [
    explanationLevel,
    setExplanationLevel,
  ] = useState('beginner')

  const [
    documentsLoading,
    setDocumentsLoading,
  ] = useState(true)

  const [
    documentsError,
    setDocumentsError,
  ] = useState('')

  const [
    generatedOutput,
    setGeneratedOutput,
  ] = useState(null)

  const [
    chatMessages,
    setChatMessages,
  ] = useState([])

  const [chats, setChats] =
    useState([])

  const [
    activeChatId,
    setActiveChatId,
  ] = useState('')

  const [
    chatsLoading,
    setChatsLoading,
  ] = useState(false)

  const [
    chatMessagesLoading,
    setChatMessagesLoading,
  ] = useState(false)

  const conversationScrollRef = useRef(null)

  useLayoutEffect(() => {
    if (chatMessagesLoading || chatMessages.length === 0) {
      return undefined
    }

    const container = conversationScrollRef.current

    if (!container) {
      return undefined
    }

    let active = true
    let frame = null

    const previousScrollBehavior =
      container.style.scrollBehavior

    // Avoid any smooth-scroll CSS delaying the initial jump.
    container.style.scrollBehavior = 'auto'

    const scrollToLatestMessage = () => {
      if (!active) {
        return
      }

      container.scrollTop = Math.max(
        0,
        container.scrollHeight - container.clientHeight
      )
    }

    const scheduleScroll = () => {
      if (!active) {
        return
      }

      if (frame !== null) {
        window.cancelAnimationFrame(frame)
      }

      frame = window.requestAnimationFrame(() => {
        frame = null
        scrollToLatestMessage()
      })
    }

    // Move immediately, then follow any delayed layout resizing.
    scrollToLatestMessage()
    scheduleScroll()

    const resizeObserver = new ResizeObserver(scheduleScroll)

    resizeObserver.observe(container)

    if (container.firstElementChild) {
      resizeObserver.observe(container.firstElementChild)
    }

    // Keep the initial position stable while content settles.
    // Then release control so older messages can be read freely.
    const settleTimer = window.setTimeout(() => {
      scrollToLatestMessage()
      active = false
      resizeObserver.disconnect()

      container.style.scrollBehavior =
        previousScrollBehavior
    }, 1400)

    return () => {
      active = false
      resizeObserver.disconnect()
      window.clearTimeout(settleTimer)

      if (frame !== null) {
        window.cancelAnimationFrame(frame)
      }

      container.style.scrollBehavior =
        previousScrollBehavior
    }
  }, [activeChatId, chatMessages, chatMessagesLoading])

  const [
    chatActionLoading,
    setChatActionLoading,
  ] = useState(false)

  const [chatError, setChatError] =
    useState('')

  const [editingChatId, setEditingChatId] = useState('')
  const [editingChatTitle, setEditingChatTitle] = useState('')
  const [renameSaving, setRenameSaving] = useState(false)

  const renameSavingRef = useRef(false)
  const renameCancelledRef = useRef(false)

  const [
    chatSources,
    setChatSources,
  ] = useState([])

  const [
    sourcesLoading,
    setSourcesLoading,
  ] = useState(false)

  const [
    sourceUploading,
    setSourceUploading,
  ] = useState(false)

  const [
    deletingSourceId,
    setDeletingSourceId,
  ] = useState(null)

  const [
    sourceError,
    setSourceError,
  ] = useState('')

  const [
    sourceStatus,
    setSourceStatus,
  ] = useState('')


  /*
   * Supplementary-file success messages are temporary.
   * Keep them visible long enough to be noticed, then
   * clear them automatically.
   */
  useEffect(() => {
    if (!sourceStatus) {
      return undefined
    }

    const sourceStatusTimer =
      window.setTimeout(() => {
        setSourceStatus('')
      }, 5000)

    return () => {
      window.clearTimeout(
        sourceStatusTimer
      )
    }
  }, [sourceStatus])

  const [disclaimer, setDisclaimer] =
    useState('')

  const [
    generationLoading,
    setGenerationLoading,
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
          if (
            response.status === 401
          ) {
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
          if (
            response.status === 401
          ) {
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


  // Restore the last study material used on the Concept Explanation page.
  // The saved ID is accepted only when it still belongs to the user's
  // currently available uploaded documents.
  useEffect(() => {
    if (
      documentsLoading ||
      documents.length === 0 ||
      selectedDocument
    ) {
      return
    }

    const savedDocumentId =
      window.localStorage.getItem(
        EXPLANATION_DOCUMENT_STORAGE_KEY
      )

    if (!savedDocumentId) {
      return
    }

    const savedDocument =
      documents.find(
        (document) =>
          String(document.file_id) ===
          savedDocumentId
      )

    if (savedDocument) {
      setSelectedDocument(
        savedDocument.file_id
      )
    } else {
      window.localStorage.removeItem(
        EXPLANATION_DOCUMENT_STORAGE_KEY
      )
    }
  }, [
    documents,
    documentsLoading,
    selectedDocument,
  ])


  // Load the chat sessions belonging to the selected main study material.
  useEffect(() => {
    if (!selectedDocument) {
      setChats([])
      setActiveChatId('')
      setChatMessages([])
      setGeneratedOutput(null)
      setDisclaimer('')
      setChatError('')

      return undefined
    }

    const selectedFileId =
      Number(selectedDocument)

    window.localStorage.setItem(
      EXPLANATION_DOCUMENT_STORAGE_KEY,
      String(selectedDocument)
    )

    let isActive = true

    const loadChats = async () => {
      setChatsLoading(true)
      setChatError('')
      setChats([])
      setActiveChatId('')
      setChatMessages([])
      setGeneratedOutput(null)
      setDisclaimer('')

      try {
        const response =
          await getExplanationChats(
            selectedFileId
          )

        if (!isActive) {
          return
        }

        if (
          !response.ok ||
          response.data?.status !==
            'success'
        ) {
          setChatError(
            response.data?.message ||
              'Unable to load Concept Explanation chats.'
          )

          return
        }

        const loadedChats =
          response.data?.chats ?? []

        setChats(loadedChats)

        const activeChatStorageKey =
          `${EXPLANATION_CHAT_STORAGE_PREFIX}${selectedFileId}`

        const savedChatId =
          window.localStorage.getItem(
            activeChatStorageKey
          )

        const savedChat =
          loadedChats.find(
            (chat) =>
              String(chat.chat_id) ===
              String(savedChatId)
          )

        const nextChat =
          savedChat ||
          loadedChats[0] ||
          null

        if (nextChat) {
          const nextChatId =
            String(nextChat.chat_id)

          setActiveChatId(
            nextChatId
          )

          window.localStorage.setItem(
            activeChatStorageKey,
            nextChatId
          )
        } else {
          window.localStorage.removeItem(
            activeChatStorageKey
          )
        }
      } catch (chatFetchError) {
        if (!isActive) {
          return
        }

        console.error(
          'Explanation chats fetch error:',
          chatFetchError
        )

        setChatError(
          'Unable to connect to the server to load Concept Explanation chats.'
        )
      } finally {
        if (isActive) {
          setChatsLoading(false)
        }
      }
    }

    loadChats()

    return () => {
      isActive = false
    }
  }, [selectedDocument])


  // Restore only the messages belonging to the active chat.
  useEffect(() => {
    if (
      !selectedDocument ||
      !activeChatId
    ) {
      setChatMessages([])
      setGeneratedOutput(null)
      setDisclaimer('')
      setChatMessagesLoading(false)

      return undefined
    }

    const selectedFileId =
      Number(selectedDocument)

    const selectedChatId =
      Number(activeChatId)

    const activeChatStorageKey =
      `${EXPLANATION_CHAT_STORAGE_PREFIX}${selectedFileId}`

    window.localStorage.setItem(
      activeChatStorageKey,
      String(activeChatId)
    )

    let isActive = true

    const loadChatMessages =
      async () => {
        setChatMessagesLoading(true)
        setChatMessages([])
        setGeneratedOutput(null)
        setDisclaimer('')
        setError('')
        setRetryableError(false)

        try {
          const response =
            await getExplanationChatMessages(
              selectedChatId
            )

          if (!isActive) {
            return
          }

          if (
            !response.ok ||
            response.data?.status !==
              'success'
          ) {
            setError(
              response.data?.message ||
                'Unable to load this Concept Explanation chat.'
            )

            return
          }

          const responseChat =
            response.data?.chat

          if (
            !responseChat ||
            Number(
              responseChat.main_file_id
            ) !== selectedFileId
          ) {
            setError(
              'This chat does not belong to the selected study material.'
            )

            return
          }

          const outputs =
            response.data?.outputs ?? []

          const restoredMessages =
            outputs.flatMap(
              (output) => {
                const messages = []

                if (
                  typeof output.concept ===
                    'string' &&
                  output.concept.trim()
                ) {
                  messages.push({
                    role: 'user',
                    content:
                      output.concept.trim(),
                    outputId:
                      output.output_id,
                  })
                }

                if (
                  typeof output.content ===
                    'string' &&
                  output.content.trim()
                ) {
                  messages.push({
                    role: 'assistant',
                    content:
                      output.content,
                    level:
                      output.level ||
                      'unknown',
                    outputId:
                      output.output_id,
                  })
                }

                return messages
              }
            )

          setChatMessages(
            restoredMessages
          )

          if (outputs.length > 0) {
            const latestOutput =
              outputs[
                outputs.length - 1
              ]

            setGeneratedOutput(
              latestOutput
            )

            if (
              [
                'beginner',
                'intermediate',
                'advanced',
              ].includes(
                latestOutput.level
              )
            ) {
              setExplanationLevel(
                latestOutput.level
              )
            }
          }
        } catch (historyError) {
          if (!isActive) {
            return
          }

          console.error(
            'Explanation chat history error:',
            historyError
          )

          setError(
            'Unable to connect to the server to load this Concept Explanation chat.'
          )
        } finally {
          if (isActive) {
            setChatMessagesLoading(false)
          }
        }
      }

    loadChatMessages()

    return () => {
      isActive = false
    }
  }, [
    selectedDocument,
    activeChatId,
  ])


  // Load supplementary material belonging only to the active chat.
  useEffect(() => {
    if (
      !selectedDocument ||
      !activeChatId
    ) {
      setChatSources([])
      setSourcesLoading(false)
      setSourceError('')
      setSourceStatus('')

      return undefined
    }

    const selectedChatId =
      Number(activeChatId)

    let isActive = true

    const loadChatSources =
      async () => {
        setSourcesLoading(true)
        setChatSources([])
        setSourceError('')
        setSourceStatus('')

        try {
          const response =
            await getExplanationChatSources(
              selectedChatId
            )

          if (!isActive) {
            return
          }

          if (
            !response.ok ||
            response.data?.status !==
              'success'
          ) {
            setSourceError(
              response.data?.message ||
                'Unable to load supplementary material for this chat.'
            )

            return
          }

          setChatSources(
            response.data?.sources ?? []
          )
        } catch (sourceFetchError) {
          if (!isActive) {
            return
          }

          console.error(
            'Explanation supplementary sources error:',
            sourceFetchError
          )

          setSourceError(
            'Unable to connect to the server to load supplementary material.'
          )
        } finally {
          if (isActive) {
            setSourcesLoading(false)
          }
        }
      }

    loadChatSources()

    return () => {
      isActive = false
    }
  }, [
    selectedDocument,
    activeChatId,
  ])


  const handleSupplementaryFileChange =
    async (event) => {
      const input =
        event.target

      const file =
        input.files?.[0]

      /*
       * Reset immediately so selecting the same
       * file again later still triggers onChange.
       */
      input.value = ''

      if (!file) {
        return
      }

      if (!activeChatId) {
        setSourceError(
          'Create or select a chat before attaching supplementary material.'
        )

        return
      }

      if (
        generationLoading ||
        chatActionLoading ||
        sourceUploading
      ) {
        return
      }

      const extension =
        file.name
          .split('.')
          .pop()
          ?.toLowerCase() ||
        ''

      const allowedExtensions =
        [
          'pdf',
          'docx',
          'txt',
        ]

      if (
        !allowedExtensions.includes(
          extension
        )
      ) {
        setSourceError(
          'Only PDF, DOCX and TXT files can be attached.'
        )

        setSourceStatus('')

        return
      }

      const maximumFileSize =
        15 * 1024 * 1024

      if (
        file.size >
        maximumFileSize
      ) {
        setSourceError(
          'The supplementary file exceeds the maximum size of 15 MB.'
        )

        setSourceStatus('')

        return
      }

      const targetChatId =
        Number(activeChatId)

      setSourceUploading(true)

      /*
       * Reuse the existing chat-action lock so the user
       * cannot switch/delete chats while an attachment
       * is being uploaded to the current conversation.
       */
      setChatActionLoading(true)

      setSourceError('')
      setSourceStatus('')

      try {
        const response =
          await uploadExplanationChatSource(
            targetChatId,
            file
          )

        if (
          !response.ok ||
          response.data?.status !==
            'success'
        ) {
          setSourceError(
            response.data?.message ||
              'Unable to attach this file to the chat.'
          )

          return
        }

        const uploadedSource =
          response.data?.source

        if (
          !uploadedSource?.source_id
        ) {
          setSourceError(
            'The server returned the supplementary file in an unexpected format.'
          )

          return
        }

        setChatSources(
          (currentSources) => [
            ...currentSources,
            uploadedSource,
          ]
        )

        setSourceStatus(
          `${uploadedSource.file_name || file.name} attached as supporting context.`
        )
      } catch (uploadError) {
        console.error(
          'Explanation supplementary upload error:',
          uploadError
        )

        setSourceError(
          'Unable to connect to the server while attaching supplementary material.'
        )
      } finally {
        setSourceUploading(false)
        setChatActionLoading(false)
      }
    }


  const handleDeleteSupplementarySource =
    async (sourceId) => {
      if (
        !activeChatId ||
        generationLoading ||
        chatActionLoading
      ) {
        return
      }

      const source =
        chatSources.find(
          (item) =>
            Number(item.source_id) ===
            Number(sourceId)
        )

      if (!source) {
        return
      }

      const confirmed =
        window.confirm(
          `Remove "${source.file_name}" from this chat's supporting material?`
        )

      if (!confirmed) {
        return
      }

      const targetChatId =
        Number(activeChatId)

      setDeletingSourceId(
        sourceId
      )

      setChatActionLoading(true)
      setSourceError('')
      setSourceStatus('')

      try {
        const response =
          await deleteExplanationChatSource(
            targetChatId,
            Number(sourceId)
          )

        if (
          !response.ok ||
          response.data?.status !==
            'success'
        ) {
          setSourceError(
            response.data?.message ||
              'Unable to remove this supplementary file.'
          )

          return
        }

        setChatSources(
          (currentSources) =>
            currentSources.filter(
              (item) =>
                Number(
                  item.source_id
                ) !==
                Number(sourceId)
            )
        )

        setSourceStatus(
          `${source.file_name} removed from supporting context.`
        )
      } catch (deleteError) {
        console.error(
          'Explanation supplementary delete error:',
          deleteError
        )

        setSourceError(
          'Unable to connect to the server while removing supplementary material.'
        )
      } finally {
        setDeletingSourceId(null)
        setChatActionLoading(false)
      }
    }

  const handleCreateChat =
    async () => {
      if (
        !selectedDocument ||
        chatActionLoading ||
        generationLoading
      ) {
        return
      }

      setChatActionLoading(true)
      setChatError('')
      setError('')
      setRetryableError(false)

      try {
        const response =
          await createExplanationChat(
            Number(selectedDocument)
          )

        if (
          !response.ok ||
          response.data?.status !==
            'success'
        ) {
          setChatError(
            response.data?.message ||
              'Unable to create a new chat.'
          )

          return
        }

        const createdChat =
          response.data?.chat

        if (!createdChat?.chat_id) {
          setChatError(
            'The server returned the new chat in an unexpected format.'
          )

          return
        }

        const normalisedChat = {
          ...createdChat,
          output_count: 0,
        }

        setChats(
          (currentChats) => [
            normalisedChat,
            ...currentChats,
          ]
        )

        const newChatId =
          String(
            createdChat.chat_id
          )

        setActiveChatId(
          newChatId
        )

        setChatMessages([])
        setGeneratedOutput(null)
        setDisclaimer('')
        setConcept('')

        window.localStorage.setItem(
          `${EXPLANATION_CHAT_STORAGE_PREFIX}${Number(
            selectedDocument
          )}`,
          newChatId
        )
      } catch (createError) {
        console.error(
          'Explanation chat create error:',
          createError
        )

        setChatError(
          'Unable to connect to the server to create a new chat.'
        )
      } finally {
        setChatActionLoading(false)
      }
    }


  const handleSelectChat =
    (chatId) => {
      if (
        generationLoading ||
        chatActionLoading
      ) {
        return
      }

      setActiveChatId(
        String(chatId)
      )

      setConcept('')
      setError('')
      setChatError('')
      setRetryableError(false)
    }


  const handleStartChatRename = (chat) => {
    if (
      generationLoading ||
      chatActionLoading ||
      renameSavingRef.current
    ) {
      return
    }

    renameCancelledRef.current = false
    setEditingChatId(String(chat.chat_id))
    setEditingChatTitle(chat.title || '')
    setChatError('')
  }

  const handleCancelChatRename = () => {
    renameCancelledRef.current = true
    setEditingChatId('')
    setEditingChatTitle('')
    setChatError('')
  }

  const handleSaveChatRename = async (chat) => {
    if (
      renameCancelledRef.current ||
      renameSavingRef.current
    ) {
      return
    }

    const title = editingChatTitle
      .trim()
      .replace(/\s+/g, ' ')

    if (
      !title ||
      title.length > 255 ||
      title === 'New chat'
    ) {
      setChatError(
        'Enter a conversation name between 1 and 255 characters, other than "New chat".'
      )
      return
    }

    if (title === chat.title) {
      setEditingChatId('')
      setEditingChatTitle('')
      return
    }

    renameSavingRef.current = true
    setRenameSaving(true)
    setChatError('')

    try {
      const response = await renameExplanationChat(
        Number(chat.chat_id),
        title
      )

      if (
        !response.ok ||
        response.data?.status !== 'success'
      ) {
        setChatError(
          response.data?.message ||
            'Unable to rename this conversation.'
        )
        return
      }

      const savedTitle =
        response.data?.chat?.title || title

      setChats((currentChats) =>
        currentChats.map((currentChat) =>
          String(currentChat.chat_id) ===
          String(chat.chat_id)
            ? {
                ...currentChat,
                title: savedTitle,
              }
            : currentChat
        )
      )

      setEditingChatId('')
      setEditingChatTitle('')
    } catch (renameError) {
      console.error(
        'Unable to rename conversation:',
        renameError
      )

      setChatError(
        'Unable to connect to the server to rename this conversation.'
      )
    } finally {
      renameSavingRef.current = false
      setRenameSaving(false)
    }
  }

  const handleDeleteChat =
    async (chatId) => {
      if (
        chatActionLoading ||
        generationLoading
      ) {
        return
      }

      const chatToDelete =
        chats.find(
          (chat) =>
            String(chat.chat_id) ===
            String(chatId)
        )

      if (!chatToDelete) {
        return
      }

      const confirmed =
        window.confirm(
          `Delete "${chatToDelete.title}" and its Concept Explanation history?`
        )

      if (!confirmed) {
        return
      }

      setChatActionLoading(true)
      setChatError('')

      try {
        const response =
          await deleteExplanationChat(
            Number(chatId)
          )

        if (
          !response.ok ||
          response.data?.status !==
            'success'
        ) {
          setChatError(
            response.data?.message ||
              'Unable to delete this chat.'
          )

          return
        }

        const remainingChats =
          chats.filter(
            (chat) =>
              String(chat.chat_id) !==
              String(chatId)
          )

        setChats(
          remainingChats
        )

        if (
          String(activeChatId) ===
          String(chatId)
        ) {
          const nextChat =
            remainingChats[0] ||
            null

          setChatMessages([])
          setGeneratedOutput(null)
          setDisclaimer('')
          setConcept('')

          const storageKey =
            `${EXPLANATION_CHAT_STORAGE_PREFIX}${Number(
              selectedDocument
            )}`

          if (nextChat) {
            const nextChatId =
              String(
                nextChat.chat_id
              )

            setActiveChatId(
              nextChatId
            )

            window.localStorage.setItem(
              storageKey,
              nextChatId
            )
          } else {
            setActiveChatId('')

            window.localStorage.removeItem(
              storageKey
            )
          }
        }
      } catch (deleteError) {
        console.error(
          'Explanation chat delete error:',
          deleteError
        )

        setChatError(
          'Unable to connect to the server to delete this chat.'
        )
      } finally {
        setChatActionLoading(false)
      }
    }

  const handleGenerateExplanation =
    async () => {
      if (!selectedDocument) {
        setError(
          'Please select a study material first.'
        )

        setRetryableError(false)

        return
      }

      if (!concept.trim()) {
        setError(
          'Please enter a concept or topic you would like explained.'
        )

        setRetryableError(false)

        return
      }

      if (
        consentStatus !== 'granted'
      ) {
        setError(
          'Please grant AI processing consent before generating a concept explanation.'
        )

        setRetryableError(false)

        return
      }

      if (!activeChatId) {
        setError(
          'Create a new chat or select an existing chat first.'
        )

        setRetryableError(false)

        return
      }
      const submittedConcept =
        concept.trim()

      setGenerationLoading(true)
      setError('')
      setRetryableError(false)

      try {
        const response =
          await generateAIContent({
            fileId:
              Number(
                selectedDocument
              ),

            outputType:
              'explanation',

            concept:
              submittedConcept,

            level:
              explanationLevel,

            chatId:
              Number(activeChatId),
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

          if (
            response.status === 400 &&
            response.data?.code ===
              'MISSING_CONCEPT'
          ) {
            setError(
              'Please enter a concept or topic you would like explained.'
            )

            setRetryableError(false)

            return
          }

          if (
            response.status === 400 &&
            response.data?.code ===
              'INVALID_LEVEL'
          ) {
            setError(
              'Please select a valid explanation level.'
            )

            setRetryableError(false)

            return
          }

          setError(
            response.data?.message ||
              'Unable to generate the explanation. Please try again.'
          )

          setRetryableError(
            response.data?.retryable ===
              true
          )

          return
        }

        const output =
          response.data?.output

        if (
          !output ||
          typeof output.content !==
            'string' ||
          !output.content.trim()
        ) {
          setError(
            'The server returned the explanation in an unexpected format.'
          )

          setRetryableError(false)

          return
        }

        setGeneratedOutput(output)

        setChatMessages(
          (currentMessages) => [
            ...currentMessages,
            {
              role: 'user',
              content:
                submittedConcept,
            },
            {
              role: 'assistant',
              content:
                output.content,
              level:
                output.level ||
                explanationLevel,
            },
          ]
        )

        const generatedChatTitle =
          submittedConcept
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 80) ||
          'New chat'

        setChats(
          (currentChats) => {
            const updatedChats =
              currentChats.map(
                (chat) => {
                  if (
                    String(
                      chat.chat_id
                    ) !==
                    String(
                      activeChatId
                    )
                  ) {
                    return chat
                  }

                  return {
                    ...chat,
                    title:
                      chat.title ===
                      'New chat'
                        ? generatedChatTitle
                        : chat.title,
                    output_count:
                      Number(
                        chat.output_count ||
                          0
                      ) + 1,
                    updated_at:
                      new Date().toISOString(),
                  }
                }
              )

            const activeChat =
              updatedChats.find(
                (chat) =>
                  String(
                    chat.chat_id
                  ) ===
                  String(
                    activeChatId
                  )
              )

            if (!activeChat) {
              return updatedChats
            }

            return [
              activeChat,
              ...updatedChats.filter(
                (chat) =>
                  String(
                    chat.chat_id
                  ) !==
                  String(
                    activeChatId
                  )
              ),
            ]
          }
        )
        setConcept('')

        setDisclaimer(
          response.data?.disclaimer ??
            ''
        )

        setRetryableError(false)
      } catch (generationError) {
        console.error(
          'Explanation generation error:',
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


  const selectedDocumentName =
    documents.find(
      (document) =>
        String(
          document.file_id
        ) === String(selectedDocument)
    )?.file_name || ''


  const getLevelLabel = (level) => {
    if (
      level === 'intermediate'
    ) {
      return 'Intermediate'
    }

    if (
      level === 'advanced'
    ) {
      return 'Advanced'
    }

    return 'Beginner'
  }


  return (
    <div className="explanation-theme mx-auto w-full min-w-0 max-w-[1660px]">
      <style>
        {`
          .explanation-theme-text {
            transition:
              color 100ms ease;
          }

          .explanation-theme-surface {
            transition:
              background-color 500ms ease,
              border-color 500ms ease,
              box-shadow 300ms ease;
          }

          .explanation-theme-interactive {
            transition:
              color 100ms ease,
              background-color 300ms ease,
              border-color 300ms ease,
              box-shadow 300ms ease,
              filter 300ms ease;
          }

          .explanation-theme-border {
            transition:
              border-color 500ms ease;
          }


          [data-theme-mode='light']
          .explanation-heading {
            color:
              #171717 !important;
          }

          [data-theme-mode='light']
          .explanation-body {
            color:
              #65676b !important;
          }

          [data-theme-mode='light']
          .explanation-muted {
            color:
              #7a7575 !important;
          }

          [data-theme-mode='light']
          .explanation-accent {
            color:
              #7a44ff !important;
          }

          [data-theme-mode='light']
          .explanation-accent-soft {
            color:
              #6f42c1 !important;
          }


          [data-theme-mode='light']
          .explanation-surface {
            background-color:
              #ffffff !important;

            border-color:
              #dfdfdf !important;
          }


          [data-theme-mode='light']
          .explanation-loading-text {
            color:
              #6f42c1 !important;
          }


          [data-theme-mode='light']
          .explanation-error-text {
            color:
              #b91c1c !important;
          }


          [data-theme-mode='light']
          .explanation-warning-heading {
            color:
              #92400e !important;
          }

          [data-theme-mode='light']
          .explanation-warning-body {
            color:
              #a16207 !important;
          }


          [data-theme-mode='light']
          .explanation-consent-badge {
            color:
              #047857 !important;

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
          .explanation-link:hover {
            color:
              #6634e8 !important;
          }


          /*
           * Concept input
           */
          [data-theme-mode='light']
          .explanation-concept-input {
            background-color:
              #ffffff !important;

            border-color:
              #d7d3df !important;

            color:
              #2b2b33 !important;
          }

          [data-theme-mode='light']
          .explanation-concept-input::placeholder {
            color:
              #8a8793 !important;
          }

          [data-theme-mode='light']
          .explanation-concept-input:hover {
            border-color:
              rgba(
                122,
                68,
                255,
                0.55
              ) !important;
          }

          [data-theme-mode='light']
          .explanation-concept-input:focus {
            border-color:
              #7a44ff !important;

            box-shadow:
              0 0 0 2px
              rgba(
                122,
                68,
                255,
                0.18
              ) !important;
          }


          /*
           * Disabled buttons
           */
          [data-theme-mode='light']
          .explanation-generate-button:disabled {
            background-image:
              none !important;

            background-color:
              #e6e3eb !important;

            color:
              #9a96a6 !important;

            box-shadow:
              none !important;
          }

          [data-theme-mode='light']
          .explanation-retry-button:disabled {
            background-color:
              #e6e3eb !important;

            border-color:
              transparent !important;

            color:
              #9a96a6 !important;
          }


          /*
           * Generated output
           */
          [data-theme-mode='light']
          .explanation-ai-badge {
            color:
              #6f42c1 !important;

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
          .explanation-level-badge {
            color:
              #6f42c1 !important;

            background-color:
              rgba(
                169,
                124,
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
          .explanation-meta-value {
            color:
              #5f5b78 !important;
          }


          [data-theme-mode='light']
          .explanation-output {
            background-color:
              #f7f7fb !important;

            border-color:
              #dfdfdf !important;
          }

          /*
           * Final Concept Explanation light-mode polish.
           * Dark-mode styling remains unchanged.
           */


          /*
           * Selected chat:
           * stronger contrast than the previous
           * pale-purple-on-pale-purple state.
           */
          [data-theme-mode='light']
          .explanation-active-chat-card {
            background-color:
              #e8defe !important;

            border-color:
              #8a5cff !important;

            box-shadow:
              inset 3px 0 0
              #7a44ff;
          }


          [data-theme-mode='light']
          .explanation-active-chat-card p {
            color:
              #372250 !important;
          }


          /*
           * Composer attachment button:
           * retain a visible purple paperclip on
           * the light surface.
           */
          [data-theme-mode='light']
          .explanation-composer-attachment {
            background-color:
              #f4f0ff !important;

            border-color:
              #cfc1f3 !important;

            color:
              #6f42c1 !important;
          }


          [data-theme-mode='light']
          .explanation-composer-attachment:hover:not(:disabled) {
            background-color:
              #ebe3ff !important;

            border-color:
              #956cff !important;

            color:
              #5930a6 !important;
          }


          [data-theme-mode='light']
          .explanation-composer-attachment:disabled {
            background-color:
              #f1eff4 !important;

            border-color:
              #dcd8e3 !important;

            color:
              #aaa3b2 !important;
          }


          /*
           * Chat delete button:
           * keep the trash icon readable in light mode,
           * especially while hovering.
           */
          [data-theme-mode='light']
          .explanation-chat-delete-button {
            color:
              #756b82 !important;
          }


          [data-theme-mode='light']
          .explanation-chat-delete-button:hover:not(:disabled) {
            background-color:
              #feecec !important;

            color:
              #b42318 !important;
          }


          [data-theme-mode='light']
          .explanation-chat-delete-button:hover:not(:disabled) svg {
            color:
              #b42318 !important;
          }


          /*
           * Supporting context beneath Chats.
           */
          [data-theme-mode='light']
          .explanation-supporting-area {
            border-color:
              #ded8eb !important;
          }


          /*
           * Supplementary file chip.
           */
          [data-theme-mode='light']
          .explanation-supporting-chip {
            background-color:
              #f3efff !important;

            border-color:
              #cdbdf5 !important;
          }


          [data-theme-mode='light']
          .explanation-supporting-chip span {
            color:
              #4e3475 !important;
          }


          [data-theme-mode='light']
          .explanation-supporting-chip svg {
            color:
              #6f42c1 !important;
          }


          [data-theme-mode='light']
          .explanation-supporting-chip button {
            color:
              #75658f !important;
          }


          [data-theme-mode='light']
          .explanation-supporting-chip button:hover:not(:disabled) {
            background-color:
              #feecec !important;

            color:
              #b42318 !important;
          }


          [data-theme-mode='light']
          .explanation-supporting-chip button:hover:not(:disabled) svg {
            color:
              #b42318 !important;

            stroke:
              #b42318 !important;
          }


          /*
           * Supplementary upload/remove status.
           */
          [data-theme-mode='light']
          .explanation-support-status {
            background-color:
              #d1fae5 !important;

            border-color:
              #34d399 !important;
          }


          [data-theme-mode='light']
          .explanation-support-status p {
            color:
              #065f46 !important;
          }


          /*
           * Supporting context mirrors the Chats layout:
           * header/subtext first, then files underneath.
           */
          .explanation-supporting-area >
          .explanation-output {
            background-color:
              transparent !important;

            border-color:
              transparent !important;

            box-shadow:
              none !important;

            padding:
              0 !important;
          }


          .explanation-supporting-area
          .explanation-supporting-chip {
            width:
              100%;
          }


          /*
           * STUDYA EXPLANATION ILLUMINATED SURFACE
           *
           * Visual enhancement only.
           * Chat sessions, generation, explanation level,
           * supplementary files, consent and persistence
           * behaviour remain unchanged.
           */
          .explanation-surface {
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
          .explanation-surface::after {
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


          .explanation-surface:hover {
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
          .explanation-surface {
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
          .explanation-surface::after {
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
          .explanation-surface:hover {
            border-color:
              rgba(122, 68, 255, 0.28) !important;

            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 1),
              0 13px 32px rgba(91, 60, 145, 0.10),
              0 0 18px rgba(122, 68, 255, 0.04);
          }

          /*
           * ==================================================
           * STUDYA EXPLANATION MOBILE RESPONSIVENESS
           * ==================================================
           *
           * Layout-only changes.
           *
           * Chat sessions, consent, supplementary files,
           * generation, persistence and explanation-level
           * functionality remain unchanged.
           */


          /*
           * Flex/grid children are allowed to shrink instead
           * of establishing a wider min-content width.
           */
          .explanation-theme,
          .explanation-surface {
            min-width: 0;
            max-width: 100%;
          }


          .explanation-material-header >
          div:first-child,
          .explanation-chat-header >
          div:first-child {
            min-width: 0;
            max-width: 100%;
          }


          /*
           * Mobile / narrow tablet
           *
           * 656px activates Tailwind's sm breakpoint, so
           * override the existing sm:flex-row behaviour until
           * the layout actually has enough horizontal space.
           */
          @media (max-width: 767px) {

            .explanation-material-header {
              flex-direction: column !important;
              align-items: flex-start !important;
              justify-content: flex-start !important;
            }


            .explanation-consent-badge {
              max-width: 100% !important;
              align-self: flex-start;
            }


            .explanation-chat-header {
              flex-direction: column !important;
              align-items: stretch !important;
              justify-content: flex-start !important;
            }


            .explanation-level-control {
              width: 100% !important;
              min-width: 0 !important;
              margin-left: 0 !important;
              flex-shrink: 1 !important;
            }


            .explanation-new-chat-button {
              width: 100% !important;
              max-width: 100% !important;
              align-self: stretch !important;
            }


            .explanation-supporting-area >
            div:first-child {
              min-width: 0;
              flex-wrap: wrap;
              align-items: flex-start;
            }
          }


          /*
           * At 768px and above there is enough room to return
           * the controls to the normal desktop/tablet row.
           */
          @media (min-width: 768px) {

            .explanation-level-control {
              width: 210px !important;
              flex-shrink: 0 !important;
              margin-left: auto !important;
            }


            .explanation-new-chat-button {
              width: auto !important;
              align-self: flex-end !important;
            }
          }
`}
      </style>


      {/* Page Heading */}
      <div className="mb-8">
        <p className="explanation-theme-text explanation-accent mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
          AI Study Tools
        </p>

        <h1 className="explanation-theme-text explanation-heading text-3xl font-bold tracking-tight text-[#f3f0ff]">
          Concept Explanation
        </h1>

        <p className="explanation-theme-text explanation-body mt-2 max-w-3xl text-sm leading-6 text-[#898cc0]">
          Select a study material and request a clearer
          explanation of a topic or concept.
        </p>
      </div>


      {/* Explanation Workspace */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)]">
        {/* Study Material Panel */}
        <section className="explanation-theme-surface explanation-surface rounded-xl border border-[#2a1b4d] bg-[#160b32]">
          <div className="explanation-theme-border border-b border-[#2a1b4d] px-5 py-4">
            <div className="explanation-material-header flex min-w-0 flex-wrap items-center justify-between gap-3">
              <div>
                <p className="explanation-theme-text explanation-accent text-xs font-semibold uppercase tracking-[0.14em] text-[#a97cff]">
                  Study Material
                </p>

                <p className="explanation-theme-text explanation-muted mt-1 text-xs text-[#727494]">
                  Choose the document you want to discuss.
                </p>
              </div>

              {!consentInitialLoading &&
                consentStatus ===
                  'granted' && (
                  <Link
                    to="/privacy"
                    title="AI processing consent is granted. Manage consent."
                    className="explanation-theme-interactive explanation-consent-badge inline-flex max-w-full w-fit shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:border-emerald-400/40 hover:bg-emerald-500/15"
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
          </div>

          <div className="p-5">
            {documentsLoading ? (
              <div
                className="explanation-theme-surface flex min-h-[50px] items-center gap-3 rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 px-4 py-3"
                role="status"
              >
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

                <p className="explanation-theme-text explanation-loading-text text-sm text-[#c9b4ff]">
                  Loading materials...
                </p>
              </div>
            ) : documents.length ===
                0 &&
              !documentsError ? (
              <div className="explanation-theme-surface rounded-lg border border-amber-400/20 bg-amber-500/[0.07] p-4">
                <p className="explanation-theme-text explanation-warning-heading font-medium text-amber-200">
                  No uploaded study materials
                </p>

                <p className="explanation-theme-text explanation-warning-body mt-1 text-sm leading-6 text-amber-100/70">
                  Upload a PDF, DOCX or TXT document before
                  starting a concept explanation.
                </p>

                <Link
                  to="/upload"
                  className="explanation-theme-text explanation-accent explanation-link mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#a97cff]"
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
            ) : (
              <AnimatedSelect
                id="explanation-document"
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
                  if (
                    generationLoading ||
                    chatActionLoading
                  ) {
                    return
                  }

                  setSelectedDocument(
                    newValue
                  )

                  setChats([])
                  setActiveChatId('')
                  setChatMessages([])
                  setConcept('')

                  setError('')

                  setRetryableError(
                    false
                  )
                }}
              />
            )}

            <div className="mt-5">
              <div className="mb-3 flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="explanation-theme-text explanation-heading text-sm font-semibold text-[#f3f0ff]">
                    Chats
                  </p>

                  <p className="explanation-theme-text explanation-muted mt-0.5 text-xs text-[#727494]">
                    Conversations for this study material.
                  </p>
                </div>

                {selectedDocument && (
                  <span className="explanation-theme-surface explanation-output rounded-full border border-[#2a1b4d] bg-[#120928]/50 px-2.5 py-1 text-xs text-[#8f87a8]">
                    {chats.length}
                  </span>
                )}
              </div>

              {!selectedDocument ? (
                <div className="explanation-theme-surface explanation-output rounded-lg border border-dashed border-[#3a2860] bg-[#120928]/35 p-4">
                  <p className="explanation-theme-text explanation-muted text-sm leading-6 text-[#727494]">
                    Select a study material to view its chats.
                  </p>
                </div>
              ) : chatsLoading ? (
                <div
                  className="explanation-theme-surface explanation-output flex items-center gap-3 rounded-lg border border-[#2a1b4d] bg-[#120928]/50 p-4"
                  role="status"
                >
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

                  <p className="explanation-theme-text explanation-muted text-sm text-[#727494]">
                    Loading chats...
                  </p>
                </div>
              ) : chats.length === 0 ? (
                <div className="explanation-theme-surface explanation-output rounded-lg border border-dashed border-[#3a2860] bg-[#120928]/35 p-4">
                  <p className="explanation-theme-text explanation-heading text-sm font-medium text-[#d9d4eb]">
                    No chats yet
                  </p>

                  <p className="explanation-theme-text explanation-muted mt-1 text-xs leading-5 text-[#727494]">
                    Create a new chat to start discussing this material.
                  </p>
                </div>
              ) : (
                <div className="max-h-[370px] space-y-2 overflow-y-auto pr-1">
                  {chats.map((chat) => {
                    const isActiveChat =
                      String(chat.chat_id) ===
                      String(activeChatId)

                    return (
                      <div
                        key={chat.chat_id}
                        className={
                          isActiveChat
                            ? 'explanation-active-chat-card group flex min-w-0 items-center gap-2 rounded-lg border border-[#7a44ff]/45 bg-[#7a44ff]/12 p-2 transition duration-300'
                            : 'explanation-theme-surface explanation-output group flex min-w-0 items-center gap-2 rounded-lg border border-[#2a1b4d] bg-[#120928]/50 p-2 transition duration-300 hover:border-[#7a44ff]/35 hover:bg-[#7a44ff]/8'
                        }
                      >
                        <button
                          type="button"
                          onClick={() =>
                            handleSelectChat(
                              chat.chat_id
                            )
                          }
                          onDoubleClick={() =>
                            handleStartChatRename(chat)
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'F2') {
                              event.preventDefault()
                              handleStartChatRename(chat)
                            }
                          }}
                          title="Double-click to rename"
                          disabled={
                            generationLoading ||
                            chatActionLoading
                          }
                          className={`min-w-0 flex-1 rounded-md px-2 py-2 text-left disabled:cursor-not-allowed ${
  editingChatId === String(chat.chat_id) ? 'hidden' : ''
}`}
                        >
                          <p
                            className={
                              isActiveChat
                                ? 'truncate text-sm font-semibold text-[#c9b4ff]'
                                : 'explanation-theme-text explanation-heading truncate text-sm font-medium text-[#d9d4eb]'
                            }
                          >
                            {chat.title}
                          </p>

                          <p className="explanation-theme-text explanation-muted mt-1 text-xs text-[#727494]">
                            {Number(
                              chat.output_count ||
                                0
                            ) === 1
                              ? '1 explanation'
                              : `${Number(
                                  chat.output_count ||
                                    0
                                )} explanations`}
                          </p>
                        </button>

                        {editingChatId === String(chat.chat_id) && (
                          <input
                            autoFocus
                            type="text"
                            maxLength={255}
                            aria-label={`Rename ${chat.title}`}
                            value={editingChatTitle}
                            disabled={renameSaving}
                            onFocus={(event) => {
                              event.currentTarget.select()
                            }}
                            onChange={(event) => {
                              setEditingChatTitle(event.target.value)
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                event.currentTarget.blur()
                              }

                              if (event.key === 'Escape') {
                                event.preventDefault()
                                handleCancelChatRename()
                              }
                            }}
                            onBlur={() => {
                              if (!renameCancelledRef.current) {
                                void handleSaveChatRename(chat)
                              }
                            }}
                            className="explanation-theme-surface min-w-0 flex-1 rounded-md border border-[#7a44ff] bg-[#120928] px-2 py-2 text-sm text-[#f3f0ff] outline-none focus:ring-2 focus:ring-[#7a44ff]/30 disabled:opacity-60"
                          />
                        )}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()

                            handleDeleteChat(
                              chat.chat_id
                            )
                          }}
                          disabled={
                            generationLoading ||
                            chatActionLoading
                          }
                          title={`Delete ${chat.title}`}
                          aria-label={`Delete ${chat.title}`}
                          className="explanation-chat-delete-button explanation-theme-interactive flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#727494] transition duration-300 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
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
                              d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"
                            />
                          </svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="explanation-supporting-area mt-5 border-t border-[#2a1b4d] pt-4">
                <div className="mb-3 flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="explanation-theme-text explanation-heading text-sm font-semibold text-[#f3f0ff]">
                      Supporting context
                    </p>

                    <p className="explanation-theme-text explanation-muted mt-0.5 text-xs text-[#727494]">
                      Files used alongside the main study material for this chat.
                    </p>
                  </div>

                  {activeChatId && (
                    <span className="explanation-theme-surface explanation-output rounded-full border border-[#2a1b4d] bg-[#120928]/50 px-2.5 py-1 text-xs text-[#8f87a8]">
                      {chatSources.length}
                    </span>
                  )}
                </div>
              {/* Supplementary Chat Material */}
              {sourcesLoading &&
                activeChatId && (
                  <div
                    className="mb-3 flex items-center gap-2 px-1"
                    role="status"
                  >
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

                    <p className="explanation-theme-text explanation-muted text-xs text-[#727494]">
                      Loading supporting material...
                    </p>
                  </div>
                )}

              {!sourcesLoading &&
                chatSources.length > 0 && (
                  <div className="explanation-theme-surface explanation-output mb-3 rounded-lg border border-[#2a1b4d] bg-[#120928]/45 p-3">
                    <div className="hidden">
                      <div>
                        <p className="explanation-theme-text explanation-heading text-xs font-semibold text-[#d9d4eb]">
                          Supporting context
                        </p>

                        <p className="explanation-theme-text explanation-muted mt-0.5 text-[11px] leading-4 text-[#727494]">
                          Used alongside the main study material for this chat only.
                        </p>
                      </div>

                      <span className="explanation-theme-text explanation-accent rounded-full bg-[#7a44ff]/10 px-2 py-0.5 text-[11px] font-semibold text-[#a97cff]">
                        {chatSources.length}
                      </span>
                    </div>

                    <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                      {chatSources.map(
                        (source) => (
                          <div
                            key={
                              source.source_id
                            }
                            className="explanation-supporting-chip explanation-theme-surface flex w-full min-w-0 max-w-full items-center gap-2 rounded-lg border border-[#3a2860] bg-[#19103a] px-2.5 py-1.5"
                          >
                            <svg
                              aria-hidden="true"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              className="explanation-accent h-3.5 w-3.5 shrink-0 text-[#a97cff]"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M7 3h7l5 5v13H7zM14 3v6h6"
                              />
                            </svg>

                            <span
                              title={
                                source.file_name
                              }
                              className="explanation-theme-text explanation-heading min-w-0 flex-1 truncate text-xs font-medium text-[#d9d4eb]"
                            >
                              {
                                source.file_name
                              }
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteSupplementarySource(
                                  source.source_id
                                )
                              }
                              disabled={
                                generationLoading ||
                                chatActionLoading
                              }
                              title={`Remove ${source.file_name}`}
                              aria-label={`Remove ${source.file_name} from supporting context`}
                              className="explanation-theme-interactive ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#727494] transition duration-300 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {Number(
                                deletingSourceId
                              ) ===
                              Number(
                                source.source_id
                              ) ? (
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
                              ) : (
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
                                    d="M6 7h12M9 7V5h6v2M8 7l1 13h6l1-13M10.5 11v5M13.5 11v5"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {sourceError && (
                <div
                  className="mb-3 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2.5"
                  role="alert"
                >
                  <p className="explanation-theme-text explanation-error-text text-xs leading-5 text-red-300">
                    {sourceError}
                  </p>
                </div>
              )}

              {sourceStatus && (
                <div
                  className="explanation-support-status mb-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2.5"
                  role="status"
                >
                  <p className="explanation-theme-text text-xs leading-5 text-emerald-300">
                    {sourceStatus}
                  </p>
                </div>
              )}
              </div>
              {chatError && (
                <div
                  className="mt-3 rounded-lg border border-red-400/25 bg-red-500/10 p-3"
                  role="alert"
                >
                  <p className="explanation-theme-text explanation-error-text text-xs leading-5 text-red-300">
                    {chatError}
                  </p>
                </div>
              )}
            </div>
            {documentsError && (
              <div
                className="explanation-theme-surface mt-4 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
                role="alert"
              >
                <p className="explanation-theme-text explanation-error-text text-sm leading-6 text-red-300">
                  {documentsError}
                </p>
              </div>
            )}

            <div className="mt-4">
              {consentInitialLoading ? (
                <div
                  className="explanation-theme-surface flex items-center gap-3 rounded-lg border border-[#7a44ff]/25 bg-[#7a44ff]/10 p-4"
                  role="status"
                >
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

                  <p className="explanation-theme-text explanation-loading-text text-sm text-[#c9b4ff]">
                    Checking AI processing consent...
                  </p>
                </div>
              ) : consentStatus !==
                'granted' ? (
                <AIConsentRequired
                  featureName="AI-generated concept explanations"
                />
              ) : null}
            </div>

            {consentError && (
              <div
                className="explanation-theme-surface mt-4 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
                role="alert"
              >
                <p className="explanation-theme-text explanation-error-text text-sm leading-6 text-red-300">
                  {consentError}
                </p>
              </div>
            )}
          </div>
        </section>


        {/* Explanation Chat */}
        <section className="explanation-theme-surface explanation-surface flex h-[calc(100vh-235px)] min-h-[650px] flex-col overflow-hidden rounded-xl border border-[#2a1b4d] bg-[#160b32]">
          {/* Chat Header */}
          <div className="explanation-chat-header explanation-theme-border flex min-w-0 flex-col gap-4 border-b border-[#2a1b4d] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="explanation-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">
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
                      d="M8 10h8M8 14h5M7 20l-4 1 1-4a8 8 0 1 1 3 3Z"
                    />
                  </svg>
                </div>

                <div className="min-w-0">
                  <h2 className="explanation-theme-text explanation-heading truncate text-lg font-semibold text-[#f3f0ff]">
                    {selectedDocumentName ||
                      'Concept Explanation'}
                  </h2>

                  <p className="explanation-theme-text explanation-muted mt-0.5 text-xs text-[#727494]">
                    Ask StudyA about concepts in your selected material.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={
                handleCreateChat
              }
              disabled={
                !selectedDocument ||
                chatsLoading ||
                chatActionLoading ||
                generationLoading
              }
              className="explanation-new-chat-button explanation-generate-button inline-flex h-10 shrink-0 items-center justify-center gap-2 order-2 h-11 self-end rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#9c46ff] px-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(122,68,255,0.18)] transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:from-[#3a3150] disabled:to-[#3a3150] disabled:text-[#77718d] disabled:shadow-none sm:self-end"
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
                  d="M12 5v14M5 12h14"
                />
              </svg>

              {chatActionLoading
                ? 'Please wait...'
                : 'New Chat'}
            </button>
            {/* Explanation Level */}
            <div className="explanation-level-control order-1 w-full shrink-0 sm:ml-auto sm:w-[210px]">
              <p className="explanation-theme-text explanation-muted mb-1.5 text-xs font-medium text-[#727494]">
                Explanation Level
              </p>

              <AnimatedSelect
                id="explanation-level"
                value={
                  explanationLevel
                }
                options={[
                  {
                    value: 'beginner',
                    label: 'Beginner',
                  },
                  {
                    value:
                      'intermediate',
                    label:
                      'Intermediate',
                  },
                  {
                    value: 'advanced',
                    label: 'Advanced',
                  },
                ]}
                onChange={(
                  newValue
                ) => {
                  setExplanationLevel(
                    newValue
                  )

                  setError('')

                  setRetryableError(
                    false
                  )
                }}
              />
            </div>
          </div>


          {/* Conversation */}
          <div ref={conversationScrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
            {chatMessagesLoading ? (
              <div className="flex min-h-[260px] items-center justify-center">
                <div
                  className="flex items-center gap-3"
                  role="status"
                >
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

                  <p className="explanation-theme-text explanation-muted text-sm text-[#727494]">
                    Loading conversation...
                  </p>
                </div>
              </div>
            ) : chatMessages.length ===
              0 ? (
              <div className="flex min-h-[360px] items-center justify-center">
                <div className="max-w-lg text-center">
                  <div className="explanation-accent mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">
                    <svg
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      className="h-7 w-7"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.5 18h5M10 22h4M8.5 14.5A7 7 0 1 1 15.5 14.5C14.6 15.2 14 16 14 17h-4c0-1-.6-1.8-1.5-2.5Z"
                      />
                    </svg>
                  </div>

                  <h3 className="explanation-theme-text explanation-heading mt-4 text-lg font-semibold text-[#f3f0ff]">
                    {selectedDocument
                      ? 'What would you like explained?'
                      : 'Select a study material to begin'}
                  </h3>

                  <p className="explanation-theme-text explanation-body mt-2 text-sm leading-6 text-[#898cc0]">
                    {selectedDocument
                      ? activeChatId
                        ? 'Ask about a concept, theory, process or topic from the selected document. StudyA will explain it at your chosen level.'
                        : 'Create a new chat or select one from the left panel to begin.'
                      : 'Choose a document from the left panel, then ask StudyA about any concept contained in that material.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {chatMessages.map(
                  (
                    message,
                    messageIndex
                  ) => (
                    <div
                      key={`${message.role}-${messageIndex}`}
                      className={
                        message.role ===
                        'user'
                          ? 'flex justify-end'
                          : 'flex justify-start'
                      }
                    >
                      {message.role ===
                      'user' ? (
                        <div className="max-w-[82%] rounded-2xl rounded-br-md bg-gradient-to-r from-[#7a44ff] to-[#9c46ff] px-4 py-3 text-sm leading-6 text-white shadow-[0_8px_24px_rgba(122,68,255,0.15)]">
                          <p className="whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                      ) : (
                        <div className="flex max-w-[92%] items-start gap-3">
                          <div className="explanation-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#7a44ff]/25 bg-[#7a44ff]/10 text-[#a97cff]">
                            <svg
                              aria-hidden="true"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              className="h-4.5 w-4.5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M8 10h8M8 14h5M7 20l-4 1 1-4a8 8 0 1 1 3 3Z"
                              />
                            </svg>
                          </div>

                          <div className="explanation-theme-surface explanation-output rounded-2xl rounded-tl-md border border-[#2a1b4d] bg-[#120928]/50 px-4 py-4 sm:px-5">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <span className="explanation-theme-interactive explanation-ai-badge rounded-full border border-[#7a44ff]/25 bg-[#7a44ff]/10 px-2.5 py-1 text-[11px] font-semibold text-[#c9b4ff]">
                                AI Generated
                              </span>

                              {message.level && (
                                <span className="explanation-theme-interactive explanation-level-badge rounded-full border border-[#a97cff]/25 bg-[#a97cff]/10 px-2.5 py-1 text-[11px] font-semibold text-[#d9c9ff]">
                                  {getLevelLabel(
                                    message.level
                                  )}
                                </span>
                              )}
                            </div>

                            <p className="explanation-theme-text explanation-heading whitespace-pre-wrap text-sm leading-7 text-[#d9d4eb]">
                              {message.content}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}

            {generationLoading && (
              <div
                className="mt-6 flex justify-end"
                role="status"
              >
                <div className="flex max-w-[82%] items-center gap-3 rounded-2xl rounded-tr-md bg-gradient-to-r from-[#7a44ff] to-[#9c46ff] px-4 py-3 text-white shadow-[0_8px_24px_rgba(122,68,255,0.18)]">
                  <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                  <p className="text-sm text-white">
                    StudyAI is preparing your explanation...
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div
                className="explanation-theme-surface mt-6 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
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
                    <p className="explanation-theme-text explanation-error-text text-sm leading-6 text-red-300">
                      {error}
                    </p>

                    {retryableError && (
                      <button
                        type="button"
                        onClick={
                          handleGenerateExplanation
                        }
                        disabled={
                          generationLoading
                        }
                        className="explanation-theme-interactive explanation-retry-button mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#3a3150] disabled:text-[#77718d]"
                      >
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


          {/* Composer */}
          <div className="explanation-theme-border border-t border-[#2a1b4d] p-4 sm:p-5">
            <div className="explanation-theme-surface explanation-output flex items-center gap-2 rounded-xl border border-[#3a2860] bg-[#120928]/50 p-2 focus-within:border-[#7a44ff] focus-within:ring-2 focus-within:ring-[#7a44ff]/20">
              <input
                id="explanation-source-file"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={
                  handleSupplementaryFileChange
                }
                disabled={
                  !activeChatId ||
                  sourcesLoading ||
                  sourceUploading ||
                  chatActionLoading ||
                  generationLoading
                }
                className="hidden"
              />

              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById(
                      'explanation-source-file'
                    )
                    ?.click()
                }
                disabled={
                  !activeChatId ||
                  sourcesLoading ||
                  sourceUploading ||
                  chatActionLoading ||
                  generationLoading
                }
                title="Attach supporting material (PDF, DOCX or TXT, max 15 MB)"
                aria-label="Attach supplementary material to this chat"
                className="explanation-composer-attachment explanation-theme-interactive explanation-theme-surface flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#3a2860] bg-[#19103a] text-[#a97cff] transition duration-300 hover:border-[#7a44ff]/70 hover:bg-[#7a44ff]/10 disabled:cursor-not-allowed disabled:border-[#2a2440] disabled:text-[#5f5b78] disabled:opacity-60"
              >
                {sourceUploading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                ) : (
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
                      d="m21.4 11.1-8.9 8.9a6 6 0 0 1-8.5-8.5l9.6-9.6a4 4 0 0 1 5.7 5.7l-9.6 9.6a2 2 0 0 1-2.8-2.8l8.9-8.9"
                    />
                  </svg>
                )}
              </button>
              <textarea
                id="concept"
                value={concept}
                rows={1}
                onChange={(event) => {
                  setConcept(
                    event.target.value
                  )

                  setError('')

                  setRetryableError(
                    false
                  )
                }}
                onKeyDown={(event) => {
                  if (
                    event.key ===
                      'Enter' &&
                    !event.shiftKey &&
                    !generationLoading &&
                    !chatActionLoading &&
                    concept.trim() &&
                    selectedDocument &&
                    activeChatId &&
                    consentStatus ===
                      'granted'
                  ) {
                    event.preventDefault()

                    handleGenerateExplanation()
                  }
                }}
                disabled={
                  documentsLoading ||
                  documents.length ===
                    0 ||
                  consentInitialLoading ||
                  consentStatus !==
                    'granted' ||
                  !activeChatId ||
                  chatActionLoading ||
                  generationLoading
                }
                placeholder={
                  !selectedDocument
                    ? 'Select a study material first...'
                    : !activeChatId
                      ? 'Create or select a chat first...'
                      : 'Ask about a concept from this material...'
                }
                className="explanation-concept-input min-h-[44px] max-h-28 min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm leading-6 text-[#d9d4eb] outline-none placeholder:text-[#5f5b78] focus:ring-0 disabled:cursor-not-allowed"
              />

              <button
                type="button"
                onClick={
                  handleGenerateExplanation
                }
                disabled={
                  documentsLoading ||
                  documents.length ===
                    0 ||
                  consentInitialLoading ||
                  consentStatus !==
                    'granted' ||
                  !activeChatId ||
                  chatActionLoading ||
                  generationLoading ||
                  !selectedDocument ||
                  !concept.trim()
                }
                aria-label="Send concept explanation request"
                className="explanation-generate-button flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#9c46ff] text-white shadow-[0_8px_24px_rgba(122,68,255,0.18)] transition duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:from-[#3a3150] disabled:to-[#3a3150] disabled:text-[#77718d] disabled:shadow-none"
              >
                {generationLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <svg
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 12h14M13 6l6 6-6 6"
                    />
                  </svg>
                )}
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
              <p className="explanation-theme-text explanation-muted text-xs text-[#727494]">
                Press Enter to send · Shift + Enter for a new line
              </p>

              <p className="explanation-theme-text explanation-muted text-xs text-[#727494]">
                AI responses may contain errors.
              </p>
            </div>

            {chatMessages.length > 0 && (
              <div className="explanation-theme-surface mt-4 rounded-lg border border-amber-400/20 bg-amber-500/[0.07] px-4 py-3">
                <p className="explanation-theme-text explanation-warning-body text-xs leading-5 text-amber-100/70">
                  {disclaimer ||
                    'This content was generated by AI and may contain errors or omissions. Please check it against your original study material.'}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}


export default Explanation
