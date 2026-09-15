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
