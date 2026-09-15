# bloub-react

React port of [bloub](https://github.com/jeremy-prt/bloub) by Jérémy Perret: the
x.ai bot avatar as **one filled shape morphing through 14 states**, eyes as mask
holes, no animation library. The engine is a pure function of time
(`engine.sample(t)`), so a frame can be frozen, tested or exported without a DOM.

`src/bot/` is bloub's framework-free engine, copied verbatim (MIT, see
`LICENSE.bloub`). This package only adds the React component.

## Install

```bash
pnpm add bloub-react
```

## Use

```tsx
import { BloubBot, stateForActivity } from 'bloub-react'

// Direct state control: changing `state` morphs the bot.
<BloubBot state="orbit" size={48} />

// Map an agent's run status onto a state.
<BloubBot state={stateForActivity(run.isThinking ? 'thinking' : 'working')} size={40} follow />

// One exact frame, no animation loop (thumbnails, tests).
<BloubBot state="notify" frozenAt={1.2} size={80} />

// Montage: play the cycle measured off the reference video.
<BloubBot cycle={defaultCycle().blocks} />
```

Props: `size`, `state`, `shape`, `color`, `expression`, `paper`, `frozenAt`,
`cycle`, `playing`, `onStateChange`, `follow`, `gaze`, `className`, `style`, `label`.

States: `idle` `thinking` `wink` `wide` `alert` `notify` `exclaim` `sleep` `egg`
`hexagon` `play` `orbit` `burst` `comet` `swirl`.

`stateForActivity` maps `idle | thinking | working | needs-input | done | error | sleeping`
onto those states so a chat UI can drive the avatar from its own run status.

## Develop

```bash
pnpm install
pnpm dev      # demo on http://localhost:5191
pnpm test     # vitest, DOM-less
pnpm build    # tsc + vite lib build to dist/
```

## Credits

All the measurements, shapes and states are bloub's. This package changes none
of them; if a constant looks arbitrary, read
[bloub's docs](https://github.com/jeremy-prt/bloub/tree/main/docs) before
"fixing" it. Not affiliated with x.ai.
