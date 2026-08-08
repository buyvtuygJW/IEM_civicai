// A 24-spoke wheel motif — evokes movement and progress (cases advancing,
// applications moving forward) rather than reproducing any official emblem.
// Used as the logomark in the navbar and as a decorative graphic on the home
// hero, always in the same tri-tone gradient so it reads as one identity
// wherever it appears.
export default function ChakraIcon({ size = 40, className = "", spin = false, id = "chakraGradient" }) {
  const spokes = Array.from({ length: 24 });
  const cx = 50, cy = 50, rOuter = 44, rInner = 15;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`${spin ? "chakra-spin" : ""} ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF9933" />
          <stop offset="55%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#138808" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke={`url(#${id})`} strokeWidth="3" />
      {spokes.map((_, i) => {
        const angle = (i * 360) / spokes.length;
        const rad = (angle * Math.PI) / 180;
        const x1 = cx + rInner * Math.cos(rad);
        const y1 = cy + rInner * Math.sin(rad);
        const x2 = cx + rOuter * Math.cos(rad);
        const y2 = cy + rOuter * Math.sin(rad);
        return (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={`url(#${id})`}
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={cx} cy={cy} r={rInner} fill="none" stroke={`url(#${id})`} strokeWidth="3" />
    </svg>
  );
}
