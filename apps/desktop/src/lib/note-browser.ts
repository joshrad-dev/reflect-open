import { dateFromDailyPath, displayNoteTitle, isDaily } from '@reflect/core'
import { isIsoDate } from '@/lib/dates.ts'

export type NoteSortColumn = 'title' | 'snippet' | 'tags' | 'updated'

/** A note browser's selected column and ordering, preserved in route history. */
export interface NoteSort {
  readonly column: NoteSortColumn
  readonly direction: 'ascending' | 'descending'
}

export const DEFAULT_NOTE_SORT: NoteSort = { column: 'updated', direction: 'descending' }

interface SortableNote {
  readonly path: string
  readonly title: string
  readonly snippet: string
  readonly tags: readonly string[]
  readonly mtime: number
}

/** Toggle the active column, or start text ascending and dates newest first. */
export function nextNoteSort(sort: NoteSort, column: NoteSortColumn): NoteSort {
  return {
    column,
    direction:
      sort.column === column
        ? sort.direction === 'ascending'
          ? 'descending'
          : 'ascending'
        : column === 'updated'
          ? 'descending'
          : 'ascending',
  }
}

/** Sort saved notes without mutating query-cache data; paths break equal-value ties. */
export function sortNotes<Note extends SortableNote>(
  notes: readonly Note[],
  sort: NoteSort,
): Note[] {
  const direction = sort.direction === 'ascending' ? 1 : -1
  return [...notes].sort((first, second) => {
    let comparison: number
    switch (sort.column) {
      case 'updated':
        comparison = first.mtime - second.mtime
        break
      case 'title':
        comparison = displayNoteTitle(first.title).localeCompare(
          displayNoteTitle(second.title),
          undefined,
          { numeric: true, sensitivity: 'base' },
        )
        break
      case 'snippet':
        comparison = first.snippet.localeCompare(second.snippet, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
        break
      case 'tags':
        comparison = first.tags
          .join(' ')
          .localeCompare(second.tags.join(' '), undefined, { numeric: true, sensitivity: 'base' })
        break
    }
    return comparison * direction || first.path.localeCompare(second.path)
  })
}

/** The valid calendar date of a daily note, or null for an ordinary note. */
export function dailyDateForNotePath(path: string): string | null {
  const date = isDaily(path) ? dateFromDailyPath(path) : null
  return date !== null && isIsoDate(date) ? date : null
}

/** The immediate subdirectories of a directory, derived from saved note paths. */
export function noteDirectories(paths: readonly string[], directory: string | null): string[] {
  const prefix = directory === null ? '' : `${directory}/`
  const directories = new Set<string>(directory === null ? ['daily', 'notes'] : [])
  for (const path of paths) {
    if (!path.startsWith(prefix)) {
      continue
    }
    const relative = path.slice(prefix.length)
    const separator = relative.indexOf('/')
    if (separator > 0) {
      directories.add(`${prefix}${relative.slice(0, separator)}`)
    }
  }
  return [...directories].sort((first, second) => first.localeCompare(second))
}

/** Whether a saved note is a direct child of the browsed directory. Null includes all notes. */
export function noteInDirectory(path: string, directory: string | null): boolean {
  if (directory === null) {
    return true
  }
  const prefix = `${directory}/`
  return path.startsWith(prefix) && !path.slice(prefix.length).includes('/')
}
