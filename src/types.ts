import type { CommandDefinition, CommandId, ProfileDefinition, ProfileId } from '../protocol';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export type ClientMessage =
  | { type: 'pair'; pin: string }
  | { type: 'command'; command: CommandId; profile: ProfileId };

export type ServerMessage =
  | { type: 'status'; connected: boolean; paired: boolean; profiles?: Record<ProfileId, ProfileDefinition>; commands?: Record<CommandId, CommandDefinition> }
  | { type: 'paired' }
  | { type: 'ack'; command: CommandId; profile: ProfileId; dryRun?: boolean }
  | { type: 'error'; code?: string; message: string };

export interface RemoteSocketState {
  connection: ConnectionState;
  paired: boolean;
  hasPaired: boolean;
  lastAck?: CommandId;
  lastError?: string;
  lastEvent: string;
}
