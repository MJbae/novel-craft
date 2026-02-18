'use client';

import { useState, useEffect } from 'react';
import { Loader2, RotateCcw, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useJobStore } from '@/stores/job-store';
import { toast } from 'sonner';

function getStepLabel(step: string | null): string {
  switch (step) {
    case 'pass1_generating':
      return '부트스트랩 생성 중...';
    case 'validating':
      return '검증 중...';
    default:
      return '처리 중...';
  }
}

interface BootstrapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCompleted: () => void;
}

export function BootstrapDialog({
  open,
  onOpenChange,
  projectId,
  onCompleted,
}: BootstrapDialogProps) {
  const [triggering, setTriggering] = useState(false);
  const { status, step, progress, error, polling, startPolling, stopPolling, reset } =
    useJobStore();

  const isRunning = polling || status === 'queued' || status === 'processing';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  const triggerBootstrap = async () => {
    setTriggering(true);
    reset();

    try {
      const res = await fetch('/api/generate/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as Record<string, string>).error || '부트스트랩 요청에 실패했습니다'
        );
      }

      const data: { job_id: string } = await res.json();
      startPolling(data.job_id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '부트스트랩 요청에 실패했습니다');
    } finally {
      setTriggering(false);
    }
  };

  useEffect(() => {
    if (open && !isRunning && !isCompleted && !isFailed && !triggering) {
      triggerBootstrap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (isCompleted) {
      toast.success('부트스트랩이 완료되었습니다');
    }
  }, [isCompleted]);

  const handleClose = () => {
    if (isRunning) return;
    stopPolling();
    reset();
    if (isCompleted) {
      onCompleted();
    }
    onOpenChange(false);
  };

  const handleDone = () => {
    stopPolling();
    reset();
    onCompleted();
    onOpenChange(false);
  };

  const handleRetry = () => {
    triggerBootstrap();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isRunning && onOpenChange(v)}>
      <DialogContent showCloseButton={!isRunning} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5" />
            부트스트랩 생성
          </DialogTitle>
          <DialogDescription>
            AI가 시놉시스, 세계관, 캐릭터, 플롯을 자동으로 생성합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {(isRunning || triggering) && (
            <>
              <div className="flex items-center gap-3">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span className="text-sm font-medium">
                  {triggering ? '요청 중...' : getStepLabel(step)}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                약 60~120초 소요됩니다. 잠시만 기다려 주세요.
              </p>
            </>
          )}

          {isCompleted && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="size-10 text-emerald-500" />
              <div className="text-center">
                <p className="font-medium">생성 완료!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  시놉시스, 세계관, 캐릭터, 플롯이 생성되었습니다.
                </p>
              </div>
            </div>
          )}

          {isFailed && (
            <div className="flex flex-col items-center gap-3 py-4">
              <XCircle className="size-10 text-destructive" />
              <div className="text-center">
                <p className="font-medium">생성 실패</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {error || '알 수 없는 오류가 발생했습니다.'}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {isCompleted && (
            <Button onClick={handleDone}>
              <CheckCircle2 className="size-4" />
              확인
            </Button>
          )}
          {isFailed && (
            <>
              <Button variant="outline" onClick={handleClose}>
                닫기
              </Button>
              <Button onClick={handleRetry}>
                <RotateCcw className="size-4" />
                다시 시도
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
