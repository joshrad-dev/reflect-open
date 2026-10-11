import { useState, type ReactElement } from 'react'
import { Virtualizer } from 'virtua'
import { useQueryClient } from '@tanstack/react-query'
import { FolderTreeRow } from '@/components/all-notes/folder-tree-row.tsx'
import { useNoteTree } from '@/hooks/use-note-tree.ts'
import type { NoteSort } from '@/lib/note-browser.ts'
import { toggleNotePinned } from '@/lib/note-pin.ts'
import { NoteDeleteDrawer } from '@/mobile/note-delete-drawer.tsx'
import {
  NOTE_ROW_HEIGHT,
  SwipeableNoteRow,
  type NoteRowModel,
} from '@/mobile/swipeable-note-row.tsx'
import { useGraph } from '@/providers/graph-provider.tsx'

interface NoteRowListProps {
  rows: NoteRowModel[]
  paths?: readonly string[]
  directory?: string | null
  sort?: NoteSort
  emptyMessage?: string | undefined
  onOpen: (path: string) => void
  /** Called after a swipe action successfully deletes a row. */
  onDeleted: (path: string) => void
}

/**
 * The All tab's virtualized note list: fixed-height rows (title, first
 * content line, relative timestamp, a pin marker on pinned notes) shared by
 * the plain list, the filtered feed, and search results — V1's one row shape.
 */
export function NoteRowList({
  rows,
  paths = [],
  directory = null,
  sort,
  emptyMessage,
  onOpen,
  onDeleted,
}: NoteRowListProps): ReactElement {
  const tree = useNoteTree(rows, paths, directory, sort)
  const { graph } = useGraph()
  const queryClient = useQueryClient()
  const [revealedPath, setRevealedPath] = useState<string | null>(null)
  const [deletePath, setDeletePath] = useState<string | null>(null)

  const togglePin = (row: NoteRowModel): void => {
    if (graph !== null) {
      void toggleNotePinned({
        queryClient,
        root: graph.root,
        generation: graph.generation,
        path: row.path,
      })
    }
  }

  return (
    <>
      <div
        className="min-h-0 flex-1 overflow-y-auto"
        // Keyboard avoidance is the shell root's job (it ends at the keyboard's
        // top); this only clears the home indicator when the keyboard is down.
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onScroll={() => setRevealedPath(null)}
      >
        {rows.length === 0 && emptyMessage !== undefined && (
          <p className="px-4 py-8 text-sm text-text-muted">{emptyMessage}</p>
        )}
        <Virtualizer as="ul" item="li" data={tree.rows} itemSize={NOTE_ROW_HEIGHT} bufferSize={640}>
          {(entry) => {
            if (entry.kind === 'folder')
              return (
                <FolderTreeRow
                  key={entry.path}
                  path={entry.path}
                  depth={entry.depth}
                  expanded={entry.expanded}
                  onToggle={tree.toggleFolder}
                />
              )
            const row = entry.note
            return (
              <SwipeableNoteRow
                key={row.path}
                row={row}
                depth={entry.depth}
                revealed={revealedPath === row.path}
                onReveal={() => setRevealedPath(row.path)}
                onClose={() => setRevealedPath(null)}
                onBeginInteraction={() =>
                  setRevealedPath((current) => (current === row.path ? current : null))
                }
                onOpen={() => onOpen(row.path)}
                onTogglePin={() => togglePin(row)}
                onDelete={() => {
                  setRevealedPath(null)
                  setDeletePath(row.path)
                }}
              />
            )
          }}
        </Virtualizer>
      </div>
      {deletePath !== null ? (
        <NoteDeleteDrawer
          key={deletePath}
          path={deletePath}
          open
          onOpenChange={(open) => {
            if (!open) {
              setDeletePath(null)
            }
          }}
          onDeleted={() => onDeleted(deletePath)}
        />
      ) : null}
    </>
  )
}
