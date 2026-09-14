const ASPECT_RATIO = 680 / 220;

/** @param size Rendered height in px; width scales automatically to preserve the logo's aspect ratio. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size * ASPECT_RATIO} height={size} viewBox="0 0 680 220" xmlns="http://www.w3.org/2000/svg" role="img">
      <title>Rotisserie logo</title>
      <desc>
        A rounded square badge in burnt orange containing a monoline letter R whose diagonal leg is a skewer
        threaded with four alternating food pieces, wrapped by a circular rotation arrow, next to the wordmark
        "Rotisserie" and the tagline "Keeping your meals on rotation".
      </desc>

      <rect x="40" y="40" width="160" height="160" rx="32" fill="#C2410C" />

      <path d="M108.2,53.03 A68,68 0 1 1 53.03,131.8" fill="none" stroke="#FFF3E0" strokeWidth="6" strokeLinecap="round" />
      <path d="M-7,-12 L7,-12 L0,5 Z" fill="#FFF3E0" transform="translate(53.03,131.8) rotate(170)" />

      <line x1="80" y1="65" x2="80" y2="175" stroke="#FFF3E0" strokeWidth="15" strokeLinecap="round" />
      <path
        d="M80,65 L120,65 Q142,65 142,90 Q142,115 120,115 L80,115"
        fill="none"
        stroke="#FFF3E0"
        strokeWidth="15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="118" y1="113" x2="158" y2="178" stroke="#FFF3E0" strokeWidth="9" strokeLinecap="round" />
      <circle cx="126" cy="126" r="9" fill="#7C3F00" stroke="#FFF3E0" strokeWidth="2" />
      <circle cx="136" cy="142.3" r="9" fill="#F4A261" stroke="#FFF3E0" strokeWidth="2" />
      <circle cx="146" cy="158.5" r="9" fill="#7C3F00" stroke="#FFF3E0" strokeWidth="2" />
      <circle cx="154" cy="171.5" r="9" fill="#F4A261" stroke="#FFF3E0" strokeWidth="2" />

      <text x="230" y="108" fill="#1A1A1A" style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 56, fontWeight: 500 }}>
        Rotisserie
      </text>
      <text x="230" y="148" fill="#6B7280" style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 20, fontWeight: 400 }}>
        Keeping your meals on rotation
      </text>
    </svg>
  );
}
