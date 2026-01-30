import { useRef, useCallback, useEffect, useState } from 'react'
import { Stage, Layer, Line, Rect, Circle, Group, Text, Tag, Label, Arc } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'
import { useFloorPlanStore, useEditorStore } from '@/stores'
import type { Point2D, Wall, WindowInstance, DoorInstance } from '@/models'
import { DEFAULT_WALL_THICKNESS, DEFAULT_WALL_HEIGHT, DEFAULT_WINDOW_HEIGHT, DEFAULT_WINDOW_ELEVATION, DEFAULT_DOOR_HEIGHT } from '@/models'

const GRID_SIZE = 50 // 50cm grid

// Nordic color palette
const COLORS = {
  canvas: '#FAF9F7',
  gridLine: '#E8E4DF',
  gridLineMajor: '#D9D4CD',
  wall: '#5C5650',
  wallSelected: '#5B8A72',
  wallHover: '#7BA393',
  wallPreview: '#5B8A72',
  handle: '#5B8A72',
  handleFill: '#FFFFFF',
  measureBg: '#5B8A72',
  measureText: '#FFFFFF',
  furniture: '#C4A77D',
  furnitureSelected: '#5B8A72',
  window: '#87CEEB',
  windowFrame: '#5C5650',
  door: '#8B7355',
  doorFrame: '#5C5650',
}

// Snap position to grid
function snapToGrid(point: Point2D, gridSize: number, enabled: boolean): Point2D {
  if (!enabled) return point
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  }
}

// Adaptive grid that works at all zoom levels
function Grid({
  width,
  height,
  offsetX,
  offsetY,
  scale,
}: {
  width: number
  height: number
  offsetX: number
  offsetY: number
  scale: number
}) {
  // Calculate adaptive grid size based on zoom
  let effectiveGridSize = GRID_SIZE

  // When zoomed out, use larger grid cells
  if (scale < 0.5) {
    effectiveGridSize = GRID_SIZE * 4 // 2m grid
  } else if (scale < 0.25) {
    effectiveGridSize = GRID_SIZE * 8 // 4m grid
  } else if (scale < 0.1) {
    effectiveGridSize = GRID_SIZE * 20 // 10m grid
  }

  // Ensure we don't draw too many lines
  const maxLines = 200
  const visibleWidth = width / scale
  const visibleHeight = height / scale
  const numVerticalLines = Math.ceil(visibleWidth / effectiveGridSize)
  const numHorizontalLines = Math.ceil(visibleHeight / effectiveGridSize)

  if (numVerticalLines > maxLines || numHorizontalLines > maxLines) {
    return null
  }

  const lines = []

  const worldStartX = -offsetX / scale
  const worldStartY = -offsetY / scale
  const worldEndX = worldStartX + visibleWidth
  const worldEndY = worldStartY + visibleHeight

  const gridStartX = Math.floor(worldStartX / effectiveGridSize) * effectiveGridSize
  const gridStartY = Math.floor(worldStartY / effectiveGridSize) * effectiveGridSize

  let i = 0

  // Vertical lines
  for (let x = gridStartX; x <= worldEndX + effectiveGridSize; x += effectiveGridSize) {
    const isMajor = Math.round(x / effectiveGridSize) % 5 === 0
    lines.push(
      <Line
        key={`v-${i++}`}
        points={[x, gridStartY - effectiveGridSize, x, worldEndY + effectiveGridSize]}
        stroke={isMajor ? COLORS.gridLineMajor : COLORS.gridLine}
        strokeWidth={(isMajor ? 1 : 0.5) / scale}
        listening={false}
      />
    )
  }

  // Horizontal lines
  for (let y = gridStartY; y <= worldEndY + effectiveGridSize; y += effectiveGridSize) {
    const isMajor = Math.round(y / effectiveGridSize) % 5 === 0
    lines.push(
      <Line
        key={`h-${i++}`}
        points={[gridStartX - effectiveGridSize, y, worldEndX + effectiveGridSize, y]}
        stroke={isMajor ? COLORS.gridLineMajor : COLORS.gridLine}
        strokeWidth={(isMajor ? 1 : 0.5) / scale}
        listening={false}
      />
    )
  }

  return <Group listening={false}>{lines}</Group>
}

