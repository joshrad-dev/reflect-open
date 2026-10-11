import { useId, type ReactElement } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { nextNoteSort, type NoteSort, type NoteSortColumn } from '@/lib/note-browser.ts'
import { cn } from '@/lib/utils.ts'

interface NoteSortHeaderProps {
  sort: NoteSort
  onSort: (sort: NoteSort) => void
  columns: readonly NoteSortColumn[]
  className?: string
}

const LABELS: Record<NoteSortColumn, string> = {
  title: 'Title',
  snippet: 'Snippet',
  tags: 'Tags',
  updated: 'Updated',
}

/** Clickable column labels with the active sort direction visible and announced. */
export function NoteSortHeader({
  sort,
  onSort,
  columns,
  className,
}: NoteSortHeaderProps): ReactElement {
  const descriptionId = useId()
  return (
    <div
      role="group"
      aria-label="Sort notes"
      className={cn(
        'border-b border-border bg-surface py-3 text-[13px] font-medium text-text-secondary',
        className,
      )}
    >
      {columns.map((column) => (
        <button
          key={column}
          type="button"
          aria-label={LABELS[column]}
          aria-pressed={sort.column === column}
          aria-describedby={sort.column === column ? `${descriptionId}-${column}` : undefined}
          title={
            sort.column === column
              ? `Sorted ${sort.direction}; click to reverse`
              : `Sort by ${LABELS[column].toLowerCase()}`
          }
          onClick={() => onSort(nextNoteSort(sort, column))}
          className={cn(
            'flex items-center gap-1 text-left hover:text-text focus-visible:outline-accent',
            column === 'updated' || column === 'tags' ? 'justify-end' : '',
          )}
        >
          {LABELS[column]}
          {sort.column === column &&
            (sort.direction === 'ascending' ? (
              <ArrowUp aria-hidden className="size-3" />
            ) : (
              <ArrowDown aria-hidden className="size-3" />
            ))}
          {sort.column === column && (
            <span id={`${descriptionId}-${column}`} className="sr-only">
              Sorted {sort.direction}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
