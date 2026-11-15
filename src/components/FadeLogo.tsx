/** Marca de Fade Studio: barras que se degradan (un fade), de azul a dorado. */
export function FadeMark({ size = 40 }: { size?: number }) {
  return (
    <svg className="fade-mark" viewBox="0 0 130 120" width={size * (130 / 120)} height={size} aria-hidden="true">
      <rect x="6" y="14" width="16" height="92" rx="8" fill="#2563eb" />
      <rect x="30" y="24" width="16" height="72" rx="8" fill="#2563eb" opacity=".85" />
      <rect x="54" y="36" width="16" height="48" rx="8" fill="#2563eb" opacity=".65" />
      <rect x="78" y="46" width="16" height="28" rx="8" fill="#e0b24a" opacity=".85" />
      <rect x="102" y="54" width="16" height="12" rx="6" fill="#e0b24a" />
    </svg>
  );
}

/** Marca + nombre. */
export default function FadeLogo({ size = 40 }: { size?: number }) {
  return (
    <span className="fade-logo" style={{ fontSize: size * 0.8 }}>
      <FadeMark size={size} />
      <span className="fade-logo-txt">
        FADE <i>STUDIO</i>
      </span>
    </span>
  );
}