// Measurement label
function MeasurementLabel({
  x,
  y,
  length,
  angle,
  scale,
}: {
  x: number
  y: number
  length: number
  angle: number
  scale: number
}) {
  const text = `${(length / 100).toFixed(2)} m`
  const fontSize = 11 / scale
  const padding = 6 / scale
  const offsetY = 24 / scale

  const perpAngle = angle + Math.PI / 2
  const labelX = x + Math.cos(perpAngle) * offsetY
  const labelY = y + Math.sin(perpAngle) * offsetY

  return (
    <Label x={labelX} y={labelY} listening={false}>
      <Tag
        fill={COLORS.measureBg}
        cornerRadius={4 / scale}
        pointerDirection="down"
        pointerWidth={6 / scale}
        pointerHeight={4 / scale}
        shadowColor="black"
        shadowBlur={4}
        shadowOpacity={0.1}
        shadowOffsetY={2}
      />
      <Text
        text={text}
        fontSize={fontSize}
        fontFamily="system-ui, sans-serif"
        fontStyle="500"
        fill={COLORS.measureText}
        padding={padding}
        align="center"
      />
    </Label>
  )
}

// Wall shape component
function WallShape({
  wall,
  isSelected,
  isHovered,
  scale,
}: {
  wall: Wall
  isSelected: boolean
  isHovered: boolean
  scale: number
}) {
  const { select, setHovered } = useEditorStore()
  const { moveWallEndpoint } = useFloorPlanStore()

  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  const length = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx)
  const midX = (wall.start.x + wall.end.x) / 2
  const midY = (wall.start.y + wall.end.y) / 2

  // Get wall color from material
  const baseColor = wall.material.colorOverride || COLORS.wall
  const color = isSelected
    ? COLORS.wallSelected
    : isHovered
    ? COLORS.wallHover
    : baseColor

  const handleRadius = 8 / scale

  return (
    <Group>
      {/* Wall body */}
      <Line
        points={[wall.start.x, wall.start.y, wall.end.x, wall.end.y]}
        stroke={color}
        strokeWidth={wall.thickness}
        lineCap="round"
        lineJoin="round"
        onClick={() => select([wall.id])}
        onMouseEnter={() => setHovered(wall.id)}
        onMouseLeave={() => setHovered(null)}
        hitStrokeWidth={Math.max(wall.thickness, 20)}
      />

      {/* Measurement label when selected or hovered */}
      {(isSelected || isHovered) && length > 50 && (
        <MeasurementLabel
          x={midX}
          y={midY}
          length={length}
          angle={angle}
          scale={scale}
        />
      )}

      {/* Endpoint handles when selected */}
      {isSelected && (
        <>
          <Circle
            x={wall.start.x}
            y={wall.start.y}
            radius={handleRadius}
            fill={COLORS.handleFill}
            stroke={COLORS.handle}
            strokeWidth={2 / scale}
            draggable
            onDragMove={(e) => {
              moveWallEndpoint(wall.id, 'start', {
                x: e.target.x(),
                y: e.target.y(),
              })
            }}
            onMouseEnter={(e) => {
              const stage = e.target.getStage()
              if (stage) stage.container().style.cursor = 'move'
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage()
              if (stage) stage.container().style.cursor = 'default'
            }}
          />
          <Circle
            x={wall.end.x}
            y={wall.end.y}
            radius={handleRadius}
            fill={COLORS.handleFill}
            stroke={COLORS.handle}
            strokeWidth={2 / scale}
            draggable
            onDragMove={(e) => {
              moveWallEndpoint(wall.id, 'end', {
                x: e.target.x(),
                y: e.target.y(),
              })
            }}
            onMouseEnter={(e) => {
              const stage = e.target.getStage()
              if (stage) stage.container().style.cursor = 'move'
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage()
              if (stage) stage.container().style.cursor = 'default'
            }}
          />
        </>
      )}
    </Group>
  )
}

