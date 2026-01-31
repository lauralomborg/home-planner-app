import { memo, useRef, useEffect } from 'react'
import { Rect, Circle, Group } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'
import { useEditorStore, useFloorPlanStore } from '@/stores'
import { COLORS_2D, GROUP_COLORS } from '@/constants/colors'
import { handleSelectWithModifiers } from '../types'
import type { Point2D } from '@/models'

interface FurnitureShapeProps {
  id: string
  scale: number
  onRegisterNode: (id: string, node: Konva.Rect) => void
  onUnregisterNode: (id: string) => void
  onDragUpdate: (isDragging: boolean, draggedIds: string[]) => void
}

export const FurnitureShape = memo(function FurnitureShape({
  id,
  scale,
  onRegisterNode,
  onUnregisterNode,
  onDragUpdate,
}: FurnitureShapeProps) {
  const shapeRef = useRef<Konva.Rect>(null)
  const furniture = useFloorPlanStore((state) =>
    state.floorPlan.furniture.find((f) => f.id === id)
  )
  const { select, addToSelection, toggleSelection, setHovered, setIsDragging, enterGroupEdit } = useEditorStore()
  const selectedIds = useEditorStore((state) => state.selectedIds)
  const editingGroupId = useEditorStore((state) => state.editingGroupId)
  const { moveFurniture, moveMultipleFurniture, duplicateMultiple, resizeFurniture, rotateFurniture, getGroupForItem, getGroupMembers } = useFloorPlanStore()
  const isSelected = useEditorStore((state) => state.selectedIds.includes(id))
  const isHovered = useEditorStore((state) => state.hoveredId === id)

  // Track drag start position for multi-select drag
  const dragStartPos = useRef<Point2D | null>(null)
  const didAltDuplicate = useRef(false)

  // Register/unregister node with transformer when selected
  useEffect(() => {
    if (isSelected && shapeRef.current) {
      onRegisterNode(id, shapeRef.current)
    } else {
      onUnregisterNode(id)
    }
    return () => onUnregisterNode(id)
  }, [isSelected, id, onRegisterNode, onUnregisterNode])

  if (!furniture) return null

  const group = getGroupForItem(id)
  const isGrouped = !!group
  const isInEditMode = editingGroupId === group?.id

  // Handle click with group awareness
  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    const isShift = e.evt.shiftKey
    const isCmd = e.evt.metaKey || e.evt.ctrlKey

    // If item is grouped and we're not in edit mode, select the whole group
    if (isGrouped && !isInEditMode && !isShift && !isCmd) {
      const members = getGroupMembers(group!.id)
      select(members.map((m) => m.id))
    } else {
      // Normal selection behavior
      handleSelectWithModifiers(e, furniture.id, select, addToSelection, toggleSelection)
    }
  }

  // Handle double-click to enter group edit mode
  const handleDblClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true
    if (isGrouped && !isInEditMode) {
      enterGroupEdit(group!.id)
      select([id]) // Select just this item when entering edit mode
    }
  }

  const color = isSelected
    ? COLORS_2D.furnitureSelected
    : isHovered
    ? COLORS_2D.wallHover
    : COLORS_2D.furniture

  return (
    <Group>
      {/* Group indicator badge */}
      {isGrouped && !isInEditMode && (
        <Circle
          x={furniture.position.x + furniture.dimensions.width / 2 - 8 / scale}
          y={furniture.position.y - furniture.dimensions.depth / 2 + 8 / scale}
          radius={6 / scale}
          fill={GROUP_COLORS.indicator}
          stroke="#FFFFFF"
          strokeWidth={1 / scale}
          listening={false}
        />
      )}
      <Rect
        ref={shapeRef}
        x={furniture.position.x}
        y={furniture.position.y}
        width={furniture.dimensions.width}
        height={furniture.dimensions.depth}
        offsetX={furniture.dimensions.width / 2}
        offsetY={furniture.dimensions.depth / 2}
        rotation={furniture.rotation}
        fill={color}
        opacity={0.8}
        stroke={isSelected ? COLORS_2D.wallSelected : isGrouped && !isInEditMode ? GROUP_COLORS.indicator : color}
        strokeWidth={isSelected ? 2 / scale : 1 / scale}
        cornerRadius={4}
        draggable={!furniture.locked}
        onClick={handleClick}
        onDblClick={handleDblClick}
        onMouseEnter={() => setHovered(furniture.id)}
        onMouseLeave={() => setHovered(null)}
        onDragStart={(e) => {
          setIsDragging(true)
          dragStartPos.current = { x: furniture.position.x, y: furniture.position.y }
          didAltDuplicate.current = false

          // Determine what items we're dragging
          let dragIds = [id]
          if (isSelected && selectedIds.length > 1) {
            dragIds = selectedIds
          } else if (isGrouped && !isInEditMode) {
            // Drag whole group
            const members = getGroupMembers(group!.id)
            dragIds = members.map((m) => m.id)
            select(dragIds)
          }

          // Alt+drag to duplicate
          if (e.evt.altKey) {
            const newIds = duplicateMultiple(dragIds)
            select(newIds)
            didAltDuplicate.current = true
          }

          onDragUpdate(true, dragIds)
        }}
        onDragMove={(e) => {
          const newPos = { x: e.target.x(), y: e.target.y() }

          // If this item is selected and there are multiple selected, move all
          if (isSelected && selectedIds.length > 1 && dragStartPos.current) {
            const delta = {
              x: newPos.x - dragStartPos.current.x,
              y: newPos.y - dragStartPos.current.y,
            }
            // Move all other selected items by the delta
            const otherIds = selectedIds.filter((sid) => sid !== id)
            moveMultipleFurniture(otherIds, delta)
            // Update this item
            moveFurniture(id, newPos)
            // Update drag start position for next move
            dragStartPos.current = newPos
          } else {
            moveFurniture(id, newPos)
          }
        }}
        onDragEnd={() => {
          setIsDragging(false)
          dragStartPos.current = null
          didAltDuplicate.current = false
          onDragUpdate(false, [])
        }}
        onTransformEnd={() => {
          // Get the transformed values
          const node = shapeRef.current
          if (!node) return

          const scaleX = node.scaleX()
          const scaleY = node.scaleY()

          // Reset scale and update dimensions
          node.scaleX(1)
          node.scaleY(1)

          resizeFurniture(id, {
            width: Math.max(10, furniture.dimensions.width * scaleX),
            depth: Math.max(10, furniture.dimensions.depth * scaleY),
            height: furniture.dimensions.height,
          })
          moveFurniture(id, { x: node.x(), y: node.y() })
          rotateFurniture(id, node.rotation())
        }}
      />
    </Group>
  )
})
