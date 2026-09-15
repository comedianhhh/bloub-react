import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BloubBot } from './BloubBot'
import { BotEngine } from './bot/engine'
import { RAYON } from './bot/repere'
import { SEQUENCE } from './bot/states'
import { stateForActivity } from './activity'

// `frozenAt` renders one exact frame with no animation loop, so the component
// can be checked without a DOM: the markup must carry the same body path the
// engine produces for that date.
describe('BloubBot frozen render', () => {
  it('renders the engine frame for the requested state and date', () => {
    const html = renderToStaticMarkup(<BloubBot state="wide" frozenAt={0.8} size={64} />)
    const expected = new BotEngine(RAYON, 'wide', null, null).sample(0.8)
    expect(html).toContain('<svg')
    expect(html).toContain(`d="${expected.bodyPath}"`)
    expect(html).toContain('width="64"')
  })

  it('renders every catalogue state without throwing', () => {
    for (const id of SEQUENCE) {
      const html = renderToStaticMarkup(<BloubBot state={id} frozenAt={0.5} />)
      expect(html).toContain('<svg')
    }
  })

  it('draws the notification pastille on notify', () => {
    const html = renderToStaticMarkup(<BloubBot state="notify" frozenAt={1} />)
    expect(html).toContain('#2496e8')
  })

  it('uses the chosen ink colour', () => {
    const html = renderToStaticMarkup(<BloubBot color="bleu" frozenAt={0} />)
    expect(html).not.toContain('fill="#0a0a0c"')
  })
})

describe('stateForActivity', () => {
  it('maps agent activity onto catalogue states', () => {
    expect(stateForActivity('thinking')).toBe('thinking')
    expect(stateForActivity('working')).toBe('orbit')
    expect(stateForActivity('needs-input')).toBe('notify')
  })
})

describe('raw hex colours', () => {
  it('uses a hex colour verbatim', () => {
    const html = renderToStaticMarkup(<BloubBot color="#8B5CF6" frozenAt={0} />)
    expect(html).toContain('fill="#8B5CF6"')
  })
})
