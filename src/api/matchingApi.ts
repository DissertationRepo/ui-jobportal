import { request } from './http'

export type SimilarityRequest = {
  sentence: string
  sentences: string[]
}

export type SimilarityResult = {
  sentence: string
  cosineSimilarity: number
}

export type SimilarityResponse = {
  sentence: string
  model?: string
  embeddingDimension?: number
  bestMatch?: SimilarityResult | null
  results: SimilarityResult[]
}

type SimilarityResultWire = {
  sentence?: string
  Sentence?: string
  cosineSimilarity?: number
  CosineSimilarity?: number
}

type SimilarityResponseWire = {
  sentence?: string
  Sentence?: string
  model?: string
  Model?: string
  embeddingDimension?: number
  EmbeddingDimension?: number
  bestMatch?: SimilarityResultWire | null
  BestMatch?: SimilarityResultWire | null
  results?: SimilarityResultWire[]
  Results?: SimilarityResultWire[]
}

function normalizeResult(result?: SimilarityResultWire | null): SimilarityResult | null {
  if (!result) return null

  const sentence = result.sentence ?? result.Sentence ?? ''
  const cosineSimilarity = result.cosineSimilarity ?? result.CosineSimilarity ?? 0
  if (!sentence) return null

  return { sentence, cosineSimilarity }
}

function normalizeResponse(response: SimilarityResponseWire): SimilarityResponse {
  const results = (response.results ?? response.Results ?? [])
    .map(normalizeResult)
    .filter((result): result is SimilarityResult => result !== null)

  return {
    sentence: response.sentence ?? response.Sentence ?? '',
    model: response.model ?? response.Model,
    embeddingDimension: response.embeddingDimension ?? response.EmbeddingDimension,
    bestMatch: normalizeResult(response.bestMatch ?? response.BestMatch),
    results,
  }
}

export const matchingApi = {
  calculateSimilarity: async (body: SimilarityRequest, token: string) => {
    const response = await request<SimilarityResponseWire>('/flow/matching/similarity', {
      method: 'POST',
      body,
      token,
    })
    return normalizeResponse(response)
  },
}
