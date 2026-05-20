import { request } from './http'

export type ConversationResponse = {
  id?: string
  conversationId?: string
  title?: string
  participants?: ({ userId?: string; participantUserId?: string; id?: string } | string)[]
  participantUserIds?: string[]
  createdAt?: string
}

export type ConversationSummary = ConversationResponse | string

export type MessageResponse = {
  id: string
  conversationId: string
  senderId: string
  body?: string
  content?: string
  sentAt?: string
}

export type NewConversation = {
  initiatorUserId?: string
  title?: string
  participantUserIds: string[]
}

export type NewMessage = {
  conversationId: string
  senderId: string
  content: string
  receiverEmail?: string
}

export const messagingApi = {
  createConversation: (body: NewConversation, token: string) =>
    request<{ conversationId: string }>('/Conversation/create', {
      method: 'POST',
      body,
      token,
    }),
  getConversation: (id: string, token: string) =>
    request<ConversationResponse>(`/Conversation/${id}`, { token }),
  getParticipantConversations: async (userId: string, token: string) => {
    const encodedUserId = encodeURIComponent(userId)
    const response = await request<
      | ConversationSummary
      | ConversationSummary[]
      | {
          conversationIds?: string[]
          conversations?: ConversationSummary[]
          results?: ConversationSummary[]
          items?: ConversationSummary[]
        }
    >(`/flow/conversations/user/${encodedUserId}`, { token })

    if (Array.isArray(response)) return response
    if (!response || typeof response !== 'object') return []

    const collections = response as {
      conversationIds?: string[]
      conversations?: ConversationSummary[]
      results?: ConversationSummary[]
      items?: ConversationSummary[]
    }
    if (Array.isArray(collections.conversationIds)) return collections.conversationIds
    if (Array.isArray(collections.conversations)) return collections.conversations
    if (Array.isArray(collections.results)) return collections.results
    if (Array.isArray(collections.items)) return collections.items

    return [response as ConversationResponse]
  },
  sendMessage: (body: NewMessage, token: string) =>
    request<{ messageId: string }>('/Message/send', {
      method: 'POST',
      body,
      token,
    }),
  getMessages: (conversationId: string, token: string) =>
    request<MessageResponse[]>(`/Message/conversation/${conversationId}`, {
      token,
    }),
}
