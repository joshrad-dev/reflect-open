import { describe, expect, it } from 'vitest'
import { routesEqual } from '@/routing/route.ts'
import {
  DEFAULT_NOTE_SORT,
  dailyDateForNotePath,
  nextNoteSort,
  noteDirectories,
  noteInDirectory,
  sortNotes,
} from './note-browser.ts'

describe('note browser', () => {
  const paths = ['daily/2026-06-09.md', 'notes/work.md', 'notes/projects/plan.md', 'other/a.md']

  it('shows saved notes together at the root and direct children within folders', () => {
    expect(paths.filter((path) => noteInDirectory(path, null))).toEqual(paths)
    expect(paths.filter((path) => noteInDirectory(path, 'notes'))).toEqual(['notes/work.md'])
    expect(paths.filter((path) => noteInDirectory(path, 'notes/projects'))).toEqual([
      'notes/projects/plan.md',
    ])
    expect(noteInDirectory('notes-archive/work.md', 'notes')).toBe(false)
  })

  it('offers the standard folders even when empty and supports nested imported folders', () => {
    expect(noteDirectories([], null)).toEqual(['daily', 'notes'])
    expect(noteDirectories(paths, null)).toEqual(['daily', 'notes', 'other'])
    expect(noteDirectories(paths, 'notes')).toEqual(['notes/projects'])
    expect(noteDirectories(paths, 'notes/projects')).toEqual([])
  })

  it('gives each folder a distinct route identity while treating the root consistently', () => {
    expect(
      routesEqual(
        { kind: 'allNotes', tag: null },
        { kind: 'allNotes', tag: null, directory: null },
      ),
    ).toBe(true)
    expect(
      routesEqual(
        { kind: 'allNotes', tag: null, directory: 'notes' },
        { kind: 'allNotes', tag: null, directory: 'daily' },
      ),
    ).toBe(false)
  })

  it('only gives real calendar dates daily-note behavior', () => {
    expect(dailyDateForNotePath('daily/2026-06-09.md')).toBe('2026-06-09')
    expect(dailyDateForNotePath('daily/2026-02-31.md')).toBeNull()
    expect(dailyDateForNotePath('notes/work.md')).toBeNull()
  })

  it('toggles columns and sorts actual dates, text, and tags without changing cached rows', () => {
    const notes = [
      { path: 'notes/z.md', title: 'Note 10', snippet: 'Alpha', tags: ['work'], mtime: 100 },
      { path: 'notes/a.md', title: 'Note 2', snippet: 'Beta', tags: ['book'], mtime: 200 },
    ]
    expect(nextNoteSort(DEFAULT_NOTE_SORT, 'updated')).toEqual({
      column: 'updated',
      direction: 'ascending',
    })
    const titleSort = nextNoteSort(DEFAULT_NOTE_SORT, 'title')
    expect(titleSort).toEqual({ column: 'title', direction: 'ascending' })
    expect(sortNotes(notes, titleSort).map((note) => note.path)).toEqual([
      'notes/a.md',
      'notes/z.md',
    ])
    expect(sortNotes(notes, nextNoteSort(titleSort, 'title')).map((note) => note.path)).toEqual([
      'notes/z.md',
      'notes/a.md',
    ])
    expect(sortNotes(notes, DEFAULT_NOTE_SORT).map((note) => note.mtime)).toEqual([200, 100])
    expect(
      sortNotes(notes, nextNoteSort(DEFAULT_NOTE_SORT, 'updated')).map((note) => note.mtime),
    ).toEqual([100, 200])
    expect(
      sortNotes(notes, { column: 'snippet', direction: 'ascending' }).map((note) => note.snippet),
    ).toEqual(['Alpha', 'Beta'])
    expect(
      sortNotes(notes, { column: 'tags', direction: 'ascending' }).map((note) => note.tags),
    ).toEqual([['book'], ['work']])
    expect(notes.map((note) => note.path)).toEqual(['notes/z.md', 'notes/a.md'])
  })

  it('preserves sort choices as distinct history entries', () => {
    expect(
      routesEqual(
        { kind: 'allNotes', tag: null },
        { kind: 'allNotes', tag: null, sort: DEFAULT_NOTE_SORT },
      ),
    ).toBe(true)
    expect(
      routesEqual(
        { kind: 'allNotes', tag: null, sort: DEFAULT_NOTE_SORT },
        { kind: 'allNotes', tag: null, sort: nextNoteSort(DEFAULT_NOTE_SORT, 'updated') },
      ),
    ).toBe(false)
  })
})
