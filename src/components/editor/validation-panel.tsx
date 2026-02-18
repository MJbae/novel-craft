'use client';

import { useState } from 'react';
import { BarChart3, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useJobStore } from '@/stores/job-store';
import type { StyleMetrics } from '@/types';

interface ValidationPanelProps {
  metrics: StyleMetrics | null;
  projectId: string;
  episodeId: string;
  hasContent: boolean;
}

interface MetricRow {
  label: string;
  actual: string;
  expected: string;
  status: 'pass' | 'warn' | 'fail';
}

function evaluateMetrics(m: StyleMetrics): MetricRow[] {
  return [
    {
      label: '분량',
      actual: `${m.wordCount.toLocaleString('ko-KR')}자`,
      expected: '7,000~9,000자',
      status:
        m.wordCount >= 7000 && m.wordCount <= 9000
          ? 'pass'
          : m.wordCount >= 6000 && m.wordCount <= 10000
            ? 'warn'
            : 'fail',
    },
    {
      label: '장면 수',
      actual: `${m.sceneCount}개`,
      expected: '3개 이상',
      status: m.sceneCount >= 3 ? 'pass' : 'warn',
    },
    {
      label: '엔딩 훅',
      actual: m.endingHookValid ? '유효' : '무효',
      expected: '유효',
      status: m.endingHookValid ? 'pass' : 'fail',
    },
    {
      label: '평균 문장 길이',
      actual: `${m.avgSentenceLength.toFixed(1)}자`,
      expected: '15~35자',
      status:
        m.avgSentenceLength >= 15 && m.avgSentenceLength <= 35
          ? 'pass'
          : 'warn',
    },
    {
      label: '대화 비율',
      actual: `${(m.dialogueRatio * 100).toFixed(1)}%`,
      expected: '40~60%',
      status:
        m.dialogueRatio >= 0.4 && m.dialogueRatio <= 0.6 ? 'pass' : 'warn',
    },
    {
      label: '설명체',
      actual: `${(m.explanationDensity * 100).toFixed(1)}%`,
      expected: '5% 미만',
      status: m.explanationDensity < 0.05 ? 'pass' : 'warn',
    },
    {
      label: '반복률',
      actual: `${(m.repetitionRate * 100).toFixed(1)}%`,
      expected: '3% 미만',
      status: m.repetitionRate < 0.03 ? 'pass' : 'warn',
    },
  ];
}

const STATUS_ICON: Record<MetricRow['status'], string> = {
  pass: '\u2705',
  warn: '\u26a0\ufe0f',
  fail: '\u274c',
};

function buildImprovementInstruction(rows: MetricRow[]): string {
  const issues = rows.filter((r) => r.status !== 'pass');
  if (issues.length === 0) return '';

  const lines = issues.map((r) => {
    const prefix = r.status === 'fail' ? '[필수]' : '[권장]';
    return `${prefix} ${r.label}: 현재 ${r.actual}, 목표 ${r.expected}`;
  });

  return `다음 검증 결과를 바탕으로 원고를 개선해주세요:\n${lines.join('\n')}`;
}

export function ValidationPanel({ metrics, projectId, episodeId, hasContent }: ValidationPanelProps) {
  const { polling, startPolling } = useJobStore();
  const [improving, setImproving] = useState(false);

  const handleImprove = async (instruction: string) => {
    setImproving(true);
    try {
      const res = await fetch('/api/generate/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          episode_id: episodeId,
          revision_instruction: instruction,
        }),
      });

      if (!res.ok) throw new Error('요청 실패');

      const data = await res.json();
      startPolling(data.job_id);
      toast.success('원고 개선 작업이 시작되었습니다');
    } catch {
      toast.error('원고 개선 요청에 실패했습니다');
    } finally {
      setImproving(false);
    }
  };

  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <BarChart3 className="size-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          검증 데이터가 없습니다. 원고 생성 후 자동으로 표시됩니다.
        </p>
      </div>
    );
  }

  const rows = evaluateMetrics(metrics);
  const passCount = rows.filter((r) => r.status === 'pass').length;
  const hasIssues = passCount < rows.length;
  const improvementInstruction = buildImprovementInstruction(rows);
  const busy = polling || improving;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          스타일 검증 결과
        </p>
        <span
          className={cn(
            'text-xs font-medium',
            passCount === rows.length
              ? 'text-emerald-600'
              : passCount >= 5
                ? 'text-amber-600'
                : 'text-destructive'
          )}
        >
          {passCount}/{rows.length} 통과
        </span>
      </div>

      <div className="rounded-lg border">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={cn(
              'flex items-center justify-between px-4 py-3',
              i < rows.length - 1 && 'border-b'
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">{STATUS_ICON[row.status]}</span>
              <span className="text-sm font-medium">{row.label}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  'font-mono',
                  row.status === 'pass'
                    ? 'text-emerald-600'
                    : row.status === 'warn'
                      ? 'text-amber-600'
                      : 'text-destructive'
                )}
              >
                {row.actual}
              </span>
              <span className="text-muted-foreground">/ {row.expected}</span>
            </div>
          </div>
        ))}
      </div>

      {hasContent && (
        <Button
          onClick={() => handleImprove(improvementInstruction)}
          disabled={busy || !hasIssues}
          className="w-full"
        >
          {improving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {hasIssues
            ? `검증 기준으로 원고 개선 (${rows.length - passCount}건)`
            : '모든 검증 통과'}
        </Button>
      )}
    </div>
  );
}
