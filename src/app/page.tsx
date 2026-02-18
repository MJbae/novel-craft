'use client';

import { useEffect, useState } from 'react';
import { Plus, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ProjectCard } from '@/components/projects/project-card';
import { ProjectForm } from '@/components/projects/project-form';
import type { Project } from '@/types';

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data: Project[]) => setProjects(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreated = (project: Project) => {
    setProjects((prev) => [project, ...prev]);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success('프로젝트가 삭제되었습니다');
    } catch {
      toast.error('삭제에 실패했습니다');
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">내 프로젝트</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          새 프로젝트
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border bg-muted"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-20 text-center">
          <BookOpen className="size-10 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">프로젝트가 없습니다</p>
            <p className="text-sm text-muted-foreground">
              새 프로젝트를 만들어 웹소설 집필을 시작하세요.
            </p>
          </div>
          <Button variant="outline" onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            첫 프로젝트 만들기
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <ProjectForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}
