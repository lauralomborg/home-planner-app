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
  selectedFurnitureId: string | null // Catalog item ID for furniture placement

  // Selection state
  selectedIds: string[]
  hoveredId: string | null

  // Marquee selection state
  isMarqueeSelecting: boolean
  marqueeStart: Point2D | null
  marqueeEnd: Point2D | null

  // Clipboard state
  clipboard: {
    furnitureItems: Array<{
      catalogItemId: string
      position: Point2D
      rotation: number
      dimensions: { width: number; depth: number; height: number }
      partMaterials: Record<string, { materialId: string; colorOverride?: string }>
      locked: boolean
    }>
  } | null

  // History (for undo/redo)
  canUndo: boolean
  canRedo: boolean

  // Drag state (to pause history capture during drag)
  isDragging: boolean

  // Group editing state (when editing inside a group)
  editingGroupId: string | null

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
  setSelectedFurniture: (catalogItemId: string | null) => void

  // Selection actions
  select: (ids: string[]) => void
  addToSelection: (id: string) => void
  removeFromSelection: (id: string) => void
  toggleSelection: (id: string) => void
  clearSelection: () => void
  setHovered: (id: string | null) => void

  // Marquee selection actions
  startMarquee: (start: Point2D) => void
  updateMarquee: (end: Point2D) => void
  finishMarquee: () => void
  cancelMarquee: () => void

  // Clipboard actions
  copyToClipboard: (items: EditorState['clipboard']) => void
  clearClipboard: () => void

  // History actions
  setCanUndo: (canUndo: boolean) => void
  setCanRedo: (canRedo: boolean) => void

  // Drag actions
  setIsDragging: (dragging: boolean) => void

  // Group editing actions
  enterGroupEdit: (groupId: string) => void
  exitGroupEdit: () => void
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
    selectedFurnitureId: null,

    selectedIds: [],
    hoveredId: null,

    isMarqueeSelecting: false,
    marqueeStart: null,
    marqueeEnd: null,

    clipboard: null,

    canUndo: false,
    canRedo: false,

    isDragging: false,

    editingGroupId: null,

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

    setSelectedFurniture: (catalogItemId) => {
      set((state) => {
        state.selectedFurnitureId = catalogItemId
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

    // ==================== Marquee Selection Actions ====================

    startMarquee: (start) => {
      set((state) => {
        state.isMarqueeSelecting = true
        state.marqueeStart = start
        state.marqueeEnd = start
      })
    },

    updateMarquee: (end) => {
      set((state) => {
        state.marqueeEnd = end
      })
    },

    finishMarquee: () => {
      set((state) => {
        state.isMarqueeSelecting = false
        state.marqueeStart = null
        state.marqueeEnd = null
      })
    },

    cancelMarquee: () => {
      set((state) => {
        state.isMarqueeSelecting = false
        state.marqueeStart = null
        state.marqueeEnd = null
      })
    },

    // ==================== Clipboard Actions ====================

    copyToClipboard: (items) => {
      set((state) => {
        state.clipboard = items
      })
    },

    clearClipboard: () => {
      set((state) => {
        state.clipboard = null
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

    // ==================== Drag Actions ====================

    setIsDragging: (dragging) => {
      set((state) => {
        state.isDragging = dragging
      })
    },

    // ==================== Group Editing Actions ====================

    enterGroupEdit: (groupId) => {
      set((state) => {
        state.editingGroupId = groupId
        state.selectedIds = [] // Clear selection when entering group
      })
    },

    exitGroupEdit: () => {
      set((state) => {
        state.editingGroupId = null
        state.selectedIds = []
      })
    },
  }))
)

// Selector hooks for optimized re-renders
export const useActiveTool = () => useEditorStore((state) => state.activeTool)
export const useActiveView = () => useEditorStore((state) => state.activeView)
export const useSelectedIds = () => useEditorStore((state) => state.selectedIds)
export const useSelectedFurnitureId = () => useEditorStore((state) => state.selectedFurnitureId)
export const useIsSelected = (id: string) =>
  useEditorStore((state) => state.selectedIds.includes(id))
export const useIsHovered = (id: string) =>
  useEditorStore((state) => state.hoveredId === id)
