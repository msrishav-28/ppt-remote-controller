const PROFILES = {
  universal: {
    id: 'universal',
    label: 'Slides',
    description: 'Core commands that work across most presentation apps.',
    commandIds: ['start', 'prev', 'next', 'black', 'white', 'end']
  },
  media: {
    id: 'media',
    label: 'Media',
    description: 'Video and embedded media controls. Focus may need to be on the media.',
    commandIds: ['mediaPlayPause', 'mediaPlaySelected']
  },
  zoom: {
    id: 'zoom',
    label: 'Zoom',
    description: 'Browser-style zoom controls for web-based presentation views.',
    commandIds: ['zoomIn', 'zoomOut', 'zoomReset']
  }
};

const COMMANDS = {
  start: {
    id: 'start',
    profile: 'universal',
    label: 'Start Show',
    shortLabel: 'Start',
    hint: 'F5',
    keyNames: ['F5'],
    tone: 'primary'
  },
  prev: {
    id: 'prev',
    profile: 'universal',
    label: 'Previous Slide',
    shortLabel: 'Prev',
    hint: 'Arrow Left',
    keyNames: ['Left'],
    tone: 'neutral'
  },
  next: {
    id: 'next',
    profile: 'universal',
    label: 'Next Slide',
    shortLabel: 'Next',
    hint: 'Arrow Right',
    keyNames: ['Right'],
    tone: 'primary'
  },
  black: {
    id: 'black',
    profile: 'universal',
    label: 'Black Screen',
    shortLabel: 'Black',
    hint: 'B',
    keyNames: ['B'],
    tone: 'neutral'
  },
  white: {
    id: 'white',
    profile: 'universal',
    label: 'White Screen',
    shortLabel: 'White',
    hint: 'W',
    keyNames: ['W'],
    tone: 'neutral'
  },
  end: {
    id: 'end',
    profile: 'universal',
    label: 'End Show',
    shortLabel: 'End',
    hint: 'Esc',
    keyNames: ['Escape'],
    tone: 'danger'
  },
  mediaPlayPause: {
    id: 'mediaPlayPause',
    profile: 'media',
    label: 'Play / Pause',
    shortLabel: 'Play',
    hint: 'Space',
    keyNames: ['Space'],
    tone: 'primary'
  },
  mediaPlaySelected: {
    id: 'mediaPlaySelected',
    profile: 'media',
    label: 'Play Selected',
    shortLabel: 'Select',
    hint: 'Enter',
    keyNames: ['Enter'],
    tone: 'neutral'
  },
  zoomIn: {
    id: 'zoomIn',
    profile: 'zoom',
    label: 'Zoom In',
    shortLabel: 'Zoom +',
    hint: 'Ctrl + =',
    keyNames: ['LeftControl', 'Equal'],
    tone: 'primary'
  },
  zoomOut: {
    id: 'zoomOut',
    profile: 'zoom',
    label: 'Zoom Out',
    shortLabel: 'Zoom -',
    hint: 'Ctrl + -',
    keyNames: ['LeftControl', 'Minus'],
    tone: 'neutral'
  },
  zoomReset: {
    id: 'zoomReset',
    profile: 'zoom',
    label: 'Reset Zoom',
    shortLabel: 'Reset',
    hint: 'Ctrl + 0',
    keyNames: ['LeftControl', 'Num0'],
    tone: 'neutral'
  }
};

const PRIMARY_COMMAND_IDS = ['prev', 'next'];
const START_COMMAND_IDS = ['start'];
const UTILITY_COMMAND_IDS = ['black', 'white', 'end'];

module.exports = {
  COMMANDS,
  PRIMARY_COMMAND_IDS,
  PROFILES,
  START_COMMAND_IDS,
  UTILITY_COMMAND_IDS
};
