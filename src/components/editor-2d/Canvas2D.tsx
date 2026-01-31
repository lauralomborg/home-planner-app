import { useRef, useCallback, useEffect, useState } from 'react'
import { Stage, Layer, Line, Rect, Circle, Group, Text, Tag, Label, Arc, Transformer } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'
import { useFloorPlanStore, useEditorStore } from '@/stores'
import type { Point2D, Wall, Room, WindowInstance, DoorInstance, FurnitureInstance } from '@/models'
import { DEFAULT_WALL_THICKNESS, DEFAULT_WALL_HEIGHT, DEFAULT_WINDOW_HEIGHT, DEFAULT_WINDOW_ELEVATION, DEFAULT_DOOR_HEIGHT } from '@/models'
import { FURNITURE_CATALOG } from '@/services/catalog'

const GRID_SIZE = 50 // 50cm grid

// Handle selection with modifier keys (Figma-style)
function handleSelectWithModifiers(
  e: KonvaEventObject<MouseEvent>,
  id: string,
  select: (ids: string[]) => void,
  addToSelection: (id: string) => void,
  toggleSelection: (id: string) => void
) {
  e.cancelBubble = true // Prevent stage click from clearing selection
  const isShift = e.evt.shiftKey
  const isCmd = e.evt.metaKey || e.evt.ctrlKey

  if (isCmd) {
    // Cmd/Ctrl+click toggles selection
    toggleSelection(id)
  } else if (isShift) {
    // Shift+click adds to selection
    addToSelection(id)
  } else {
    // Regular click replaces selection
    select([id])
  }
}

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
  roomFloor: '#E8E0D5',
  roomSelected: '#D5E8DE',
  roomLabel: '#5C5650',
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
  const { select, addToSelection, toggleSelection, setHovered, setIsDragging, activeTool } = useEditorStore()
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
        onClick={(e) => {
          if (activeTool === 'door' || activeTool === 'window') {
            return // Let event bubble to stage for door/window placement
          }
          handleSelectWithModifiers(e, wall.id, select, addToSelection, toggleSelection)
        }}
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
            onDragStart={() => setIsDragging(true)}
            onDragMove={(e) => {
              moveWallEndpoint(wall.id, 'start', {
                x: e.target.x(),
                y: e.target.y(),
              })
            }}
            onDragEnd={() => setIsDragging(false)}
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
            onDragStart={() => setIsDragging(true)}
            onDragMove={(e) => {
              moveWallEndpoint(wall.id, 'end', {
                x: e.target.x(),
                y: e.target.y(),
              })
            }}
            onDragEnd={() => setIsDragging(false)}
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
  const { select, addToSelection, toggleSelection, setHovered, setIsDragging } = useEditorStore()
  const { updateWindow } = useFloorPlanStore()

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

  // Handle drag to move window along wall
  const handleDragMove = useCallback((e: KonvaEventObject<DragEvent>) => {
    const node = e.target
    const dragX = node.x()
    const dragY = node.y()

    // Project drag position onto wall line
    const px = dragX - wall.start.x
    const py = dragY - wall.start.y

    // Calculate position along wall (dot product / length)
    const dotProduct = px * dx + py * dy
    let newPosition = dotProduct / wallLength

    // Clamp position to keep window within wall bounds
    const minPos = windowWidth / 2
    const maxPos = wallLength - windowWidth / 2
    newPosition = Math.max(minPos, Math.min(maxPos, newPosition))

    // Update window position in store
    updateWindow(window.id, { position: newPosition })

    // Reset node position (the Group will re-render at correct position from state)
    const newT = newPosition / wallLength
    node.x(wall.start.x + dx * newT)
    node.y(wall.start.y + dy * newT)
  }, [wall, dx, dy, wallLength, windowWidth, updateWindow, window.id])

  return (
    <Group
      x={centerX}
      y={centerY}
      rotation={angle * (180 / Math.PI)}
      draggable
      onClick={(e) => handleSelectWithModifiers(e, window.id, select, addToSelection, toggleSelection)}
      onDragStart={() => setIsDragging(true)}
      onDragMove={handleDragMove}
      onDragEnd={() => setIsDragging(false)}
      onMouseEnter={(e) => {
        setHovered(window.id)
        const stage = e.target.getStage()
        if (stage) stage.container().style.cursor = 'move'
      }}
      onMouseLeave={(e) => {
        setHovered(null)
        const stage = e.target.getStage()
        if (stage) stage.container().style.cursor = 'default'
      }}
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
  const { select, addToSelection, toggleSelection, setHovered, setIsDragging } = useEditorStore()
  const { updateDoor } = useFloorPlanStore()

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

  // Handle drag to move door along wall
  const handleDragMove = useCallback((e: KonvaEventObject<DragEvent>) => {
    const node = e.target
    const dragX = node.x()
    const dragY = node.y()

    // Project drag position onto wall line
    const px = dragX - wall.start.x
    const py = dragY - wall.start.y

    // Calculate position along wall (dot product / length)
    const dotProduct = px * dx + py * dy
    let newPosition = dotProduct / wallLength

    // Clamp position to keep door within wall bounds
    const minPos = doorWidth / 2
    const maxPos = wallLength - doorWidth / 2
    newPosition = Math.max(minPos, Math.min(maxPos, newPosition))

    // Update door position in store
    updateDoor(door.id, { position: newPosition })

    // Reset node position (the Group will re-render at correct position from state)
    const newT = newPosition / wallLength
    node.x(wall.start.x + dx * newT)
    node.y(wall.start.y + dy * newT)
  }, [wall, dx, dy, wallLength, doorWidth, updateDoor, door.id])

  return (
    <Group
      x={centerX}
      y={centerY}
      rotation={angle * (180 / Math.PI)}
      draggable
      onClick={(e) => handleSelectWithModifiers(e, door.id, select, addToSelection, toggleSelection)}
      onDragStart={() => setIsDragging(true)}
      onDragMove={handleDragMove}
      onDragEnd={() => setIsDragging(false)}
      onMouseEnter={(e) => {
        setHovered(door.id)
        const stage = e.target.getStage()
        if (stage) stage.container().style.cursor = 'move'
      }}
      onMouseLeave={(e) => {
        setHovered(null)
        const stage = e.target.getStage()
        if (stage) stage.container().style.cursor = 'default'
      }}
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

// Room floor shape - works like furniture with Transformer support
function RoomShape({
  room,
  isSelected,
  isHovered,
  scale,
  onRegisterNode,
  onUnregisterNode,
}: {
  room: Room
  isSelected: boolean
  isHovered: boolean
  scale: number
  onRegisterNode: (id: string, node: Konva.Rect) => void
  onUnregisterNode: (id: string) => void
}) {
  const shapeRef = useRef<Konva.Rect>(null)
  const { select, addToSelection, toggleSelection, setHovered, activeTool, setIsDragging } = useEditorStore()
  const { moveRoomTo, resizeRoom } = useFloorPlanStore()

  // Use bounds directly instead of deriving from walls
  const { x, y, width, height } = room.bounds
  const centerX = x + width / 2
  const centerY = y + height / 2

  const floorColor = room.floorMaterial.colorOverride || COLORS.roomFloor
  const fillColor = isSelected ? COLORS.roomSelected : floorColor

  // Register/unregister node with transformer when selected
  useEffect(() => {
    if (isSelected && shapeRef.current) {
      onRegisterNode(room.id, shapeRef.current)
    } else {
      onUnregisterNode(room.id)
    }
    return () => onUnregisterNode(room.id)
  }, [isSelected, room.id, onRegisterNode, onUnregisterNode])

  return (
    <Group>
      {/* Room floor fill */}
      <Rect
        ref={shapeRef}
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fillColor}
        opacity={isSelected ? 0.5 : isHovered ? 0.4 : 0.3}
        draggable={activeTool === 'select'}
        onDragStart={() => setIsDragging(true)}
        onDragMove={(e) => {
          // Direct position update like furniture
          const newPos = { x: e.target.x(), y: e.target.y() }
          moveRoomTo(room.id, newPos)
        }}
        onDragEnd={() => setIsDragging(false)}
        onTransformEnd={() => {
          // Get the transformed values
          const node = shapeRef.current
          if (!node) return

          const scaleX = node.scaleX()
          const scaleY = node.scaleY()

          // Reset scale
          node.scaleX(1)
          node.scaleY(1)

          // Update room bounds with new position and scaled dimensions
          resizeRoom(room.id, {
            x: node.x(),
            y: node.y(),
            width: Math.max(50, width * scaleX),
            height: Math.max(50, height * scaleY),
          })
        }}
        onClick={(e) => {
          if (activeTool === 'furniture') {
            return // Let event bubble to stage for furniture placement
          }
          handleSelectWithModifiers(e, room.id, select, addToSelection, toggleSelection)
        }}
        onMouseEnter={() => setHovered(room.id)}
        onMouseLeave={() => setHovered(null)}
      />
      {/* Room label */}
      <Text
        x={centerX}
        y={centerY}
        text={room.name}
        fontSize={14 / scale}
        fontFamily="system-ui, sans-serif"
        fill={COLORS.roomLabel}
        opacity={0.7}
        align="center"
        offsetX={room.name.length * 3.5 / scale}
        offsetY={7 / scale}
        listening={false}
      />
      {/* Area label */}
      <Text
        x={centerX}
        y={centerY + 16 / scale}
        text={`${room.area.toFixed(1)} m²`}
        fontSize={11 / scale}
        fontFamily="system-ui, sans-serif"
        fill={COLORS.roomLabel}
        opacity={0.5}
        align="center"
        offsetX={room.area.toFixed(1).length * 3 / scale + 10 / scale}
        listening={false}
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
      { dragged: draggedBounds.left, other: otherBounds.left, label: 'left-left' },
      { dragged: draggedBounds.right, other: otherBounds.right, label: 'right-right' },
      { dragged: draggedBounds.left, other: otherBounds.right, label: 'left-right' },
      { dragged: draggedBounds.right, other: otherBounds.left, label: 'right-left' },
      { dragged: draggedCenterX, other: otherCenterX, label: 'center-center' },
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
      { dragged: draggedBounds.top, other: otherBounds.top, label: 'top-top' },
      { dragged: draggedBounds.bottom, other: otherBounds.bottom, label: 'bottom-bottom' },
      { dragged: draggedBounds.top, other: otherBounds.bottom, label: 'top-bottom' },
      { dragged: draggedBounds.bottom, other: otherBounds.top, label: 'bottom-top' },
      { dragged: draggedCenterY, other: otherCenterY, label: 'center-center' },
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

// Colors for grouping
const GROUP_COLORS = {
  indicator: '#9B59B6', // Purple indicator for grouped items
  editMode: '#E8DAEF', // Light purple background when editing group
}

// Furniture shape component
function FurnitureShape({
  id,
  scale,
  onRegisterNode,
  onUnregisterNode,
  onDragUpdate,
}: {
  id: string
  scale: number
  onRegisterNode: (id: string, node: Konva.Rect) => void
  onUnregisterNode: (id: string) => void
  onDragUpdate: (isDragging: boolean, draggedIds: string[]) => void
}) {
  const shapeRef = useRef<Konva.Rect>(null)
  const furniture = useFloorPlanStore((state) =>
    state.floorPlan.furniture.find((f) => f.id === id)
  )
  const { select, addToSelection, toggleSelection, setHovered, setIsDragging, enterGroupEdit } = useEditorStore()
  const selectedIds = useEditorStore((state) => state.selectedIds)
  const editingGroupId = useEditorStore((state) => state.editingGroupId)
  const { moveFurniture, moveMultipleFurniture, duplicateMultiple, resizeFurniture, rotateFurniture, getGroupForItem, getGroupMembers } = useFloorPlanStore()
  const isSelected = useEditorStore((state) => state.selectedIds.includes(id))
  const isHovered = useEditorStore((state) => state.hoveredId === id)

  // Track drag start position for multi-select drag
  const dragStartPos = useRef<Point2D | null>(null)
  const didAltDuplicate = useRef(false)

  // Register/unregister node with transformer when selected
  useEffect(() => {
    if (isSelected && shapeRef.current) {
      onRegisterNode(id, shapeRef.current)
    } else {
      onUnregisterNode(id)
    }
    return () => onUnregisterNode(id)
  }, [isSelected, id, onRegisterNode, onUnregisterNode])

  if (!furniture) return null

  const group = getGroupForItem(id)
  const isGrouped = !!group
  const isInEditMode = editingGroupId === group?.id

  // Handle click with group awareness
  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    const isShift = e.evt.shiftKey
    const isCmd = e.evt.metaKey || e.evt.ctrlKey

    // If item is grouped and we're not in edit mode, select the whole group
    if (isGrouped && !isInEditMode && !isShift && !isCmd) {
      const members = getGroupMembers(group!.id)
      select(members.map((m) => m.id))
    } else {
      // Normal selection behavior
      handleSelectWithModifiers(e, furniture.id, select, addToSelection, toggleSelection)
    }
  }

  // Handle double-click to enter group edit mode
  const handleDblClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    if (isGrouped && !isInEditMode) {
      enterGroupEdit(group!.id)
      select([id]) // Select just this item when entering edit mode
    }
  }

  const color = isSelected
    ? COLORS.furnitureSelected
    : isHovered
    ? COLORS.wallHover
    : COLORS.furniture

  return (
    <Group>
      {/* Group indicator badge */}
      {isGrouped && !isInEditMode && (
        <Circle
          x={furniture.position.x + furniture.dimensions.width / 2 - 8 / scale}
          y={furniture.position.y - furniture.dimensions.depth / 2 + 8 / scale}
          radius={6 / scale}
          fill={GROUP_COLORS.indicator}
          stroke="#FFFFFF"
          strokeWidth={1 / scale}
          listening={false}
        />
      )}
      <Rect
        ref={shapeRef}
        x={furniture.position.x}
        y={furniture.position.y}
        width={furniture.dimensions.width}
        height={furniture.dimensions.depth}
        offsetX={furniture.dimensions.width / 2}
        offsetY={furniture.dimensions.depth / 2}
        rotation={furniture.rotation}
        fill={color}
        opacity={0.8}
        stroke={isSelected ? COLORS.wallSelected : isGrouped && !isInEditMode ? GROUP_COLORS.indicator : color}
        strokeWidth={isSelected ? 2 / scale : 1 / scale}
        cornerRadius={4}
        draggable={!furniture.locked}
        onClick={handleClick}
        onDblClick={handleDblClick}
        onMouseEnter={() => setHovered(furniture.id)}
        onMouseLeave={() => setHovered(null)}
        onDragStart={(e) => {
          setIsDragging(true)
          dragStartPos.current = { x: furniture.position.x, y: furniture.position.y }
          didAltDuplicate.current = false

          // Determine what items we're dragging
          let dragIds = [id]
          if (isSelected && selectedIds.length > 1) {
            dragIds = selectedIds
          } else if (isGrouped && !isInEditMode) {
            // Drag whole group
            const members = getGroupMembers(group!.id)
            dragIds = members.map((m) => m.id)
            select(dragIds)
          }

          // Alt+drag to duplicate
          if (e.evt.altKey) {
            const newIds = duplicateMultiple(dragIds)
            select(newIds)
            didAltDuplicate.current = true
          }

          onDragUpdate(true, dragIds)
        }}
        onDragMove={(e) => {
          const newPos = { x: e.target.x(), y: e.target.y() }

          // If this item is selected and there are multiple selected, move all
          if (isSelected && selectedIds.length > 1 && dragStartPos.current) {
            const delta = {
              x: newPos.x - dragStartPos.current.x,
              y: newPos.y - dragStartPos.current.y,
            }
            // Move all other selected items by the delta
            const otherIds = selectedIds.filter((sid) => sid !== id)
            moveMultipleFurniture(otherIds, delta)
            // Update this item
            moveFurniture(id, newPos)
            // Update drag start position for next move
            dragStartPos.current = newPos
          } else {
            moveFurniture(id, newPos)
          }
        }}
        onDragEnd={() => {
          setIsDragging(false)
          dragStartPos.current = null
          didAltDuplicate.current = false
          onDragUpdate(false, [])
        }}
        onTransformEnd={() => {
          // Get the transformed values
          const node = shapeRef.current
          if (!node) return

          const scaleX = node.scaleX()
          const scaleY = node.scaleY()

          // Reset scale and update dimensions
          node.scaleX(1)
          node.scaleY(1)

          resizeFurniture(id, {
            width: Math.max(10, furniture.dimensions.width * scaleX),
            depth: Math.max(10, furniture.dimensions.depth * scaleY),
            height: furniture.dimensions.height,
          })
          moveFurniture(id, { x: node.x(), y: node.y() })
          rotateFurniture(id, node.rotation())
        }}
      />
    </Group>
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

  // Get items within a marquee rectangle
  const getItemsInMarquee = useCallback((start: Point2D, end: Point2D): string[] => {
    const minX = Math.min(start.x, end.x)
    const maxX = Math.max(start.x, end.x)
    const minY = Math.min(start.y, end.y)
    const maxY = Math.max(start.y, end.y)

    const ids: string[] = []

    // Check furniture
    for (const f of furniture) {
      const fx = f.position.x
      const fy = f.position.y
      const hw = f.dimensions.width / 2
      const hd = f.dimensions.depth / 2
      // Simple AABB check (doesn't account for rotation, but good enough)
      if (fx - hw < maxX && fx + hw > minX && fy - hd < maxY && fy + hd > minY) {
        ids.push(f.id)
      }
    }

    // Check walls (by midpoint)
    for (const w of walls) {
      const midX = (w.start.x + w.end.x) / 2
      const midY = (w.start.y + w.end.y) / 2
      if (midX >= minX && midX <= maxX && midY >= minY && midY <= maxY) {
        ids.push(w.id)
      }
    }

    // Check windows (by position along wall)
    for (const win of windows) {
      const wall = walls.find((w) => w.id === win.wallId)
      if (wall) {
        const dx = wall.end.x - wall.start.x
        const dy = wall.end.y - wall.start.y
        const length = Math.sqrt(dx * dx + dy * dy)
        const t = win.position / length
        const wx = wall.start.x + dx * t
        const wy = wall.start.y + dy * t
        if (wx >= minX && wx <= maxX && wy >= minY && wy <= maxY) {
          ids.push(win.id)
        }
      }
    }

    // Check doors (by position along wall)
    for (const door of doors) {
      const wall = walls.find((w) => w.id === door.wallId)
      if (wall) {
        const dx = wall.end.x - wall.start.x
        const dy = wall.end.y - wall.start.y
        const length = Math.sqrt(dx * dx + dy * dy)
        const t = door.position / length
        const doorX = wall.start.x + dx * t
        const doorY = wall.start.y + dy * t
        if (doorX >= minX && doorX <= maxX && doorY >= minY && doorY <= maxY) {
          ids.push(door.id)
        }
      }
    }

    return ids
  }, [furniture, walls, windows, doors])

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
      } else if (activeTool === 'furniture' && selectedFurnitureId) {
        // Find the catalog item to get default dimensions
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
        // Only clear selection when clicking on empty stage without modifier keys
        if (e.target === stage && !e.evt.shiftKey && !e.evt.metaKey && !e.evt.ctrlKey) {
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
      selectedFurnitureId,
      addWall,
      addWindow,
      addDoor,
      addFurniture,
      startWallDraw,
      finishWallDraw,
      clearSelection,
      findWallAtPosition,
    ]
  )

  // Handle mouse down - start panning with middle mouse, right click, pan tool, or space held
  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage()
      if (!stage) return

      // Middle mouse button (1) or right mouse button (2) for panning
      // OR pan tool with left click OR space held with left click
      const shouldPan = e.evt.button === 1 || e.evt.button === 2 ||
        (e.evt.button === 0 && (activeTool === 'pan' || isSpaceHeld))

      if (shouldPan) {
        e.evt.preventDefault()
        setIsPanning(true)
        const pos = stage.getPointerPosition()
        if (pos) {
          setLastPointerPos(pos)
        }
        stage.container().style.cursor = 'grabbing'
        return
      }

      // Room tool: start drawing rectangle on left click
      if (e.evt.button === 0 && activeTool === 'room') {
        const pointerPos = stage.getPointerPosition()
        if (!pointerPos) return

        const worldPos = {
          x: (pointerPos.x - pan2D.x) / zoom2D,
          y: (pointerPos.y - pan2D.y) / zoom2D,
        }
        const snappedPos = snapToGrid(worldPos, GRID_SIZE, snapEnabled)
        setRoomDrawStart(snappedPos)
        setRoomDrawPreview(snappedPos)
      }

      // Select tool: start marquee selection on empty canvas
      if (e.evt.button === 0 && activeTool === 'select' && e.target === stage) {
        const pointerPos = stage.getPointerPosition()
        if (!pointerPos) return

        const worldPos = {
          x: (pointerPos.x - pan2D.x) / zoom2D,
          y: (pointerPos.y - pan2D.y) / zoom2D,
        }
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

      // Handle room drawing preview
      if (roomDrawStart) {
        const pointerPos = stage.getPointerPosition()
        if (!pointerPos) return

        const worldPos = {
          x: (pointerPos.x - pan2D.x) / zoom2D,
          y: (pointerPos.y - pan2D.y) / zoom2D,
        }

        const snappedPos = snapToGrid(worldPos, GRID_SIZE, snapEnabled)
        setRoomDrawPreview(snappedPos)
      }

      // Handle marquee selection preview
      if (isMarqueeSelecting) {
        const pointerPos = stage.getPointerPosition()
        if (!pointerPos) return

        const worldPos = {
          x: (pointerPos.x - pan2D.x) / zoom2D,
          y: (pointerPos.y - pan2D.y) / zoom2D,
        }
        updateMarquee(worldPos)
      }
    },
    [isPanning, lastPointerPos, isDrawingWall, roomDrawStart, isMarqueeSelecting, zoom2D, pan2D, snapEnabled, updateWallDrawPreview, updateMarquee, setPan2D]
  )

  // Handle mouse up - stop panning or finish room draw
  const handleMouseUp = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (isPanning) {
        setIsPanning(false)
        setLastPointerPos(null)
        const stage = e.target.getStage()
        if (stage) {
          stage.container().style.cursor = getCursor()
        }
        return
      }

      // Finish room drawing - create room from bounds
      if (roomDrawStart && roomDrawPreview) {
        const minSize = 50 // Minimum room size in cm
        const roomWidth = Math.abs(roomDrawPreview.x - roomDrawStart.x)
        const roomHeight = Math.abs(roomDrawPreview.y - roomDrawStart.y)

        if (roomWidth >= minSize && roomHeight >= minSize) {
          // Calculate bounds
          const left = Math.min(roomDrawStart.x, roomDrawPreview.x)
          const top = Math.min(roomDrawStart.y, roomDrawPreview.y)

          // Create room with bounds (walls are auto-generated)
          createRoomFromBounds({
            x: left,
            y: top,
            width: roomWidth,
            height: roomHeight,
          })
        }

        setRoomDrawStart(null)
        setRoomDrawPreview(null)
      }

      // Finish marquee selection
      if (isMarqueeSelecting && marqueeStart && marqueeEnd) {
        const itemsInMarquee = getItemsInMarquee(marqueeStart, marqueeEnd)
        if (itemsInMarquee.length > 0) {
          // If shift is held, add to existing selection
          if (e.evt.shiftKey) {
            const newSelection = [...new Set([...selectedIds, ...itemsInMarquee])]
            select(newSelection)
          } else {
            select(itemsInMarquee)
          }
        }
        finishMarquee()
      }
    },
    [isPanning, roomDrawStart, roomDrawPreview, isMarqueeSelecting, marqueeStart, marqueeEnd, selectedIds, createRoomFromBounds, getItemsInMarquee, select, finishMarquee]
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
      // Space key for temporary pan mode
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setIsSpaceHeld(true)
        const stage = stageRef.current
        if (stage) {
          stage.container().style.cursor = 'grab'
        }
        return
      }

      if (e.key === 'Escape') {
        if (isDrawingWall) {
          cancelWallDraw()
        }
        // Cancel room drawing if in progress
        if (roomDrawStart) {
          setRoomDrawStart(null)
          setRoomDrawPreview(null)
        }
        // Cancel marquee selection if in progress
        if (isMarqueeSelecting) {
          finishMarquee()
        }
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
      // Release space key
      if (e.code === 'Space') {
        setIsSpaceHeld(false)
        const stage = stageRef.current
        if (stage && !isPanning) {
          stage.container().style.cursor = getCursor()
        }
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
    if (!isDraggingFurniture || draggedIdsRef.current.length === 0) {
      return
    }

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
  const getCursor = useCallback(() => {
    if (isPanning) return 'grabbing'
    if (isSpaceHeld) return 'grab'
    if (activeTool === 'wall') return 'crosshair'
    if (activeTool === 'room') return 'crosshair'
    if (activeTool === 'window') return 'crosshair'
    if (activeTool === 'door') return 'crosshair'
    if (activeTool === 'furniture' && selectedFurnitureId) return 'crosshair'
    if (activeTool === 'pan') return 'grab'
    return 'default'
  }, [isPanning, isSpaceHeld, activeTool, selectedFurnitureId])

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

          {/* Rooms (render first, behind walls) */}
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
            <FurnitureShape
              key={f.id}
              id={f.id}
              scale={zoom2D}
              onRegisterNode={handleRegisterNode}
              onUnregisterNode={handleUnregisterNode}
              onDragUpdate={handleFurnitureDragUpdate}
            />
          ))}

          {/* Transformer for resize/rotate handles */}
          <Transformer
            ref={transformerRef}
            rotateEnabled={true}
            rotateAnchorOffset={20 / zoom2D}
            anchorSize={8 / zoom2D}
            anchorStroke={COLORS.handle}
            anchorFill={COLORS.handleFill}
            anchorCornerRadius={2 / zoom2D}
            borderStroke={COLORS.handle}
            borderStrokeWidth={1 / zoom2D}
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center', 'middle-left', 'middle-right']}
            boundBoxFunc={(oldBox, newBox) => {
              // Constrain minimum size
              if (newBox.width < 20 || newBox.height < 20) return oldBox
              return newBox
            }}
          />

          {/* Wall drawing preview */}
          {isDrawingWall && wallDrawStart && wallDrawPreview && (
            <WallPreview
              start={wallDrawStart}
              end={wallDrawPreview}
              thickness={DEFAULT_WALL_THICKNESS}
              scale={zoom2D}
            />
          )}

          {/* Room drawing preview */}
          {roomDrawStart && roomDrawPreview && (
            <Rect
              x={Math.min(roomDrawStart.x, roomDrawPreview.x)}
              y={Math.min(roomDrawStart.y, roomDrawPreview.y)}
              width={Math.abs(roomDrawPreview.x - roomDrawStart.x)}
              height={Math.abs(roomDrawPreview.y - roomDrawStart.y)}
              fill={COLORS.wallPreview}
              opacity={0.1}
              stroke={COLORS.wallPreview}
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
              points={
                guide.type === 'vertical'
                  ? [guide.position, guide.start, guide.position, guide.end]
                  : [guide.start, guide.position, guide.end, guide.position]
              }
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
