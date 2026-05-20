import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../state/AuthContext'
import { candidateApi } from '../api/candidateApi'
import type {
  CandidateExperience,
  CandidateProfile,
  CandidateSkill,
} from '../api/candidateApi'
import { jobApi } from '../api/jobApi'
import type { JobResponse } from '../api/jobApi'
import { matchingApi } from '../api/matchingApi'
import type { SimilarityResult } from '../api/matchingApi'
import { ApiError } from '../api/http'

const SIMILARITY_THRESHOLD = 0.7

type CandidateMatchInput = {
  candidate: CandidateProfile
  skills: CandidateSkill[]
  experiences: CandidateExperience[]
  sentence: string
}

type JobMatchInput = {
  job: JobResponse
  sentence: string
}

type MatchItem =
  | {
      kind: 'job'
      title: string
      meta: string
      description: string
      score: number
      job: JobResponse
    }
  | {
      kind: 'candidate'
      title: string
      meta: string
      description: string
      score: number
      skills: CandidateSkill[]
      experiences: CandidateExperience[]
      candidate: CandidateProfile
    }

function compactText(parts: Array<string | number | null | undefined>) {
  return parts
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join('. ')
}

function formatSalary(job: JobResponse) {
  const hasMin = typeof job.salaryMin === 'number'
  const hasMax = typeof job.salaryMax === 'number'
  if (!hasMin && !hasMax) return ''

  const formatNumber = (value: number) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)
  const range =
    hasMin && hasMax
      ? `${formatNumber(job.salaryMin ?? 0)}-${formatNumber(job.salaryMax ?? 0)}`
      : hasMin
        ? `From ${formatNumber(job.salaryMin ?? 0)}`
        : `Up to ${formatNumber(job.salaryMax ?? 0)}`

  return `${range} ${job.currency ?? ''}`.trim()
}

function formatScore(score: number) {
  return `${Math.round(score * 100)}% match`
}

function getJobTitle(job: JobResponse) {
  return job.jobTitle?.trim() || 'Untitled job'
}

function getCandidateName(candidate?: CandidateProfile | null) {
  if (!candidate) return 'Candidate'
  const fullName = [candidate.firstName, candidate.lastName].filter(Boolean).join(' ').trim()
  return fullName || candidate.email || 'Candidate'
}

function buildJobSentence(job: JobResponse) {
  const requiredSkill = compactText([
    job.requiredSkillName ? `Required skill: ${job.requiredSkillName}` : '',
    job.requiredSkillLevel ? `Skill level: ${job.requiredSkillLevel}` : '',
  ])

  return compactText([
    job.jobTitle,
    job.jobDescription,
    job.location ? `Location: ${job.location}` : '',
    job.employmentType ? `Employment type: ${job.employmentType}` : '',
    job.seniorityLevel ? `Seniority: ${job.seniorityLevel}` : '',
    requiredSkill,
    formatSalary(job),
  ])
}

function buildCandidateSentence(
  candidate: CandidateProfile,
  skills: CandidateSkill[] = [],
  experiences: CandidateExperience[] = []
) {
  const skillsText = skills.length
    ? `Skills: ${skills
        .map((skill) =>
          compactText([
            skill.name,
            skill.skillLevel,
            skill.yearsOfExperience ? `${skill.yearsOfExperience} years` : '',
          ])
        )
        .join('; ')}`
    : ''

  const experienceText = experiences.length
    ? `Experience: ${experiences
        .map((experience) =>
          compactText([
            experience.position,
            experience.company,
            experience.description,
          ])
        )
        .join('; ')}`
    : ''

  return compactText([
    candidate.summary,
    candidate.location ? `Location: ${candidate.location}` : '',
    skillsText,
    experienceText,
  ])
}

function makeSentenceBuckets<T>(items: Array<{ sentence: string; item: T }>) {
  const buckets = new Map<string, T[]>()

  for (const { sentence, item } of items) {
    const key = sentence.trim()
    buckets.set(key, [...(buckets.get(key) ?? []), item])
  }

  return buckets
}

