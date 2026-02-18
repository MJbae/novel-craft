'use client';

import { useState } from 'react';
import { Download, FileText, FileCode, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportButtonProps {
  projectId: string;
  projectName: string;
  exportType?: 'episodes' | 'settings';
}

export function ExportButton({
  projectId,
  projectName,
  exportType = 'episodes',
}: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'txt' | 'md') => {
    setExporting(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/export?format=${format}&type=${exportType}`,
      );

      if (!res.ok) throw new Error('내보내기 실패');

      const blob = await res.blob();
      const suffix = exportType === 'settings' ? '_설정' : '';
      const ext = format === 'md' ? 'md' : 'txt';
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}${suffix}.${ext}`;
      document.body.appendChild(a);
      a.click();

      URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('내보내기 완료');
    } catch {
      toast.error('내보내기에 실패했습니다');
    } finally {
      setExporting(false);
    }
  };

  const label = exportType === 'settings' ? '설정 내보내기' : '원고 내보내기';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={exporting}>
          {exporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('txt')}>
          <FileText className="size-4" />
          TXT로 내보내기
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('md')}>
          <FileCode className="size-4" />
          마크다운으로 내보내기
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
