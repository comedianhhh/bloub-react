import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  type BotActivity,
  BloubBot,
  COLORS,
  defaultCycle,
  SEQUENCE,
  SHAPES,
  stateForActivity
} from '../src/index'

const ACTIVITIES: BotActivity[] = ['idle', 'thinking', 'working', 'needs-input', 'done', 'error', 'sleeping']

function App() {
  const [activity, setActivity] = useState<BotActivity>('idle')
  const [shape, setShape] = useState('cercle')
  const [color, setColor] = useState('encre')
  const [auto, setAuto] = useState(false)

  // Fake agent run: thinking -> working -> needs-input -> done -> idle
  useEffect(() => {
    if (!auto) return
    const script: BotActivity[] = ['thinking', 'working', 'needs-input', 'working', 'done', 'idle']
    let i = 0
    setActivity(script[0]!)
    const id = setInterval(() => {
      i = (i + 1) % script.length
      setActivity(script[i]!)
    }, 2200)
    return () => clearInterval(id)
  }, [auto])

  return (
    <>
      <h1>bloub-react</h1>
      <p>The bloub engine driven from React. Pick an activity, or let a fake agent run play.</p>

      <div className="chat">
        <BloubBot state={stateForActivity(activity)} shape={shape} color={color} size={48} follow />
        <div>
          <strong>scout-bot</strong>
          <div style={{ color: '#666' }}>{activity}</div>
        </div>
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        {ACTIVITIES.map((a) => (
          <button key={a} data-on={a === activity} onClick={() => { setAuto(false); setActivity(a) }}>
            {a}
          </button>
        ))}
        <button data-on={auto} onClick={() => setAuto((v) => !v)}>
          {auto ? 'stop fake run' : 'play fake run'}
        </button>
      </div>

      <div className="row">
        {SHAPES.map((s) => (
          <button key={s.id} data-on={s.id === shape} onClick={() => setShape(s.id)}>{s.id}</button>
        ))}
      </div>
      <div className="row">
        {COLORS.map((c) => (
          <button
            key={c.id}
            data-on={c.id === color}
            onClick={() => setColor(c.id)}
            style={{ background: c.hex, color: '#fff', borderColor: c.hex }}
          >
            {c.id}
          </button>
        ))}
      </div>

      <h1>Every state, frozen</h1>
      <p>`frozenAt` renders one exact frame with no animation loop.</p>
      <div className="row">
        {SEQUENCE.map((id) => (
          <div className="card" key={id}>
            <BloubBot state={id} frozenAt={1.2} size={80} color={color} shape={shape} />
            <span>{id}</span>
          </div>
        ))}
      </div>

      <h1>Montage</h1>
      <p>The default cycle measured off the video, looping.</p>
      <BloubBot cycle={defaultCycle().blocks} size={200} color={color} shape={shape} />
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
