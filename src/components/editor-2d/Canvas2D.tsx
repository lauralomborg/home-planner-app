import { useRef, useCallback, useEffect, useState, useMemo } from 'react'
import { Stage, Layer, Rect, Line, Transformer } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'
import { useFloorPlanStore, useEditorStore } from '@/stores'
import type { Point2D, Wall, FurnitureInstance } from '@/models'
import { DEFAULT_WALL_THICKNESS, DEFAULT_WALL_HEIGHT, DEFAULT_WINDOW_HEIGHT, DEFAULT_WINDOW_ELEVATION, DEFAULT_DOOR_HEIGHT } from '@/models'
import { FURNITURE_CATALOG } from '@/services/catalog'
import { COLORS_2D } from '@/constants/colors'

// Import extracted components
import { WallShape, WindowShape, DoorShape, RoomShape, FurnitureShape } from './shapes'
import { Grid, OriginMarker, WallPreview } from './utils'
import { GRID_SIZE, snapToGrid } from './types'

// Smart alignment guide calculation
interface AlignmentGuide {
  type: 'horizontal' | 'vertical'
  position: number // x for vertical, y for horizontal
  start: number // start of line
  end: number // end of line
}

const SNAP_THRESHOLD = 8 // pixels

function calculateAlignmentGuides(
  draggedItems: FurnitureInstance[],
  otherItems: FurnitureInstance[],
  scale: number
): { guides: AlignmentGuide[]; snapDelta: Point2D } {
  const guides: AlignmentGuide[] = []
  let snapDeltaX = 0
  let snapDeltaY = 0
  const threshold = SNAP_THRESHOLD / scale

  // Get bounding box of dragged items
  if (draggedItems.length === 0) return { guides, snapDelta: { x: 0, y: 0 } }

  const draggedBounds = {
    left: Math.min(...draggedItems.map((f) => f.position.x - f.dimensions.width / 2)),
    right: Math.max(...draggedItems.map((f) => f.position.x + f.dimensions.width / 2)),
    top: Math.min(...draggedItems.map((f) => f.position.y - f.dimensions.depth / 2)),
    bottom: Math.max(...draggedItems.map((f) => f.position.y + f.dimensions.depth / 2)),
  }
  const draggedCenterX = (draggedBounds.left + draggedBounds.right) / 2
  const draggedCenterY = (draggedBounds.top + draggedBounds.bottom) / 2

  // Check alignment with other items
  for (const other of otherItems) {
    const otherBounds = {
      left: other.position.x - other.dimensions.width / 2,
      right: other.position.x + other.dimensions.width / 2,
      top: other.position.y - other.dimensions.depth / 2,
      bottom: other.position.y + other.dimensions.depth / 2,
    }
    const otherCenterX = other.position.x
    const otherCenterY = other.position.y

    // Vertical guides (for X alignment)
    const verticalChecks = [
      { dragged: draggedBounds.left, other: otherBounds.left },
      { dragged: draggedBounds.right, other: otherBounds.right },
      { dragged: draggedBounds.left, other: otherBounds.right },
      { dragged: draggedBounds.right, other: otherBounds.left },
      { dragged: draggedCenterX, other: otherCenterX },
    ]

    for (const check of verticalChecks) {
      const diff = check.other - check.dragged
      if (Math.abs(diff) < threshold) {
        if (snapDeltaX === 0) snapDeltaX = diff
        guides.push({
          type: 'vertical',
          position: check.other,
          start: Math.min(draggedBounds.top, otherBounds.top) - 20,
          end: Math.max(draggedBounds.bottom, otherBounds.bottom) + 20,
        })
      }
    }

    // Horizontal guides (for Y alignment)
    const horizontalChecks = [
      { dragged: draggedBounds.top, other: otherBounds.top },
      { dragged: draggedBounds.bottom, other: otherBounds.bottom },
      { dragged: draggedBounds.top, other: otherBounds.bottom },
      { dragged: draggedBounds.bottom, other: otherBounds.top },
      { dragged: draggedCenterY, other: otherCenterY },
    ]

    for (const check of horizontalChecks) {
      const diff = check.other - check.dragged
      if (Math.abs(diff) < threshold) {
        if (snapDeltaY === 0) snapDeltaY = diff
        guides.push({
          type: 'horizontal',
          position: check.other,
          start: Math.min(draggedBounds.left, otherBounds.left) - 20,
          end: Math.max(draggedBounds.right, otherBounds.right) + 20,
        })
      }
    }
  }

  return { guides, snapDelta: { x: snapDeltaX, y: snapDeltaY } }
}

