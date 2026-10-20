// DOM-only SVGs: the editor runs in its own WebView, outside the native icon/font context.
const paths = {
  bold: "M6 4h7a4 4 0 0 1 0 8H6V4Zm0 8h8a4 4 0 0 1 0 8H6v-8Z",
  italic: "M19 4h-9m4 16H5M15 4 9 20",
  underline: "M6 4v7a6 6 0 0 0 12 0V4M4 21h16",
  strike: "M17 5c-1-1-3-2-5-2-3 0-5 2-5 4 0 2 2 3 5 4m-1 2c4 1 6 2 6 4 0 3-3 4-5 4-3 0-5-1-6-3M3 12h18",
  heading: "M4 5v14M14 5v14M4 12h10M18 14c0-3 4-3 4 0 0 2-4 3-4 5h4",
  bulletList: "M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01",
  orderedList: "M10 6h11M10 12h11M10 18h11M3 4h1v5M3 9h2M2 15c0-3 4-3 4 0 0 2-4 3-4 5h4",
  blockquote: "M3 5h7v7H6c0 3-1 5-3 7m11-14h7v7h-4c0 3-1 5-3 7",
  link: "m10 13 4-4m-5-1 3-3a5 5 0 0 1 7 7l-3 3m-1 1-3 3a5 5 0 0 1-7-7l3-3",
  image: "M14 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9M3 17l6-6 5 5 3-3 4 4M19 2v6m-3-3h6M8 7h.01",
  undo: "M3 10h11a5 5 0 0 1 0 10M3 10l5-5M3 10l5 5",
  redo: "M21 10H10a5 5 0 0 0 0 10M21 10l-5-5m5 5-5 5",
  check: "m5 12 4 4L19 6",
  unlink: "m10 13 4-4m-1-4a5 5 0 0 1 7 7M11 19a5 5 0 0 1-7-7M3 3l18 18",
  close: "m6 6 12 12M6 18 18 6",
  grip: "M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01",
  arrowUp: "M12 20V4m-6 6 6-6 6 6",
  arrowDown: "M12 4v16m-6-6 6 6 6-6",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7",
} as const;

export type EditorIconName = keyof typeof paths;

export function EditorIcon({ name }: { name: EditorIconName }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
