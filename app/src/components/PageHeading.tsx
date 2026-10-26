import type { ReactNode } from 'react';

export function PageHeading({ kicker, title, trailing }: { kicker: string; title: string; trailing?: ReactNode }) {
  return (
    <div className="page-heading">
      <div><p className="eyebrow">{kicker}</p><h1>{title}</h1></div>
      {trailing}
    </div>
  );
}
