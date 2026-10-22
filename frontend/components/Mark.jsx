/** RELIC seal: three stacked excavation contours around a find-spot. */
export function Mark({ size = 30, color = "currentColor", accent = "#C59A45" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke={color} strokeWidth="1.4">
      <path d="M20 2.5c8.6-.6 17 4.6 17.4 13.6.4 9-5.6 15.6-14.6 17.8C13.8 36.2 3 32.4 2.6 22.4 2.2 11.8 10.8 3.2 20 2.5Z" />
      <path d="M20.4 8c6.2-.2 11.4 3.8 11.7 10 .3 6.4-4 10.9-10.4 12.2C14.8 31.6 8 28.6 7.8 21.8 7.6 14.6 13.6 8.3 20.4 8Z" />
      <path d="M20.6 13.5c3.6-.1 6.3 2.200 6.4 5.8.1 3.5-2.3 5.9-5.900 6.400-3.700.5-7-1.400-7.100-5C13.900 17.200 16.900 13.6 20.6 13.500Z" />
      <circle cx="20.5" cy="19.5" r="1.700" fill={accent} stroke="none" />
    </svg>
  );
}

export function Wordmark({ size = 30, color }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 11 }}>
      <Mark size={size} color={color} />
      <span style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: size * 0.9, letterSpacing: ".2em", lineHeight: 1 }}>RELIC</span>
    </span>
  );
}
