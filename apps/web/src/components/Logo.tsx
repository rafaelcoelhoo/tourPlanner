/** Marca da aplicação (o mesmo desenho do favicon). Decorativa: o nome da app é dado em texto ao lado. */
export const Logo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false" className="logo">
    <rect width="64" height="64" rx="14" fill="var(--primary)" />
    <rect x="13" y="19" width="38" height="31" rx="4" fill="#fff" />
    <path d="M13 23a4 4 0 0 1 4-4h30a4 4 0 0 1 4 4v5H13z" fill="var(--primary-soft-strong)" />
    <rect x="21" y="13" width="4" height="10" rx="2" fill="#fff" />
    <rect x="39" y="13" width="4" height="10" rx="2" fill="#fff" />
    <g fill="var(--primary)">
      <rect x="19" y="33" width="6" height="5" rx="1" />
      <rect x="29" y="33" width="6" height="5" rx="1" />
      <rect x="39" y="33" width="6" height="5" rx="1" />
      <rect x="19" y="42" width="6" height="5" rx="1" />
      <rect x="29" y="42" width="6" height="5" rx="1" />
    </g>
  </svg>
);