// Window shape on 2D canvas
function WindowShape({
  window,
  wall,
  isSelected,
  scale,
}: {
  window: WindowInstance
  wall: Wall
  isSelected: boolean
  scale: number
}) {
  const { select, setHovered } = useEditorStore()

  // Calculate window position on wall
  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  const wallLength = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx)

  // Position along wall
  const t = window.position / wallLength
  const centerX = wall.start.x + dx * t
  const centerY = wall.start.y + dy * t

  const windowWidth = window.width
  const thickness = wall.thickness + 4

  return (
    <Group
      x={centerX}
      y={centerY}
      rotation={angle * (180 / Math.PI)}
      onClick={() => select([window.id])}
      onMouseEnter={() => setHovered(window.id)}
      onMouseLeave={() => setHovered(null)}
    >
      {/* Window frame */}
      <Rect
        x={-windowWidth / 2}
        y={-thickness / 2}
        width={windowWidth}
        height={thickness}
        fill={COLORS.window}
        stroke={isSelected ? COLORS.wallSelected : COLORS.windowFrame}
        strokeWidth={2 / scale}
        cornerRadius={2}
      />
      {/* Glass lines */}
      <Line
        points={[0, -thickness / 2, 0, thickness / 2]}
        stroke={COLORS.windowFrame}
        strokeWidth={1 / scale}
      />
    </Group>
  )
}

// Door shape on 2D canvas
function DoorShape({
  door,
  wall,
  isSelected,
  scale,
}: {
  door: DoorInstance
  wall: Wall
  isSelected: boolean
  scale: number
}) {
  const { select, setHovered } = useEditorStore()

  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  const wallLength = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx)

  const t = door.position / wallLength
  const centerX = wall.start.x + dx * t
  const centerY = wall.start.y + dy * t

  const doorWidth = door.width
  const thickness = wall.thickness + 4
  const swingDirection = door.openDirection === 'left' ? -1 : 1

  return (
    <Group
      x={centerX}
      y={centerY}
      rotation={angle * (180 / Math.PI)}
      onClick={() => select([door.id])}
      onMouseEnter={() => setHovered(door.id)}
      onMouseLeave={() => setHovered(null)}
    >
      {/* Door opening */}
      <Rect
        x={-doorWidth / 2}
        y={-thickness / 2}
        width={doorWidth}
        height={thickness}
        fill={COLORS.canvas}
        stroke={isSelected ? COLORS.wallSelected : COLORS.doorFrame}
        strokeWidth={2 / scale}
      />
      {/* Door swing arc */}
      <Arc
        x={swingDirection * doorWidth / 2}
        y={thickness / 2 + 2}
        innerRadius={0}
        outerRadius={doorWidth * 0.9}
        angle={90}
        rotation={swingDirection === 1 ? 180 : -90}
        stroke={isSelected ? COLORS.wallSelected : COLORS.door}
        strokeWidth={1 / scale}
        dash={[4 / scale, 4 / scale]}
      />
      {/* Door leaf */}
      <Line
        points={[
          swingDirection * doorWidth / 2,
          thickness / 2 + 2,
          swingDirection * doorWidth / 2 + (swingDirection * -doorWidth * 0.9 * Math.cos(Math.PI / 4)),
          thickness / 2 + 2 + doorWidth * 0.9 * Math.sin(Math.PI / 4)
        ]}
        stroke={isSelected ? COLORS.wallSelected : COLORS.door}
        strokeWidth={3 / scale}
      />
    </Group>
  )
}

// Wall preview during drawing
function WallPreview({
  start,
  end,
  thickness,
  scale,
}: {
  start: Point2D
  end: Point2D
  thickness: number
  scale: number
}) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx)
  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2

  return (
    <Group>
      <Line
        points={[start.x, start.y, end.x, end.y]}
        stroke={COLORS.wallPreview}
        strokeWidth={thickness}
        lineCap="round"
        opacity={0.6}
      />
      <Circle
        x={start.x}
        y={start.y}
        radius={4 / scale}
        fill={COLORS.wallPreview}
      />
      <Circle
        x={end.x}
        y={end.y}
        radius={6 / scale}
        fill={COLORS.handleFill}
        stroke={COLORS.wallPreview}
        strokeWidth={2 / scale}
      />
      {length > 30 && (
        <MeasurementLabel
          x={midX}
          y={midY}
          length={length}
          angle={angle}
          scale={scale}
        />
      )}
    </Group>
  )
}

