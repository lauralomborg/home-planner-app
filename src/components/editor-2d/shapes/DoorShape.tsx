import { memo, useCallback, useRef, useEffect } from 'react'
import { Rect, Line, Arc, Group } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'
import { useEditorStore, useFloorPlanStore } from '@/stores'
import { COLORS_2D } from '@/constants/colors'
import { handleSelectWithModifiers } from '../types'
import { calculatePositionOnWall, findNearestWall } from '@/services/geometry'
import type { DoorInstance, Wall } from '@/models'

interface DoorShapeProps {
  door: DoorInstance
  wall: Wall
  isSelected: boolean
  scale: number
  onRegisterNode: (id: string, node: Konva.Rect) => void
  onUnregisterNode: (id: string) => void
}

export const DoorShape = memo(function DoorShape({
  door,
  wall,
  isSelected,
  scale,
  onRegisterNode,
  onUnregisterNode,
}: DoorShapeProps) {
  const { select, addToSelection, toggleSelection, setHovered, setIsDragging } = useEditorStore()
  const { updateDoor } = useFloorPlanStore()
  const floorPlan = useFloorPlanStore((state) => state.floorPlan)

  // Ref for the main rect shape (used for transformer)
  const shapeRef = useRef<Konva.Rect>(null)

  // Track target wall during drag for wall-to-wall transfer
  const targetWallRef = useRef<{ wallId: string; position: number } | null>(null)

  // Calculate door position on wall
  const { centerX, centerY, wallAngle, wallLength } = calculatePositionOnWall(wall, door.position)
  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y

  const doorWidth = door.width
  const thickness = wall.thickness + 4

  // Register/unregister with transformer when selected
  useEffect(() => {
    if (isSelected && shapeRef.current) {
      onRegisterNode(door.id, shapeRef.current)
    } else {
      onUnregisterNode(door.id)
    }
    return () => onUnregisterNode(door.id)
  }, [isSelected, door.id, onRegisterNode, onUnregisterNode])

  // Handle transform end (resize width only)
  const handleTransformEnd = useCallback(() => {
    const node = shapeRef.current
    if (!node) return

    const scaleX = node.scaleX()

    // Reset scale on the node
    node.scaleX(1)
    node.scaleY(1)

    // Calculate new width (minimum 40cm)
    const newWidth = Math.max(40, doorWidth * scaleX)

    updateDoor(door.id, { width: newWidth })
  }, [doorWidth, door.id, updateDoor])

  // Determine hinge position based on open direction
  // left/inward = hinge on left side, right/outward = hinge on right side
  const hingeOnLeft = door.openDirection === 'left' || door.openDirection === 'inward'
  const hingeX = hingeOnLeft ? -doorWidth / 2 : doorWidth / 2
  // Arc rotation: left hinge swings clockwise (0°), right hinge swings counter-clockwise (90°)
  const arcRotation = hingeOnLeft ? 0 : 90

  // Handle drag to move door along wall or to another wall
  const handleDragMove = useCallback((e: KonvaEventObject<DragEvent>) => {
    const node = e.target
    const dragX = node.x()
    const dragY = node.y()
    const dragPos = { x: dragX, y: dragY }

    // Check if near a different wall
    const nearestResult = findNearestWall(dragPos, floorPlan.walls, wall.id, 30)

    if (nearestResult) {
      // Near a different wall - store target for drag end
      const newWall = nearestResult.wall
      const newWallDx = newWall.end.x - newWall.start.x
      const newWallDy = newWall.end.y - newWall.start.y
      const newWallLength = Math.sqrt(newWallDx * newWallDx + newWallDy * newWallDy)

      // Clamp position on new wall
      const minPos = doorWidth / 2
      const maxPos = newWallLength - doorWidth / 2
      const clampedPosition = Math.max(minPos, Math.min(maxPos, nearestResult.position))

      targetWallRef.current = {
        wallId: newWall.id,
        position: clampedPosition,
      }

      // Snap visual position to new wall
      const t = clampedPosition / newWallLength
      node.x(newWall.start.x + newWallDx * t)
      node.y(newWall.start.y + newWallDy * t)
      node.rotation(Math.atan2(newWallDy, newWallDx) * (180 / Math.PI))
    } else {
      // Stay on current wall
      targetWallRef.current = null

      // Project drag position onto current wall line
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
      node.rotation(wallAngle * (180 / Math.PI))
    }
  }, [wall, dx, dy, wallLength, wallAngle, doorWidth, updateDoor, door.id, floorPlan.walls])

  // Handle drag end - transfer to new wall if needed
  const handleDragEnd = useCallback(() => {
    setIsDragging(false)

    if (targetWallRef.current) {
      // Transfer door to new wall
      updateDoor(door.id, {
        wallId: targetWallRef.current.wallId,
        position: targetWallRef.current.position,
      })
      targetWallRef.current = null
    }
  }, [setIsDragging, updateDoor, door.id])

  return (
    <Group
      x={centerX}
      y={centerY}
      rotation={wallAngle * (180 / Math.PI)}
      draggable
      onClick={(e) => handleSelectWithModifiers(e, door.id, select, addToSelection, toggleSelection)}
      onDragStart={() => setIsDragging(true)}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
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
        ref={shapeRef}
        x={-doorWidth / 2}
        y={-thickness / 2}
        width={doorWidth}
        height={thickness}
        fill={COLORS_2D.canvas}
        stroke={isSelected ? COLORS_2D.wallSelected : COLORS_2D.doorFrame}
        strokeWidth={2 / scale}
        onTransformEnd={handleTransformEnd}
      />
      {/* Door swing arc */}
      <Arc
        x={hingeX}
        y={thickness / 2 + 2}
        innerRadius={0}
        outerRadius={doorWidth * 0.9}
        angle={90}
        rotation={arcRotation}
        stroke={isSelected ? COLORS_2D.wallSelected : COLORS_2D.door}
        strokeWidth={1 / scale}
        dash={[4 / scale, 4 / scale]}
      />
      {/* Door leaf - line from hinge to 45° open position */}
      <Line
        points={[
          hingeX,
          thickness / 2 + 2,
          hingeX + (hingeOnLeft ? 1 : -1) * doorWidth * 0.9 * Math.cos(Math.PI / 4),
          thickness / 2 + 2 + doorWidth * 0.9 * Math.sin(Math.PI / 4)
        ]}
        stroke={isSelected ? COLORS_2D.wallSelected : COLORS_2D.door}
        strokeWidth={3 / scale}
      />
    </Group>
  )
})
