import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { EditorTool, ViewMode, Point2D, Point3D, Camera3DMode } from '@/models'

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

  // Room snap guides (for visual feedback during room drawing/moving)
  roomSnapGuides: Array<{ axis: 'horizontal' | 'vertical'; position: number; start: number; end: number }>

  // 3D Camera state
  camera3DMode: Camera3DMode
  walkthroughPosition: Point3D | null
  cameraHeightCommand: 'up' | 'down' | null

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

  // Room snap guide actions
  setRoomSnapGuides: (guides: EditorState['roomSnapGuides']) => void
  clearRoomSnapGuides: () => void

  // 3D Camera actions
  setCamera3DMode: (mode: Camera3DMode) => void
  setWalkthroughPosition: (pos: Point3D | null) => void
  setCameraHeightCommand: (command: 'up' | 'down' | null) => void
}

const DEFAULT_ZOOM = 1
const MIN_ZOOM = 0.02
const MAX_ZOOM = 20

export const useEditorStore = create<EditorState>()(
  immer((set) => ({
    // Initial state
    activeView: '2d',
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

    roomSnapGuides: [],

    camera3DMode: 'walkthrough',
    walkthroughPosition: null,
    cameraHeightCommand: null,

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

    // ==================== Room Snap Guide Actions ====================

    setRoomSnapGuides: (guides) => {
      set((state) => {
        state.roomSnapGuides = guides
      })
    },

    clearRoomSnapGuides: () => {
      set((state) => {
        state.roomSnapGuides = []
      })
    },

    // ==================== 3D Camera Actions ====================

    setCamera3DMode: (mode) => {
      set((state) => {
        state.camera3DMode = mode
      })
    },

    setWalkthroughPosition: (pos) => {
      set((state) => {
        state.walkthroughPosition = pos
      })
    },

    setCameraHeightCommand: (command) => {
      set((state) => {
        state.cameraHeightCommand = command
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
export const useCamera3DMode = () => useEditorStore((state) => state.camera3DMode)
export const useWalkthroughPosition = () => useEditorStore((state) => state.walkthroughPosition)
export const useCameraHeightCommand = () => useEditorStore((state) => state.cameraHeightCommand)