// Furniture shape component
function FurnitureShape({ id, scale }: { id: string; scale: number }) {
  const furniture = useFloorPlanStore((state) =>
    state.floorPlan.furniture.find((f) => f.id === id)
  )
  const { select, setHovered } = useEditorStore()
  const { moveFurniture } = useFloorPlanStore()
  const isSelected = useEditorStore((state) => state.selectedIds.includes(id))
  const isHovered = useEditorStore((state) => state.hoveredId === id)

  if (!furniture) return null

  const color = isSelected
    ? COLORS.furnitureSelected
    : isHovered
    ? COLORS.wallHover
    : COLORS.furniture

  return (
    <Rect
      x={furniture.position.x}
      y={furniture.position.y}
      width={furniture.dimensions.width}
      height={furniture.dimensions.depth}
      offsetX={furniture.dimensions.width / 2}
      offsetY={furniture.dimensions.depth / 2}
      rotation={furniture.rotation}
      fill={color}
      opacity={0.8}
      stroke={isSelected ? COLORS.wallSelected : color}
      strokeWidth={isSelected ? 2 / scale : 1 / scale}
      cornerRadius={4}
      draggable={!furniture.locked}
      onClick={() => select([furniture.id])}
      onMouseEnter={() => setHovered(furniture.id)}
      onMouseLeave={() => setHovered(null)}
      onDragMove={(e) => {
        moveFurniture(furniture.id, { x: e.target.x(), y: e.target.y() })
      }}
    />
  )
}

// Origin crosshair
function OriginMarker({ scale }: { scale: number }) {
  const size = 20 / scale
  return (
    <Group listening={false} opacity={0.3}>
      <Line
        points={[-size, 0, size, 0]}
        stroke={COLORS.wall}
        strokeWidth={1 / scale}
      />
      <Line
        points={[0, -size, 0, size]}
        stroke={COLORS.wall}
        strokeWidth={1 / scale}
      />
      <Circle x={0} y={0} radius={3 / scale} fill={COLORS.wall} />
    </Group>
  )
}

