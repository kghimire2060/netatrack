/** Inline icon set. Stroke-based so a single set works on light and dark. */
type IconProps = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  "aria-hidden": true,
  focusable: "false" as const,
});

export const SearchIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.9" />
    <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);

export const PinIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <path
      d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.9" />
  </svg>
);

export const PeopleIcon = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="9" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.9" />
    <path d="M3 20a6 6 0 0 1 12 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    <path d="M16.5 5.3a3.4 3.4 0 0 1 0 5.4M18 20a6 6 0 0 0-2.2-4.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);

export const DocIcon = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M6 3h7l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
    <path d="M13 3v5h5M8.5 13h7M8.5 17h4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);

export const ChartIcon = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);

export const CalendarIcon = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
    <path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);

export const NewsIcon = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="3" y="5" width="14" height="15" rx="2" stroke="currentColor" strokeWidth="1.9" />
    <path d="M17 9h2.5a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-3 0V9ZM6.5 9h7M6.5 13h7M6.5 16.5h4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);

export const ProfileSearchIcon = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="10" cy="7.5" r="3.4" stroke="currentColor" strokeWidth="1.9" />
    <path d="M4 19a6 6 0 0 1 9.2-5.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    <circle cx="16.5" cy="16.5" r="3.2" stroke="currentColor" strokeWidth="1.9" />
    <path d="m19 19 2 2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);

export const SpeechIcon = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M20 14a2 2 0 0 1-2 2H8l-4 3.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
    <path d="M8.5 9h7M8.5 12.5h4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);

export const BellIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
    <path d="M10.3 19a2 2 0 0 0 3.4 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);

export const MenuIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);
