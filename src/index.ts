export { BloubBot, type BloubBotProps } from './BloubBot'
export { type BotActivity, stateForActivity } from './activity'

export { BotEngine, type BotFrame, type Look, type RenderedEye } from './bot/engine'
export {
  type Block,
  type Cycle,
  blockAt,
  clampDuration,
  defaultCycle,
  makeBlock,
  MIN_BLOCK,
  MAX_BLOCK,
  offsetOf
} from './bot/cycles'
export { SEQUENCE, STATES, STATE_BY_ID, type StateDef, type StateId } from './bot/states'
export {
  COLORS,
  COLOR_BY_ID,
  type ColorId,
  DEFAULT_COLOR,
  DEFAULT_SHAPE,
  SHAPES,
  SHAPE_BY_ID,
  type ShapeId,
  mixHex
} from './bot/skins'
export {
  DEFAULT_EXPRESSION,
  EXPRESSIONS,
  EXPRESSION_BY_ID,
  type BotExpression,
  type ExpressionId
} from './bot/expressions'
export { type GazeScript, tourLook, lookTarget } from './bot/gaze'
export { DEMI_VIEWBOX, RAYON } from './bot/repere'
