import { memo, useRef, useEffect } from 'react'
import { Rect, Text, Group } from 'react-konva'
import type Konva from 'konva'
import { useEditorStore, useFloorPlanStore } from '@/stores'
import { COLORS_2D } from '@/constants/colors'
import { handleSelectWithModifiers } from '../types'
import { calculateRoomSnapWithConnections, findAdjacentRooms } from '@/services/geometry'
import type { Room } from '@/models'

interface RoomShapeProps {
  room: Room
  isSelected: boolean
  isHovered: boolean
  scale: number
  isPanning?: boolean
  onRegisterNode: (id: string, node: Konva.Rect) => void
  onUnregisterNode: (id: string) => void
}

export const RoomShape = memo(function RoomShape({
  room,
  isSelected,
  isHovered,
  scale,
  isPanning,
  onRegisterNode,
  onUnregisterNode,
}: RoomShapeProps) {
  const shapeRef = useRef<Konva.Rect>(null)
  const { select, addToSelection, toggleSelection, setHovered, activeTool, setIsDragging, setRoomSnapGuides, clearRoomSnapGuides } = useEditorStore()
  const { moveRoomTo, resizeRoom, finishRoomMove, addRoomConnection, removeRoomConnection, getConnectionBetweenRooms, getConnectionsForRoom } = useFloorPlanStore()
  const allRooms = useFloorPlanStore((state) => state.floorPlan.rooms)

  // Track the pending connection during drag
  const pendingConnectionRef = useRef<{
    adjacentRoomId: string
    connectionType: 'wall' | 'direct'
    axis: 'horizontal' | 'vertical'
    proposedSide: 'top' | 'right' | 'bottom' | 'left'
    adjacentSide: 'top' | 'right' | 'bottom' | 'left'
  } | null>(null)

  // Use bounds directly instead of deriving from walls
  const { x, y, width, height } = room.bounds
  const centerX = x + width / 2
  const centerY = y + height / 2

  const floorColor = room.floorMaterial.colorOverride || COLORS_2D.roomFloor
  const fillColor = isSelected ? COLORS_2D.roomSelected : floorColor

  // Register/unregister node with transformer when selected
  useEffect(() => {
    if (isSelected && shapeRef.current) {
      onRegisterNode(room.id, shapeRef.current)
    } else {
      onUnregisterNode(room.id)
    }
    return () => onUnregisterNode(room.id)
  }, [isSelected, room.id, onRegisterNode, onUnregisterNode])

  return (
    <Group>
      {/* Room floor fill */}
      <Rect
        ref={shapeRef}
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fillColor}
        opacity={isSelected ? 0.5 : isHovered ? 0.4 : 0.3}
        draggable={activeTool === 'select' && !isPanning}
        onDragStart={() => setIsDragging(true)}
        onDragMove={(e) => {
          // Snap to 1cm grid using position() for instant snapping
          const pos = e.target.position()
          const gridSnappedX = Math.round(pos.x)
          const gridSnappedY = Math.round(pos.y)
          e.target.position({ x: gridSnappedX, y: gridSnappedY })

          // Calculate proposed bounds with grid-snapped position
          const proposedBounds = {
            x: gridSnappedX,
            y: gridSnappedY,
            width: room.bounds.width,
            height: room.bounds.height,
          }

          // Calculate snap with connections (two-mode: wall or direct)
          const snapResult = calculateRoomSnapWithConnections(proposedBounds, allRooms, room.id)
          setRoomSnapGuides(snapResult.snapGuides)

          // Track pending connection for when drag ends
          if (snapResult.connectionType && snapResult.adjacentRoomId && snapResult.connectionInfo) {
            pendingConnectionRef.current = {
              adjacentRoomId: snapResult.adjacentRoomId,
              connectionType: snapResult.connectionType,
              axis: snapResult.connectionInfo.axis,
              proposedSide: snapResult.connectionInfo.proposedSide,
              adjacentSide: snapResult.connectionInfo.adjacentSide,
            }
          } else {
            pendingConnectionRef.current = null
          }

          // Apply room-to-room snapped position (overrides grid snap when rooms align)
          e.target.position({ x: snapResult.snappedBounds.x, y: snapResult.snappedBounds.y })
          moveRoomTo(room.id, { x: snapResult.snappedBounds.x, y: snapResult.snappedBounds.y })
        }}
        onDragEnd={() => {
          setIsDragging(false)
          clearRoomSnapGuides()

          // Handle room connections after move
          const currentBounds = room.bounds

          // Find all adjacent rooms after the move
          const adjacentRooms = findAdjacentRooms(currentBounds, allRooms, room.id)

          // Get existing connections for this room
          const existingConnections = getConnectionsForRoom(room.id)

          // Remove connections that are no longer valid (rooms not adjacent anymore)
          for (const conn of existingConnections) {
            const otherRoomId = conn.roomIds[0] === room.id ? conn.roomIds[1] : conn.roomIds[0]
            const stillAdjacent = adjacentRooms.some((adj) => adj.roomId === otherRoomId)
            if (!stillAdjacent) {
              removeRoomConnection(conn.id)
            }
          }

          // Add new connections for adjacent rooms
          for (const adj of adjacentRooms) {
            const existingConnection = getConnectionBetweenRooms(room.id, adj.roomId)
            if (!existingConnection) {
              // Determine connection type based on pending or default to 'wall'
              const connectionType = pendingConnectionRef.current?.adjacentRoomId === adj.roomId
                ? pendingConnectionRef.current.connectionType
                : 'wall'

              addRoomConnection({
                roomIds: [room.id, adj.roomId],
                type: connectionType,
                axis: adj.axis,
                roomSides: [adj.proposedSide, adj.adjacentSide],
              })
            }
            // No need to update existing connections - overlap is computed dynamically
          }

          pendingConnectionRef.current = null
          finishRoomMove(room.id)
        }}
        onTransformEnd={() => {
          // Get the transformed values
          const node = shapeRef.current
          if (!node) return

          const scaleX = node.scaleX()
          const scaleY = node.scaleY()

          // Reset scale
          node.scaleX(1)
          node.scaleY(1)

          // Snap position to 1cm grid after transform
          const snappedX = Math.round(node.x())
          const snappedY = Math.round(node.y())

          // Update room bounds with snapped position and scaled dimensions
          resizeRoom(room.id, {
            x: snappedX,
            y: snappedY,
            width: Math.max(50, width * scaleX),
            height: Math.max(50, height * scaleY),
          })
        }}
        onClick={(e) => {
          if (activeTool === 'furniture') {
            return // Let event bubble to stage for furniture placement
          }
          handleSelectWithModifiers(e, room.id, select, addToSelection, toggleSelection)
        }}
        onMouseEnter={() => setHovered(room.id)}
        onMouseLeave={() => setHovered(null)}
      />
      {/* Room label */}
      <Text
        x={centerX}
        y={centerY}
        text={room.name}
        fontSize={14 / scale}
        fontFamily="system-ui, sans-serif"
        fill={COLORS_2D.roomLabel}
        opacity={0.7}
        align="center"
        offsetX={room.name.length * 3.5 / scale}
        offsetY={7 / scale}
        listening={false}
      />
      {/* Area label */}
      <Text
        x={centerX}
        y={centerY + 16 / scale}
        text={`${room.area.toFixed(1)} m²`}
        fontSize={11 / scale}
        fontFamily="system-ui, sans-serif"
        fill={COLORS_2D.roomLabel}
        opacity={0.5}
        align="center"
        offsetX={room.area.toFixed(1).length * 3 / scale + 10 / scale}
        listening={false}
      />
    </Group>
  )
})
