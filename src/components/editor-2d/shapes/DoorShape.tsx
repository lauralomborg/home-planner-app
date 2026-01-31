import { memo, useCallback } from 'react'
import { Rect, Line, Arc, Group } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useEditorStore, useFloorPlanStore } from '@/stores'
import { COLORS_2D } from '@/constants/colors'
import { handleSelectWithModifiers } from '../types'
import type { DoorInstance, Wall } from '@/models'

interface DoorShapeProps {
  door: DoorInstance
  wall: Wall
  isSelected: boolean
  scale: number
}

export const DoorShape = memo(function DoorShape({
  door,
  wall,
  isSelected,
  scale,
}: DoorShapeProps) {
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
        fill={COLORS_2D.canvas}
        stroke={isSelected ? COLORS_2D.wallSelected : COLORS_2D.doorFrame}
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
        stroke={isSelected ? COLORS_2D.wallSelected : COLORS_2D.door}
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
        stroke={isSelected ? COLORS_2D.wallSelected : COLORS_2D.door}
        strokeWidth={3 / scale}
      />
    </Group>
  )
})
