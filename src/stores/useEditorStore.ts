import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { EditorTool, ViewMode, Point2D } from '@/models'

interface EditorState {
  // View state
  activeView: ViewMode
  zoom2D: number
  pan2D: Point2D
  showGrid: boolean
  snapToGrid: boolean
  showDimensions: boolean

  // Tool state
  activeTool: EditorTool
  isDrawingWall: boolean
  wallDrawStart: Point2D | null
  wallDrawPreview: Point2D | null

  // Selection state
  selectedIds: string[]
  hoveredId: string | null

  // History (for undo/redo)
  canUndo: boolean
  canRedo: boolean

  // View actions
  setActiveView: (view: ViewMode) => void
  setZoom2D: (zoom: number) => void
  setPan2D: (pan: Point2D) => void
  resetView: () => void
  toggleGrid: () => void
  toggleSnapToGrid: () => void
  toggleDimensions: () => void

  // Tool actions
  setActiveTool: (tool: EditorTool) => void
  startWallDraw: (position: Point2D) => void
  updateWallDrawPreview: (position: Point2D | null) => void
  finishWallDraw: () => void
  cancelWallDraw: () => void

  // Selection actions
  select: (ids: string[]) => void
  addToSelection: (id: string) => void
  removeFromSelection: (id: string) => void
  toggleSelection: (id: string) => void
  clearSelection: () => void
  setHovered: (id: string | null) => void

  // History actions
  setCanUndo: (canUndo: boolean) => void
  setCanRedo: (canRedo: boolean) => void
}

const DEFAULT_ZOOM = 1
const MIN_ZOOM = 0.1
const MAX_ZOOM = 5

export const useEditorStore = create<EditorState>()(
  immer((set) => ({
    // Initial state
    activeView: 'split',
    zoom2D: DEFAULT_ZOOM,
    pan2D: { x: 0, y: 0 },
    showGrid: true,
    snapToGrid: true,
    showDimensions: true,

    activeTool: 'select',
    isDrawingWall: false,
    wallDrawStart: null,
    wallDrawPreview: null,

    selectedIds: [],
    hoveredId: null,

    canUndo: false,
    canRedo: false,

    // ==================== View Actions ====================

    setActiveView: (view) => {
      set((state) => {
        state.activeView = view
      })
    },

    setZoom2D: (zoom) => {
      set((state) => {
        state.zoom2D = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
      })
    },

    setPan2D: (pan) => {
      set((state) => {
        state.pan2D = pan
      })
    },

    resetView: () => {
      set((state) => {
        state.zoom2D = DEFAULT_ZOOM
        state.pan2D = { x: 0, y: 0 }
      })
    },

    toggleGrid: () => {
      set((state) => {
        state.showGrid = !state.showGrid
      })
    },

    toggleSnapToGrid: () => {
      set((state) => {
        state.snapToGrid = !state.snapToGrid
      })
    },

    toggleDimensions: () => {
      set((state) => {
        state.showDimensions = !state.showDimensions
      })
    },

    // ==================== Tool Actions ====================

    setActiveTool: (tool) => {
      set((state) => {
        // Cancel any ongoing wall draw when switching tools
        if (state.isDrawingWall && tool !== 'wall') {
          state.isDrawingWall = false
          state.wallDrawStart = null
          state.wallDrawPreview = null
        }
        state.activeTool = tool
      })
    },

    startWallDraw: (position) => {
      set((state) => {
        state.isDrawingWall = true
        state.wallDrawStart = position
        state.wallDrawPreview = position
      })
    },

    updateWallDrawPreview: (position) => {
      set((state) => {
        state.wallDrawPreview = position
      })
    },

    finishWallDraw: () => {
      set((state) => {
        state.isDrawingWall = false
        state.wallDrawStart = null
        state.wallDrawPreview = null
      })
    },

    cancelWallDraw: () => {
      set((state) => {
        state.isDrawingWall = false
        state.wallDrawStart = null
        state.wallDrawPreview = null
      })
    },

    // ==================== Selection Actions ====================

    select: (ids) => {
      set((state) => {
        state.selectedIds = ids
      })
    },

    addToSelection: (id) => {
      set((state) => {
        if (!state.selectedIds.includes(id)) {
          state.selectedIds.push(id)
        }
      })
    },

    removeFromSelection: (id) => {
      set((state) => {
        state.selectedIds = state.selectedIds.filter((i) => i !== id)
      })
    },

    toggleSelection: (id) => {
      set((state) => {
        const index = state.selectedIds.indexOf(id)
        if (index === -1) {
          state.selectedIds.push(id)
        } else {
          state.selectedIds.splice(index, 1)
        }
      })
    },

    clearSelection: () => {
      set((state) => {
        state.selectedIds = []
      })
    },

    setHovered: (id) => {
      set((state) => {
        state.hoveredId = id
      })
    },

    // ==================== History Actions ====================

    setCanUndo: (canUndo) => {
      set((state) => {
        state.canUndo = canUndo
      })
    },

    setCanRedo: (canRedo) => {
      set((state) => {
        state.canRedo = canRedo
      })
    },
  }))
)

// Selector hooks for optimized re-renders
export const useActiveTool = () => useEditorStore((state) => state.activeTool)
export const useActiveView = () => useEditorStore((state) => state.activeView)
export const useSelectedIds = () => useEditorStore((state) => state.selectedIds)
export const useIsSelected = (id: string) =>
  useEditorStore((state) => state.selectedIds.includes(id))
export const useIsHovered = (id: string) =>
  useEditorStore((state) => state.hoveredId === id)
