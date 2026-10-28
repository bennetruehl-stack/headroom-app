/** Headroom-Logo: blaues abgerundetes Quadrat, weißes „h“, hellblauer Punkt. Gleiche Form wie public/headroom.svg. */
export function BrandLogo({ size = 32 }: { size?: number }) {
  return (
    <svg className="brand-logo" viewBox="0 0 2000 2000" width={size} height={size} aria-hidden="true" focusable="false">
      <rect width="2000" height="2000" rx="620" fill="#2457F5" />
      <path d="M539 396H760V799C812 718 880 670 1004 670C1180 670 1301 780 1301 1014V1566H1076V1032C1076 912 1027 854 937 854C826 854 760 935 760 1076V1566H539Z" fill="#FFFFFF" />
      <rect x="1402" y="1000" width="227" height="222" fill="#A9B9F8" />
    </svg>
  );
}
