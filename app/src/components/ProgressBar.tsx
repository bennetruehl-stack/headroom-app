import { statusFor } from '@headroom/core';

export function ProgressBar({
  ratio,
  label,
}: {
  ratio: number;
  label: string;
}) {
  return (
    <div
      className="progress-track"
      data-level={statusFor(ratio).toLowerCase()}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.max(0, Math.min(100, Math.round(ratio * 100)))}
    >
      <span style={{ clipPath: 'inset(0 ' + (100 - Math.max(0, Math.min(100, ratio * 100))) + '% 0 0 round 999px)' }} />
    </div>
  );
}
