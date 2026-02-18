'use client';

import Link from 'next/link';
import { PenLine, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Project } from '@/types';

interface TopNavProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onToggleMobileSidebar: () => void;
}

export function TopNav({
  projects,
  selectedProjectId,
  onSelectProject,
  onToggleMobileSidebar,
}: TopNavProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={onToggleMobileSidebar}
        >
          <Menu className="size-5" />
        </Button>
        <Link href="/" className="flex items-center gap-2">
          <PenLine className="size-5 text-primary" />
          <span className="text-lg font-bold tracking-tight">Novel Craft</span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={selectedProjectId ?? ''}
          onValueChange={(val) => onSelectProject(val || null)}
        >
          <SelectTrigger className="w-32 sm:w-48">
            <SelectValue placeholder="프로젝트 선택" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </header>
  );
}
