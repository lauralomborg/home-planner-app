import { memo, useRef } from 'react'
import { Line, Group, Circle } from 'react-konva'
import type Konva from 'konva'
import { useEditorStore, useFloorPlanStore } from '@/stores'
import { COLORS_2D } from '@/constants/colors'
import type { RoomConnection } from '@/models'

interface ConnectionShapeProps {
  connection: RoomConnection
  isSelected: boolean
  scale: number
}

export const ConnectionShape = memo(function ConnectionShape({
  connection,
  isSelected,
  scale,
}: ConnectionShapeProps) {
  const { select, setHovered } = useEditorStore()
  const { updateConnectionOpening } = useFloorPlanStore()
  const dragStartRef = useRef<{ position: number; width: number } | null>(null)

  const { start, end } = connection.sharedEdge
  const isDirect = connection.type === 'direct'

  const edgeLength = Math.sqrt(
    Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
  )
  const dx = (end.x - start.x) / edgeLength
  const dy = (end.y - start.y) / edgeLength

  // Calculate line points
  const points = [start.x, start.y, end.x, end.y]

  // Direct connections: dotted blue line
  // Wall connections: dashed gray line with green opening indicators
  const strokeColor = isSelected ? COLORS_2D.handle : isDirect ? '#3B82F6' : '#9CA3AF'
  const strokeWidth = (isSelected ? 3 : 2) / scale
  const dashPattern = isDirect ? [8 / scale, 4 / scale] : [4 / scale, 2 / scale]

  // Calculate position along edge from world coordinates
  const worldToEdgePosition = (worldX: number, worldY: number): number => {
    const px = worldX - start.x
    const py = worldY - start.y
    const projection = (px * dx + py * dy) / edgeLength
    return Math.max(0, Math.min(1, projection))
  }

  // For wall connections, render opening segments with drag handles
  const renderOpenings = () => {
    if (connection.type !== 'wall' || connection.openings.length === 0) return null

    return connection.openings.map((opening) => {
      const openingStart = opening.position * edgeLength
      const openingWidth = opening.width * edgeLength

      const x1 = start.x + dx * openingStart
      const y1 = start.y + dy * openingStart
      const x2 = start.x + dx * (openingStart + openingWidth)
      const y2 = start.y + dy * (openingStart + openingWidth)

      return (
        <Group key={opening.id}>
          {/* Opening indicator line */}
          <Line
            points={[x1, y1, x2, y2]}
            stroke="#22C55E"
            strokeWidth={4 / scale}
            listening={false}
          />

          {/* Drag handles (only when selected) */}
          {isSelected && (
            <>
              {/* Start handle */}
              <Circle
                x={x1}
                y={y1}
                radius={6 / scale}
                fill={COLORS_2D.handleFill}
                stroke={COLORS_2D.handle}
                strokeWidth={1 / scale}
                draggable
                onDragStart={() => {
                  dragStartRef.current = { position: opening.position, width: opening.width }
                }}
                onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => {
                  const node = e.target
                  const newPos = worldToEdgePosition(node.x(), node.y())
                  const endPos = dragStartRef.current!.position + dragStartRef.current!.width
                  const newWidth = endPos - newPos

                  if (newWidth > 0.05) {
                    updateConnectionOpening(connection.id, opening.id, {
                      position: newPos,
                      width: newWidth,
                    })
                  }

                  // Snap back to edge
                  node.x(start.x + dx * newPos * edgeLength)
                  node.y(start.y + dy * newPos * edgeLength)
                }}
                onDragEnd={() => {
                  dragStartRef.current = null
                }}
              />

              {/* End handle */}
              <Circle
                x={x2}
                y={y2}
                radius={6 / scale}
                fill={COLORS_2D.handleFill}
                stroke={COLORS_2D.handle}
                strokeWidth={1 / scale}
                draggable
                onDragStart={() => {
                  dragStartRef.current = { position: opening.position, width: opening.width }
                }}
                onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => {
                  const node = e.target
                  const newEndPos = worldToEdgePosition(node.x(), node.y())
                  const startPos = dragStartRef.current!.position
                  const newWidth = newEndPos - startPos

                  if (newWidth > 0.05) {
                    updateConnectionOpening(connection.id, opening.id, {
                      width: newWidth,
                    })
                  }

                  // Snap back to edge
                  node.x(start.x + dx * newEndPos * edgeLength)
                  node.y(start.y + dy * newEndPos * edgeLength)
                }}
                onDragEnd={() => {
                  dragStartRef.current = null
                }}
              />
            </>
          )}
        </Group>
      )
    })
  }

  // For direct connections, show as full opening (entire edge)
  const renderDirectConnection = () => {
    if (connection.type !== 'direct') return null

    return (
      <Line
        points={points}
        stroke="#22C55E"
        strokeWidth={4 / scale}
        opacity={0.5}
        listening={false}
      />
    )
  }

  return (
    <Group>
      {/* Main connection line (clickable) */}
      <Line
        points={points}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        dash={dashPattern}
        hitStrokeWidth={20 / scale}
        onClick={(e) => {
          e.cancelBubble = true
          select([connection.id])
        }}
        onMouseEnter={() => setHovered(connection.id)}
        onMouseLeave={() => setHovered(null)}
      />

      {/* Opening indicators for wall connections */}
      {renderOpenings()}

      {/* Full opening indicator for direct connections */}
      {renderDirectConnection()}
    </Group>
  )
})
