import { useCallback, useEffect, useRef, type MouseEvent, type ReactElement } from 'react'
import { Virtualizer, type VirtualizerHandle } from 'virtua'
import type { NoteListEntry } from '@reflect/core'
import type { ListSelection } from '@/lib/selection/use-list-selection.ts'
import { cn } from '@/lib/utils.ts'
import type { ModClickEvent } from '@/lib/windows/open-in-new-window.ts'
import type { NoteSort } from '@/lib/note-browser.ts'
import { FolderTreeRow } from './folder-tree-row.tsx'
import type { NoteTreeRow } from '@/lib/note-tree.ts'
import { NoteSortHeader } from './note-sort-header.tsx'
import { ALL_NOTES_GRID, AllNotesRow } from './all-notes-row.tsx'

interface AllNotesTableProps {
  /** `undefined` while the index query settles (renders nothing, not "empty"). */
  notes: NoteListEntry[] | undefined
  rows: NoteTreeRow<NoteListEntry>[]
  onToggleFolder: (path: string) => void
  sort: NoteSort
  onSort: (sort: NoteSort) => void
  /** The active tag filter, for the empty state's wording. */
  tag: string | null
  directory?: string | null
  /** The shared row selection (click/keyboard); rows read their selected state from it. */
  selection: ListSelection
  onOpen: (path: string, event?: ModClickEvent) => void
  /**
   * Hand the screen a way to scroll a row index into view — a virtualized
   * off-screen row isn't in the DOM, so the keyboard nav can't `scrollIntoView`
   * it; only the virtualizer's own `scrollToIndex` reaches an unmounted row.
   */
  registerScrollToIndex: (scrollToIndex: (index: number) => void) => void
}

const ESTIMATED_ROW_HEIGHT = 48

/**
 * The All Notes table: a sticky header row over virtualized note rows. The
 * list is uncapped: virtualization keeps a many-thousand-note graph as cheap as
 * a ten-note one, so there is no silent "first N" truncation.
 *
 * Returns a fragment so the list virtualizes against the screen's scroll
 * container (its parent) directly. The header is a leading sibling; `bufferSize`
 * is wide enough to absorb its height so the windowed range never falls short.
 */
export function AllNotesTable({
  notes,
  rows,
  onToggleFolder,
  sort,
  onSort,
  tag,
  directory = null,
  selection,
  onOpen,
  registerScrollToIndex,
}: AllNotesTableProps): ReactElement | null {
  const { clickSelect, isSelected } = selection
  const virtualizerRef = useRef<VirtualizerHandle>(null)
  const handleToggle = useCallback(
    (path: string, event: Pick<MouseEvent, 'shiftKey'>) =>
      clickSelect(
        path,
        event.shiftKey
          ? { metaKey: false, ctrlKey: false, shiftKey: true }
          : { metaKey: true, ctrlKey: true, shiftKey: false },
      ),
    [clickSelect],
  )

  useEffect(() => {
    registerScrollToIndex((index) => {
      if (index >= 0) {
        const noteRow = rows.filter((row) => row.kind === 'note')[index]
        const treeIndex = noteRow === undefined ? -1 : rows.indexOf(noteRow)
        if (treeIndex >= 0) virtualizerRef.current?.scrollToIndex(treeIndex, { align: 'nearest' })
      }
    })
  }, [registerScrollToIndex, rows])

  if (notes === undefined) {
    return null
  }
  return (
    <>
      <NoteSortHeader
        sort={sort}
        onSort={onSort}
        columns={['title', 'snippet', 'tags', 'updated']}
        className={cn(ALL_NOTES_GRID, 'sticky top-0 z-10 shadow-sm')}
      />
      {notes.length === 0 && (
        <p className="py-8 pl-12 pr-7 text-sm text-text-muted">
          {tag === null
            ? directory === null
              ? 'No notes yet.'
              : 'No notes in this folder.'
            : `No notes tagged #${tag}.`}
        </p>
      )}
      <Virtualizer
        ref={virtualizerRef}
        as="ul"
        item="li"
        data={rows}
        itemSize={ESTIMATED_ROW_HEIGHT}
        bufferSize={10 * ESTIMATED_ROW_HEIGHT}
      >
        {(row) =>
          row.kind === 'folder' ? (
            <FolderTreeRow
              key={row.path}
              path={row.path}
              depth={row.depth}
              expanded={row.expanded}
              onToggle={onToggleFolder}
              className="text-[13px]"
            />
          ) : (
            <AllNotesRow
              key={row.note.path}
              note={row.note}
              depth={row.depth}
              selected={isSelected(row.note.path)}
              onSelect={clickSelect}
              onToggle={handleToggle}
              onOpen={onOpen}
            />
          )
        }
      </Virtualizer>
    </>
  )
}
