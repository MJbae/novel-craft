'use client';

import { Progress } from '@/components/ui/progress';
import { useJobStore } from '@/stores/job-store';
import { cn } from '@/lib/utils';

const STEP_LABELS: Record<string, string> = {
  pass1_generating: '1패스 생성 중...',
  validating: '검증 중...',
  pass2_correcting: '2패스 교정 중...',
  extracting_events: '이벤트 추출 중...',
  summarizing: '요약 생성 중...',
};

export function GenerationProgress() {
  const { polling, status, step, progress, error } = useJobStore();

  const visible = polling || status === 'completed' || status === 'failed';
  if (!visible) return null;

  const stepLabel = step ? (STEP_LABELS[step] ?? step) : '준비 중...';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-sm font-medium',
            status === 'completed' && 'text-emerald-600',
            status === 'failed' && 'text-destructive'
          )}
        >
          {status === 'completed'
            ? '\u2705 완료'
            : status === 'failed'
              ? `\u274c 실패${error ? `: ${error}` : ''}`
              : stepLabel}
        </span>
        {polling && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {Math.round(progress)}%
          </span>
        )}
      </div>

      <Progress
        value={status === 'completed' ? 100 : progress}
        className={cn(
          'h-2',
          status === 'failed' && '[&>[data-slot=progress-indicator]]:bg-destructive'
        )}
      />
    </div>
  );
}
