import type { ElectionPhase } from '@aia-pama/shared';
import { PHASE_LABELS } from '@aia-pama/shared';

type PhaseBannerProps = {
  phase: ElectionPhase;
  message?: string;
  closesAt?: string;
};

const activePhases: ElectionPhase[] = ['nomination', 'voting'];

export function PhaseBanner({ phase, message, closesAt }: PhaseBannerProps) {
  const isActive = activePhases.includes(phase);
  const label = PHASE_LABELS[phase];

  return (
    <div
      className={`rounded-lg border border-border bg-surface-card px-4 py-3 sm:px-5 sm:py-4 ${
        isActive ? 'border-l-4 border-l-aia-red' : 'border-l-4 border-l-border'
      }`}
      role="status"
      aria-live="polite"
    >
      <p className="text-base font-semibold text-ink-primary sm:text-lg">{label}</p>
      {message && (
        <p className="mt-1 text-sm text-ink-secondary sm:text-base">{message}</p>
      )}
      {closesAt && isActive && (
        <p className="mt-1 text-sm text-ink-secondary">Closes: {closesAt}</p>
      )}
    </div>
  );
}
