import { create } from 'zustand'
import type { FloorPlan } from '@/models'

const MAX_HISTORY_SIZE = 50

interface HistoryEntry {
  floorPlan: FloorPlan
  selectedIds: string[]
}

interface HistoryState {
  past: HistoryEntry[]
  future: HistoryEntry[]
  lastEntry: HistoryEntry | null
  isUndoRedoing: boolean
  selectionDebounceTimer: ReturnType<typeof setTimeout> | null

  // Actions
  pushEntry: (entry: HistoryEntry) => void
  undo: () => HistoryEntry | null
  redo: () => HistoryEntry | null
  clearHistory: () => void
  setIsUndoRedoing: (value: boolean) => void
  setLastEntry: (entry: HistoryEntry | null) => void
  setSelectionDebounceTimer: (timer: ReturnType<typeof setTimeout> | null) => void
  clearDebounceTimer: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  lastEntry: null,
  isUndoRedoing: false,
  selectionDebounceTimer: null,

  pushEntry: (entry) => {
    const { lastEntry } = get()
    set((state) => ({
      past: lastEntry
        ? [...state.past.slice(-MAX_HISTORY_SIZE + 1), lastEntry]
        : state.past,
      future: [],
      lastEntry: entry,
    }))
  },

  undo: () => {
    const { past, lastEntry } = get()
    if (past.length === 0) return null

    const previous = past[past.length - 1]

    set((state) => ({
      past: state.past.slice(0, -1),
      future: lastEntry ? [lastEntry, ...state.future] : state.future,
      lastEntry: structuredClone(previous),
      isUndoRedoing: true,
    }))

    // Reset isUndoRedoing after the state update propagates
    setTimeout(() => {
      set({ isUndoRedoing: false })
    }, 0)

    return previous
  },

  redo: () => {
    const { future, lastEntry } = get()
    if (future.length === 0) return null

    const next = future[0]

    set((state) => ({
      past: lastEntry ? [...state.past, lastEntry] : state.past,
      future: state.future.slice(1),
      lastEntry: structuredClone(next),
      isUndoRedoing: true,
    }))

    // Reset isUndoRedoing after the state update propagates
    setTimeout(() => {
      set({ isUndoRedoing: false })
    }, 0)

    return next
  },

  clearHistory: () => {
    const { selectionDebounceTimer } = get()
    if (selectionDebounceTimer) {
      clearTimeout(selectionDebounceTimer)
    }
    set({
      past: [],
      future: [],
      lastEntry: null,
      selectionDebounceTimer: null,
    })
  },

  setIsUndoRedoing: (value) => set({ isUndoRedoing: value }),

  setLastEntry: (entry) => set({ lastEntry: entry }),

  setSelectionDebounceTimer: (timer) => set({ selectionDebounceTimer: timer }),

  clearDebounceTimer: () => {
    const { selectionDebounceTimer } = get()
    if (selectionDebounceTimer) {
      clearTimeout(selectionDebounceTimer)
      set({ selectionDebounceTimer: null })
    }
  },

  canUndo: () => get().past.length > 0,

  canRedo: () => get().future.length > 0,
}))