export function Canvas2D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPointerPos, setLastPointerPos] = useState<Point2D | null>(null)
  const [isSpaceHeld, setIsSpaceHeld] = useState(false)
  const [roomDrawStart, setRoomDrawStart] = useState<Point2D | null>(null)
  const [roomDrawPreview, setRoomDrawPreview] = useState<Point2D | null>(null)

  // Smart alignment guides state
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([])
  const [isDraggingFurniture, setIsDraggingFurniture] = useState(false)
  const draggedIdsRef = useRef<string[]>([])

  // Track selected nodes for transformer
  const selectedNodesRef = useRef<Map<string, Konva.Rect>>(new Map())

  // Track when marquee selection just finished to prevent click handler from clearing it
  const justFinishedMarqueeRef = useRef(false)

  // Callbacks for registering/unregistering nodes with transformer
  const handleRegisterNode = useCallback((id: string, node: Konva.Rect) => {
    selectedNodesRef.current.set(id, node)
    if (transformerRef.current) {
      transformerRef.current.nodes(Array.from(selectedNodesRef.current.values()))
    }
  }, [])

  const handleUnregisterNode = useCallback((id: string) => {
    selectedNodesRef.current.delete(id)
    if (transformerRef.current) {
      transformerRef.current.nodes(Array.from(selectedNodesRef.current.values()))
    }
  }, [])

  // Handle furniture drag updates for smart guides
  const handleFurnitureDragUpdate = useCallback((isDragging: boolean, draggedIds: string[]) => {
    setIsDraggingFurniture(isDragging)
    draggedIdsRef.current = draggedIds
    if (!isDragging) {
      setAlignmentGuides([])
    }
  }, [])

  // Store state
  const walls = useFloorPlanStore((state) => state.floorPlan.walls)
  const rooms = useFloorPlanStore((state) => state.floorPlan.rooms)
  const furniture = useFloorPlanStore((state) => state.floorPlan.furniture)
  const windows = useFloorPlanStore((state) => state.floorPlan.windows)
  const doors = useFloorPlanStore((state) => state.floorPlan.doors)
  const { addWall, removeSelected, addWindow, addDoor, createRoomFromBounds, addFurniture } = useFloorPlanStore()

  const {
    activeTool,
    showGrid,
    snapToGrid: snapEnabled,
    zoom2D,
    pan2D,
    isDrawingWall,
    wallDrawStart,
    wallDrawPreview,
    selectedIds,
    hoveredId,
    selectedFurnitureId,
    isMarqueeSelecting,
    marqueeStart,
    marqueeEnd,
    setZoom2D,
    setPan2D,
    startWallDraw,
    updateWallDrawPreview,
    finishWallDraw,
    cancelWallDraw,
    clearSelection,
    setActiveTool,
    select,
    startMarquee,
    updateMarquee,
    finishMarquee,
  } = useEditorStore()

  // Create wall lookup for efficient access
  const wallsById = useMemo(() => {
    const map = new Map<string, Wall>()
    walls.forEach((wall) => map.set(wall.id, wall))
    return map
  }, [walls])

  // Get items within a marquee rectangle (Figma-like: touch to select)
  const getItemsInMarquee = useCallback((start: Point2D, end: Point2D): string[] => {
    const minX = Math.min(start.x, end.x)
    const maxX = Math.max(start.x, end.x)
    const minY = Math.min(start.y, end.y)
    const maxY = Math.max(start.y, end.y)

    const ids: string[] = []

    // Helper: Check if line segment intersects rectangle
    const lineIntersectsRect = (
      x1: number, y1: number, x2: number, y2: number,
      rectMinX: number, rectMinY: number, rectMaxX: number, rectMaxY: number
    ): boolean => {
      // Check if either endpoint is inside the rect
      if ((x1 >= rectMinX && x1 <= rectMaxX && y1 >= rectMinY && y1 <= rectMaxY) ||
          (x2 >= rectMinX && x2 <= rectMaxX && y2 >= rectMinY && y2 <= rectMaxY)) {
        return true
      }

      // Check if line crosses any of the 4 rectangle edges
      const linesCross = (ax1: number, ay1: number, ax2: number, ay2: number,
                          bx1: number, by1: number, bx2: number, by2: number): boolean => {
        const d1 = (bx2 - bx1) * (ay1 - by1) - (by2 - by1) * (ax1 - bx1)
        const d2 = (bx2 - bx1) * (ay2 - by1) - (by2 - by1) * (ax2 - bx1)
        const d3 = (ax2 - ax1) * (by1 - ay1) - (ay2 - ay1) * (bx1 - ax1)
        const d4 = (ax2 - ax1) * (by2 - ay1) - (ay2 - ay1) * (bx2 - ax1)
        return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
               ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
      }

      return linesCross(x1, y1, x2, y2, rectMinX, rectMinY, rectMaxX, rectMinY) ||
             linesCross(x1, y1, x2, y2, rectMaxX, rectMinY, rectMaxX, rectMaxY) ||
             linesCross(x1, y1, x2, y2, rectMinX, rectMaxY, rectMaxX, rectMaxY) ||
             linesCross(x1, y1, x2, y2, rectMinX, rectMinY, rectMinX, rectMaxY)
    }

    // Helper: Check if two rectangles intersect
    const rectsIntersect = (
      aMinX: number, aMinY: number, aMaxX: number, aMaxY: number,
      bMinX: number, bMinY: number, bMaxX: number, bMaxY: number
    ): boolean => aMinX < bMaxX && aMaxX > bMinX && aMinY < bMaxY && aMaxY > bMinY

    // Check rooms
    for (const r of rooms) {
      if (rectsIntersect(minX, minY, maxX, maxY,
          r.bounds.x, r.bounds.y, r.bounds.x + r.bounds.width, r.bounds.y + r.bounds.height)) {
        ids.push(r.id)
      }
    }

    // Check furniture
    for (const f of furniture) {
      const hw = f.dimensions.width / 2
      const hd = f.dimensions.depth / 2
      if (f.position.x - hw < maxX && f.position.x + hw > minX &&
          f.position.y - hd < maxY && f.position.y + hd > minY) {
        ids.push(f.id)
      }
    }

    // Check walls
    for (const w of walls) {
      if (lineIntersectsRect(w.start.x, w.start.y, w.end.x, w.end.y, minX, minY, maxX, maxY)) {
        ids.push(w.id)
      }
    }

    // Check windows
    for (const win of windows) {
      const wall = wallsById.get(win.wallId)
      if (wall) {
        const dx = wall.end.x - wall.start.x
        const dy = wall.end.y - wall.start.y
        const length = Math.sqrt(dx * dx + dy * dy)
        const t = win.position / length
        const wx = wall.start.x + dx * t
        const wy = wall.start.y + dy * t
        const halfWidth = win.width / 2
        if (rectsIntersect(minX, minY, maxX, maxY,
            wx - halfWidth, wy - halfWidth, wx + halfWidth, wy + halfWidth)) {
          ids.push(win.id)
        }
      }
    }

    // Check doors
    for (const door of doors) {
      const wall = wallsById.get(door.wallId)
      if (wall) {
        const dx = wall.end.x - wall.start.x
        const dy = wall.end.y - wall.start.y
        const length = Math.sqrt(dx * dx + dy * dy)
        const t = door.position / length
        const doorX = wall.start.x + dx * t
        const doorY = wall.start.y + dy * t
        const halfWidth = door.width / 2
        if (rectsIntersect(minX, minY, maxX, maxY,
            doorX - halfWidth, doorY - halfWidth, doorX + halfWidth, doorY + halfWidth)) {
          ids.push(door.id)
        }
      }
    }

    return ids
  }, [rooms, furniture, walls, windows, doors, wallsById])

  // Find wall at position for window/door placement
  const findWallAtPosition = useCallback((pos: Point2D): { wall: Wall; position: number } | null => {
    for (const wall of walls) {
      const dx = wall.end.x - wall.start.x
      const dy = wall.end.y - wall.start.y
      const length = Math.sqrt(dx * dx + dy * dy)
      const px = pos.x - wall.start.x
      const py = pos.y - wall.start.y
      const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (length * length)))
      const closestX = wall.start.x + t * dx
      const closestY = wall.start.y + t * dy
      const dist = Math.sqrt(Math.pow(pos.x - closestX, 2) + Math.pow(pos.y - closestY, 2))
      if (dist < wall.thickness + 20) {
        return { wall, position: t * length }
      }
    }
    return null
  }, [walls])

  // Handle stage click
  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (isPanning) return
      const stage = e.target.getStage()
      if (!stage) return
      const pointerPos = stage.getPointerPosition()
      if (!pointerPos) return

      const worldPos = {
        x: (pointerPos.x - pan2D.x) / zoom2D,
        y: (pointerPos.y - pan2D.y) / zoom2D,
      }
      const snappedPos = snapToGrid(worldPos, GRID_SIZE, snapEnabled)

      if (activeTool === 'wall') {
        if (!isDrawingWall) {
          startWallDraw(snappedPos)
        } else if (wallDrawStart) {
          if (Math.abs(snappedPos.x - wallDrawStart.x) > 10 || Math.abs(snappedPos.y - wallDrawStart.y) > 10) {
            addWall({
              start: wallDrawStart,
              end: snappedPos,
              thickness: DEFAULT_WALL_THICKNESS,
              height: DEFAULT_WALL_HEIGHT,
              material: { materialId: 'white-paint' },
            })
          }
          finishWallDraw()
        }
      } else if (activeTool === 'window') {
        const result = findWallAtPosition(worldPos)
        if (result) {
          addWindow({
            type: 'double',
            wallId: result.wall.id,
            position: result.position,
            width: 100,
            height: DEFAULT_WINDOW_HEIGHT,
            elevationFromFloor: DEFAULT_WINDOW_ELEVATION,
            frameMaterial: { materialId: 'white-paint' },
            glassOpacity: 0.3,
          })
        }
      } else if (activeTool === 'door') {
        const result = findWallAtPosition(worldPos)
        if (result) {
          addDoor({
            type: 'single',
            wallId: result.wall.id,
            position: result.position,
            width: 90,
            height: DEFAULT_DOOR_HEIGHT,
            openDirection: 'right',
            material: { materialId: 'wood-oak' },
            isOpen: false,
            openAngle: 0,
          })
        }
      } else if (activeTool === 'furniture' && selectedFurnitureId) {
        const catalogItem = FURNITURE_CATALOG.find((item) => item.id === selectedFurnitureId)
        if (catalogItem) {
          addFurniture({
            catalogItemId: selectedFurnitureId,
            position: snappedPos,
            rotation: 0,
            dimensions: { ...catalogItem.defaultDimensions },
            partMaterials: {},
            locked: false,
          })
        }
      } else if (activeTool === 'select') {
        if (e.target === stage && !e.evt.shiftKey && !e.evt.metaKey && !e.evt.ctrlKey) {
          if (justFinishedMarqueeRef.current) {
            justFinishedMarqueeRef.current = false
          } else {
            clearSelection()
          }
        }
      }
    },
    [activeTool, isDrawingWall, wallDrawStart, snapEnabled, zoom2D, pan2D, isPanning, selectedFurnitureId,
     addWall, addWindow, addDoor, addFurniture, startWallDraw, finishWallDraw, clearSelection, findWallAtPosition]
  )

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage()
      if (!stage) return

      const shouldPan = e.evt.button === 1 || e.evt.button === 2 ||
        (e.evt.button === 0 && (activeTool === 'pan' || isSpaceHeld))

      if (shouldPan) {
        e.evt.preventDefault()
        setIsPanning(true)
        const pos = stage.getPointerPosition()
        if (pos) setLastPointerPos(pos)
        stage.container().style.cursor = 'grabbing'
        return
      }

      if (e.evt.button === 0 && activeTool === 'room') {
        const pointerPos = stage.getPointerPosition()
        if (!pointerPos) return
        const worldPos = { x: (pointerPos.x - pan2D.x) / zoom2D, y: (pointerPos.y - pan2D.y) / zoom2D }
        const snappedPos = snapToGrid(worldPos, GRID_SIZE, snapEnabled)
        setRoomDrawStart(snappedPos)
        setRoomDrawPreview(snappedPos)
      }

      if (e.evt.button === 0 && activeTool === 'select' && e.target === stage) {
        const pointerPos = stage.getPointerPosition()
        if (!pointerPos) return
        const worldPos = { x: (pointerPos.x - pan2D.x) / zoom2D, y: (pointerPos.y - pan2D.y) / zoom2D }
        startMarquee(worldPos)
      }
    },
    [activeTool, isSpaceHeld, pan2D, zoom2D, snapEnabled, startMarquee]
  )

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage()
      if (!stage) return

      if (isPanning && lastPointerPos) {
        const pos = stage.getPointerPosition()
        if (pos) {
          setPan2D({ x: pan2D.x + pos.x - lastPointerPos.x, y: pan2D.y + pos.y - lastPointerPos.y })
          setLastPointerPos(pos)
        }
        return
      }

      if (isDrawingWall) {
        const pointerPos = stage.getPointerPosition()
        if (!pointerPos) return
        const worldPos = { x: (pointerPos.x - pan2D.x) / zoom2D, y: (pointerPos.y - pan2D.y) / zoom2D }
        updateWallDrawPreview(snapToGrid(worldPos, GRID_SIZE, snapEnabled))
      }

      if (roomDrawStart) {
        const pointerPos = stage.getPointerPosition()
        if (!pointerPos) return
        const worldPos = { x: (pointerPos.x - pan2D.x) / zoom2D, y: (pointerPos.y - pan2D.y) / zoom2D }
        setRoomDrawPreview(snapToGrid(worldPos, GRID_SIZE, snapEnabled))
      }

      if (isMarqueeSelecting) {
        const pointerPos = stage.getPointerPosition()
        if (!pointerPos) return
        const worldPos = { x: (pointerPos.x - pan2D.x) / zoom2D, y: (pointerPos.y - pan2D.y) / zoom2D }
        updateMarquee(worldPos)
      }
    },
    [isPanning, lastPointerPos, isDrawingWall, roomDrawStart, isMarqueeSelecting, zoom2D, pan2D, snapEnabled,
     updateWallDrawPreview, updateMarquee, setPan2D]
  )

  // Handle mouse up
  const handleMouseUp = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (isPanning) {
        setIsPanning(false)
        setLastPointerPos(null)
        const stage = e.target.getStage()
        if (stage) stage.container().style.cursor = getCursor()
        return
      }

      if (roomDrawStart && roomDrawPreview) {
        const roomWidth = Math.abs(roomDrawPreview.x - roomDrawStart.x)
        const roomHeight = Math.abs(roomDrawPreview.y - roomDrawStart.y)
        if (roomWidth >= 50 && roomHeight >= 50) {
          createRoomFromBounds({
            x: Math.min(roomDrawStart.x, roomDrawPreview.x),
            y: Math.min(roomDrawStart.y, roomDrawPreview.y),
            width: roomWidth,
            height: roomHeight,
          })
        }
        setRoomDrawStart(null)
        setRoomDrawPreview(null)
      }

      if (isMarqueeSelecting && marqueeStart && marqueeEnd) {
        const itemsInMarquee = getItemsInMarquee(marqueeStart, marqueeEnd)
        if (itemsInMarquee.length > 0) {
          if (e.evt.shiftKey) {
            select([...new Set([...selectedIds, ...itemsInMarquee])])
          } else {
            select(itemsInMarquee)
          }
          justFinishedMarqueeRef.current = true
        }
        finishMarquee()
      }
    },
    [isPanning, roomDrawStart, roomDrawPreview, isMarqueeSelecting, marqueeStart, marqueeEnd, selectedIds,
     createRoomFromBounds, getItemsInMarquee, select, finishMarquee]
  )

  // Handle wheel for zoom
  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()
      const stage = stageRef.current
      if (!stage) return

      const pointer = stage.getPointerPosition()
      if (!pointer) return

      const scaleBy = 1.08
      const newScale = e.evt.deltaY < 0 ? zoom2D * scaleBy : zoom2D / scaleBy
      const clampedScale = Math.min(Math.max(newScale, 0.02), 5)

      const mousePointTo = { x: (pointer.x - pan2D.x) / zoom2D, y: (pointer.y - pan2D.y) / zoom2D }
      const newPos = { x: pointer.x - mousePointTo.x * clampedScale, y: pointer.y - mousePointTo.y * clampedScale }

      setZoom2D(clampedScale)
      setPan2D(newPos)
    },
    [zoom2D, pan2D, setZoom2D, setPan2D]
  )

  // Prevent context menu on right click
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handleContextMenu = (e: MouseEvent) => e.preventDefault()
    container.addEventListener('contextmenu', handleContextMenu)
    return () => container.removeEventListener('contextmenu', handleContextMenu)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setIsSpaceHeld(true)
        const stage = stageRef.current
        if (stage) stage.container().style.cursor = 'grab'
        return
      }

      if (e.key === 'Escape') {
        if (isDrawingWall) cancelWallDraw()
        if (roomDrawStart) { setRoomDrawStart(null); setRoomDrawPreview(null) }
        if (isMarqueeSelecting) finishMarquee()
        clearSelection()
        setActiveTool('select')
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault()
        removeSelected(selectedIds)
        clearSelection()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceHeld(false)
        const stage = stageRef.current
        if (stage && !isPanning) stage.container().style.cursor = getCursor()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isDrawingWall, cancelWallDraw, clearSelection, selectedIds, removeSelected, setActiveTool, roomDrawStart, isPanning, isMarqueeSelecting, finishMarquee])

  // Calculate alignment guides during furniture drag
  useEffect(() => {
    if (!isDraggingFurniture || draggedIdsRef.current.length === 0) return
    const draggedIdSet = new Set(draggedIdsRef.current)
    const draggedItems = furniture.filter((f) => draggedIdSet.has(f.id))
    const otherItems = furniture.filter((f) => !draggedIdSet.has(f.id))
    const { guides } = calculateAlignmentGuides(draggedItems, otherItems, zoom2D)
    setAlignmentGuides(guides)
  }, [isDraggingFurniture, furniture, zoom2D])

  // Resize observer
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const updateSize = () => setDimensions({ width: container.clientWidth, height: container.clientHeight })
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Cursor based on tool
  const getCursor = useCallback(() => {
    if (isPanning) return 'grabbing'
    if (isSpaceHeld) return 'grab'
    if (activeTool === 'wall' || activeTool === 'room' || activeTool === 'window' || activeTool === 'door') return 'crosshair'
    if (activeTool === 'furniture' && selectedFurnitureId) return 'crosshair'
    if (activeTool === 'pan') return 'grab'
    return 'default'
  }, [isPanning, isSpaceHeld, activeTool, selectedFurnitureId])

  return (
    <div ref={containerRef} className="w-full h-full" style={{ backgroundColor: COLORS_2D.canvas }}>
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleStageClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        x={pan2D.x}
        y={pan2D.y}
        scaleX={zoom2D}
        scaleY={zoom2D}
        style={{ cursor: getCursor() }}
      >
        {/* Grid Layer */}
        {showGrid && (
          <Layer listening={false}>
            <Grid width={dimensions.width} height={dimensions.height} offsetX={pan2D.x} offsetY={pan2D.y} scale={zoom2D} />
          </Layer>
        )}

        {/* Main Content Layer */}
        <Layer>
          <OriginMarker scale={zoom2D} />

          {/* Rooms */}
          {rooms.map((room) => (
            <RoomShape
              key={room.id}
              room={room}
              isSelected={selectedIds.includes(room.id)}
              isHovered={hoveredId === room.id}
              scale={zoom2D}
              onRegisterNode={handleRegisterNode}
              onUnregisterNode={handleUnregisterNode}
            />
          ))}

          {/* Walls */}
          {walls.map((wall) => (
            <WallShape
              key={wall.id}
              wall={wall}
              isSelected={selectedIds.includes(wall.id)}
              isHovered={hoveredId === wall.id}
              scale={zoom2D}
            />
          ))}

          {/* Windows */}
          {windows.map((window) => {
            const wall = wallsById.get(window.wallId)
            if (!wall) return null
            return <WindowShape key={window.id} window={window} wall={wall} isSelected={selectedIds.includes(window.id)} scale={zoom2D} />
          })}

          {/* Doors */}
          {doors.map((door) => {
            const wall = wallsById.get(door.wallId)
            if (!wall) return null
            return <DoorShape key={door.id} door={door} wall={wall} isSelected={selectedIds.includes(door.id)} scale={zoom2D} />
          })}

          {/* Furniture */}
          {furniture.map((f) => (
            <FurnitureShape
              key={f.id}
              id={f.id}
              scale={zoom2D}
              onRegisterNode={handleRegisterNode}
              onUnregisterNode={handleUnregisterNode}
              onDragUpdate={handleFurnitureDragUpdate}
            />
          ))}

          {/* Transformer */}
          <Transformer
            ref={transformerRef}
            rotateEnabled={true}
            rotateAnchorOffset={20 / zoom2D}
            anchorSize={8 / zoom2D}
            anchorStroke={COLORS_2D.handle}
            anchorFill={COLORS_2D.handleFill}
            anchorCornerRadius={2 / zoom2D}
            borderStroke={COLORS_2D.handle}
            borderStrokeWidth={1 / zoom2D}
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center', 'middle-left', 'middle-right']}
            boundBoxFunc={(oldBox, newBox) => (newBox.width < 20 || newBox.height < 20) ? oldBox : newBox}
          />

          {/* Wall drawing preview */}
          {isDrawingWall && wallDrawStart && wallDrawPreview && (
            <WallPreview start={wallDrawStart} end={wallDrawPreview} thickness={DEFAULT_WALL_THICKNESS} scale={zoom2D} />
          )}

          {/* Room drawing preview */}
          {roomDrawStart && roomDrawPreview && (
            <Rect
              x={Math.min(roomDrawStart.x, roomDrawPreview.x)}
              y={Math.min(roomDrawStart.y, roomDrawPreview.y)}
              width={Math.abs(roomDrawPreview.x - roomDrawStart.x)}
              height={Math.abs(roomDrawPreview.y - roomDrawStart.y)}
              fill={COLORS_2D.wallPreview}
              opacity={0.1}
              stroke={COLORS_2D.wallPreview}
              strokeWidth={2 / zoom2D}
              dash={[8 / zoom2D, 4 / zoom2D]}
              listening={false}
            />
          )}

          {/* Marquee selection preview */}
          {isMarqueeSelecting && marqueeStart && marqueeEnd && (
            <Rect
              x={Math.min(marqueeStart.x, marqueeEnd.x)}
              y={Math.min(marqueeStart.y, marqueeEnd.y)}
              width={Math.abs(marqueeEnd.x - marqueeStart.x)}
              height={Math.abs(marqueeEnd.y - marqueeStart.y)}
              fill="#5B8A72"
              opacity={0.1}
              stroke="#5B8A72"
              strokeWidth={1 / zoom2D}
              dash={[4 / zoom2D, 4 / zoom2D]}
              listening={false}
            />
          )}

          {/* Smart alignment guides */}
          {alignmentGuides.map((guide, index) => (
            <Line
              key={`guide-${index}`}
              points={guide.type === 'vertical'
                ? [guide.position, guide.start, guide.position, guide.end]
                : [guide.start, guide.position, guide.end, guide.position]}
              stroke="#E74C3C"
              strokeWidth={1 / zoom2D}
              dash={[4 / zoom2D, 4 / zoom2D]}
              listening={false}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}
