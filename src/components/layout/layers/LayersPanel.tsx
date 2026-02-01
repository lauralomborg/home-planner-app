import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useEditorStore, useFloorPlanStore } from '@/stores'
import { useLayerTree } from './useLayerTree'
import type { LayerNode as LayerNodeType } from './useLayerTree'
import { LayerNode } from './LayerNode'

export function LayersPanel() {
  const { flatNodes } = useLayerTree()
  const selectedIds = useEditorStore((state) => state.selectedIds)
  const groups = useFloorPlanStore((state) => state.floorPlan.groups)
  const rooms = useFloorPlanStore((state) => state.floorPlan.rooms)
  const {
    reorderFurniture,
    reorderRoom,
    reorderGroup,
    reparentToGroup,
    reparentFurniture,
    reparentRoom,
  } = useFloorPlanStore()

  // Track expanded nodes
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Auto-expand parents when item is selected from canvas
  useEffect(() => {
    if (selectedIds.length === 0) return

    setExpandedIds((prev) => {
      const next = new Set(prev)
      for (const selectedId of selectedIds) {
        const node = flatNodes.find((n) => n.id === selectedId)
        if (!node) continue

        // Walk up the tree and expand all ancestors
        let current = node
        while (current.parentId) {
          next.add(current.parentId)
          const parent = flatNodes.find((n) => n.id === current.parentId)
          if (!parent) break
          current = parent
        }
      }
      return next
    })
  }, [selectedIds, flatNodes])

  // Check if a node is visible (all ancestors expanded)
  const isNodeVisible = useCallback(
    (node: LayerNodeType): boolean => {
      if (node.depth === 0) return true
      if (!node.parentId) return true

      // Check if parent is expanded
      if (!expandedIds.has(node.parentId)) return false

      // Check ancestors recursively
      const parent = flatNodes.find((n) => n.id === node.parentId)
      if (!parent) return true
      return isNodeVisible(parent)
    },
    [expandedIds, flatNodes]
  )

  // Get visible nodes for rendering
  const visibleNodes = useMemo(() => {
    return flatNodes.filter(isNodeVisible)
  }, [flatNodes, isNodeVisible])

  // Sortable IDs - include all groups and rooms as potential drop targets
  // even when collapsed, so users can drop onto collapsed containers
  const sortableIds = useMemo(() => {
    const visibleIds = visibleNodes.map((n) => n.id)
    // Add collapsed groups and rooms as drop targets
    const groupIds = groups.map((g) => g.id)
    const roomIds = rooms.map((r) => r.id)
    return [...new Set([...visibleIds, ...groupIds, ...roomIds])]
  }, [visibleNodes, groups, rooms])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (_: DragOverEvent) => {
    // Could implement drop indicators here
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const activeNode = flatNodes.find((n) => n.id === active.id)
    const overNode = flatNodes.find((n) => n.id === over.id)

    if (!activeNode || !overNode) return

    // Handle reordering within same parent
    if (activeNode.parentId === overNode.parentId) {
      // Simple z-index swap based on position
      const overZIndex = overNode.zIndex

      if (activeNode.type === 'furniture') {
        reorderFurniture(activeNode.id, overZIndex)
      } else if (activeNode.type === 'room') {
        reorderRoom(activeNode.id, overZIndex)
      } else if (activeNode.type === 'group') {
        reorderGroup(activeNode.id, overZIndex)
      }
    }
    // Handle reparenting - dropping onto a group or room
    else if (
      activeNode.type === 'furniture' &&
      (overNode.type === 'group' || overNode.type === 'room')
    ) {
      if (overNode.type === 'group') {
        reparentToGroup(activeNode.id, overNode.id)
      } else if (overNode.type === 'room') {
        // Clear group parent and set room parent
        reparentToGroup(activeNode.id, null)
        reparentFurniture(activeNode.id, overNode.id)
      }

      // Expand the target so user can see the result
      setExpandedIds((prev) => new Set([...prev, overNode.id]))
    }
    // Handle dropping onto unassigned
    else if (
      activeNode.type === 'furniture' &&
      overNode.type === 'unassigned'
    ) {
      reparentToGroup(activeNode.id, null)
      reparentFurniture(activeNode.id, null)
    }
    // Handle room-to-room reparenting (drag room onto another room)
    else if (activeNode.type === 'room' && overNode.type === 'room') {
      reparentRoom(activeNode.id, overNode.id)
      setExpandedIds((prev) => new Set([...prev, overNode.id]))
    }
    // Handle dragging room to root level (onto unassigned)
    else if (activeNode.type === 'room' && overNode.type === 'unassigned') {
      reparentRoom(activeNode.id, null)
    }
  }

  const activeNode = activeId
    ? flatNodes.find((n) => n.id === activeId)
    : null

  return (
    <ScrollArea className="flex-1">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortableIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="p-2 space-y-0.5">
            {visibleNodes.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                No layers yet.
                <br />
                Add rooms or furniture to see them here.
              </div>
            ) : (
              visibleNodes.map((node) => (
                <LayerNode
                  key={node.id}
                  node={node}
                  isSelected={selectedIds.includes(node.id)}
                  isExpanded={expandedIds.has(node.id)}
                  onToggleExpand={toggleExpand}
                />
              ))
            )}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeNode && (
            <div className="bg-card border rounded-lg shadow-lg px-3 py-1.5 text-sm">
              {activeNode.name}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </ScrollArea>
  )
}
