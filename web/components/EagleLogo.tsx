type Props = {
  size?: number;
  className?: string;
};

/**
 * Kirk's Ecommerce Shop — Bald-eagle inspired logo.
 * Navy rounded square (Old Glory Blue #0A3161) + white eagle head
 * with gold beak + red stripes accent (Old Glory Red #B31942),
 * echoing the American flag.
 */
export default function EagleLogo({ size = 36, className = "" }: Props) {
  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-lg shadow-sm ${className}`}
      style={{ width: size, height: size, background: "#0A3161" }}
      aria-label="Kirk's Ecommerce Shop eagle logo"
      title="Kirk's Ecommerce Shop"
    >
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        {/* red stripes at the bottom — US flag stripes */}
        <rect x="0" y="36" width="48" height="3.2" fill="#B31942" />
        <rect x="0" y="41" width="48" height="3.2" fill="#FFFFFF" opacity="0.92" />
        <rect x="0" y="45" width="48" height="3" fill="#B31942" />

        {/* white stars hint on navy field (top corners) */}
        <g fill="#FFFFFF" opacity="0.9">
          <circle cx="6" cy="6" r="1" />
          <circle cx="12" cy="6" r="1" />
          <circle cx="9" cy="10.5" r="1" />
        </g>

        {/* Bald eagle head — side profile facing right */}
        {/* neck / feathers */}
        <path
          d="M10 33c-1.5-6 .5-12 5-16 3.5-3.2 8-5 13-4.6 4 .3 7.5 2 9.6 4.4l-2.6.8c1.8 1 3 2.4 3.6 4.2l-2.4-.4c.7 1.2 1 2.6.9 4.1-3.5 1.6-7.4 2.3-11.4 2.1L14 33H10z"
          fill="#FFFFFF"
        />
        {/* feather shading */}
        <path
          d="M12 30c2 1.5 5 2.4 8.5 2.4M13.5 26.5c2.4 1.6 5.4 2.4 8.6 2.2"
          stroke="#0A3161"
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.55"
        />
        {/* fierce brow */}
        <path d="M24.5 16.5l8.2 1.2-7.4 1.6-.8-2.8z" fill="#0A3161" />
        {/* eye */}
        <circle cx="29.2" cy="19.4" r="1.5" fill="#0A3161" />
        <circle cx="29.6" cy="19" r="0.5" fill="#FFFFFF" />
        {/* golden beak — hooked, like a bald eagle */}
        <path
          d="M33.5 17.5c2.6.7 4.4 2.3 5 4.6.3 1.2-.2 2.2-1.4 2.5-1 .3-2-.1-2.7-.9-.9 1-2.2 1.5-3.6 1.4-1.6-.2-2.6-1.3-2.8-2.9-.2-2 1.7-4.1 5.5-4.7z"
          fill="#F2B705"
        />
        <path
          d="M35.6 21.6c1 .3 1.8 1 2.1 2-.7.5-1.6.4-2.4-.1-.7-.5-1-1.2-.9-2.1l1.2.2z"
          fill="#B31942"
          opacity="0.85"
        />
        <path d="M28.6 20.6c2.2-.5 4.5-.3 6.4.7" stroke="#C98A00" strokeWidth="1" strokeLinecap="round" />
      </svg>
      {/* thin white ring for crisp edge */}
      <span className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-white/30" />
    </span>
  );
}
