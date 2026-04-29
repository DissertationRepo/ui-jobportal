export async function postJson<TResponse, TBody extends Record<string, string>>(
  baseUrl: string,
  path: string,
  body: TBody
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return (await response.json()) as TResponse
  }

  return null as TResponse
}

export async function getJson<TResponse>(
  baseUrl: string,
  path: string,
  headers?: HeadersInit
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return (await response.json()) as TResponse
}
