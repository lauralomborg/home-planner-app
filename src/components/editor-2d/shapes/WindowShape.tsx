import { memo, useCallback } from 'react'
import { Rect, Line, Group } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useEditorStore, useFloorPlanStore } from '@/stores'
import { COLORS_2D } from '@/constants/colors'
import { handleSelectWithModifiers } from '../types'
import type { WindowInstance, Wall } from '@/models'

interface WindowShapeProps {
  window: WindowInstance
  wall: Wall
  isSelected: boolean
  scale: number
}

export const WindowShape = memo(function WindowShape({
  window,
  wall,
  isSelected,
  scale,
}: WindowShapeProps) {
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
        fill={COLORS_2D.window}
        stroke={isSelected ? COLORS_2D.wallSelected : COLORS_2D.windowFrame}
        strokeWidth={2 / scale}
        cornerRadius={2}
      />
      {/* Glass lines */}
      <Line
        points={[0, -thickness / 2, 0, thickness / 2]}
        stroke={COLORS_2D.windowFrame}
        strokeWidth={1 / scale}
      />
    </Group>
  )
})
