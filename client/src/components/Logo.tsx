import { useId } from "react";

export function Logo({ size = 28 }: { size?: number }) {
  const clipId = useId();

  return (
    <svg viewBox="30 30 200 200" width={size} height={size} role="img" aria-label="What's for Dinner?">
      <defs>
        <clipPath id={clipId}>
          <circle cx="140" cy="130" r="72" />
        </clipPath>
      </defs>
      <rect x="30" y="30" width="200" height="200" rx="46" fill="#5c6b2f" />
      <circle cx="140" cy="130" r="72" fill="#fdfaf3" />
      <g clipPath={`url(#${clipId})`}>
        <line x1="140" y1="58" x2="140" y2="202" stroke="#ead9b8" strokeWidth="2" />
        <line x1="140" y1="130" x2="68" y2="90" stroke="#ead9b8" strokeWidth="2" />
        <line x1="140" y1="130" x2="68" y2="170" stroke="#ead9b8" strokeWidth="2" />
      </g>
      <circle cx="140" cy="130" r="72" fill="none" stroke="#eee3c8" strokeWidth="2" />
      <circle cx="140" cy="130" r="30" fill="none" stroke="#ead9b8" strokeWidth="2" />
      <circle cx="196" cy="188" r="30" fill="#c2410c" />
      <path
        d="M184 188 L192 197 L210 178"
        fill="none"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
