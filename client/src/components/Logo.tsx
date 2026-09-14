import { useId } from "react";

export function Logo({ size = 28 }: { size?: number }) {
  const clipId = useId();

  return (
    <svg width="680" height="280" viewBox="0 0 680 280" xmlns="http://www.w3.org/2000/svg" role="img">
    <title>What's for Dinner logo</title>
    <desc>A logo mark showing a plate divided into meal segments with a terracotta checkmark badge, next to a wordmark reading "What's for Dinner?" with the tagline "plan your week. eat well."</desc>
    <defs>
      <clipPath id="plateClip">
        <circle cx="140" cy="130" r="72"/>
      </clipPath>
    </defs>

    <rect x="30" y="30" width="200" height="200" rx="46" fill="#5c6b2f"/>

    <circle cx="140" cy="130" r="72" fill="#fdfaf3"/>
    <g clip-path="url(#plateClip)">
      <line x1="140" y1="58" x2="140" y2="202" stroke="#ead9b8" stroke-width="2"/>
      <line x1="140" y1="130" x2="68" y2="90" stroke="#ead9b8" stroke-width="2"/>
      <line x1="140" y1="130" x2="68" y2="170" stroke="#ead9b8" stroke-width="2"/>
    </g>
    <circle cx="140" cy="130" r="72" fill="none" stroke="#eee3c8" stroke-width="2"/>
    <circle cx="140" cy="130" r="30" fill="none" stroke="#ead9b8" stroke-width="2"/>

    <circle cx="196" cy="188" r="30" fill="#c2410c"/>
    <path d="M184 188 L192 197 L210 178" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>

    <text x="270" y="112" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="500" fill="#1f2937">What's for</text>
    <text x="270" y="158" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="500" fill="#5c6b2f">Dinner<tspan fill="#ca8a04">?</tspan></text>
    <text x="271" y="192" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="400" fill="#8a7c5c">plan your week. eat well.</text>
  </svg>
  );
}
