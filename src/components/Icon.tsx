const PATHS: Record<string, string> = {
  prev: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  first: 'M17 5l-7 7 7 7M7 5v14',
  last: 'M7 5l7 7-7 7M17 5v14',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
  redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  copy: 'M8 8h11v11H8zM5 16V5h11',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  top: 'M12 20V8M6 14l6-6 6 6M5 4h14',
  bottom: 'M12 4v12M6 10l6 6 6-6M5 20h14',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 017 0v3',
  unlock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 016.8-1.2',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  sound: 'M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12',
  mute: 'M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 16V5M7 9l5-5 5 5M5 20h14',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  book: 'M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5zM12 6v14',
  pen: 'M15 5l4 4L8 20H4v-4zM13 7l4 4',
  palette: 'M12 3a9 9 0 100 18c1.2 0 1.6-.9 1.2-1.8-.5-1-.1-2.2 1.2-2.2H17a4 4 0 004-4c0-5-4-10-9-10zM7.5 11.5h.01M10 7.5h.01M15 7.5h.01',
  page: 'M6 3h9l4 4v14H6zM15 3v4h4',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15 9.5h.01',
  text: 'M5 6V4h14v2M12 4v16M9 20h6',
  sticker: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z',
  tape: 'M4 9l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2v6l-2 2-2-2-2 2-2-2-2 2-2-2-2 2-2-2z',
  note: 'M5 4h14v11l-5 5H5zM14 20v-5h5M8 9h8M8 12h5',
  ticket: 'M3 7h18v3a2 2 0 000 4v3H3v-3a2 2 0 000-4zM15 7v10',
  label: 'M4 8h13l3 4-3 4H4zM8 12h5',
  reset: 'M4 4v6h6M20 20v-6h-6M5.6 15a7 7 0 0011.8 2.6M18.4 9A7 7 0 006.6 6.4',
  eyedrop: 'M14.5 5.5l4 4M17 3l4 4-3 3-4-4zM14 7l-9 9v3h3l9-9',
  shuffle: 'M4 7h3c4 0 6 10 10 10h3M4 17h3c1.5 0 2.8-1.4 4-3.2M17 7h3M13 10.2C14.2 8.4 15.5 7 17 7M18 4l3 3-3 3M18 14l3 3-3 3',
};

export function Icon({ name, size = 18 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
