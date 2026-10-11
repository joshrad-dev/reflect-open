import type { ReactElement } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'

interface NoteBreadcrumbsProps {
  directory: string | null
  onNavigate: (directory: string | null) => void
}

/** Shared desktop/mobile breadcrumbs for the graph's note folders. */
export function NoteBreadcrumbs({ directory, onNavigate }: NoteBreadcrumbsProps): ReactElement {
  const segments = directory?.split('/') ?? []

  return (
    <nav aria-label="Note breadcrumbs" className="flex min-w-0 flex-wrap items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(null)}
        aria-current={directory === null ? 'page' : undefined}
      >
        All notes
      </Button>
      {segments.map((segment, index) => {
        const path = segments.slice(0, index + 1).join('/')
        return (
          <span key={path} className="flex min-w-0 items-center gap-1">
            <ChevronRight aria-hidden className="size-3 text-text-muted" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate(path)}
              aria-current={path === directory ? 'page' : undefined}
            >
              {segment}/
            </Button>
          </span>
        )
      })}
    </nav>
  )
}
