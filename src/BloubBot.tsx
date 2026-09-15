import {
  type CSSProperties,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState
} from 'react'
import type { Block } from './bot/cycles'
import { NOTIF_BLUE, type DotRender } from './bot/decor'
import { BotEngine, type BotFrame } from './bot/engine'
import { DEFAULT_EXPRESSION, EXPRESSION_BY_ID } from './bot/expressions'
import { lookTarget, TURN_TIME, type GazeScript } from './bot/gaze'
import { clamp, easings } from './bot/math'
import { DEMI_VIEWBOX, RAYON } from './bot/repere'
import { COLOR_BY_ID, DEFAULT_COLOR, DEFAULT_SHAPE, mixHex, SHAPE_BY_ID } from './bot/skins'
import { STATE_BY_ID, type StateId } from './bot/states'

export interface BloubBotProps {
  /** Rendered width and height in px. */
  size?: number
  /**
   * Catalogue state to show. Changing it morphs the bot over the state's own
   * `morph` duration. Ignored while `cycle` is set.
   */
  state?: StateId
  /** Body shape id from the customiser (`cercle`, `galet`, `squircle`, ...). */
  shape?: string
  /** Ink colour: a customiser id (`encre`, `bleu`, `rose`, ...) or any CSS hex like `#8B5CF6`. */
  color?: string
  /** Rest expression id (`neutre`, `heureux`, `curieux`, ...). Only visible on `idle`. */
  expression?: string
  /** Page background. Backs the eye holes and fades the burst particles. */
  paper?: string
  /**
   * Freeze the render at this many seconds into the current state. No animation
   * loop runs: the engine is a pure function of time, so this is a reproducible
   * still (thumbnails, state boards, tests).
   */
  frozenAt?: number
  /**
   * Montage: a list of states, each held for its block duration, looped. When
   * given, playback drives the state and `state` is ignored.
   */
  cycle?: Block[]
  /** Whether the montage advances. Default true when `cycle` is set. */
  playing?: boolean
  /** Reports the state the montage is currently showing. */
  onStateChange?: (state: StateId, blockIndex: number) => void
  /** The gaze follows the pointer on rest-face states. */
  follow?: boolean
  /** Scripted gaze, evaluated with the seconds elapsed since it was set. */
  gaze?: GazeScript | null
  className?: string
  style?: CSSProperties
  /** Accessible name for the SVG. */
  label?: string
}

const R = RAYON
const VB = DEMI_VIEWBOX

/** A palette id, or a raw hex colour passed straight through. */
export function inkFor(color: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color
  return COLOR_BY_ID.get(color)?.hex ?? '#0a0a0c'
}
/** Short catch-up so a gaze script owns the eyes from its first frame (never zero: NaN). */
const SCRIPT_MORPH = 1 / 60

