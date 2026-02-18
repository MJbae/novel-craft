'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useJobStore } from '@/stores/job-store';

interface RevisionInputProps {
  projectId: string;
  episodeId: string;
  disabled?: boolean;
  onRevised: () => void;
}

export function RevisionInput({
  projectId,
  episodeId,
  disabled = false,
  onRevised,
}: RevisionInputProps) {
  const [instruction, setInstruction] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { polling, startPolling } = useJobStore();

  const isDisabled = disabled || polling || submitting;

  const handleSubmit = async () => {
    const trimmed = instruction.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/generate/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          episode_id: episodeId,
          revision_instruction: trimmed,
        }),
      });

      if (!res.ok) throw new Error('요청 실패');

      const data = await res.json();
      startPolling(data.job_id);
      setInstruction('');
      onRevised();
      toast.success('수정 작업이 시작되었습니다');
    } catch {
      toast.error('수정 요청에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span className="shrink-0 text-sm font-medium text-muted-foreground">
        수정 지시
      </span>
      <div className="flex flex-1 items-center gap-2">
        <Input
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="수정 지시를 입력하세요 (예: 3번째 장면의 전투를 더 역동적으로)"
          disabled={isDisabled}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              handleSubmit();
            }
          }}
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isDisabled || !instruction.trim()}
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          전송
        </Button>
      </div>
    </div>
  );
}
