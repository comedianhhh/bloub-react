import { type Block, makeBlock } from './bot/cycles'
import type { StateId } from './bot/states'

/**
 * What an agent is doing, in words a chat UI already has. Map your own run
 * status onto these, then `stateForActivity` picks the bot state to show.
 */
export type BotActivity =
  | 'idle'
  | 'thinking'
  | 'working'
  | 'needs-input'
  | 'done'
  | 'error'
  | 'sleeping'

const STATE_FOR_ACTIVITY: Record<BotActivity, StateId> = {
  idle: 'idle',
  thinking: 'thinking',
  working: 'orbit',
  'needs-input': 'notify',
  done: 'wink',
  error: 'alert',
  sleeping: 'sleep'
}

export function stateForActivity(activity: BotActivity): StateId {
  return STATE_FOR_ACTIVITY[activity]
}

/**
 * `orbit` is a measured one-shot: the rings fly for about three seconds and
 * settle. An agent can stay busy for minutes, so `working` plays a small
 * montage instead of a single state; every other activity holds its state.
 * Pass the result to `BloubBot`'s `cycle` prop (undefined means use `state`).
 */
export function cycleForActivity(activity: BotActivity): Block[] | undefined {
  return activity === 'working' ? WORKING_CYCLE : undefined
}

const WORKING_CYCLE: Block[] = [makeBlock('orbit'), makeBlock('thinking'), makeBlock('play')]
