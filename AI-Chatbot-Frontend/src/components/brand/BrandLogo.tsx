interface BrandMarkProps {
  size?: number;
  className?: string;
  /** Adds the soft shadow used in the navigation bar. */
  framed?: boolean;
}

/**
 * Shikhi Bondhu brand mark: an open book that also reads as a friendly face,
 * with a small learning spark. Pure SVG so it stays crisp on every screen.
 */
export function BrandMark({ size = 40, className = '', framed = true }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Shikhi Bondhu"
      style={
        framed
          ? {
              borderRadius: size * 0.28,
              border: '2px solid #1E293B',
              boxShadow: '3px 3px 0 #1E293B',
              flexShrink: 0,
              display: 'block',
            }
          : { flexShrink: 0, display: 'block' }
      }
    >
      <defs>
        <linearGradient id="sb-mark-bg" x1="8" y1="4" x2="58" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0D9488" />
          <stop offset="0.55" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
        <linearGradient id="sb-mark-page" x1="16" y1="20" x2="48" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E9E5FF" />
        </linearGradient>
        <linearGradient id="sb-mark-spark" x1="46" y1="8" x2="60" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE68A" />
          <stop offset="1" stopColor="#FBBF24" />
        </linearGradient>
      </defs>

      <rect x="1" y="1" width="62" height="62" rx="18" fill="url(#sb-mark-bg)" />
      <path d="M13 41c6-3.4 11.7-3.1 19 .9v12.3c-6.8-3.6-12.7-3.9-19-1.2V41Z" fill="url(#sb-mark-page)" />
      <path d="M51 41c-6-3.4-11.7-3.1-19 .9v12.3c6.8-3.6 12.7-3.9 19-1.2V41Z" fill="url(#sb-mark-page)" />
      <path d="M32 41.6v13" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M17.5 46.2c3.4-1.4 6.7-1.2 10.5.6M17.5 50.6c3.4-1.4 6.7-1.2 10.5.6" stroke="#7C3AED" strokeWidth="1.7" strokeLinecap="round" opacity="0.55" />
      <path d="M46.5 46.2c-3.4-1.4-6.7-1.2-10.5.6M46.5 50.6c-3.4-1.4-6.7-1.2-10.5.6" stroke="#0D9488" strokeWidth="1.7" strokeLinecap="round" opacity="0.55" />
      <circle cx="24.5" cy="34.5" r="2.2" fill="#1E293B" />
      <circle cx="39.5" cy="34.5" r="2.2" fill="#1E293B" />
      <path d="M27 38.6c1.7 2 3.3 3 5 3s3.3-1 5-3" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path
        d="M49 9.5 51 15l5.5 2L51 19l-2 5.5-2-5.5-5.5-2 5.5-2L49 9.5Z"
        fill="url(#sb-mark-spark)"
        stroke="#1E293B"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface BrandLogoProps {
  size?: number;
  compact?: boolean;
  tagline?: string;
  framed?: boolean;
  className?: string;
}

/** Horizontal lockup: mark + wordmark, used in the header and footer. */
export function BrandLogo({ size = 38, compact = false, tagline, framed = true, className = '' }: BrandLogoProps) {
  return (
    <span className={`brand-logo ${className}`.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <BrandMark size={size} framed={framed} />
      {!compact && (
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.08 }}>
          <span className="brand-name" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Shikhi Bondhu
          </span>
          {tagline && <span className="brand-tagline">{tagline}</span>}
        </span>
      )}
    </span>
  );
}
