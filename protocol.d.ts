export type ProfileId = 'universal' | 'media' | 'zoom';

export type CommandId =
  | 'start'
  | 'prev'
  | 'next'
  | 'black'
  | 'white'
  | 'end'
  | 'mediaPlayPause'
  | 'mediaPlaySelected'
  | 'zoomIn'
  | 'zoomOut'
  | 'zoomReset';

export type CommandTone = 'primary' | 'neutral' | 'danger';

export interface CommandDefinition {
  id: CommandId;
  profile: ProfileId;
  label: string;
  shortLabel: string;
  hint: string;
  keyNames: string[];
  tone: CommandTone;
}

export interface ProfileDefinition {
  id: ProfileId;
  label: string;
  description: string;
  commandIds: CommandId[];
}

export const COMMANDS: Record<CommandId, CommandDefinition>;
export const PRIMARY_COMMAND_IDS: CommandId[];
export const PROFILES: Record<ProfileId, ProfileDefinition>;
export const START_COMMAND_IDS: CommandId[];
export const UTILITY_COMMAND_IDS: CommandId[];
