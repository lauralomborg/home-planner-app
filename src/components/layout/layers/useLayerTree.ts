import { useMemo } from 'react'
import { useFloorPlanStore } from '@/stores'
import type { FurnitureInstance, FurnitureGroup, Room } from '@/models'

export type LayerNodeType = 'room' | 'group' | 'furniture' | 'unassigned'

export interface LayerNode {
  id: string
  type: LayerNodeType
  name: string
  locked: boolean
  zIndex: number
  depth: number
  parentId: string | null
  children: LayerNode[]
  data: Room | FurnitureGroup | FurnitureInstance | null
}

export function useLayerTree() {
  const rooms = useFloorPlanStore((state) => state.floorPlan.rooms)
  const furniture = useFloorPlanStore((state) => state.floorPlan.furniture)
  const groups = useFloorPlanStore((state) => state.floorPlan.groups)

  const tree = useMemo(() => {
    const nodes: LayerNode[] = []

    // Helper to get furniture name from catalog
    const getFurnitureName = (f: FurnitureInstance) => {
      // Use catalogItemId as a fallback name
      return f.catalogItemId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }

    // Helper to build group node with its children
    const buildGroupNode = (
      group: FurnitureGroup,
      depth: number,
      parentId: string | null
    ): LayerNode => {
      const childFurniture = furniture
        .filter((f) => f.parentGroupId === group.id)
        .sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0))

      const childGroups = groups
        .filter((g) => g.parentGroupId === group.id)
        .sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0))

      const children: LayerNode[] = [
        // Nested groups first
        ...childGroups.map((g) => buildGroupNode(g, depth + 1, group.id)),
        // Then furniture
        ...childFurniture.map((f) => ({
          id: f.id,
          type: 'furniture' as const,
          name: getFurnitureName(f),
          locked: f.locked,
          zIndex: f.zIndex ?? 0,
          depth: depth + 1,
          parentId: group.id,
          children: [],
          data: f,
        })),
      ]

      return {
        id: group.id,
        type: 'group',
        name: group.name,
        locked: group.locked,
        zIndex: group.zIndex ?? 0,
        depth,
        parentId,
        children,
        data: group,
      }
    }

    // Helper to build room node with its children (including nested rooms)
    const buildRoomNode = (room: Room, depth: number, parentId: string | null): LayerNode => {
      // Groups directly in this room (not nested in another group)
      const roomGroups = groups
        .filter((g) => g.parentRoomId === room.id && !g.parentGroupId)
        .sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0))

      // Furniture directly in this room (not in a group)
      const roomFurniture = furniture
        .filter((f) => f.parentRoomId === room.id && !f.parentGroupId)
        .sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0))

      // Child rooms (rooms with this room as parent)
      const childRooms = rooms
        .filter((r) => r.parentRoomId === room.id)
        .sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0))

      const children: LayerNode[] = [
        // Nested rooms first
        ...childRooms.map((r) => buildRoomNode(r, depth + 1, room.id)),
        // Then groups
        ...roomGroups.map((g) => buildGroupNode(g, depth + 1, room.id)),
        // Then furniture
        ...roomFurniture.map((f) => ({
          id: f.id,
          type: 'furniture' as const,
          name: getFurnitureName(f),
          locked: f.locked,
          zIndex: f.zIndex ?? 0,
          depth: depth + 1,
          parentId: room.id,
          children: [],
          data: f,
        })),
      ]

      return {
        id: room.id,
        type: 'room',
        name: room.name,
        locked: false, // Rooms don't have a locked property currently
        zIndex: room.zIndex ?? 0,
        depth,
        parentId,
        children,
        data: room,
      }
    }

    // Only render root-level rooms (no parentRoomId) at depth 0
    const rootRooms = rooms
      .filter((r) => !r.parentRoomId)
      .sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0))

    for (const room of rootRooms) {
      nodes.push(buildRoomNode(room, 0, null))
    }

    // Root-level groups (no parent room or group)
    const rootGroups = groups
      .filter((g) => !g.parentRoomId && !g.parentGroupId)
      .sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0))

    for (const group of rootGroups) {
      nodes.push(buildGroupNode(group, 0, null))
    }

    // Unassigned furniture (no parent room or group)
    const unassignedFurniture = furniture
      .filter((f) => !f.parentRoomId && !f.parentGroupId)
      .sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0))

    if (unassignedFurniture.length > 0) {
      nodes.push({
        id: '__unassigned__',
        type: 'unassigned',
        name: 'Unassigned',
        locked: false,
        zIndex: -1,
        depth: 0,
        parentId: null,
        children: unassignedFurniture.map((f) => ({
          id: f.id,
          type: 'furniture' as const,
          name: getFurnitureName(f),
          locked: f.locked,
          zIndex: f.zIndex ?? 0,
          depth: 1,
          parentId: '__unassigned__',
          children: [],
          data: f,
        })),
        data: null,
      })
    }

    return nodes
  }, [rooms, furniture, groups])

  // Flatten tree for rendering
  const flatNodes = useMemo(() => {
    const result: LayerNode[] = []

    const flatten = (nodes: LayerNode[]) => {
      for (const node of nodes) {
        result.push(node)
        if (node.children.length > 0) {
          flatten(node.children)
        }
      }
    }

    flatten(tree)
    return result
  }, [tree])

  return { tree, flatNodes }
}
