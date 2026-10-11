import { describe, expect, it } from 'vitest'
import { buildNoteTree } from './note-tree.ts'

const notes = [
  { path: 'notes/z.md' },
  { path: 'daily/2026-10-11.md' },
  { path: 'notes/projects/plan.md' },
  { path: 'notes/a.md' },
  { path: 'loose.md' },
]
const paths = notes.map((note) => note.path)

describe('buildNoteTree', () => {
  it('nests every note once under its parent and preserves note ordering within folders', () => {
    expect(buildNoteTree(notes, paths, new Set())).toEqual([
      { kind: 'folder', path: 'daily', depth: 0, expanded: true },
      { kind: 'note', note: notes[1], depth: 1 },
      { kind: 'folder', path: 'notes', depth: 0, expanded: true },
      { kind: 'folder', path: 'notes/projects', depth: 1, expanded: true },
      { kind: 'note', note: notes[2], depth: 2 },
      { kind: 'note', note: notes[0], depth: 1 },
      { kind: 'note', note: notes[3], depth: 1 },
      { kind: 'note', note: notes[4], depth: 0 },
    ])
  })

  it('hides all descendants of a collapsed folder without hiding its siblings', () => {
    const rows = buildNoteTree(notes, paths, new Set(['notes']))
    expect(rows.filter((row) => row.kind === 'note').map((row) => row.note.path)).toEqual([
      'daily/2026-10-11.md',
      'loose.md',
    ])
    expect(rows.some((row) => row.kind === 'folder' && row.path === 'notes/projects')).toBe(false)
  })

  it('supports scoped trees and folders whose notes are filtered out', () => {
    expect(buildNoteTree([], paths, new Set(), 'notes')).toEqual([
      { kind: 'folder', path: 'notes/projects', depth: 0, expanded: true },
    ])
    expect(
      buildNoteTree(notes, paths, new Set(['notes/projects']), 'notes')
        .filter((row) => row.kind === 'note')
        .map((row) => row.note.path),
    ).toEqual(['notes/z.md', 'notes/a.md'])
  })
})
