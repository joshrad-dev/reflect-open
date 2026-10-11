import { useCallback, useMemo, useState } from 'react'
import { buildNoteTree, type NoteTreeRow } from '@/lib/note-tree.ts'
import type { NoteSort } from '@/lib/note-browser.ts'

interface NoteTreeState<Note extends { readonly path: string }> {
  rows: NoteTreeRow<Note>[]
  toggleFolder: (path: string) => void
}

/** Folders start expanded; explicit collapses survive filtering and sorting. */
export function useNoteTree<Note extends { readonly path: string }>(
  notes: readonly Note[],
  paths: readonly string[],
  directory: string | null,
  sort?: NoteSort,
): NoteTreeState<Note> {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set())
  const toggleFolder = useCallback((path: string) => {
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])
  const rows = useMemo(
    () =>
      buildNoteTree(
        notes,
        paths,
        collapsed,
        directory,
        sort?.column === 'title' && sort.direction === 'descending',
      ),
    [notes, paths, collapsed, directory, sort],
  )
  return { rows, toggleFolder }
}
