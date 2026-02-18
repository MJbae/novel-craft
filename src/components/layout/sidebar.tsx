'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Settings,
  Users,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  projectId: string | null;
  projectName: string | null;
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}

const NAV_ITEMS = [
  { label: '프로젝트 설정', icon: Settings, segment: '' },
  { label: '캐릭터', icon: Users, segment: '/characters' },
  { label: '회차 목록', icon: BookOpen, segment: '/episodes' },
] as const;

export function Sidebar({
  projectId,
  projectName,
  collapsed,
  onToggle,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      <div className="flex h-14 items-center justify-between gap-2 px-3">
        {!collapsed && (
          <span className="truncate text-sm font-semibold">
            {projectName ?? '프로젝트를 선택하세요'}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onToggle}
          className="ml-auto shrink-0"
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </Button>
      </div>

      <Separator />

      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {projectId ? (
            NAV_ITEMS.map(({ label, icon: Icon, segment }) => {
              const href = `/projects/${projectId}${segment}`;
              const isActive =
                segment === ''
                  ? pathname === href
                  : pathname.startsWith(href);

              return (
                <Link key={segment} href={href} onClick={onNavigate}>
                  <span
                    className={cn(
                      'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </span>
                </Link>
              );
            })
          ) : (
            <span
              className={cn(
                'px-2 py-2 text-sm text-muted-foreground',
                collapsed && 'sr-only'
              )}
            >
              프로젝트를 먼저 선택하세요
            </span>
          )}
        </nav>
      </ScrollArea>
    </aside>
  );
}
