import { memo, useCallback, useRef, useEffect } from 'react'
import { Rect, Line, Group } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'
import { useEditorStore, useFloorPlanStore } from '@/stores'
import { COLORS_2D } from '@/constants/colors'
import { handleSelectWithModifiers } from '../types'
import { findNearestWall } from '@/services/geometry'
import type { WindowInstance, Wall } from '@/models'

interface WindowShapeProps {
  window: WindowInstance
  wall: Wall
  isSelected: boolean
  scale: number
  onRegisterNode: (id: string, node: Konva.Rect) => void
  onUnregisterNode: (id: string) => void
}

export const WindowShape = memo(function WindowShape({
  window,
  wall,
  isSelected,
  scale,
  onRegisterNode,
  onUnregisterNode,
}: WindowShapeProps) {
  const { select, addToSelection, toggleSelection, setHovered, setIsDragging } = useEditorStore()
  const { updateWindow } = useFloorPlanStore()
  const floorPlan = useFloorPlanStore((state) => state.floorPlan)

  // Ref for the main rect shape (used for transformer)
  const shapeRef = useRef<Konva.Rect>(null)

  // Track target wall during drag for wall-to-wall transfer
  const targetWallRef = useRef<{ wallId: string; position: number } | null>(null)

  // Calculate window position on wall (position is left edge)
  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  const wallLength = Math.sqrt(dx * dx + dy * dy)
  const wallAngle = Math.atan2(dy, dx)

  const windowWidth = window.width
  const thickness = wall.thickness

  // Position is left edge, but Group needs to be at center for rotation
  // Calculate center by adding half-width along the wall direction
  const centerPos = window.position + windowWidth / 2
  const t = centerPos / wallLength
  const centerX = wall.start.x + dx * t
  const centerY = wall.start.y + dy * t

  // Register/unregister with transformer when selected
  useEffect(() => {
    if (isSelected && shapeRef.current) {
      onRegisterNode(window.id, shapeRef.current)
    } else {
      onUnregisterNode(window.id)
    }
    return () => onUnregisterNode(window.id)
  }, [isSelected, window.id, onRegisterNode, onUnregisterNode])

  // Handle transform end (resize width only)
  const handleTransformEnd = useCallback(() => {
    const node = shapeRef.current
    if (!node) return

    const scaleX = node.scaleX()
    const nodeX = node.x() // Check if position shifted (left handle was used)

    // Reset scale on the node
    node.scaleX(1)
    node.scaleY(1)

    // Calculate new width (minimum 30cm)
    const newWidth = Math.max(30, Math.round(windowWidth * scaleX))

    // If node.x changed, left handle was used - adjust position to keep right edge fixed
    if (Math.abs(nodeX) > 0.1) {
      const positionDelta = -nodeX // negative because left = negative x in local coords
      const newPosition = Math.max(0, Math.min(wallLength - newWidth, Math.round(window.position + positionDelta)))
      updateWindow(window.id, { width: newWidth, position: newPosition })
    } else {
      // Right handle used - just update width, clamp if needed
      const maxPos = wallLength - newWidth
      if (window.position > maxPos) {
        updateWindow(window.id, { width: newWidth, position: Math.round(maxPos) })
      } else {
        updateWindow(window.id, { width: newWidth })
      }
    }

    // Reset node position
    node.x(0)
  }, [windowWidth, window.id, window.position, wallLength, updateWindow])

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

      // Clamp position on new wall (position is left edge)
      const minPos = 0
      const maxPos = newWallLength - windowWidth
      // Snap to 1cm grid and clamp
      const snappedPosition = Math.round(nearestResult.position - windowWidth / 2) // Convert center to left edge
      const clampedPosition = Math.max(minPos, Math.min(maxPos, snappedPosition))

      targetWallRef.current = {
        wallId: newWall.id,
        position: clampedPosition,
      }

      // Snap visual position to new wall (position is left edge, offset to center for visual)
      const centerPos = clampedPosition + windowWidth / 2
      const t = centerPos / newWallLength
      node.x(newWall.start.x + newWallDx * t)
      node.y(newWall.start.y + newWallDy * t)
      node.rotation(Math.atan2(newWallDy, newWallDx) * (180 / Math.PI))
    } else {
      // Stay on current wall
      targetWallRef.current = null

      // Project drag position onto current wall line
      const px = dragX - wall.start.x
      const py = dragY - wall.start.y

      // Calculate position along wall (dot product / length) - this gives center position
      const dotProduct = px * dx + py * dy
      const centerPosition = dotProduct / wallLength

      // Convert to left edge position
      let newPosition = centerPosition - windowWidth / 2

      // Snap to 1cm grid
      newPosition = Math.round(newPosition)

      // Clamp position to keep window within wall bounds (position is left edge)
      const minPos = 0
      const maxPos = wallLength - windowWidth
      newPosition = Math.max(minPos, Math.min(maxPos, newPosition))

      // Update window position in store
      updateWindow(window.id, { position: newPosition })

      // Reset node position (position is left edge, offset to center for visual)
      const centerPos = newPosition + windowWidth / 2
      const newT = centerPos / wallLength
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
        ref={shapeRef}
        x={-windowWidth / 2}
        y={-thickness / 2}
        width={windowWidth}
        height={thickness}
        fill={COLORS_2D.window}
        stroke={isSelected ? COLORS_2D.wallSelected : COLORS_2D.windowFrame}
        strokeWidth={2 / scale}
        cornerRadius={2}
        onTransformEnd={handleTransformEnd}
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
