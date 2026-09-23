// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AssistantMarkdown, localPathMediaUrl } from '../src/client/chat/AssistantMarkdown.tsx'
import { collectLocalPathImages } from '../src/client/chat/local-path-images.tsx'
import type { ChatNodeOwnerProps, ChatViewSlotProps } from '../src/client/contract/slots.ts'
import type { AssistantBlock } from '../src/client/contract/snapshot.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const t = ((_key: string) => 'label') as unknown as ChatViewSlotProps['t']
const renderMessageImages = (() => null) as unknown as ChatNodeOwnerProps['renderMessageImages']

function textBlock(text: string): AssistantBlock {
  return { kind: 'text', text }
}

const ORIGIN = 'http://127.0.0.1:3080'

describe('localPathMediaUrl', () => {
  it('maps an absolute POSIX path on an HTTP page to the file API', () => {
    expect(localPathMediaUrl('http:', ORIGIN, '/tmp/graph.png'))
      .toBe(`${ORIGIN}/api/file?path=${encodeURIComponent('/tmp/graph.png')}`)
    expect(localPathMediaUrl('https:', 'https://127.0.0.1:3080', '/tmp/graph.png'))
      .toBe(`https://127.0.0.1:3080/api/file?path=${encodeURIComponent('/tmp/graph.png')}`)
  })

  it('keeps non-HTTP transports inert', () => {
    expect(localPathMediaUrl('file:', 'file:///app', '/tmp/graph.png')).toBeUndefined()
    expect(localPathMediaUrl('ws:', ORIGIN, '/tmp/graph.png')).toBeUndefined()
  })

  it('keeps destinations that cannot be Host-served local files inert and accepts Windows drives', () => {
    expect(localPathMediaUrl('http:', ORIGIN, '')).toBeUndefined()
    expect(localPathMediaUrl('http:', ORIGIN, '//cdn.example.com/x.png')).toBeUndefined()
    expect(localPathMediaUrl('http:', ORIGIN, 'relative.png')).toBeUndefined()
    expect(localPathMediaUrl('http:', ORIGIN, 'C:\\tmp\\x.png'))
      .toBe(`${ORIGIN}/api/file?path=${encodeURIComponent('C:\\tmp\\x.png')}`)
  })

  it('encodes the full path including spaces', () => {
    expect(localPathMediaUrl('http:', ORIGIN, '/tmp/my graph.png'))
      .toBe(`${ORIGIN}/api/file?path=${encodeURIComponent('/tmp/my graph.png')}`)
  })
})

describe('collectLocalPathImages', () => {
  it('collects links, file mentions, plain paths, relative paths, SVG, and de-duplicates in order', () => {
    const images = collectLocalPathImages([
      textBlock([
        '[map](results/map.png)',
        '`/tmp/chart.jpeg`',
        '/tmp/chart.jpeg',
        'C:\\work\\diagram.svg',
        'poster.webp',
      ].join('\n')),
    ], '/workspace', 'http:', ORIGIN)
    expect(images).toEqual([
      { path: '/workspace/results/map.png', url: `${ORIGIN}/api/file?path=${encodeURIComponent('/workspace/results/map.png')}` },
      { path: '/tmp/chart.jpeg', url: `${ORIGIN}/api/file?path=${encodeURIComponent('/tmp/chart.jpeg')}` },
      { path: 'C:\\work\\diagram.svg', url: `${ORIGIN}/api/file?path=${encodeURIComponent('C:\\work\\diagram.svg')}` },
      { path: '/workspace/poster.webp', url: `${ORIGIN}/api/file?path=${encodeURIComponent('/workspace/poster.webp')}` },
    ])
  })

  it('ignores fenced examples, remote URLs, and Markdown images already rendered in place', () => {
    const images = collectLocalPathImages([
      textBlock([
        '```text',
        '/tmp/example.png',
        '```',
        '![already shown](/tmp/inline.png)',
        'https://example.com/remote.png',
      ].join('\n')),
    ], '/workspace', 'http:', ORIGIN)
    expect(images).toEqual([])
  })
})

describe('AssistantMarkdown local-path images', () => {
  it('renders a local image path in closing prose through the same-origin API', () => {
    const { container } = render(
      <AssistantMarkdown
        blocks={[textBlock('See ![diagram](/tmp/graph.png) for the layout.')]}
        streaming={false}
        renderMessageImages={renderMessageImages}
        t={t}
      />,
    )
    const image = container.querySelector('img')
    expect(image?.getAttribute('alt')).toBe('diagram')
    const url = new URL(image?.getAttribute('src') ?? '')
    expect(url.pathname).toBe('/api/file')
    expect(url.searchParams.get('path')).toBe('/tmp/graph.png')
  })

  it('keeps non-absolute destinations inert', () => {
    const { container } = render(
      <AssistantMarkdown
        blocks={[textBlock('See ![diagram](relative.png).')]}
        streaming={false}
        renderMessageImages={renderMessageImages}
        t={t}
      />,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('diagram')
  })

  it('validates a plain local path and appends an expanded preview gallery', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {
      status: 200,
      headers: { 'content-type': 'image/png' },
    })))
    const calls: Array<Parameters<ChatNodeOwnerProps['renderMessageImages']>[0]> = []
    const openFile = vi.fn()
    const revealFile = vi.fn()
    render(
      <AssistantMarkdown
        blocks={[textBlock('Saved to `/tmp/result.png`.')]}
        streaming={false}
        cwd="/workspace"
        openFile={openFile}
        revealFile={revealFile}
        renderMessageImages={(owner) => {
          calls.push(owner)
          return <div data-testid="local-gallery" />
        }}
        t={t}
      />,
    )
    await waitFor(() => { expect(calls.at(-1)?.expanded).toBe(true) })
    const preview = calls.at(-1)?.images[0]
    if (preview === undefined || !('preview' in preview)) throw new Error('expected preview')
    expect(preview.preview.name).toBe('result.png')
    expect(preview.preview.actions?.map(action => action.label)).toEqual(['label', 'label'])
    preview.preview.actions?.[0]?.onSelect()
    preview.preview.actions?.[1]?.onSelect()
    expect(openFile).toHaveBeenCalledWith('/tmp/result.png')
    expect(revealFile).toHaveBeenCalledWith('/tmp/result.png')
  })
})
