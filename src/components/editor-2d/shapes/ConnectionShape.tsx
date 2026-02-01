import { memo } from 'react'
import { Line, Group } from 'react-konva'
import { useEditorStore, useFloorPlanStore } from '@/stores'
import { COLORS_2D } from '@/constants/colors'
import { DEFAULT_WALL_THICKNESS } from '@/models'
import type { RoomConnection, Point2D } from '@/models'

interface ConnectionShapeProps {
  connection: RoomConnection
  isSelected: boolean
  scale: number
}

/**
 * Computes the visual line for a connection based on current room positions.
 * Returns start and end points for drawing the connection indicator.
 *
 * For "wall" connections, the line is positioned in the middle of the gap between rooms.
 * For "direct" connections, the line is at the room edge where they touch.
 */
function computeConnectionLine(
  connection: RoomConnection,
  room1Bounds: { x: number; y: number; width: number; height: number } | undefined,
  room2Bounds: { x: number; y: number; width: number; height: number } | undefined
): { start: Point2D; end: Point2D } | null {
  if (!room1Bounds || !room2Bounds) return null

  const halfWallThickness = DEFAULT_WALL_THICKNESS / 2

  if (connection.axis === 'horizontal') {
    // Top/bottom connection - line is horizontal along the X overlap
    const overlapStart = Math.max(room1Bounds.x, room2Bounds.x)
    const overlapEnd = Math.min(
      room1Bounds.x + room1Bounds.width,
      room2Bounds.x + room2Bounds.width
    )

    if (overlapEnd <= overlapStart) return null

    // Calculate Y position based on which room's side is involved
    const [side1] = connection.roomSides
    let y: number
    if (side1 === 'top') {
      y = room1Bounds.y
      // For wall connections, move into the gap
      if (connection.type === 'wall') {
        y -= halfWallThickness
      }
    } else if (side1 === 'bottom') {
      y = room1Bounds.y + room1Bounds.height
      // For wall connections, move into the gap
      if (connection.type === 'wall') {
        y += halfWallThickness
      }
    } else {
      // Fallback: midpoint between rooms
      const room1Edge = connection.roomSides[0] === 'bottom' ? room1Bounds.y + room1Bounds.height : room1Bounds.y
      const room2Edge = connection.roomSides[1] === 'bottom' ? room2Bounds.y + room2Bounds.height : room2Bounds.y
      y = (room1Edge + room2Edge) / 2
    }

    return {
      start: { x: overlapStart, y },
      end: { x: overlapEnd, y },
    }
  } else {
    // Left/right connection - line is vertical along the Y overlap
    const overlapStart = Math.max(room1Bounds.y, room2Bounds.y)
    const overlapEnd = Math.min(
      room1Bounds.y + room1Bounds.height,
      room2Bounds.y + room2Bounds.height
    )

    if (overlapEnd <= overlapStart) return null

    // Calculate X position based on which room's side is involved
    const [side1] = connection.roomSides
    let x: number
    if (side1 === 'left') {
      x = room1Bounds.x
      // For wall connections, move into the gap
      if (connection.type === 'wall') {
        x -= halfWallThickness
      }
    } else if (side1 === 'right') {
      x = room1Bounds.x + room1Bounds.width
      // For wall connections, move into the gap
      if (connection.type === 'wall') {
        x += halfWallThickness
      }
    } else {
      // Fallback: midpoint between rooms
      const room1Edge = connection.roomSides[0] === 'right' ? room1Bounds.x + room1Bounds.width : room1Bounds.x
      const room2Edge = connection.roomSides[1] === 'right' ? room2Bounds.x + room2Bounds.width : room2Bounds.x
      x = (room1Edge + room2Edge) / 2
    }

    return {
      start: { x, y: overlapStart },
      end: { x, y: overlapEnd },
    }
  }
}

export const ConnectionShape = memo(function ConnectionShape({
  connection,
  isSelected,
  scale,
}: ConnectionShapeProps) {
  const { select, setHovered } = useEditorStore()
  const getRoomById = useFloorPlanStore((state) => state.getRoomById)

  // Get current room bounds for dynamic line computation
  const room1 = getRoomById(connection.roomIds[0])
  const room2 = getRoomById(connection.roomIds[1])

  const line = computeConnectionLine(connection, room1?.bounds, room2?.bounds)

  // Don't render if rooms don't overlap anymore
  if (!line) return null

  const { start, end } = line
  const isDirect = connection.type === 'direct'

  // Calculate line points
  const points = [start.x, start.y, end.x, end.y]

  // Direct connections: dotted blue line (no wall between rooms)
  // Wall connections: dashed gray line (shared wall in the gap)
  const strokeColor = isSelected ? COLORS_2D.handle : isDirect ? '#3B82F6' : '#9CA3AF'
  const strokeWidth = (isSelected ? 3 : 2) / scale
  const dashPattern = isDirect ? [8 / scale, 4 / scale] : [4 / scale, 2 / scale]

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

      {/* For direct connections, show a green overlay indicating full opening */}
      {isDirect && (
        <Line
          points={points}
          stroke="#22C55E"
          strokeWidth={4 / scale}
          opacity={0.5}
          listening={false}
        />
      )}
    </Group>
  )
})
