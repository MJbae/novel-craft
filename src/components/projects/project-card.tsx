'use client';

import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Project } from '@/types';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const createdDate = new Date(project.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="group cursor-pointer transition-colors hover:border-primary/30 hover:bg-accent/30">
        <CardHeader className="pb-3">
          <CardTitle className="line-clamp-1 text-base">
            {project.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{project.genre}</Badge>
            {project.tone && (
              <Badge variant="outline">{project.tone}</Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" />
            <span>{createdDate}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
