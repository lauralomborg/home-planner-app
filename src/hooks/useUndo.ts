import { useCallback, useEffect, useRef } from 'react'
import { useFloorPlanStore, useEditorStore } from '@/stores'
import type { FloorPlan } from '@/models'

const MAX_HISTORY_SIZE = 50
const SELECTION_DEBOUNCE_MS = 300

interface HistoryEntry {
  floorPlan: FloorPlan
  selectedIds: string[]
}

interface HistoryState {
  past: HistoryEntry[]
  future: HistoryEntry[]
}

let history: HistoryState = {
  past: [],
  future: [],
}

let lastEntry: HistoryEntry | null = null
let isUndoRedoing = false
let selectionDebounceTimer: ReturnType<typeof setTimeout> | null = null

export function useUndo() {
  const floorPlan = useFloorPlanStore((state) => state.floorPlan)
  const loadFloorPlan = useFloorPlanStore((state) => state.loadFloorPlan)
  const selectedIds = useEditorStore((state) => state.selectedIds)
  const { setCanUndo, setCanRedo, select } = useEditorStore()

  // Track if this is a selection-only change
  const isSelectionOnlyChange = useRef(false)

  // Track changes and add to history
  useEffect(() => {
    if (isUndoRedoing) return

    const currentFloorPlanStr = JSON.stringify(floorPlan)
    const currentSelectedIdsStr = JSON.stringify(selectedIds)
    const lastFloorPlanStr = lastEntry ? JSON.stringify(lastEntry.floorPlan) : null
    const lastSelectedIdsStr = lastEntry ? JSON.stringify(lastEntry.selectedIds) : null

    const floorPlanChanged = currentFloorPlanStr !== lastFloorPlanStr
    const selectionChanged = currentSelectedIdsStr !== lastSelectedIdsStr

    // Nothing changed
    if (!floorPlanChanged && !selectionChanged) return

    // Floor plan changed - record immediately
    if (floorPlanChanged) {
      // Clear any pending selection debounce
      if (selectionDebounceTimer) {
        clearTimeout(selectionDebounceTimer)
        selectionDebounceTimer = null
      }

      if (lastEntry) {
        history.past = [...history.past.slice(-MAX_HISTORY_SIZE + 1), lastEntry]
        history.future = []
      }

      lastEntry = {
        floorPlan: JSON.parse(currentFloorPlanStr) as FloorPlan,
        selectedIds: [...selectedIds],
      }

      setCanUndo(history.past.length > 0)
      setCanRedo(false)
      isSelectionOnlyChange.current = false
    }
    // Selection only changed - debounce to avoid history spam
    else if (selectionChanged) {
      if (selectionDebounceTimer) {
        clearTimeout(selectionDebounceTimer)
      }

      selectionDebounceTimer = setTimeout(() => {
        if (isUndoRedoing) return

        // Only record if we have a previous entry to compare
        if (lastEntry) {
          history.past = [...history.past.slice(-MAX_HISTORY_SIZE + 1), lastEntry]
          history.future = []
        }

        lastEntry = {
          floorPlan: JSON.parse(JSON.stringify(floorPlan)) as FloorPlan,
          selectedIds: [...selectedIds],
        }

        setCanUndo(history.past.length > 0)
        setCanRedo(false)
        isSelectionOnlyChange.current = true
        selectionDebounceTimer = null
      }, SELECTION_DEBOUNCE_MS)
    }
  }, [floorPlan, selectedIds, setCanUndo, setCanRedo])

  const undo = useCallback(() => {
    if (history.past.length === 0) return

    // Clear any pending debounce
    if (selectionDebounceTimer) {
      clearTimeout(selectionDebounceTimer)
      selectionDebounceTimer = null
    }

    isUndoRedoing = true

    // Save current state to future
    const current: HistoryEntry = {
      floorPlan: JSON.parse(JSON.stringify(useFloorPlanStore.getState().floorPlan)),
      selectedIds: [...useEditorStore.getState().selectedIds],
    }
    history.future = [current, ...history.future]

    // Restore previous state
    const previous = history.past[history.past.length - 1]
    history.past = history.past.slice(0, -1)

    loadFloorPlan(JSON.parse(JSON.stringify(previous.floorPlan)))
    select(previous.selectedIds)
    lastEntry = JSON.parse(JSON.stringify(previous))

    // Update UI state
    setCanUndo(history.past.length > 0)
    setCanRedo(history.future.length > 0)

    setTimeout(() => {
      isUndoRedoing = false
    }, 0)
  }, [loadFloorPlan, select, setCanUndo, setCanRedo])

  const redo = useCallback(() => {
    if (history.future.length === 0) return

    // Clear any pending debounce
    if (selectionDebounceTimer) {
      clearTimeout(selectionDebounceTimer)
      selectionDebounceTimer = null
    }

    isUndoRedoing = true

    // Save current state to past
    const current: HistoryEntry = {
      floorPlan: JSON.parse(JSON.stringify(useFloorPlanStore.getState().floorPlan)),
      selectedIds: [...useEditorStore.getState().selectedIds],
    }
    history.past = [...history.past, current]

    // Restore next state
    const next = history.future[0]
    history.future = history.future.slice(1)

    loadFloorPlan(JSON.parse(JSON.stringify(next.floorPlan)))
    select(next.selectedIds)
    lastEntry = JSON.parse(JSON.stringify(next))

    // Update UI state
    setCanUndo(history.past.length > 0)
    setCanRedo(history.future.length > 0)

    setTimeout(() => {
      isUndoRedoing = false
    }, 0)
  }, [loadFloorPlan, select, setCanUndo, setCanRedo])

  const clearHistory = useCallback(() => {
    if (selectionDebounceTimer) {
      clearTimeout(selectionDebounceTimer)
      selectionDebounceTimer = null
    }
    history = { past: [], future: [] }
    lastEntry = null
    setCanUndo(false)
    setCanRedo(false)
  }, [setCanUndo, setCanRedo])

  return { undo, redo, clearHistory }
}