export function BloubBot({
  size = 320,
  state = 'idle',
  shape = DEFAULT_SHAPE,
  color = DEFAULT_COLOR,
  expression = DEFAULT_EXPRESSION,
  paper = '#f9f9f9',
  frozenAt,
  cycle,
  playing,
  onStateChange,
  follow = false,
  gaze = null,
  className,
  style,
  label = 'Bot avatar'
}: BloubBotProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const maskId = `bloub-mask-${uid}`
  const shapeRadii = SHAPE_BY_ID.get(shape)?.radii ?? null
  const ink = inkFor(color)
  const expressionDef = EXPRESSION_BY_ID.get(expression) ?? null
  const frozen = frozenAt !== undefined
  const montage = cycle !== undefined
  const isPlaying = montage && (playing ?? true)
  const initialState = montage ? (cycle[0]?.state ?? 'idle') : state

  // One engine per mounted component. Created lazily so React strict mode does
  // not build two.
  const engineRef = useRef<BotEngine | null>(null)
  if (engineRef.current === null) {
    engineRef.current = new BotEngine(R, initialState, shapeRadii, expressionDef)
  }
  const engine = engineRef.current

  const [frame, setFrame] = useState<BotFrame>(() => engine.sample(frozenAt ?? 0))

  const svgRef = useRef<SVGSVGElement | null>(null)
  // Mutable scene clock and playback bookkeeping. None of it is render state.
  const clockRef = useRef(0)
  const blockRef = useRef(0)
  const blockStartRef = useRef(0)
  const nextAtRef = useRef(Infinity)
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  const aimingRef = useRef(false)
  const turnSinceRef = useRef(0)
  const gazeSinceRef = useRef(0)
  const scriptedRef = useRef(false)
  const onStateChangeRef = useRef(onStateChange)
  onStateChangeRef.current = onStateChange

  const redrawFrozen = useCallback(() => {
    if (frozenAt === undefined) return
    setFrame(engine.sample(frozenAt))
  }, [engine, frozenAt])

  /* ------------------------------------------------ props -> engine */

  // Direct state control (no montage).
  useLayoutEffect(() => {
    if (montage) return
    if (engine.state === state) return
    engine.setState(state, clockRef.current)
    redrawFrozen()
  }, [engine, montage, state, redrawFrozen])

  useLayoutEffect(() => {
    engine.setShape(shapeRadii, clockRef.current)
    redrawFrozen()
    // radii arrays are stable per shape id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, shape, redrawFrozen])

  useLayoutEffect(() => {
    engine.setExpression(expressionDef, clockRef.current)
    redrawFrozen()
  }, [engine, expressionDef, redrawFrozen])

  useLayoutEffect(redrawFrozen, [redrawFrozen])

  // Scripted gaze: set on arrival, released when the script goes away.
  useLayoutEffect(() => {
    if (frozen) return
    if (gaze) {
      gazeSinceRef.current = clockRef.current
      scriptedRef.current = true
      engine.setLook(gaze(0), clockRef.current - SCRIPT_MORPH, SCRIPT_MORPH)
      return
    }
    if (!scriptedRef.current) return
    engine.setLook(null, clockRef.current)
    scriptedRef.current = false
  }, [engine, gaze, frozen])

  /* ------------------------------------------------ montage playback */

  const applyBlock = useCallback(
    (i: number, from = 0) => {
      const b = cycle?.[i]
      if (!b) {
        nextAtRef.current = Infinity
        return
      }
      blockRef.current = i
      blockStartRef.current = clockRef.current - from
      engine.setState(b.state, clockRef.current)
      nextAtRef.current = isPlaying ? blockStartRef.current + b.duration : Infinity
      onStateChangeRef.current?.(b.state, i)
    },
    [cycle, engine, isPlaying]
  )

  // The montage changed under our feet (new cycle, block removed, resumed).
  useLayoutEffect(() => {
    if (!montage || frozen) return
    const i = Math.min(blockRef.current, cycle.length - 1)
    if (i < 0) {
      nextAtRef.current = Infinity
      return
    }
    if (i !== blockRef.current) {
      applyBlock(i)
      return
    }
    const elapsed = clockRef.current - blockStartRef.current
    const b = cycle[i]!
    if (engine.state !== b.state) applyBlock(i, 0)
    else nextAtRef.current = isPlaying ? blockStartRef.current + Math.max(b.duration, elapsed) : Infinity
  }, [montage, frozen, cycle, isPlaying, applyBlock, engine])

  /* ------------------------------------------------ pointer follow */

  const release = useCallback(() => {
    if (!aimingRef.current) return
    engine.setLook(null, clockRef.current, TURN_TIME)
    aimingRef.current = false
  }, [engine])

  const aim = useCallback(() => {
    // Only rest-face states take a gaze; elsewhere the gaze IS the animation.
    if (!STATE_BY_ID.get(engine.state)?.baseFace) {
      release()
      return
    }
    const box = svgRef.current?.getBoundingClientRect()
    // A hidden panel reports zeros; a NaN target would stick in the engine forever.
    if (!box || box.width === 0 || box.height === 0) return
    if (!aimingRef.current) turnSinceRef.current = clockRef.current
    const halfW = Math.max(1, window.innerWidth / 2)
    const halfH = Math.max(1, window.innerHeight / 2)
    const p = pointerRef.current
    engine.setLook(
      lookTarget({
        nx: p ? clamp((p.x - (box.left + box.width / 2)) / halfW, -1, 1) : 0,
        ny: p ? clamp((p.y - (box.top + box.height / 2)) / halfH, -1, 1) : 0,
        tour: easings.easeOutQuint(clamp((clockRef.current - turnSinceRef.current) / TURN_TIME)),
        pointer: p !== null
      }),
      clockRef.current
    )
    aimingRef.current = true
  }, [engine, release])

  useEffect(() => {
    if (!follow || frozen) {
      release()
      return
    }
    const onMove = (event: PointerEvent) => {
      // A lifted finger would leave the gaze stuck on the last touch point.
      if (event.pointerType === 'touch') return
      pointerRef.current = { x: event.clientX, y: event.clientY }
    }
    const onLeave = () => {
      pointerRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    document.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      release()
    }
  }, [follow, frozen, release])

  /* ------------------------------------------------ animation loop */

  const followRef = useRef(follow)
  followRef.current = follow
  const gazeRef = useRef(gaze)
  gazeRef.current = gaze
  const cycleRef = useRef(cycle)
  cycleRef.current = cycle
  const playingRef = useRef(isPlaying)
  playingRef.current = isPlaying
  const applyBlockRef = useRef(applyBlock)
  applyBlockRef.current = applyBlock

  useEffect(() => {
    if (frozen) return
    let raf = 0
    let last = 0
    const tick = (ms: number) => {
      raf = requestAnimationFrame(tick)
      // Bounded delta: a tab shown again after being hidden resumes without a jump.
      const dt = last ? Math.min((ms - last) / 1000, 0.064) : 0
      last = ms
      clockRef.current += dt
      const clock = clockRef.current

      const blocks = cycleRef.current
      if (blocks && playingRef.current && blocks.length && clock >= nextAtRef.current) {
        applyBlockRef.current((blockRef.current + 1) % blocks.length)
      }

      if (followRef.current) aim()
      else if (gazeRef.current) {
        engine.setLook(gazeRef.current(clock - gazeSinceRef.current), clock, SCRIPT_MORPH)
      }

      setFrame(engine.sample(clock))
    }
    if (cycleRef.current) applyBlockRef.current(blockRef.current)
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [engine, frozen, aim])

  /* ------------------------------------------------ render */

  const dotProps = (dot: DotRender) => {
    const fill = dot.color ?? (dot.depth === undefined ? ink : mixHex(paper, ink, dot.depth))
    return { fill, opacity: dot.opacity }
  }
  const renderDots = (prefix: string) =>
    frame.dots.map((dot, i) =>
      dot.d ? (
        <path
          key={`${prefix}${i}`}
          {...dotProps(dot)}
          d={dot.d}
          transform={`translate(${dot.x} ${dot.y}) rotate(${dot.rot ?? 0}) scale(${R})`}
        />
      ) : (
        <circle key={`${prefix}${i}`} {...dotProps(dot)} cx={dot.x} cy={dot.y} r={dot.r} />
      )
    )

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`${-VB} ${-VB} ${VB * 2} ${VB * 2}`}
      role="img"
      aria-label={label}
      className={className}
      style={style}
    >
      <defs>
        {/* The eyes are holes in the body, so they clip themselves at the silhouette. */}
        <mask id={maskId} maskUnits="userSpaceOnUse" x={-VB} y={-VB} width={VB * 2} height={VB * 2}>
          <path d={frame.bodyPath} fill="#fff" />
          {frame.eyes.map((eye, i) => (
            <path key={i} d={eye.d} transform={eye.matrix} opacity={eye.alpha} fill="#000" />
          ))}
          {frame.notch && <circle cx={frame.notch.x} cy={frame.notch.y} r={frame.notch.r} fill="#000" />}
        </mask>
        {frame.arcs.map((arc) => (
          <linearGradient
            key={arc.id}
            id={`${uid}-${arc.id}`}
            gradientUnits="userSpaceOnUse"
            x1={arc.grad.x1}
            y1={arc.grad.y1}
            x2={arc.grad.x2}
            y2={arc.grad.y2}
          >
            {arc.grad.stops.map((c, i) => (
              <stop key={i} offset={i / (arc.grad.stops.length - 1)} stopColor={c} />
            ))}
          </linearGradient>
        ))}
      </defs>

      {/* Back half of the rings: drawn before the body so it occludes them. */}
      <g fill="none" strokeLinecap="round">
        {frame.arcs.map((arc) => (
          <path
            key={`b${arc.id}`}
            d={arc.back}
            stroke={`url(#${uid}-${arc.id})`}
            strokeWidth={arc.width}
            opacity={arc.opacity}
          />
        ))}
      </g>

      {frame.dotsBehind && <g>{renderDots('pb')}</g>}

      <g opacity={frame.bodyAlpha}>
        {/* Opaque paper backing: a hole shows what is behind, and the back rings are. */}
        <path d={frame.bodyPath} fill={paper} />
        <g mask={`url(#${maskId})`}>
          <rect x={-VB} y={-VB} width={VB * 2} height={VB * 2} fill={ink} />
        </g>
      </g>

      {!frame.dotsBehind && <g>{renderDots('pf')}</g>}

      {frame.notif && <circle cx={frame.notif.x} cy={frame.notif.y} r={frame.notif.r} fill={NOTIF_BLUE} />}

      <g fill="none" strokeLinecap="round">
        {frame.arcs.map((arc) => (
          <path
            key={`f${arc.id}`}
            d={arc.front}
            stroke={`url(#${uid}-${arc.id})`}
            strokeWidth={arc.width}
            opacity={arc.opacity}
          />
        ))}
      </g>
    </svg>
  )
}

