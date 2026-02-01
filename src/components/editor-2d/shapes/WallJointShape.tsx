import { memo, useCallback, useState } from 'react'
import { Circle } from 'react-konva'
import { useEditorStore, useFloorPlanStore } from '@/stores'
import { COLORS_2D } from '@/constants/colors'
import type { Point2D } from '@/models'

interface WallJointShapeProps {
  /** The position of the joint (center point where walls meet) */
  position: Point2D
  /** IDs of walls connected at this joint */
  connectedWallIds: string[]
  /** Current zoom scale */
  scale: number
  /** Whether any of the connected walls is selected */
  isSelected: boolean
}

/**
 * Renders a draggable joint indicator at a point where 2+ walls meet.
 * Dragging this joint moves all connected wall endpoints together.
 */
export const WallJointShape = memo(function WallJointShape({
  position,
  connectedWallIds: _connectedWallIds,
  scale,
  isSelected,
}: WallJointShapeProps) {
  const { setIsDragging } = useEditorStore()
  const { moveWallJoint } = useFloorPlanStore()
  const [isHovered, setIsHovered] = useState(false)

  const baseRadius = 6 / scale
  const radius = isSelected ? baseRadius * 1.4 : isHovered ? baseRadius * 1.2 : baseRadius

  const color = isSelected
    ? COLORS_2D.wallJointConnected
    : isHovered
    ? COLORS_2D.wallJointHover
    : COLORS_2D.wallJoint

  const handleDragMove = useCallback(
    (e: any) => {
      const newPos: Point2D = { x: e.target.x(), y: e.target.y() }
      moveWallJoint(position, newPos)
    },
    [position, moveWallJoint]
  )

  return (
    <Circle
      x={position.x}
      y={position.y}
      radius={radius}
      fill={color}
      stroke={COLORS_2D.wallJointConnected}
      strokeWidth={2 / scale}
      opacity={isSelected || isHovered ? 1 : 0.7}
      draggable
      onDragStart={() => setIsDragging(true)}
      onDragMove={handleDragMove}
      onDragEnd={() => setIsDragging(false)}
      onMouseEnter={(e) => {
        setIsHovered(true)
        const stage = e.target.getStage()
        if (stage) stage.container().style.cursor = 'move'
      }}
      onMouseLeave={(e) => {
        setIsHovered(false)
        const stage = e.target.getStage()
        if (stage) stage.container().style.cursor = 'default'
      }}
    />
  )
})
