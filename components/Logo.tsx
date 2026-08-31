type LogoMarkProps = {
  className?: string;
};

/**
 * The Shift Story S monogram — two interlocking strokes with a deliberate
 * seam between them. Renders in `currentColor`, so it inherits the text
 * color of whatever it's placed in.
 */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" className={className}>
      <path
        d="M61.3 41.3 A16 16 0 1 1 61.3 18.7"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="M38.7 58.7 A16 16 0 1 1 38.7 81.3"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="round"
      />
    </svg>
  );
}