export function useKeyboardShortcuts() {
  const { undo, redo } = useUndo()
  const { setActiveTool, clearSelection, toggleGrid, toggleSnapToGrid } = useEditorStore()
  const { removeSelected } = useFloorPlanStore()
  const selectedIds = useEditorStore((state) => state.selectedIds)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      const isMeta = e.metaKey || e.ctrlKey

      // Undo: Cmd/Ctrl + Z
      if (isMeta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
      if ((isMeta && e.key === 'z' && e.shiftKey) || (isMeta && e.key === 'y')) {
        e.preventDefault()
        redo()
        return
      }

      // Tool shortcuts (no modifier)
      if (!isMeta && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'v':
            setActiveTool('select')
            break
          case 'w':
            setActiveTool('wall')
            break
          case 'r':
            setActiveTool('room')
            break
          case 'f':
            setActiveTool('furniture')
            break
          case 'd':
            setActiveTool('door')
            break
          case 'l':
            setActiveTool('light')
            break
          case 'm':
            setActiveTool('measure')
            break
          case 'h':
            setActiveTool('pan')
            break
          case 'g':
            toggleGrid()
            break
          case 's':
            if (!isMeta) {
              toggleSnapToGrid()
            }
            break
          case 'escape':
            clearSelection()
            setActiveTool('select')
            break
          case 'delete':
          case 'backspace':
            if (selectedIds.length > 0) {
              e.preventDefault()
              removeSelected(selectedIds)
              clearSelection()
            }
            break
        }
      }

      // Select all: Cmd/Ctrl + A
      if (isMeta && e.key === 'a') {
        e.preventDefault()
        const allIds = [
          ...useFloorPlanStore.getState().floorPlan.walls.map(w => w.id),
          ...useFloorPlanStore.getState().floorPlan.furniture.map(f => f.id),
        ]
        useEditorStore.getState().select(allIds)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, setActiveTool, clearSelection, toggleGrid, toggleSnapToGrid, selectedIds, removeSelected])
}
