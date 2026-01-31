import { memo, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronRight,
  ChevronDown,
  Square,
  Folder,
  Armchair,
  Lock,
  Unlock,
  GripVertical,
  FolderOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEditorStore, useFloorPlanStore } from '@/stores'
import type { LayerNode as LayerNodeType } from './useLayerTree'

interface LayerNodeProps {
  node: LayerNodeType
  isSelected: boolean
  isExpanded: boolean
  onToggleExpand: (id: string) => void
}

export const LayerNode = memo(function LayerNode({
  node,
  isSelected,
  isExpanded,
  onToggleExpand,
}: LayerNodeProps) {
  const { select, addToSelection, toggleSelection } = useEditorStore()
  const {
    toggleFurnitureLock,
    toggleGroupLock,
    getChildrenOfGroup,
  } = useFloorPlanStore()
  const [isHovered, setIsHovered] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.id,
    disabled: node.type === 'unassigned',
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Get the icon for this node type
  const getIcon = () => {
    switch (node.type) {
      case 'room':
        return <Square className="w-4 h-4" />
      case 'group':
        return isExpanded ? (
          <FolderOpen className="w-4 h-4" />
        ) : (
          <Folder className="w-4 h-4" />
        )
      case 'furniture':
        return <Armchair className="w-4 h-4" />
      case 'unassigned':
        return <Folder className="w-4 h-4 text-muted-foreground" />
    }
  }

  const hasChildren = node.children.length > 0

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (node.type === 'unassigned') return

    const isShift = e.shiftKey
    const isCmd = e.metaKey || e.ctrlKey

    if (node.type === 'group') {
      // Clicking a group selects all descendants
      // Get all nested furniture recursively
      const getAllNestedFurniture = (groupId: string): string[] => {
        const children = getChildrenOfGroup(groupId)
        const ids = children.furniture.map((f) => f.id)
        for (const nestedGroup of children.groups) {
          ids.push(...getAllNestedFurniture(nestedGroup.id))
        }
        return ids
      }

      const nestedFurnitureIds = getAllNestedFurniture(node.id)

      if (isShift) {
        for (const furnitureId of nestedFurnitureIds) {
          addToSelection(furnitureId)
        }
      } else if (isCmd) {
        for (const id of nestedFurnitureIds) {
          toggleSelection(id)
        }
      } else {
        select(nestedFurnitureIds)
      }
    } else if (node.type === 'room') {
      // Selecting a room
      if (isShift) {
        addToSelection(node.id)
      } else if (isCmd) {
        toggleSelection(node.id)
      } else {
        select([node.id])
      }
    } else {
      // Furniture
      if (isShift) {
        addToSelection(node.id)
      } else if (isCmd) {
        toggleSelection(node.id)
      } else {
        select([node.id])
      }
    }
  }

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      onToggleExpand(node.id)
    }
  }

  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (node.type === 'furniture') {
      toggleFurnitureLock(node.id)
    } else if (node.type === 'group') {
      toggleGroupLock(node.id)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm cursor-pointer select-none',
        'hover:bg-secondary/60',
        isSelected && 'bg-primary/15 text-primary ring-1 ring-primary/30',
        isDragging && 'z-50',
        node.type === 'unassigned' && 'opacity-60'
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drag handle */}
      {node.type !== 'unassigned' && (
        <button
          className={cn(
            'p-0.5 rounded hover:bg-secondary/80 cursor-grab active:cursor-grabbing',
            !isHovered && 'invisible'
          )}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </button>
      )}

      {/* Indent spacer */}
      <div style={{ width: `${node.depth * 16}px` }} />

      {/* Expand/collapse button */}
      <button
        className={cn(
          'p-0.5 rounded hover:bg-secondary/80',
          !hasChildren && 'invisible'
        )}
        onClick={handleToggleExpand}
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
      </button>

      {/* Icon */}
      <span className="flex-shrink-0">{getIcon()}</span>

      {/* Name */}
      <span className="flex-1 truncate">{node.name}</span>

      {/* Lock button */}
      {(node.type === 'furniture' || node.type === 'group') && (
        <button
          className={cn(
            'p-0.5 rounded hover:bg-secondary/80',
            !isHovered && !node.locked && 'invisible'
          )}
          onClick={handleToggleLock}
        >
          {node.locked ? (
            <Lock className="w-3 h-3 text-orange-500" />
          ) : (
            <Unlock className="w-3 h-3 text-muted-foreground" />
          )}
        </button>
      )}
    </div>
  )
})
