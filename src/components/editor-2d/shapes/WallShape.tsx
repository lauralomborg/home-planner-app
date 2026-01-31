import { memo } from 'react'
import { Line, Circle, Group } from 'react-konva'
import { useEditorStore, useFloorPlanStore } from '@/stores'
import { COLORS_2D } from '@/constants/colors'
import { handleSelectWithModifiers } from '../types'
import { MeasurementLabel } from '../utils/MeasurementLabel'
import type { Wall } from '@/models'

interface WallShapeProps {
  wall: Wall
  isSelected: boolean
  isHovered: boolean
  scale: number
}

export const WallShape = memo(function WallShape({
  wall,
  isSelected,
  isHovered,
  scale,
}: WallShapeProps) {
  const { select, addToSelection, toggleSelection, setHovered, setIsDragging, activeTool } = useEditorStore()
  const { moveWallEndpoint } = useFloorPlanStore()

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
            fill={COLORS_2D.handleFill}
            stroke={COLORS_2D.handle}
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
            fill={COLORS_2D.handleFill}
            stroke={COLORS_2D.handle}
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
})
