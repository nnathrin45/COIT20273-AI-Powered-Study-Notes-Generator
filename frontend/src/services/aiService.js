import { apiRequest } from './api'

export const generateAIContent = async ({
  fileId,
  outputType,
  concept,
  level,
  chatId,
}) => {
  const body = {
    file_id: fileId,
    output_type: outputType,
  }

  if (chatId !== undefined && chatId !== null && chatId !== '') {
    body.chat_id = chatId
  }

  if (concept !== undefined) {
    body.concept = concept
  }

  if (level !== undefined) {
    body.level = level
  }

  return apiRequest('/api/ai/generate', {
    method: 'POST',
    requiresAuth: true,
    body,
  })
}

export const submitQuizAttempt = async ({
  outputId,
  answers,
}) => {
  return apiRequest(
    `/api/ai/quiz/${outputId}/attempt`,
    {
      method: 'POST',
      requiresAuth: true,
      body: {
        answers,
      },
    }
  )
}

export const getQuizAttempts = async (outputId) => {
  return apiRequest(
    `/api/ai/quiz/${outputId}/attempts`,
    {
      method: 'GET',
      requiresAuth: true,
    }
  )
}

export const getAIOutputs = async (fileId) => {
  return apiRequest(
    `/api/ai/outputs/${fileId}`,
    {
      method: 'GET',
      requiresAuth: true,
    }
  )
}

export const deleteAIOutput = async (outputId) => {
  return apiRequest(
    `/api/ai/outputs/${outputId}`,
    {
      method: 'DELETE',
      requiresAuth: true,
    }
  )
}

// ==================================================
// Concept Explanation chat sessions
// ==================================================

export const createExplanationChat = async (
  mainFileId,
  title
) => {
  const body = {
    main_file_id: mainFileId,
  }

  if (
    typeof title === 'string' &&
    title.trim()
  ) {
    body.title = title.trim()
  }

  return apiRequest(
    '/api/ai/explanation/chats',
    {
      method: 'POST',
      requiresAuth: true,
      body,
    }
  )
}


export const getExplanationChats = async (
  fileId
) => {
  return apiRequest(
    `/api/ai/explanation/chats/${fileId}`,
    {
      method: 'GET',
      requiresAuth: true,
    }
  )
}


export const getExplanationChatMessages = async (
  chatId
) => {
  return apiRequest(
    `/api/ai/explanation/chats/${chatId}/messages`,
    {
      method: 'GET',
      requiresAuth: true,
    }
  )
}


export const renameExplanationChat = async (
  chatId,
  title
) => {
  return apiRequest(
    `/api/ai/explanation/chats/${chatId}`,
    {
      method: 'PATCH',
      requiresAuth: true,
      body: { title },
    }
  )
}
export const deleteExplanationChat = async (
  chatId
) => {
  return apiRequest(
    `/api/ai/explanation/chats/${chatId}`,
    {
      method: 'DELETE',
      requiresAuth: true,
    }
  )
}

// ==================================================
// Concept Explanation supplementary chat sources
// ==================================================

export const uploadExplanationChatSource = async (
  chatId,
  file
) => {
  const formData =
    new FormData()

  formData.append(
    'file',
    file
  )

  return apiRequest(
    `/api/ai/explanation/chats/${chatId}/sources`,
    {
      method: 'POST',
      body: formData,
      requiresAuth: true,
      isFormData: true,
    }
  )
}


export const getExplanationChatSources = async (
  chatId
) => {
  return apiRequest(
    `/api/ai/explanation/chats/${chatId}/sources`,
    {
      method: 'GET',
      requiresAuth: true,
    }
  )
}


export const deleteExplanationChatSource = async (
  chatId,
  sourceId
) => {
  return apiRequest(
    `/api/ai/explanation/chats/${chatId}/sources/${sourceId}`,
    {
      method: 'DELETE',
      requiresAuth: true,
    }
  )
}