export function Canvas2D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPointerPos, setLastPointerPos] = useState<Point2D | null>(null)

  // Store state
  const walls = useFloorPlanStore((state) => state.floorPlan.walls)
  const furniture = useFloorPlanStore((state) => state.floorPlan.furniture)
  const windows = useFloorPlanStore((state) => state.floorPlan.windows)
  const doors = useFloorPlanStore((state) => state.floorPlan.doors)
  const { addWall, removeWall, addWindow, addDoor } = useFloorPlanStore()

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
    setZoom2D,
    setPan2D,
    startWallDraw,
    updateWallDrawPreview,
    finishWallDraw,
    cancelWallDraw,
    clearSelection,
  } = useEditorStore()

  // Find wall at position for window/door placement
  const findWallAtPosition = useCallback((pos: Point2D): { wall: Wall; position: number } | null => {
    for (const wall of walls) {
      const dx = wall.end.x - wall.start.x
      const dy = wall.end.y - wall.start.y
      const length = Math.sqrt(dx * dx + dy * dy)

      // Vector from wall start to point
      const px = pos.x - wall.start.x
      const py = pos.y - wall.start.y

      // Project point onto wall line
      const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (length * length)))

      // Closest point on wall
      const closestX = wall.start.x + t * dx
      const closestY = wall.start.y + t * dy

      // Distance from point to wall
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
      // Ignore if we were panning
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
          if (
            Math.abs(snappedPos.x - wallDrawStart.x) > 10 ||
            Math.abs(snappedPos.y - wallDrawStart.y) > 10
          ) {
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
      } else if (activeTool === 'select') {
        if (e.target === stage) {
          clearSelection()
        }
      }
    },
    [
      activeTool,
      isDrawingWall,
      wallDrawStart,
      snapEnabled,
      zoom2D,
      pan2D,
      isPanning,
      addWall,
      addWindow,
      addDoor,
      startWallDraw,
      finishWallDraw,
      clearSelection,
      findWallAtPosition,
    ]
  )

  // Handle mouse down - start panning with middle mouse or right click
  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Middle mouse button (1) or right mouse button (2) for panning
      if (e.evt.button === 1 || e.evt.button === 2) {
        e.evt.preventDefault()
        setIsPanning(true)
        const stage = e.target.getStage()
        if (stage) {
          const pos = stage.getPointerPosition()
          if (pos) {
            setLastPointerPos(pos)
          }
          stage.container().style.cursor = 'grabbing'
        }
      }
    },
    []
  )

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage()
      if (!stage) return

      // Handle panning
      if (isPanning && lastPointerPos) {
        const pos = stage.getPointerPosition()
        if (pos) {
          const dx = pos.x - lastPointerPos.x
          const dy = pos.y - lastPointerPos.y
          setPan2D({
            x: pan2D.x + dx,
            y: pan2D.y + dy,
          })
          setLastPointerPos(pos)
        }
        return
      }

      // Handle wall drawing preview
      if (isDrawingWall) {
        const pointerPos = stage.getPointerPosition()
        if (!pointerPos) return

        const worldPos = {
          x: (pointerPos.x - pan2D.x) / zoom2D,
          y: (pointerPos.y - pan2D.y) / zoom2D,
        }

        const snappedPos = snapToGrid(worldPos, GRID_SIZE, snapEnabled)
        updateWallDrawPreview(snappedPos)
      }
    },
    [isPanning, lastPointerPos, isDrawingWall, zoom2D, pan2D, snapEnabled, updateWallDrawPreview, setPan2D]
  )

  // Handle mouse up - stop panning
  const handleMouseUp = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (isPanning) {
        setIsPanning(false)
        setLastPointerPos(null)
        const stage = e.target.getStage()
        if (stage) {
          stage.container().style.cursor = getCursor()
        }
      }
    },
    [isPanning]
  )

  // Handle wheel for zoom
  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()

      const stage = stageRef.current
      if (!stage) return

      const oldScale = zoom2D
      const pointer = stage.getPointerPosition()
      if (!pointer) return

      const scaleBy = 1.08
      const newScale =
        e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy

      const clampedScale = Math.min(Math.max(newScale, 0.02), 5)

      const mousePointTo = {
        x: (pointer.x - pan2D.x) / oldScale,
        y: (pointer.y - pan2D.y) / oldScale,
      }

      const newPos = {
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      }

      setZoom2D(clampedScale)
      setPan2D(newPos)
    },
    [zoom2D, pan2D, setZoom2D, setPan2D]
  )

  // Prevent context menu on right click
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    container.addEventListener('contextmenu', handleContextMenu)
    return () => container.removeEventListener('contextmenu', handleContextMenu)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawingWall) {
          cancelWallDraw()
        } else {
          clearSelection()
        }
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault()
        selectedIds.forEach((id) => removeWall(id))
        clearSelection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawingWall, cancelWallDraw, clearSelection, selectedIds, removeWall])

  // Resize observer
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateSize = () => {
      setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Cursor based on tool
  const getCursor = () => {
    if (isPanning) return 'grabbing'
    if (activeTool === 'wall') return 'crosshair'
    if (activeTool === 'window') return 'crosshair'
    if (activeTool === 'door') return 'crosshair'
    if (activeTool === 'pan') return 'grab'
    return 'default'
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ backgroundColor: COLORS.canvas }}
    >
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
            <Grid
              width={dimensions.width}
              height={dimensions.height}
              offsetX={pan2D.x}
              offsetY={pan2D.y}
              scale={zoom2D}
            />
          </Layer>
        )}

        {/* Main Content Layer */}
        <Layer>
          <OriginMarker scale={zoom2D} />

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
            const wall = walls.find((w) => w.id === window.wallId)
            if (!wall) return null
            return (
              <WindowShape
                key={window.id}
                window={window}
                wall={wall}
                isSelected={selectedIds.includes(window.id)}
                scale={zoom2D}
              />
            )
          })}

          {/* Doors */}
          {doors.map((door) => {
            const wall = walls.find((w) => w.id === door.wallId)
            if (!wall) return null
            return (
              <DoorShape
                key={door.id}
                door={door}
                wall={wall}
                isSelected={selectedIds.includes(door.id)}
                scale={zoom2D}
              />
            )
          })}

          {/* Furniture */}
          {furniture.map((f) => (
            <FurnitureShape key={f.id} id={f.id} scale={zoom2D} />
          ))}

          {/* Wall drawing preview */}
          {isDrawingWall && wallDrawStart && wallDrawPreview && (
            <WallPreview
              start={wallDrawStart}
              end={wallDrawPreview}
              thickness={DEFAULT_WALL_THICKNESS}
              scale={zoom2D}
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}