function takeMatchedItem<T>(buckets: Map<string, T[]>, result: SimilarityResult) {
  const items = buckets.get(result.sentence.trim())
  if (!items?.length) return null

  const [item, ...remaining] = items
  buckets.set(result.sentence.trim(), remaining)
  return item
}

function statusMessage(count: number, target: 'jobs' | 'candidates') {
  if (count === 0) return `No ${target} were above 70% similarity.`
  return `${count} ${target} above 70% similarity.`
}

export function MatchingPage() {
  const { session } = useAuth()
  const token = session?.accessToken ?? ''
  const isEmp = session?.role === 'Employer'

  const [employerJobs, setEmployerJobs] = useState<JobResponse[]>([])
  const [selectedJobId, setSelectedJobId] = useState('')
  const [jobsBusy, setJobsBusy] = useState(false)
  const [jobSearchQuery, setJobSearchQuery] = useState('')
  const [jobSearchResults, setJobSearchResults] = useState<JobResponse[]>([])
  const [hasJobSearched, setHasJobSearched] = useState(false)
  const [jobSearchBusy, setJobSearchBusy] = useState(false)
  const [jobSearchError, setJobSearchError] = useState('')
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('')
  const [candidateSearchResults, setCandidateSearchResults] = useState<CandidateProfile[]>([])
  const [hasCandidateSearched, setHasCandidateSearched] = useState(false)
  const [candidateSearchBusy, setCandidateSearchBusy] = useState(false)
  const [candidateSearchError, setCandidateSearchError] = useState('')
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const searchJobsForMatching = async (e: FormEvent) => {
    e.preventDefault()
    const query = jobSearchQuery.trim()
    if (!query) return

    setJobSearchBusy(true)
    setJobSearchError('')
    setError('')
    setNote('')
    setMatches([])
    setJobSearchResults([])
    setHasJobSearched(true)
    try {
      const jobs = await jobApi.search(query, token)
      setJobSearchResults(jobs)
      if (jobs.length === 0) {
        setNote('No jobs matched your search.')
      } else {
        setNote(`${jobs.length} jobs found. Compute matches to compare them with your profile.`)
      }
    } catch (err) {
      setJobSearchError(err instanceof ApiError ? err.message : 'Could not search jobs.')
    } finally {
      setJobSearchBusy(false)
    }
  }

  const searchCandidatesForMatching = async (e: FormEvent) => {
    e.preventDefault()
    const query = candidateSearchQuery.trim()
    if (!query) return

    setCandidateSearchBusy(true)
    setCandidateSearchError('')
    setError('')
    setNote('')
    setMatches([])
    setCandidateSearchResults([])
    setHasCandidateSearched(true)
    try {
      const candidates = await candidateApi.searchByDescription(query, token)
      setCandidateSearchResults(candidates)
      if (candidates.length === 0) {
        setNote('No candidates matched those qualities.')
      } else {
        setNote(`${candidates.length} candidates found. Compute matches to compare them with the selected job.`)
      }
    } catch (err) {
      setCandidateSearchError(err instanceof ApiError ? err.message : 'Could not search candidates.')
    } finally {
      setCandidateSearchBusy(false)
    }
  }

  const loadCandidateMatches = useCallback(async () => {
    if (!session?.userId || !token) return
    if (jobSearchResults.length === 0) {
      setMatches([])
      setNote('Search for jobs first, then compute matches.')
      return
    }

    setBusy(true)
    setError('')
    setNote('')
    try {
      const [candidate, skillsResult, experiencesResult] = await Promise.all([
        candidateApi.getById(session.userId, token),
        candidateApi.getSkills(session.userId, token).catch(() => []),
        candidateApi.getExperiences(session.userId, token).catch(() => []),
      ])

      const candidateSentence = buildCandidateSentence(
        candidate,
        skillsResult,
        experiencesResult
      )
      if (!candidateSentence) {
        setMatches([])
        setNote('Add a profile summary, skills, or experience before computing matches.')
        return
      }

      const jobInputs: JobMatchInput[] = jobSearchResults
        .map((job) => ({ job, sentence: buildJobSentence(job) }))
        .filter((input) => input.sentence)

      if (jobInputs.length === 0) {
        setMatches([])
        setNote('No job descriptions were returned for matching.')
        return
      }

      const response = await matchingApi.calculateSimilarity({
        sentence: candidateSentence,
        sentences: jobInputs.map((input) => input.sentence),
      }, token)

      const buckets = makeSentenceBuckets(
        jobInputs.map((input) => ({ sentence: input.sentence, item: input.job }))
      )
      const nextMatches = response.results
        .filter((result) => result.cosineSimilarity > SIMILARITY_THRESHOLD)
        .map((result): MatchItem | null => {
          const job = takeMatchedItem(buckets, result)
          if (!job) return null

          return {
            kind: 'job',
            title: getJobTitle(job),
            meta: compactText([
              job.location,
              job.employmentType,
              job.seniorityLevel,
            ]).replaceAll('. ', ' - '),
            description: job.jobDescription?.trim() || '',
            score: result.cosineSimilarity,
            job,
          }
        })
        .filter((match): match is MatchItem => match !== null)

      setMatches(nextMatches)
      setNote(statusMessage(nextMatches.length, 'jobs'))
    } catch (err) {
      setMatches([])
      setNote('')
      setError(err instanceof ApiError ? err.message : 'Could not compute job matches.')
    } finally {
      setBusy(false)
    }
  }, [jobSearchResults, session?.userId, token])

  const loadEmployerJobs = useCallback(async () => {
    if (!token) return
    setJobsBusy(true)
    setError('')
    try {
      const jobs = await jobApi.getMine(token)
      setEmployerJobs(jobs)
      setSelectedJobId((current) => {
        if (current && jobs.some((job) => job.id?.trim() === current)) return current
        return jobs.find((job) => job.id?.trim())?.id?.trim() ?? ''
      })
    } catch (err) {
      setEmployerJobs([])
      setSelectedJobId('')
      setError(err instanceof ApiError ? err.message : 'Could not load your jobs.')
    } finally {
      setJobsBusy(false)
    }
  }, [token])

  const buildCandidateInputs = useCallback(async () => {
    const candidates = candidateSearchResults.filter((candidate) => candidate.userId?.trim())
    const candidateInputs = await Promise.all(
      candidates.map(async (searchResult) => {
        const candidateId = searchResult.userId.trim()
        const [candidate, skills, experiences] = await Promise.all([
          candidateApi.getById(candidateId, token).catch(() => searchResult),
          candidateApi.getSkills(candidateId, token).catch(() => []),
          candidateApi.getExperiences(candidateId, token).catch(() => []),
        ])

        return {
          candidate,
          skills,
          experiences,
          sentence: buildCandidateSentence(candidate, skills, experiences),
        }
      })
    )

    return candidateInputs.filter((input) => input.sentence)
  }, [candidateSearchResults, token])

  const loadEmployerMatches = useCallback(async () => {
    const selectedJob = employerJobs.find((job) => job.id?.trim() === selectedJobId)
    if (!selectedJob) return
    if (candidateSearchResults.length === 0) {
      setMatches([])
      setNote('Search for candidates first, then compute matches.')
      return
    }

    const jobSentence = buildJobSentence(selectedJob)
    if (!jobSentence) {
      setMatches([])
      setNote('Add a job description before computing matches.')
      return
    }

    setBusy(true)
    setError('')
    setNote('')
    try {
      const candidateInputs: CandidateMatchInput[] = await buildCandidateInputs()
      if (candidateInputs.length === 0) {
        setMatches([])
        setNote('No candidate descriptions were returned for matching.')
        return
      }

      const response = await matchingApi.calculateSimilarity({
        sentence: jobSentence,
        sentences: candidateInputs.map((input) => input.sentence),
      }, token)

      const buckets = makeSentenceBuckets(
        candidateInputs.map((input) => ({ sentence: input.sentence, item: input }))
      )
      const nextMatches = response.results
        .filter((result) => result.cosineSimilarity > SIMILARITY_THRESHOLD)
        .map((result): MatchItem | null => {
          const input = takeMatchedItem(buckets, result)
          if (!input) return null

          return {
            kind: 'candidate',
            title: getCandidateName(input.candidate),
            meta: input.candidate.location || input.candidate.email || 'Candidate',
            description: input.candidate.summary?.trim() || '',
            score: result.cosineSimilarity,
            skills: input.skills,
            experiences: input.experiences,
            candidate: input.candidate,
          }
        })
        .filter((match): match is MatchItem => match !== null)

      setMatches(nextMatches)
      setNote(statusMessage(nextMatches.length, 'candidates'))
    } catch (err) {
      setMatches([])
      setNote('')
      setError(err instanceof ApiError ? err.message : 'Could not compute candidate matches.')
    } finally {
      setBusy(false)
    }
  }, [buildCandidateInputs, candidateSearchResults.length, employerJobs, selectedJobId, token])

  useEffect(() => {
    if (isEmp) {
      loadEmployerJobs()
    }
  }, [isEmp, loadEmployerJobs])

  const selectableJobs = employerJobs.filter((job) => job.id?.trim())

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{isEmp ? 'Candidate matches' : 'Matching jobs'}</h1>
          <p className="subtitle">
            {isEmp
              ? 'See candidates suggested for one of your job postings.'
              : 'Jobs the matching service recommends for your profile.'}
          </p>
        </div>
      </div>

      {!isEmp ? (
        <div className="card">
          <div className="card-title">Search jobs to match</div>
          <p className="card-sub">Search by title, skill, seniority, or location.</p>
          <form className="form" onSubmit={searchJobsForMatching}>
            <div className="row">
              <input
                className="input"
                placeholder="e.g. React, remote, junior"
                value={jobSearchQuery}
                onChange={(e) => {
                  setJobSearchQuery(e.target.value)
                  setHasJobSearched(false)
                }}
                style={{ flex: 1, minWidth: 240 }}
                required
              />
              <button className="btn btn-ghost" disabled={jobSearchBusy} type="submit">
                {jobSearchBusy ? 'Searching...' : 'Search'}
              </button>
              <button
                className="btn btn-primary"
                disabled={busy || jobSearchBusy || jobSearchResults.length === 0}
                onClick={loadCandidateMatches}
                type="button"
              >
                {busy ? 'Computing...' : 'Compute matches'}
              </button>
            </div>
            {jobSearchError ? <div className="alert error">{jobSearchError}</div> : null}
          </form>

          {jobSearchBusy && jobSearchResults.length === 0 ? (
            <div className="empty" style={{ marginTop: 14 }}>Searching jobs...</div>
          ) : null}

          {!jobSearchBusy && hasJobSearched && !jobSearchError && jobSearchResults.length === 0 ? (
            <div className="empty" style={{ marginTop: 14 }}>No jobs matched your search.</div>
          ) : null}

          {jobSearchResults.length > 0 ? (
            <div className="list" style={{ marginTop: 16 }}>
              {jobSearchResults.map((job, index) => (
                <div className="list-item" key={job.id?.trim() || `${getJobTitle(job)}-${index}`}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{getJobTitle(job)}</div>
                    <div className="meta">
                      {job.location ?? 'No location'} - {job.employmentType ?? 'Employment type not set'}
                      {job.seniorityLevel ? ` - ${job.seniorityLevel}` : ''}
                    </div>
                    {job.jobDescription ? (
                      <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>{job.jobDescription}</p>
                    ) : null}
                    <div className="row" style={{ marginTop: 10 }}>
                      <span className="badge">{formatSalary(job) || 'Salary not set'}</span>
                      {job.requiredSkillName ? (
                        <span className="badge muted">
                          {job.requiredSkillName}
                          {job.requiredSkillLevel ? ` - ${job.requiredSkillLevel}` : ''}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {isEmp ? (
        <div className="card">
          <div className="card-title">Find matches for a job</div>
          <p className="card-sub">Choose one of your job postings, then search candidates by qualities to compare.</p>
          <div className="row">
            <select
              className="select"
              value={selectedJobId}
              onChange={(e) => {
                setSelectedJobId(e.target.value)
                setMatches([])
                setNote('')
              }}
              style={{ flex: 1, minWidth: 240 }}
            >
              <option value="">{jobsBusy ? 'Loading jobs...' : 'Choose a job'}</option>
              {selectableJobs.map((job, index) => (
                <option key={job.id ?? `${getJobTitle(job)}-${index}`} value={job.id?.trim()}>
                  {getJobTitle(job)}
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary"
              onClick={loadEmployerMatches}
              disabled={busy || jobsBusy || candidateSearchBusy || !selectedJobId || candidateSearchResults.length === 0}
            >
              {busy ? 'Loading...' : 'Compute matches'}
            </button>
          </div>
          {!jobsBusy && selectableJobs.length === 0 ? (
            <div className="empty" style={{ marginTop: 12 }}>No posted jobs were returned for your account.</div>
          ) : null}

          <form className="form" onSubmit={searchCandidatesForMatching} style={{ marginTop: 14 }}>
            <div className="row">
              <input
                className="input"
                placeholder="Candidate qualities, skills, or experience"
                value={candidateSearchQuery}
                onChange={(e) => {
                  setCandidateSearchQuery(e.target.value)
                  setHasCandidateSearched(false)
                }}
                style={{ flex: 1, minWidth: 240 }}
                required
              />
              <button className="btn btn-ghost" disabled={candidateSearchBusy} type="submit">
                {candidateSearchBusy ? 'Searching...' : 'Search candidates'}
              </button>
            </div>
            {candidateSearchError ? <div className="alert error">{candidateSearchError}</div> : null}
          </form>

          {candidateSearchBusy && candidateSearchResults.length === 0 ? (
            <div className="empty" style={{ marginTop: 14 }}>Searching candidates...</div>
          ) : null}

          {!candidateSearchBusy && hasCandidateSearched && !candidateSearchError && candidateSearchResults.length === 0 ? (
            <div className="empty" style={{ marginTop: 14 }}>No candidates matched those qualities.</div>
          ) : null}

          {candidateSearchResults.length > 0 ? (
            <div className="list" style={{ marginTop: 16 }}>
              {candidateSearchResults.map((candidate, index) => (
                <div className="list-item" key={candidate.userId?.trim() || `${getCandidateName(candidate)}-${index}`}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{getCandidateName(candidate)}</div>
                    <div className="meta">{candidate.location || candidate.email || 'Candidate'}</div>
                    {candidate.summary ? (
                      <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>{candidate.summary}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <div className="alert error" style={{ marginTop: 14 }}>{error}</div> : null}

      <div className="card">
        <div className="card-title">Results</div>
        {busy && matches.length === 0 ? (
          <div className="empty">Computing matches...</div>
        ) : matches.length === 0 ? (
          <div className="empty">
            {note || 'No matches yet - the matching service has no results.'}
          </div>
        ) : (
          <div className="list">
            {matches.map((match, index) => (
              <div className="list-item" key={`${match.kind}-${match.title}-${index}`}>
                <div>
                  <div style={{ fontWeight: 600 }}>{match.title}</div>
                  {match.meta ? <div className="meta">{match.meta}</div> : null}
                  {match.description ? (
                    <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>{match.description}</p>
                  ) : null}
                  <div className="row" style={{ marginTop: 10 }}>
                    <span className="badge success">{formatScore(match.score)}</span>
                    {match.kind === 'job' && match.job.requiredSkillName ? (
                      <span className="badge muted">
                        {match.job.requiredSkillName}
                        {match.job.requiredSkillLevel ? ` - ${match.job.requiredSkillLevel}` : ''}
                      </span>
                    ) : null}
                    {match.kind === 'candidate' ? (
                      match.skills.slice(0, 4).map((skill) => (
                        <span className="badge muted" key={`${match.title}-${skill.name}-${skill.skillLevel}`}>
                          {skill.name}
                          {skill.skillLevel ? ` - ${skill.skillLevel}` : ''}
                        </span>
                      ))
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {note && matches.length > 0 ? <p className="muted" style={{ marginTop: 8 }}>{note}</p> : null}
      </div>
    </>
  )
}
