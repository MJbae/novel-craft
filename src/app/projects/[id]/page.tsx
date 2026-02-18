'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Sparkles, Users, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BootstrapDialog } from '@/components/projects/bootstrap-dialog';
import { ExportButton } from '@/components/projects/export-button';
import { toast } from 'sonner';
import type { Project, Character } from '@/types';

const GENRE_OPTIONS = [
  '판타지',
  '로맨스',
  '현대판타지',
  '회귀',
  '무협',
  'SF',
  '스릴러',
  '호러',
] as const;

const ROLE_LABELS: Record<string, string> = {
  main: '주연',
  supporting: '조연',
  minor: '단역',
};

interface ProjectSettingsPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bootstrapOpen, setBootstrapOpen] = useState(false);

  const [name, setName] = useState('');
  const [genre, setGenre] = useState('');
  const [tone, setTone] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [worldbuilding, setWorldbuilding] = useState('');
  const [plotOutline, setPlotOutline] = useState('');

  const populateForm = useCallback((p: Project) => {
    setName(p.name);
    setGenre(p.genre);
    setTone(p.tone ?? '');
    setSynopsis(p.synopsis ?? '');
    setWorldbuilding(p.worldbuilding ?? '');
    setPlotOutline(p.plot_outline ?? '');
  }, []);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error('프로젝트를 불러올 수 없습니다');
      const data: Project = await res.json();
      setProject(data);
      populateForm(data);
    } catch {
      toast.error('프로젝트를 불러오는데 실패했습니다');
    }
  }, [id, populateForm]);

  const fetchCharacters = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}/characters`);
      if (!res.ok) return;
      const data: Character[] = await res.json();
      setCharacters(data);
    } catch {
    }
  }, [id]);

  useEffect(() => {
    Promise.all([fetchProject(), fetchCharacters()]).finally(() =>
      setLoading(false)
    );
  }, [fetchProject, fetchCharacters]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('작품명은 필수입니다');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          genre,
          tone: tone.trim() || undefined,
          synopsis: synopsis.trim() || undefined,
          worldbuilding: worldbuilding.trim() || undefined,
          plot_outline: plotOutline.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error('저장에 실패했습니다');
      const updated: Project = await res.json();
      setProject(updated);
      populateForm(updated);
      toast.success('변경사항이 저장되었습니다');
    } catch {
      toast.error('저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleBootstrapCompleted = () => {
    fetchProject();
    fetchCharacters();
  };

  const handleDeleteProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      toast.success('프로젝트가 삭제되었습니다');
      router.push('/');
    } catch {
      toast.error('삭제에 실패했습니다');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
          <div className="flex gap-2">
            <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
            <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-lg font-medium">프로젝트를 찾을 수 없습니다</p>
        <p className="text-sm text-muted-foreground">
          존재하지 않거나 삭제된 프로젝트입니다.
        </p>
      </div>
    );
  }

  const hasContent = !!(project.synopsis || project.worldbuilding || project.plot_outline);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">프로젝트 설정</h1>
        <div className="flex flex-wrap gap-2">
          <ExportButton projectId={id} projectName={name || project?.name || ''} />
          <Button variant="outline" onClick={() => setBootstrapOpen(true)}>
            <Sparkles className="size-4" />
            부트스트랩 실행
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="size-4" />
            {saving ? '저장 중…' : '저장'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ps-name">작품명</Label>
              <Input
                id="ps-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="작품명을 입력하세요"
                maxLength={200}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="ps-genre">장르</Label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger id="ps-genre" className="w-full">
                    <SelectValue placeholder="장르 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENRE_OPTIONS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="ps-tone">톤/분위기</Label>
                <Input
                  id="ps-tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder="예: 긴장감 넘치는, 유쾌한"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>시놉시스</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Textarea
              id="ps-synopsis"
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder={
                hasContent
                  ? '시놉시스를 작성하세요'
                  : '부트스트랩을 실행하면 AI가 자동으로 생성합니다'
              }
              className="min-h-32"
            />
            <p className="text-xs text-muted-foreground text-right">
              {synopsis.length}자
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>세계관</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Textarea
              id="ps-worldbuilding"
              value={worldbuilding}
              onChange={(e) => setWorldbuilding(e.target.value)}
              placeholder={
                hasContent
                  ? '세계관을 작성하세요'
                  : '부트스트랩을 실행하면 AI가 자동으로 생성합니다'
              }
              className="min-h-32"
            />
            <p className="text-xs text-muted-foreground text-right">
              {worldbuilding.length}자
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>플롯 개요</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Textarea
              id="ps-plot"
              value={plotOutline}
              onChange={(e) => setPlotOutline(e.target.value)}
              placeholder={
                hasContent
                  ? '플롯 개요를 작성하세요'
                  : '부트스트랩을 실행하면 AI가 자동으로 생성합니다'
              }
              className="min-h-32"
            />
            <p className="text-xs text-muted-foreground text-right">
              {plotOutline.length}자
            </p>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              등록된 캐릭터
            </CardTitle>
          </CardHeader>
          <CardContent>
            {characters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {hasContent
                  ? '등록된 캐릭터가 없습니다.'
                  : '부트스트랩을 실행하면 캐릭터가 자동으로 생성됩니다.'}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {characters.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{c.name}</span>
                      <Badge variant="secondary">
                        {ROLE_LABELS[c.role] ?? c.role}
                      </Badge>
                    </div>
                    {c.personality && (
                      <span className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">
                        {c.personality}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">위험 영역</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              프로젝트를 삭제하면 모든 회차, 캐릭터, 생성 데이터가 영구적으로 삭제됩니다.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="shrink-0">
                  <Trash2 className="size-4" />
                  프로젝트 삭제
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>프로젝트 삭제</AlertDialogTitle>
                  <AlertDialogDescription>
                    &apos;{project?.name}&apos; 프로젝트를 삭제하시겠습니까? 모든 회차와 캐릭터 데이터가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleDeleteProject}
                  >
                    삭제
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>

      <BootstrapDialog
        open={bootstrapOpen}
        onOpenChange={setBootstrapOpen}
        projectId={id}
        onCompleted={handleBootstrapCompleted}
      />
    </div>
  );
}
