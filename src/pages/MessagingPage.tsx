import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../state/AuthContext'
import { messagingApi } from '../api/messagingApi'
import type { ConversationSummary, MessageResponse } from '../api/messagingApi'
import { employerApi } from '../api/employerApi'
import type { EmployerProfile } from '../api/employerApi'
import { candidateApi } from '../api/candidateApi'
import type { CandidateProfile } from '../api/candidateApi'
import { ApiError } from '../api/http'

const STORAGE_KEY = 'jobportal.conversations'

type SavedConv = {
  id: string
  otherUserId: string
  otherLabel?: string
  otherEmail?: string
  createdAt: string
}

function loadSaved(userKey: string): SavedConv[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}.${userKey}`)
    if (!raw) return []
    return JSON.parse(raw) as SavedConv[]
  } catch { return [] }
}
function persistSaved(userKey: string, list: SavedConv[]) {
  localStorage.setItem(`${STORAGE_KEY}.${userKey}`, JSON.stringify(list))
}

function getConversationTitle(conversation?: SavedConv | null) {
  return conversation?.otherLabel?.trim() || 'Conversation'
}

function getCandidateName(candidate?: CandidateProfile | null) {
  if (!candidate) return ''
  const fullName = [candidate.firstName, candidate.lastName].filter(Boolean).join(' ').trim()
  return fullName || candidate.email || 'Candidate'
}

function getEmployerEmail(employer?: EmployerProfile | null) {
  return employer?.contactEmail?.trim() || ''
}

function getCandidateEmail(candidate?: CandidateProfile | null) {
  return candidate?.email?.trim() || ''
}

function getConversationId(conversation: ConversationSummary) {
  if (typeof conversation === 'string') return conversation.trim()
  return conversation.id?.trim() || conversation.conversationId?.trim() || ''
}

function getParticipantIds(conversation: ConversationSummary) {
  if (typeof conversation === 'string') return []

  const participantIds = conversation.participantUserIds ?? []
  const participants =
    conversation.participants
      ?.map((participant) =>
        typeof participant === 'string'
          ? participant
          : participant.userId ?? participant.participantUserId ?? participant.id ?? ''
      )
      .filter(Boolean) ?? []

  return [...participantIds, ...participants]
}

function toSavedConversation(
  conversation: ConversationSummary,
  currentUserId: string,
  previous?: SavedConv
): SavedConv | null {
  const id = getConversationId(conversation)
  if (!id) return null

  const otherUserId =
    getParticipantIds(conversation).find((participantId) => participantId !== currentUserId) ??
    previous?.otherUserId ??
    '(unknown)'

  return {
    id,
    otherUserId,
    otherLabel: (typeof conversation === 'string' ? undefined : conversation.title) ?? previous?.otherLabel,
    otherEmail: previous?.otherEmail,
    createdAt:
      (typeof conversation === 'string' ? undefined : conversation.createdAt) ??
      previous?.createdAt ??
      new Date().toISOString(),
  }
}

function mergeRemoteConversations(
  conversations: ConversationSummary[],
  savedConversations: SavedConv[],
  currentUserId: string
) {
  const savedById = new Map(savedConversations.map((conversation) => [conversation.id, conversation]))

  return conversations
    .map((conversation) =>
      toSavedConversation(
        conversation,
        currentUserId,
        savedById.get(getConversationId(conversation))
      )
    )
    .filter((conversation): conversation is SavedConv => conversation !== null)
}

export function MessagingPage() {
  const { session } = useAuth()
  const token = session?.accessToken ?? ''
  const me = session?.userId ?? ''
  const isCandidate = session?.role === 'Candidate'

  const [savedList, setSavedList] = useState<SavedConv[]>(() => loadSaved(me))
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageResponse[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [conversationListBusy, setConversationListBusy] = useState(false)
  const [conversationListErr, setConversationListErr] = useState('')

  const [companyName, setCompanyName] = useState('')
  const [employerResults, setEmployerResults] = useState<EmployerProfile[]>([])
  const [selectedEmployer, setSelectedEmployer] = useState<EmployerProfile | null>(null)
  const [hasEmployerSearched, setHasEmployerSearched] = useState(false)
  const [candidateName, setCandidateName] = useState('')
  const [candidateResults, setCandidateResults] = useState<CandidateProfile[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null)
  const [hasCandidateSearched, setHasCandidateSearched] = useState(false)
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchErr, setSearchErr] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [createErr, setCreateErr] = useState('')

  const [draft, setDraft] = useState('')
  const [sendBusy, setSendBusy] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const activeConversation = savedList.find((conversation) => conversation.id === activeId) ?? null
  const activeConversationTitle = getConversationTitle(activeConversation)

  const persist = useCallback((list: SavedConv[]) => {
    setSavedList(list)
    persistSaved(me, list)
  }, [me])

  const resolveReceiverInfo = useCallback(async (
    conversationId: string,
    conversation?: SavedConv | null
  ) => {
    let otherUserId =
      conversation?.otherUserId && conversation.otherUserId !== '(unknown)'
        ? conversation.otherUserId
        : ''
    let otherLabel = conversation?.otherLabel
    let otherEmail = conversation?.otherEmail?.trim() || ''

    if (!otherUserId) {
      try {
        const latestConversation = await messagingApi.getConversation(conversationId, token)
        otherUserId = getParticipantIds(latestConversation).find((participantId) => participantId !== me) ?? ''
        otherLabel = latestConversation.title || otherLabel
      } catch {
        otherUserId = ''
      }
    }

    if (otherUserId && !otherEmail) {
      try {
        if (isCandidate) {
          const employer = await employerApi.getByUserId(otherUserId, token)
          otherLabel = employer.companyName || otherLabel
          otherEmail = getEmployerEmail(employer)
        } else {
          const candidate = await candidateApi.getById(otherUserId, token)
          otherLabel = getCandidateName(candidate) || otherLabel
          otherEmail = getCandidateEmail(candidate)
        }
      } catch {
        otherEmail = ''
      }
    }

    if (otherUserId || otherLabel || otherEmail) {
      const nextConversation: SavedConv = {
        id: conversationId,
        otherUserId: otherUserId || conversation?.otherUserId || '(unknown)',
        otherLabel,
        otherEmail: otherEmail || conversation?.otherEmail,
        createdAt: conversation?.createdAt ?? new Date().toISOString(),
      }
      persist([
        nextConversation,
        ...savedList.filter((item) => item.id !== conversationId),
      ])
    }

    return { otherUserId, otherLabel, otherEmail }
  }, [isCandidate, me, persist, savedList, token])

  const resolveConversationLabels = useCallback(async (conversations: SavedConv[]) => {
    if (!token) return conversations

    const resolved = await Promise.all(
      conversations.map(async (conversation) => {
        if (!conversation.otherUserId || conversation.otherUserId === '(unknown)') {
          return conversation
        }

        try {
          if (isCandidate) {
            const employer = await employerApi.getByUserId(conversation.otherUserId, token)
            return {
              ...conversation,
              otherLabel: employer.companyName || conversation.otherLabel,
              otherEmail: getEmployerEmail(employer) || conversation.otherEmail,
            }
          }

          const candidate = await candidateApi.getById(conversation.otherUserId, token)
          return {
            ...conversation,
            otherLabel: getCandidateName(candidate) || conversation.otherLabel,
            otherEmail: getCandidateEmail(candidate) || conversation.otherEmail,
          }
        } catch {
          return conversation
        }
      })
    )

    return resolved
  }, [isCandidate, token])

  const loadParticipantConversations = useCallback(async () => {
    if (!me) return

    const savedConversations = loadSaved(me)
    const labeledSavedConversations = await resolveConversationLabels(savedConversations)
    setSavedList(labeledSavedConversations)
    persistSaved(me, labeledSavedConversations)
    if (!token) return

    setConversationListBusy(true)
    setConversationListErr('')
    try {
      const conversations = await messagingApi.getParticipantConversations(me, token)
      const nextList = mergeRemoteConversations(conversations, labeledSavedConversations, me)
      const labeledNextList = await resolveConversationLabels(nextList)
      setSavedList(labeledNextList)
      persistSaved(me, labeledNextList)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setSavedList([])
        persistSaved(me, [])
      } else {
        setConversationListErr(
          err instanceof ApiError ? err.message : 'Failed to load your conversations.'
        )
      }
    } finally {
      setConversationListBusy(false)
    }
  }, [me, resolveConversationLabels, token])

  const loadMessages = useCallback(async (id: string) => {
    setBusy(true); setError(''); setMessages([])
    try {
      const data = await messagingApi.getMessages(id, token)
      setMessages(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load messages.')
    } finally { setBusy(false) }
  }, [token])

  const searchEmployers = async (e: FormEvent) => {
    e.preventDefault()
    const query = companyName.trim()
    if (!query) return

    setSearchBusy(true)
    setSearchErr('')
    setCreateErr('')
    setSelectedEmployer(null)
    setHasEmployerSearched(true)
    try {
      const employers = await employerApi.searchByCompanyName(query, token)
      setEmployerResults(employers)
    } catch (err) {
      setEmployerResults([])
      if (!(err instanceof ApiError && err.status === 404)) {
        setSearchErr(err instanceof ApiError ? err.message : 'Could not search employers.')
      }
    } finally {
      setSearchBusy(false)
    }
  }

  const searchCandidates = async (e: FormEvent) => {
    e.preventDefault()
    const query = candidateName.trim()
    if (!query) return

    setSearchBusy(true)
    setSearchErr('')
    setCreateErr('')
    setSelectedCandidate(null)
    setHasCandidateSearched(true)
    try {
      const candidates = await candidateApi.searchByName(query, token)
      setCandidateResults(candidates)
    } catch (err) {
      setCandidateResults([])
      if (!(err instanceof ApiError && err.status === 404)) {
        setSearchErr(err instanceof ApiError ? err.message : 'Could not search candidates.')
      }
    } finally {
      setSearchBusy(false)
    }
  }

  useEffect(() => {
    loadParticipantConversations()
  }, [loadParticipantConversations])

  useEffect(() => {
    if (activeId) loadMessages(activeId)
  }, [activeId, loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startConversation = async (e: FormEvent) => {
    e.preventDefault()
    const participantId = isCandidate ? selectedEmployer?.userId?.trim() : selectedCandidate?.userId?.trim()
    const participantLabel = isCandidate ? selectedEmployer?.companyName : getCandidateName(selectedCandidate)
    const participantEmail = isCandidate
      ? getEmployerEmail(selectedEmployer)
      : getCandidateEmail(selectedCandidate)
    if (!participantId) return

    setCreateErr(''); setCreateBusy(true)
    try {
      const resp = await messagingApi.createConversation({
        initiatorUserId: me,
        title: participantLabel,
        participantUserIds: [me, participantId],
      }, token)
      const newConv: SavedConv = {
        id: resp.conversationId,
        otherUserId: participantId,
        otherLabel: participantLabel,
        otherEmail: participantEmail,
        createdAt: new Date().toISOString(),
      }
      persist([newConv, ...savedList.filter((c) => c.id !== resp.conversationId)])
      setActiveId(resp.conversationId)
      setSelectedEmployer(null)
      setSelectedCandidate(null)
      setCompanyName('')
      setCandidateName('')
      setEmployerResults([])
      setCandidateResults([])
    } catch (err) {
      setCreateErr(err instanceof ApiError ? err.message : 'Could not create conversation.')
    } finally { setCreateBusy(false) }
  }

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault()
    if (!activeId || !draft.trim()) return
    setSendBusy(true)
    try {
      const { otherEmail } = await resolveReceiverInfo(activeId, activeConversation)

      if (!otherEmail) {
        setError('Could not resolve the receiver email for this conversation. Refresh conversations and try again.')
        return
      }

      await messagingApi.sendMessage({
        conversationId: activeId,
        senderId: me,
        content: draft.trim(),
        receiverEmail: otherEmail,
      }, token)
      setDraft('')
      await loadMessages(activeId)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send.')
    } finally { setSendBusy(false) }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Messages</h1>
          <p className="subtitle">{isCandidate ? 'Search employers by company name and start a conversation.' : 'Search candidates by name and start a conversation.'}</p>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-title">Start new conversation</div>
          {isCandidate ? (
            <>
              <form className="form" onSubmit={searchEmployers}>
                <div className="row">
                  <input
                    className="input"
                    required
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value)
                      setHasEmployerSearched(false)
                      setSelectedEmployer(null)
                    }}
                    placeholder="Company name"
                    style={{ flex: 1, minWidth: 200 }}
                  />
                  <button className="btn btn-ghost" disabled={searchBusy} type="submit">
                    {searchBusy ? 'Searching…' : 'Search'}
                  </button>
                </div>
                {searchErr ? <div className="alert error">{searchErr}</div> : null}
              </form>

              {employerResults.length > 0 ? (
                <div className="list" style={{ marginTop: 12 }}>
                  {employerResults.map((employer, index) => {
                    const employerUserId = employer.userId?.trim()
                    const isSelected = selectedEmployer?.userId === employer.userId

                    return (
                      <button
                        key={employerUserId || `${employer.companyName}-${index}`}
                        type="button"
                        className="list-item"
                        disabled={!employerUserId}
                        style={{ cursor: employerUserId ? 'pointer' : 'not-allowed', borderColor: isSelected ? 'var(--primary)' : undefined }}
                        onClick={() => {
                          setSelectedEmployer(employer)
                          setCreateErr('')
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{employer.companyName}</div>
                          <div className="meta">{employer.industry ?? 'Industry not set'}</div>
                        </div>
                        <span className={`badge ${isSelected ? '' : 'muted'}`}>{isSelected ? 'Selected' : 'Choose'}</span>
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {!searchBusy && hasEmployerSearched && employerResults.length === 0 && !searchErr ? (
                <div className="empty" style={{ marginTop: 12 }}>No matching employers yet.</div>
              ) : null}

              <form className="form" onSubmit={startConversation} style={{ marginTop: 12 }}>
                {selectedEmployer ? (
                  <div className="alert info">Starting a conversation with {selectedEmployer.companyName}.</div>
                ) : (
                  <div className="empty">Choose an employer from the search results first.</div>
                )}
                <button className="btn btn-primary" disabled={createBusy || !selectedEmployer?.userId} type="submit">
                  {createBusy ? 'Creating…' : 'Start'}
                </button>
                {createErr ? <div className="alert error">{createErr}</div> : null}
              </form>
            </>
          ) : (
            <>
              <form className="form" onSubmit={searchCandidates}>
                <div className="row">
                  <input
                    className="input"
                    required
                    value={candidateName}
                    onChange={(e) => {
                      setCandidateName(e.target.value)
                      setHasCandidateSearched(false)
                      setSelectedCandidate(null)
                    }}
                    placeholder="Candidate name"
                    style={{ flex: 1, minWidth: 200 }}
                  />
                  <button className="btn btn-ghost" disabled={searchBusy} type="submit">
                    {searchBusy ? 'Searching…' : 'Search'}
                  </button>
                </div>
                {searchErr ? <div className="alert error">{searchErr}</div> : null}
              </form>

              {candidateResults.length > 0 ? (
                <div className="list" style={{ marginTop: 12 }}>
                  {candidateResults.map((candidate, index) => {
                    const candidateUserId = candidate.userId?.trim()
                    const candidateLabel = getCandidateName(candidate)
                    const isSelected = selectedCandidate?.userId === candidate.userId

                    return (
                      <button
                        key={candidateUserId || `${candidateLabel}-${index}`}
                        type="button"
                        className="list-item"
                        disabled={!candidateUserId}
                        style={{ cursor: candidateUserId ? 'pointer' : 'not-allowed', borderColor: isSelected ? 'var(--primary)' : undefined }}
                        onClick={() => {
                          setSelectedCandidate(candidate)
                          setCreateErr('')
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{candidateLabel}</div>
                          <div className="meta">{candidate.location || candidate.email || 'Candidate'}</div>
                        </div>
                        <span className={`badge ${isSelected ? '' : 'muted'}`}>{isSelected ? 'Selected' : 'Choose'}</span>
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {!searchBusy && hasCandidateSearched && candidateResults.length === 0 && !searchErr ? (
                <div className="empty" style={{ marginTop: 12 }}>No matching candidates yet.</div>
              ) : null}

              <form className="form" onSubmit={startConversation} style={{ marginTop: 12 }}>
                {selectedCandidate ? (
                  <div className="alert info">Starting a conversation with {getCandidateName(selectedCandidate)}.</div>
                ) : (
                  <div className="empty">Choose a candidate from the search results first.</div>
                )}
                <button className="btn btn-primary" disabled={createBusy || !selectedCandidate?.userId} type="submit">
                  {createBusy ? 'Creating…' : 'Start'}
                </button>
                {createErr ? <div className="alert error">{createErr}</div> : null}
              </form>
            </>
          )}

          <div className="divider" />
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title" style={{ fontSize: '1rem' }}>Conversations</div>
            <button
              className="btn btn-ghost btn-sm"
              disabled={conversationListBusy || !me || !token}
              onClick={loadParticipantConversations}
              type="button"
            >
              {conversationListBusy ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          {conversationListErr ? <div className="alert error">{conversationListErr}</div> : null}
          {conversationListBusy && savedList.length === 0 ? (
            <div className="empty">Checking your conversations...</div>
          ) : savedList.length === 0 ? (
            <div className="empty">No conversations found for your account.</div>
          ) : (
            <div className="list">
              {savedList.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`list-item ${activeId === c.id ? '' : ''}`}
                  style={{ cursor: 'pointer', borderColor: activeId === c.id ? 'var(--primary)' : undefined }}
                  onClick={() => setActiveId(c.id)}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{getConversationTitle(c)}</div>
                    {c.createdAt ? <div className="meta">Started {new Date(c.createdAt).toLocaleDateString()}</div> : null}
                  </div>
                  <span className="badge muted">Open</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">{activeId ? activeConversationTitle : 'Pick or start a conversation'}</div>
          {error ? <div className="alert error" style={{ marginBottom: 10 }}>{error}</div> : null}
          {activeId ? (
            <>
              <div className="chat">
                <div className="chat-messages">
                  {busy ? <div className="muted">Loading…</div> : null}
                  {!busy && messages.length === 0 ? <div className="muted">No messages yet. Say hi!</div> : null}
                  {messages.map((m) => (
                    <div key={m.id} className={`chat-bubble ${m.senderId === me ? 'mine' : ''}`}>
                      <div className="who">{m.senderId === me ? 'You' : activeConversationTitle}</div>
                      {m.content ?? m.body}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <form className="chat-input" onSubmit={sendMessage}>
                  <input className="input" placeholder="Write a message…" value={draft} onChange={(e) => setDraft(e.target.value)} />
                  <button className="btn btn-primary" disabled={sendBusy || !draft.trim()} type="submit">
                    {sendBusy ? '…' : 'Send'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="empty">Start a new conversation or open one from the list.</div>
          )}
        </div>
      </div>
    </>
  )
}
