import { memo, useCallback, useRef } from 'react'
import { Rect, Line, Group } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useEditorStore, useFloorPlanStore } from '@/stores'
import { COLORS_2D } from '@/constants/colors'
import { handleSelectWithModifiers } from '../types'
import { calculatePositionOnWall, findNearestWall } from '@/services/geometry'
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
  const floorPlan = useFloorPlanStore((state) => state.floorPlan)

  // Track target wall during drag for wall-to-wall transfer
  const targetWallRef = useRef<{ wallId: string; position: number } | null>(null)

  // Calculate window position on wall
  const { centerX, centerY, wallAngle, wallLength } = calculatePositionOnWall(wall, window.position)
  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y

  const windowWidth = window.width
  const thickness = wall.thickness + 4

  // Handle drag to move window along wall or to another wall
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
      const minPos = windowWidth / 2
      const maxPos = newWallLength - windowWidth / 2
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
      node.rotation(wallAngle * (180 / Math.PI))
    }
  }, [wall, dx, dy, wallLength, wallAngle, windowWidth, updateWindow, window.id, floorPlan.walls])

  // Handle drag end - transfer to new wall if needed
  const handleDragEnd = useCallback(() => {
    setIsDragging(false)

    if (targetWallRef.current) {
      // Transfer window to new wall
      updateWindow(window.id, {
        wallId: targetWallRef.current.wallId,
        position: targetWallRef.current.position,
      })
      targetWallRef.current = null
    }
  }, [setIsDragging, updateWindow, window.id])

  return (
    <Group
      x={centerX}
      y={centerY}
      rotation={wallAngle * (180 / Math.PI)}
      draggable
      onClick={(e) => handleSelectWithModifiers(e, window.id, select, addToSelection, toggleSelection)}
      onDragStart={() => setIsDragging(true)}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
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
