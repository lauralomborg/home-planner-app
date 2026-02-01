import { memo, useCallback } from 'react'
import { Line, Circle, Group } from 'react-konva'
import { useEditorStore, useFloorPlanStore } from '@/stores'
import { COLORS_2D } from '@/constants/colors'
import { handleSelectWithModifiers } from '../types'
import { MeasurementLabel } from '../utils/MeasurementLabel'
import type { Wall, Point2D } from '@/models'

interface WallShapeProps {
  wall: Wall
  isSelected: boolean
  isHovered: boolean
  scale: number
  /** Whether the start endpoint is part of a joint (2+ walls connected) */
  startIsJoint?: boolean
  /** Whether the end endpoint is part of a joint (2+ walls connected) */
  endIsJoint?: boolean
}

export const WallShape = memo(function WallShape({
  wall,
  isSelected,
  isHovered,
  scale,
  startIsJoint = false,
  endIsJoint = false,
}: WallShapeProps) {
  const { select, addToSelection, toggleSelection, setHovered, setIsDragging, activeTool } = useEditorStore()
  const { moveWallEndpoint, moveWallJoint } = useFloorPlanStore()

  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  const length = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx)
  const midX = (wall.start.x + wall.end.x) / 2
  const midY = (wall.start.y + wall.end.y) / 2

  // Get wall color from material
  const baseColor = wall.material.colorOverride || COLORS_2D.wall
  const color = isSelected
    ? COLORS_2D.wallSelected
    : isHovered
    ? COLORS_2D.wallHover
    : baseColor

  const handleRadius = 8 / scale

  // Joint-aware endpoint drag handlers
  const handleStartDrag = useCallback(
    (e: any) => {
      const newPos: Point2D = { x: e.target.x(), y: e.target.y() }
      if (startIsJoint) {
        // Move all walls connected at this joint
        moveWallJoint(wall.start, newPos)
      } else {
        // Move just this endpoint
        moveWallEndpoint(wall.id, 'start', newPos)
      }
    },
    [wall.id, wall.start, startIsJoint, moveWallJoint, moveWallEndpoint]
  )

  const handleEndDrag = useCallback(
    (e: any) => {
      const newPos: Point2D = { x: e.target.x(), y: e.target.y() }
      if (endIsJoint) {
        // Move all walls connected at this joint
        moveWallJoint(wall.end, newPos)
      } else {
        // Move just this endpoint
        moveWallEndpoint(wall.id, 'end', newPos)
      }
    },
    [wall.id, wall.end, endIsJoint, moveWallJoint, moveWallEndpoint]
  )

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
            radius={startIsJoint ? handleRadius * 1.3 : handleRadius}
            fill={startIsJoint ? COLORS_2D.wallJoint : COLORS_2D.handleFill}
            stroke={startIsJoint ? COLORS_2D.wallJointConnected : COLORS_2D.handle}
            strokeWidth={2 / scale}
            draggable
            onDragStart={() => setIsDragging(true)}
            onDragMove={handleStartDrag}
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
            radius={endIsJoint ? handleRadius * 1.3 : handleRadius}
            fill={endIsJoint ? COLORS_2D.wallJoint : COLORS_2D.handleFill}
            stroke={endIsJoint ? COLORS_2D.wallJointConnected : COLORS_2D.handle}
            strokeWidth={2 / scale}
            draggable
            onDragStart={() => setIsDragging(true)}
            onDragMove={handleEndDrag}
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
})
