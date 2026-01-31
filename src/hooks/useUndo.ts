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
  const isDragging = useEditorStore((state) => state.isDragging)
  const { setCanUndo, setCanRedo, select } = useEditorStore()

  // Track if this is a selection-only change
  const isSelectionOnlyChange = useRef(false)

  // Track changes and add to history
  useEffect(() => {
    if (isUndoRedoing) return
    if (isDragging) return  // Skip history capture during drag operations

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
  }, [floorPlan, selectedIds, isDragging, setCanUndo, setCanRedo])

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
  const { setActiveTool, clearSelection, toggleGrid, toggleSnapToGrid, copyToClipboard, select, exitGroupEdit } = useEditorStore()
  const { removeSelected, duplicateMultiple, moveMultipleFurniture, createGroup, dissolveGroup, getGroupForItem } = useFloorPlanStore()
  const selectedIds = useEditorStore((state) => state.selectedIds)
  const clipboard = useEditorStore((state) => state.clipboard)
  const editingGroupId = useEditorStore((state) => state.editingGroupId)
  const activeView = useEditorStore((state) => state.activeView)

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

      // Copy: Cmd/Ctrl + C
      if (isMeta && e.key === 'c') {
        e.preventDefault()
        if (selectedIds.length > 0) {
          const floorPlan = useFloorPlanStore.getState().floorPlan
          const furnitureItems = floorPlan.furniture
            .filter((f) => selectedIds.includes(f.id))
            .map((f) => ({
              catalogItemId: f.catalogItemId,
              position: { ...f.position },
              rotation: f.rotation,
              dimensions: { ...f.dimensions },
              partMaterials: { ...f.partMaterials },
              locked: f.locked,
            }))
          if (furnitureItems.length > 0) {
            copyToClipboard({ furnitureItems })
          }
        }
        return
      }

      // Cut: Cmd/Ctrl + X
      if (isMeta && e.key === 'x') {
        e.preventDefault()
        if (selectedIds.length > 0) {
          const floorPlan = useFloorPlanStore.getState().floorPlan
          const furnitureItems = floorPlan.furniture
            .filter((f) => selectedIds.includes(f.id))
            .map((f) => ({
              catalogItemId: f.catalogItemId,
              position: { ...f.position },
              rotation: f.rotation,
              dimensions: { ...f.dimensions },
              partMaterials: { ...f.partMaterials },
              locked: f.locked,
            }))
          if (furnitureItems.length > 0) {
            copyToClipboard({ furnitureItems })
          }
          removeSelected(selectedIds)
          clearSelection()
        }
        return
      }

      // Paste: Cmd/Ctrl + V
      if (isMeta && e.key === 'v') {
        e.preventDefault()
        if (clipboard && clipboard.furnitureItems.length > 0) {
          const { addFurniture } = useFloorPlanStore.getState()
          const newIds: string[] = []
          for (const item of clipboard.furnitureItems) {
            const id = addFurniture({
              catalogItemId: item.catalogItemId,
              position: { x: item.position.x + 50, y: item.position.y + 50 },
              rotation: item.rotation,
              dimensions: { ...item.dimensions },
              partMaterials: { ...item.partMaterials },
              locked: false,
            })
            newIds.push(id)
          }
          select(newIds)
        }
        return
      }

      // Duplicate: Cmd/Ctrl + D
      if (isMeta && e.key === 'd') {
        e.preventDefault()
        if (selectedIds.length > 0) {
          const newIds = duplicateMultiple(selectedIds)
          select(newIds)
        }
        return
      }

      // Group: Cmd/Ctrl + G
      if (isMeta && e.key === 'g' && !e.shiftKey) {
        e.preventDefault()
        if (selectedIds.length >= 2) {
          const groupId = createGroup(selectedIds)
          if (groupId) {
            // Keep the items selected after grouping
            select(selectedIds)
          }
        }
        return
      }

      // Ungroup: Cmd/Ctrl + Shift + G
      if (isMeta && e.key === 'g' && e.shiftKey) {
        e.preventDefault()
        if (selectedIds.length > 0) {
          // Find all unique groups from selected items
          const groupIds = new Set<string>()
          for (const id of selectedIds) {
            const group = getGroupForItem(id)
            if (group) {
              groupIds.add(group.id)
            }
          }
          // Dissolve all found groups
          for (const groupId of groupIds) {
            dissolveGroup(groupId)
          }
        }
        return
      }

      // Arrow keys for nudge (no modifier = 1px, shift = 10px)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !isMeta) {
        if (selectedIds.length > 0) {
          e.preventDefault()
          const amount = e.shiftKey ? 10 : 1
          const delta = {
            x: e.key === 'ArrowLeft' ? -amount : e.key === 'ArrowRight' ? amount : 0,
            y: e.key === 'ArrowUp' ? -amount : e.key === 'ArrowDown' ? amount : 0,
          }
          moveMultipleFurniture(selectedIds, delta)
        }
        return
      }

      // Tool shortcuts (no modifier) - only in 2D mode
      // In 3D mode, these keys (WASD etc.) are used for walkthrough movement
      if (!isMeta && !e.altKey && activeView === '2d') {
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
            if (editingGroupId) {
              exitGroupEdit()
            } else {
              clearSelection()
              setActiveTool('select')
            }
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
  }, [undo, redo, setActiveTool, clearSelection, toggleGrid, toggleSnapToGrid, selectedIds, removeSelected, copyToClipboard, clipboard, duplicateMultiple, moveMultipleFurniture, select, createGroup, dissolveGroup, getGroupForItem, editingGroupId, exitGroupEdit, activeView])
}
