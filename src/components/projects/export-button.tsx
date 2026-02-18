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
}

export function ExportButton({ projectId, projectName }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'txt' | 'md') => {
    setExporting(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/export?format=${format}`,
      );

      if (!res.ok) throw new Error('내보내기 실패');

      const blob = await res.blob();
      const ext = format === 'md' ? 'md' : 'txt';
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}.${ext}`;
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={exporting}>
          {exporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          내보내기
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
