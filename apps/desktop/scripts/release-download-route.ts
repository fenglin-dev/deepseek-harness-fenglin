/** Select one explicit download route. System-proxy adoption happens at the release shell boundary. */
export function releaseDownloadProxy(environment: NodeJS.ProcessEnv = process.env): string | undefined {
  for (const name of ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy']) {
    const value = environment[name]?.trim()
    if (value !== undefined && value !== '') return value
  }
  return undefined
}

export function curlProxyArguments(environment: NodeJS.ProcessEnv = process.env): string[] {
  const proxy = releaseDownloadProxy(environment)
  return proxy === undefined ? [] : ['--proxy', proxy]
}
