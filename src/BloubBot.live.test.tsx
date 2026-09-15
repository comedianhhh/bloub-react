// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BloubBot } from './BloubBot'
import { makeBlock } from './bot/cycles'

// The animation loop is driven by requestAnimationFrame. Stub it with a queue
// we advance by hand, so the test controls the scene clock exactly.
let queue: FrameRequestCallback[] = []
let now = 0
function advance(ms: number, step = 16) {
  for (let t = 0; t < ms; t += step) {
    now += step
    const cbs = queue
    queue = []
    for (const cb of cbs) cb(now)
  }
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  queue = []
  now = 0
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    queue.push(cb)
    return queue.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})

const bodyPath = () => container.querySelector('mask path')?.getAttribute('d')
const gradients = () => container.querySelectorAll('linearGradient').length

describe('BloubBot live loop', () => {
  it('advances the frame on each animation frame', () => {
    act(() => root.render(<BloubBot state="thinking" size={48} />))
    const before = bodyPath()
    act(() => advance(500))
    expect(bodyPath()).not.toBe(before)
  })

  it('morphs to the new state when the prop changes', () => {
    act(() => root.render(<BloubBot state="idle" size={48} />))
    act(() => advance(200))
    expect(gradients()).toBe(0)
    act(() => root.render(<BloubBot state="orbit" size={48} />))
    act(() => advance(1000))
    // orbit draws its rings with per-arc gradients
    expect(gradients()).toBeGreaterThan(0)
  })

  it('plays a montage and reports each block', () => {
    const seen: string[] = []
    const cycle = [makeBlock('idle'), makeBlock('wink')]
    cycle[0]!.duration = 0.7
    cycle[1]!.duration = 0.7
    act(() => root.render(<BloubBot cycle={cycle} onStateChange={(s) => seen.push(s)} />))
    act(() => advance(2000))
    expect(seen.slice(0, 3)).toEqual(['idle', 'wink', 'idle'])
  })

  it('does not start a loop when frozen', () => {
    act(() => root.render(<BloubBot state="wide" frozenAt={0.5} />))
    expect(queue.length).toBe(0)
  })
})
