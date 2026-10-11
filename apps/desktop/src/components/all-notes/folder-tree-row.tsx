import type { ReactElement } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils.ts'

interface FolderTreeRowProps {
  path: string
  depth: number
  expanded: boolean
  onToggle: (path: string) => void
  className?: string
}

/** Keyboard-accessible disclosure for one folder in the virtualized note tree. */
export function FolderTreeRow({
  path,
  depth,
  expanded,
  onToggle,
  className,
}: FolderTreeRowProps): ReactElement {
  const Chevron = expanded ? ChevronDown : ChevronRight
  return (
    <button
      type="button"
      aria-label={`Folder ${path.split('/').at(-1) ?? path}`}
      aria-expanded={expanded}
      onClick={() => onToggle(path)}
      className={cn(
        'flex h-12 w-full items-center gap-2 pr-4 text-left text-sm text-text-secondary hover:bg-surface-hover focus-visible:outline focus-visible:outline-accent',
        className,
      )}
      style={{ paddingLeft: 16 + depth * 20 }}
    >
      <Chevron aria-hidden className="size-4 shrink-0 text-text-muted" />
      <span className="truncate">{path.split('/').at(-1) ?? path}</span>
    </button>
  )
}
