export type IconName =
  | 'play'
  | 'prev'
  | 'next'
  | 'black'
  | 'white'
  | 'end'
  | 'zoomIn'
  | 'zoomOut'
  | 'reset'
  | 'timer'
  | 'guide';

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
} as const;

export function Icon({ name }: { name: IconName }) {
  switch (name) {
    case 'play':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5.2v13.6a1 1 0 0 0 1.52.86l11-6.8a1 1 0 0 0 0-1.72l-11-6.8A1 1 0 0 0 8 5.2Z" fill="currentColor" />
        </svg>
      );
    case 'prev':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15.5 4.5 8 12l7.5 7.5" {...STROKE} strokeWidth="3" />
        </svg>
      );
    case 'next':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8.5 4.5 16 12l-7.5 7.5" {...STROKE} strokeWidth="3" />
        </svg>
      );
    case 'black':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4.5" y="4.5" width="15" height="15" rx="3" fill="currentColor" />
        </svg>
      );
    case 'white':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4.5" y="4.5" width="15" height="15" rx="3" {...STROKE} strokeWidth="2.2" />
        </svg>
      );
    case 'end':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" {...STROKE} strokeWidth="2.8" />
        </svg>
      );
    case 'zoomIn':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" {...STROKE} strokeWidth="2.2" />
          <path d="M10.5 7.5v6M7.5 10.5h6M15.5 15.5 20 20" {...STROKE} strokeWidth="2.2" />
        </svg>
      );
    case 'zoomOut':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" {...STROKE} strokeWidth="2.2" />
          <path d="M7.5 10.5h6M15.5 15.5 20 20" {...STROKE} strokeWidth="2.2" />
        </svg>
      );
    case 'reset':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 8h7.5a5 5 0 1 1-4.9 6M7 8l3.4-3M7 8l3.4 3" {...STROKE} strokeWidth="2.3" />
        </svg>
      );
    case 'timer':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9.5 3h5M12 13l3-3" {...STROKE} strokeWidth="2.2" />
          <circle cx="12" cy="13.5" r="7.5" {...STROKE} strokeWidth="2.2" />
        </svg>
      );
    case 'guide':
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01M9 6.5h11M9 12h11M9 17.5h7.5" {...STROKE} strokeWidth="2.2" />
        </svg>
      );
  }
}
