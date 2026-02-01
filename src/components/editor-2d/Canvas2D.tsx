import { useRef, useCallback, useEffect, useState, useMemo } from 'react'
import { Stage, Layer, Rect, Line, Transformer } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'
import { useFloorPlanStore, useEditorStore } from '@/stores'
import type { Point2D, Wall } from '@/models'
import { DEFAULT_WALL_THICKNESS, DEFAULT_WALL_HEIGHT, DEFAULT_WINDOW_HEIGHT, DEFAULT_WINDOW_ELEVATION, DEFAULT_DOOR_HEIGHT } from '@/models'
import { FURNITURE_CATALOG } from '@/services/catalog'
import { COLORS_2D } from '@/constants/colors'

// Import extracted components
import { WallShape, WallJointShape, WindowShape, DoorShape, RoomShape, FurnitureShape } from './shapes'
import { Grid, OriginMarker, WallPreview } from './utils'
import { GRID_SIZE, snapToGrid } from './types'
import { buildWallJointMap, findNearestWallEndpoint, WALL_CONNECTION_TOLERANCE, calculateRoomSnap } from '@/services/geometry'
import { calculateAlignmentGuides, type AlignmentGuide } from './utils/alignmentGuides'
import { getItemsInMarquee } from './utils/marqueeSelection'

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

  // Track selected nodes for transformer (furniture/rooms)
  const selectedNodesRef = useRef<Map<string, Konva.Rect>>(new Map())

  // Door/window transformer (width-only, no rotation)
  const doorWindowTransformerRef = useRef<Konva.Transformer>(null)
  const selectedDoorWindowNodesRef = useRef<Map<string, Konva.Rect>>(new Map())

  // Track when marquee selection just finished to prevent click handler from clearing it
  const justFinishedMarqueeRef = useRef(false)

  // Callbacks for registering/unregistering nodes with transformer (furniture/rooms)
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

  // Callbacks for registering/unregistering door/window nodes (width-only resize)
  const handleRegisterDoorWindowNode = useCallback((id: string, node: Konva.Rect) => {
    selectedDoorWindowNodesRef.current.set(id, node)
    if (doorWindowTransformerRef.current) {
      doorWindowTransformerRef.current.nodes(Array.from(selectedDoorWindowNodesRef.current.values()))
    }
  }, [])

  const handleUnregisterDoorWindowNode = useCallback((id: string) => {
    selectedDoorWindowNodesRef.current.delete(id)
    if (doorWindowTransformerRef.current) {
      doorWindowTransformerRef.current.nodes(Array.from(selectedDoorWindowNodesRef.current.values()))
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
  const roomsUnsorted = useFloorPlanStore((state) => state.floorPlan.rooms)
  const furniture = useFloorPlanStore((state) => state.floorPlan.furniture)

  // Sort rooms so larger (parent) rooms render first (behind) and smaller (child) rooms render on top
  // This ensures child rooms are clickable/draggable when nested inside parent rooms
  const rooms = useMemo(() => {
    return [...roomsUnsorted].sort((a, b) => {
      const areaA = a.bounds.width * a.bounds.height
      const areaB = b.bounds.width * b.bounds.height
      return areaB - areaA // Larger rooms first (rendered behind)
    })
  }, [roomsUnsorted])
  const windows = useFloorPlanStore((state) => state.floorPlan.windows)
  const doors = useFloorPlanStore((state) => state.floorPlan.doors)
  const { addWall, removeSelected, addWindow, addDoor, createRoomFromBounds, addFurniture, moveRoom, moveMultipleFurniture } = useFloorPlanStore()

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
    roomSnapGuides,
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
    setRoomSnapGuides,
    clearRoomSnapGuides,
  } = useEditorStore()

  // Create wall lookup for efficient access
  const wallsById = useMemo(() => {
    const map = new Map<string, Wall>()
    walls.forEach((wall) => map.set(wall.id, wall))
    return map
  }, [walls])

  // Compute wall joints (where 2+ walls connect)
  const wallJointMap = useMemo(() => {
    return buildWallJointMap(walls, WALL_CONNECTION_TOLERANCE)
  }, [walls])

  // Get joint positions as array for rendering
  const wallJointPositions = useMemo(() => {
    const positions: Array<{ position: Point2D; wallIds: string[] }> = []
    for (const [key, endpoints] of wallJointMap.entries()) {
      const [x, y] = key.split(',').map(Number)
      const wallIds = [...new Set(endpoints.map((e) => e.wallId))]
      positions.push({ position: { x, y }, wallIds })
    }
    return positions
  }, [wallJointMap])

  // Helper to check if a wall endpoint is part of a joint
  const isEndpointAtJoint = useCallback(
    (wallId: string, endpoint: 'start' | 'end'): boolean => {
      for (const endpoints of wallJointMap.values()) {
        if (endpoints.length >= 2) {
          for (const ep of endpoints) {
            if (ep.wallId === wallId && ep.endpoint === endpoint) {
              return true
            }
          }
        }
      }
      return false
    },
    [wallJointMap]
  )

  // Get items within a marquee rectangle (uses extracted utility)
  const getItemsInMarqueeCallback = useCallback((start: Point2D, end: Point2D): string[] => {
    return getItemsInMarquee({
      start,
      end,
      rooms,
      furniture,
      walls,
      windows,
      doors,
      wallsById,
    })
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
        // Try to snap to existing wall endpoint first, then grid
        const ENDPOINT_SNAP_TOLERANCE = 15 / zoom2D // Pixels in world space
        const nearestEndpoint = findNearestWallEndpoint(snappedPos, walls, ENDPOINT_SNAP_TOLERANCE)
        const finalPos = nearestEndpoint || snappedPos

        if (!isDrawingWall) {
          startWallDraw(finalPos)
        } else if (wallDrawStart) {
          if (Math.abs(finalPos.x - wallDrawStart.x) > 10 || Math.abs(finalPos.y - wallDrawStart.y) > 10) {
            addWall({
              start: wallDrawStart,
              end: finalPos,
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
        const snappedPos = snapToGrid(worldPos, GRID_SIZE, snapEnabled)
        // Snap to existing wall endpoint if near
        const ENDPOINT_SNAP_TOLERANCE = 15 / zoom2D
        const nearestEndpoint = findNearestWallEndpoint(snappedPos, walls, ENDPOINT_SNAP_TOLERANCE)
        updateWallDrawPreview(nearestEndpoint || snappedPos)
      }

      if (roomDrawStart) {
        const pointerPos = stage.getPointerPosition()
        if (!pointerPos) return
        const worldPos = { x: (pointerPos.x - pan2D.x) / zoom2D, y: (pointerPos.y - pan2D.y) / zoom2D }
        const gridSnappedPos = snapToGrid(worldPos, GRID_SIZE, snapEnabled)

        // Calculate proposed bounds for room snapping
        const proposedBounds = {
          x: Math.min(roomDrawStart.x, gridSnappedPos.x),
          y: Math.min(roomDrawStart.y, gridSnappedPos.y),
          width: Math.abs(gridSnappedPos.x - roomDrawStart.x),
          height: Math.abs(gridSnappedPos.y - roomDrawStart.y),
        }

        // Check for room snapping
        const snapResult = calculateRoomSnap(proposedBounds, rooms, undefined, 20)
        setRoomSnapGuides(snapResult.snapGuides)

        // Update preview with snapped bounds
        const snappedBounds = snapResult.snappedBounds
        // Determine which corner the preview point represents (opposite to start)
        const previewX = gridSnappedPos.x >= roomDrawStart.x
          ? snappedBounds.x + snappedBounds.width
          : snappedBounds.x
        const previewY = gridSnappedPos.y >= roomDrawStart.y
          ? snappedBounds.y + snappedBounds.height
          : snappedBounds.y
        setRoomDrawPreview({ x: previewX, y: previewY })
      }

      if (isMarqueeSelecting) {
        const pointerPos = stage.getPointerPosition()
        if (!pointerPos) return
        const worldPos = { x: (pointerPos.x - pan2D.x) / zoom2D, y: (pointerPos.y - pan2D.y) / zoom2D }
        updateMarquee(worldPos)
      }
    },
    [isPanning, lastPointerPos, isDrawingWall, roomDrawStart, isMarqueeSelecting, zoom2D, pan2D, snapEnabled,
     updateWallDrawPreview, updateMarquee, setPan2D, walls, rooms, setRoomSnapGuides]
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
        clearRoomSnapGuides()
      }

      if (isMarqueeSelecting && marqueeStart && marqueeEnd) {
        const itemsInMarquee = getItemsInMarqueeCallback(marqueeStart, marqueeEnd)
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
     createRoomFromBounds, getItemsInMarqueeCallback, select, finishMarquee]
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

      // Arrow key movement for selected elements
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedIds.length > 0) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1  // 10cm with Shift, 1cm otherwise

        let deltaX = 0
        let deltaY = 0
        if (e.key === 'ArrowUp') deltaY = -step
        if (e.key === 'ArrowDown') deltaY = step
        if (e.key === 'ArrowLeft') deltaX = -step
        if (e.key === 'ArrowRight') deltaX = step

        // Move selected furniture
        const selectedFurnitureIds = selectedIds.filter(id =>
          furniture.some(f => f.id === id)
        )
        if (selectedFurnitureIds.length > 0) {
          moveMultipleFurniture(selectedFurnitureIds, { x: deltaX, y: deltaY })
        }

        // Move selected rooms
        const selectedRoomIds = selectedIds.filter(id =>
          rooms.some(r => r.id === id)
        )
        selectedRoomIds.forEach(roomId => {
          moveRoom(roomId, { x: deltaX, y: deltaY })
        })
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
  }, [isDrawingWall, cancelWallDraw, clearSelection, selectedIds, removeSelected, setActiveTool, roomDrawStart, isPanning, isMarqueeSelecting, finishMarquee, furniture, rooms, moveMultipleFurniture, moveRoom])

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
              startIsJoint={isEndpointAtJoint(wall.id, 'start')}
              endIsJoint={isEndpointAtJoint(wall.id, 'end')}
            />
          ))}

          {/* Wall Joints (rendered when wall tool is active or walls are selected) */}
          {(activeTool === 'wall' || selectedIds.some((id) => wallsById.has(id))) &&
            wallJointPositions.map(({ position, wallIds }, index) => {
              const isSelected = wallIds.some((id) => selectedIds.includes(id))
              return (
                <WallJointShape
                  key={`joint-${index}`}
                  position={position}
                  connectedWallIds={wallIds}
                  scale={zoom2D}
                  isSelected={isSelected}
                />
              )
            })}

          {/* Windows */}
          {windows.map((window) => {
            const wall = wallsById.get(window.wallId)
            if (!wall) return null
            return (
              <WindowShape
                key={window.id}
                window={window}
                wall={wall}
                isSelected={selectedIds.includes(window.id)}
                scale={zoom2D}
                onRegisterNode={handleRegisterDoorWindowNode}
                onUnregisterNode={handleUnregisterDoorWindowNode}
              />
            )
          })}

          {/* Doors */}
          {doors.map((door) => {
            const wall = wallsById.get(door.wallId)
            if (!wall) return null
            return (
              <DoorShape
                key={door.id}
                door={door}
                wall={wall}
                isSelected={selectedIds.includes(door.id)}
                scale={zoom2D}
                onRegisterNode={handleRegisterDoorWindowNode}
                onUnregisterNode={handleUnregisterDoorWindowNode}
              />
            )
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

          {/* Transformer (furniture/rooms - full resize + rotation) */}
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

          {/* Door/Window Transformer (width-only, no rotation) */}
          <Transformer
            ref={doorWindowTransformerRef}
            rotateEnabled={false}
            anchorSize={8 / zoom2D}
            anchorStroke={COLORS_2D.handle}
            anchorFill={COLORS_2D.handleFill}
            anchorCornerRadius={2 / zoom2D}
            borderStroke={COLORS_2D.handle}
            borderStrokeWidth={1 / zoom2D}
            enabledAnchors={['middle-left', 'middle-right']}
            boundBoxFunc={(oldBox, newBox) => (newBox.width < 30) ? oldBox : newBox}
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

          {/* Room snap guides */}
          {roomSnapGuides.map((guide, index) => (
            <Line
              key={`room-snap-${index}`}
              points={guide.axis === 'vertical'
                ? [guide.position, guide.start, guide.position, guide.end]
                : [guide.start, guide.position, guide.end, guide.position]}
              stroke="#3B82F6"
              strokeWidth={2 / zoom2D}
              dash={[6 / zoom2D, 3 / zoom2D]}
              listening={false}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}
