'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { TopNav } from '@/components/layout/top-nav';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import type { Project } from '@/types';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const projectIdFromPath = extractProjectId(pathname);
  const selectedProject =
    projects.find((p) => p.id === projectIdFromPath) ?? null;

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data: Project[]) => setProjects(data))
      .catch(() => {});
  }, []);

  const handleSelectProject = useCallback(
    (id: string | null) => {
      if (id) {
        router.push(`/projects/${id}`);
      } else {
        router.push('/');
      }
    },
    [router]
  );

  const isDashboard = pathname === '/';

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopNav
        projects={projects}
        selectedProjectId={selectedProject?.id ?? null}
        onSelectProject={handleSelectProject}
        onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {!isDashboard && (
          <div className="hidden md:flex">
            <Sidebar
              projectId={selectedProject?.id ?? null}
              projectName={selectedProject?.name ?? null}
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed((prev) => !prev)}
            />
          </div>
        )}

        {!isDashboard && (
          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetContent side="left" className="w-56 p-0" showCloseButton={false}>
              <SheetTitle className="sr-only">사이드바 내비게이션</SheetTitle>
              <Sidebar
                projectId={selectedProject?.id ?? null}
                projectName={selectedProject?.name ?? null}
                collapsed={false}
                onToggle={() => setMobileSidebarOpen(false)}
                onNavigate={() => setMobileSidebarOpen(false)}
              />
            </SheetContent>
          </Sheet>
        )}

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function extractProjectId(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match ? match[1] : null;
}
