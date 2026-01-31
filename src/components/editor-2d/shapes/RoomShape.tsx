import { memo, useRef, useEffect } from 'react'
import { Rect, Text, Group } from 'react-konva'
import type Konva from 'konva'
import { useEditorStore, useFloorPlanStore } from '@/stores'
import { COLORS_2D } from '@/constants/colors'
import { handleSelectWithModifiers } from '../types'
import type { Room } from '@/models'

interface RoomShapeProps {
  room: Room
  isSelected: boolean
  isHovered: boolean
  scale: number
  onRegisterNode: (id: string, node: Konva.Rect) => void
  onUnregisterNode: (id: string) => void
}

export const RoomShape = memo(function RoomShape({
  room,
  isSelected,
  isHovered,
  scale,
  onRegisterNode,
  onUnregisterNode,
}: RoomShapeProps) {
  const shapeRef = useRef<Konva.Rect>(null)
  const { select, addToSelection, toggleSelection, setHovered, activeTool, setIsDragging } = useEditorStore()
  const { moveRoomTo, resizeRoom } = useFloorPlanStore()

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
        draggable={activeTool === 'select'}
        onDragStart={() => setIsDragging(true)}
        onDragMove={(e) => {
          // Direct position update like furniture
          const newPos = { x: e.target.x(), y: e.target.y() }
          moveRoomTo(room.id, newPos)
        }}
        onDragEnd={() => setIsDragging(false)}
        onTransformEnd={() => {
          // Get the transformed values
          const node = shapeRef.current
          if (!node) return

          const scaleX = node.scaleX()
          const scaleY = node.scaleY()

          // Reset scale
          node.scaleX(1)
          node.scaleY(1)

          // Update room bounds with new position and scaled dimensions
          resizeRoom(room.id, {
            x: node.x(),
            y: node.y(),
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
