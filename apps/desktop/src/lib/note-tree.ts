interface PathedNote {
  readonly path: string
}

export type NoteTreeRow<Note extends PathedNote> =
  | {
      readonly kind: 'folder'
      readonly path: string
      readonly depth: number
      readonly expanded: boolean
    }
  | { readonly kind: 'note'; readonly note: Note; readonly depth: number }

interface Folder<Note> {
  path: string
  folders: Map<string, Folder<Note>>
  notes: Note[]
}

/** Flatten expanded folders for virtualization, preserving sorted notes within each folder. */
export function buildNoteTree<Note extends PathedNote>(
  notes: readonly Note[],
  paths: readonly string[],
  collapsed: ReadonlySet<string>,
  directory: string | null = null,
  descendingFolders = false,
): NoteTreeRow<Note>[] {
  const root: Folder<Note> = { path: directory ?? '', folders: new Map(), notes: [] }
  const prefix = directory === null ? '' : `${directory}/`
  function parentFor(path: string): Folder<Note> | null {
    if (!path.startsWith(prefix)) return null
    const segments = path.slice(prefix.length).split('/').slice(0, -1)
    let parent = root
    for (const segment of segments) {
      const folderPath = parent.path === '' ? segment : `${parent.path}/${segment}`
      let folder = parent.folders.get(segment)
      if (folder === undefined) {
        folder = { path: folderPath, folders: new Map(), notes: [] }
        parent.folders.set(segment, folder)
      }
      parent = folder
    }
    return parent
  }
  if (directory === null) {
    parentFor('daily/placeholder.md')
    parentFor('notes/placeholder.md')
  }
  for (const path of paths) parentFor(path)
  for (const note of notes) parentFor(note.path)?.notes.push(note)
  const rows: NoteTreeRow<Note>[] = []
  function visit(folder: Folder<Note>, depth: number): void {
    const folders = [...folder.folders.values()].sort(
      (first, second) =>
        first.path.localeCompare(second.path, undefined, { numeric: true, sensitivity: 'base' }) *
        (descendingFolders ? -1 : 1),
    )
    for (const child of folders) {
      const expanded = !collapsed.has(child.path)
      rows.push({ kind: 'folder', path: child.path, depth, expanded })
      if (expanded) visit(child, depth + 1)
    }
    for (const note of folder.notes) rows.push({ kind: 'note', note, depth })
  }
  visit(root, 0)
  return rows
}
