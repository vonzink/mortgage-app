import React from 'react';

/**
 * Design-system icon. 24×24 viewBox, currentColor stroke, round caps/joins.
 * Ported 1:1 from the design handoff's shared.jsx so visual output matches the
 * design files exactly. Use Lucide React later if we want a bigger set.
 */
const PATHS = {
  home: (<><path d="M3 11L12 4l9 7"/><path d="M5 10v10h14V10"/></>),
  user: (<><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/></>),
  folder: (<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>),
  doc: (<><path d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M14 3v5h5"/></>),
  chart: (<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>),
  chevron: <path d="M9 6l6 6-6 6"/>,
  chevDown: <path d="M6 9l6 6 6-6"/>,
  plus: (<><path d="M12 5v14M5 12h14"/></>),
  check: <path d="M5 12l5 5L20 6"/>,
  upload: (<><path d="M12 17V5"/><path d="M6 11l6-6 6 6"/><path d="M5 21h14"/></>),
  download: (<><path d="M12 5v12"/><path d="M6 13l6 6 6-6"/><path d="M5 21h14"/></>),
  edit: <path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/>,
  trash: <path d="M4 7h16M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13"/>,
  search: (<><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></>),
  bell: (<><path d="M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8z"/><path d="M10 21a2 2 0 004 0"/></>),
  settings: (<><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1.3l2-1.5-2-3.5-2.4.9a7 7 0 00-2.2-1.3L14 3h-4l-.4 2.3A7 7 0 007.4 6.6L5 5.7l-2 3.5 2 1.5a7 7 0 000 2.6l-2 1.5 2 3.5 2.4-.9a7 7 0 002.2 1.3L10 21h4l.4-2.3a7 7 0 002.2-1.3l2.4.9 2-3.5-2-1.5a7 7 0 00.1-1.3z"/></>),
  clock: (<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>),
  flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5"/>,
  map: (<><path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></>),
  phone: <path d="M5 4h4l2 5-3 2a12 12 0 006 6l2-3 5 2v4a2 2 0 01-2 2A17 17 0 013 6a2 2 0 012-2z"/>,
  mail: (<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></>),
  briefcase: (<><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2"/></>),
  coin: (<><circle cx="12" cy="12" r="9"/><path d="M12 6v12M9 9h4a2 2 0 010 4h-2a2 2 0 000 4h4"/></>),
  key: (<><circle cx="8" cy="15" r="4"/><path d="M11 13l9-9M16 8l3 3"/></>),
  grid: (<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>),
  bldg: (<><path d="M3 21V7l9-4 9 4v14"/><path d="M9 21V11M15 21V11"/></>),
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/>,
};

export default function Icon({ name, size = 16, stroke = 1.6, className }) {
  const paths = PATHS[name];
  if (!paths) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {paths}
    </svg>
  );
}
