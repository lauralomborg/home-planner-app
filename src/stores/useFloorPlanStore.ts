import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type {
  FloorPlan,
  Wall,
  Room,
  RoomBounds,
  FurnitureInstance,
  FurnitureGroup,
  WindowInstance,
  DoorInstance,
  LightInstance,
  Point2D,
  MaterialRef,
  RoomType,
  Dimensions3D,
} from '@/models'
import {
  detectRooms as detectRoomsFromWalls,
  generateWallsFromBounds,
  getContainedFurnitureIds,
  getContainedRoomIds,
  findParentRoomForPoint,
  findParentRoomForBounds,
} from '@/services/geometry'

interface FloorPlanState {
  floorPlan: FloorPlan

  // Wall actions
  addWall: (wall: Omit<Wall, 'id' | 'openings'>) => string
  updateWall: (id: string, updates: Partial<Omit<Wall, 'id'>>) => void
  moveWallEndpoint: (
    id: string,
    endpoint: 'start' | 'end',
    position: Point2D
  ) => void
  removeWall: (id: string) => void

  // Room actions
  addRoom: (room: Omit<Room, 'id' | 'area' | 'perimeter' | 'zIndex'>) => string
  updateRoom: (id: string, updates: Partial<Omit<Room, 'id'>>) => void
  renameRoom: (id: string, name: string) => void
  setRoomType: (id: string, type: RoomType) => void
  setRoomFloorMaterial: (id: string, material: MaterialRef) => void
  removeRoom: (id: string) => void
  detectRooms: () => void
  // New room frame actions
  createRoomFromBounds: (bounds: RoomBounds, name?: string) => string
  moveRoom: (roomId: string, delta: Point2D) => void
  moveRoomTo: (roomId: string, position: Point2D) => void
  resizeRoom: (roomId: string, newBounds: RoomBounds) => void
  updateRoomContainment: (roomId: string) => void
  updateAllRoomContainment: () => void

  // Furniture actions
  addFurniture: (furniture: Omit<FurnitureInstance, 'id' | 'zIndex'>) => string
  updateFurniture: (
    id: string,
    updates: Partial<Omit<FurnitureInstance, 'id'>>
  ) => void
  moveFurniture: (id: string, position: Point2D) => void
  rotateFurniture: (id: string, rotation: number) => void
  resizeFurniture: (id: string, dimensions: Dimensions3D) => void
  setFurnitureMaterial: (
    id: string,
    partName: string,
    material: MaterialRef
  ) => void
  toggleFurnitureLock: (id: string) => void
  removeFurniture: (id: string) => void
  duplicateFurniture: (id: string) => string | null

  // Window actions
  addWindow: (window: Omit<WindowInstance, 'id'>) => string
  updateWindow: (
    id: string,
    updates: Partial<Omit<WindowInstance, 'id'>>
  ) => void
  removeWindow: (id: string) => void

  // Door actions
  addDoor: (door: Omit<DoorInstance, 'id'>) => string
  updateDoor: (id: string, updates: Partial<Omit<DoorInstance, 'id'>>) => void
  toggleDoorOpen: (id: string) => void
  removeDoor: (id: string) => void

  // Light actions
  addLight: (light: Omit<LightInstance, 'id'>) => string
  updateLight: (id: string, updates: Partial<Omit<LightInstance, 'id'>>) => void
  removeLight: (id: string) => void

  // Bulk actions
  clearFloorPlan: () => void
  loadFloorPlan: (floorPlan: FloorPlan) => void
  removeSelected: (ids: string[]) => void

  // Batch operations for multi-select
  moveMultipleFurniture: (ids: string[], delta: Point2D) => void
  duplicateMultiple: (ids: string[]) => string[]

  // Group operations
  createGroup: (memberIds: string[], name?: string) => string | null
  dissolveGroup: (groupId: string) => void
  toggleGroupLock: (groupId: string) => void
  renameGroup: (groupId: string, name: string) => void
  getGroupById: (groupId: string) => FurnitureGroup | undefined
  getGroupForItem: (itemId: string) => FurnitureGroup | undefined
  getGroupMembers: (groupId: string) => FurnitureInstance[]
  getChildrenOfGroup: (groupId: string) => { furniture: FurnitureInstance[]; groups: FurnitureGroup[] }
  reparentToGroup: (itemId: string, groupId: string | null) => void
  moveGroup: (groupId: string, delta: Point2D) => void

  // Z-index / ordering operations
  reorderFurniture: (id: string, newZIndex: number) => void
  reorderRoom: (id: string, newZIndex: number) => void
  reorderGroup: (id: string, newZIndex: number) => void
  getNextZIndex: (type: 'furniture' | 'room' | 'group') => number

  // Furniture hierarchy actions
  reparentFurniture: (furnitureId: string, newParentRoomId: string | null) => void
  reparentFurnitureByPosition: (furnitureId: string) => void
  finishFurnitureMove: (furnitureIds: string[]) => void

  // Room hierarchy actions
  finishRoomMove: (roomId: string) => void
  reparentRoom: (roomId: string, newParentRoomId: string | null) => void

  // Getters
  getWallById: (id: string) => Wall | undefined
  getRoomById: (id: string) => Room | undefined
  getFurnitureById: (id: string) => FurnitureInstance | undefined
  getWindowById: (id: string) => WindowInstance | undefined
  getDoorById: (id: string) => DoorInstance | undefined
  getWallsForRoom: (roomId: string) => Wall[]
  getFurnitureForRoom: (roomId: string) => FurnitureInstance[]
  getRootFurniture: () => FurnitureInstance[]
  getGroupsForRoom: (roomId: string) => FurnitureGroup[]
  getRootGroups: () => FurnitureGroup[]
}

export const useFloorPlanStore = create<FloorPlanState>()(
  persist(
    immer((set, get) => ({
      floorPlan: {
        id: crypto.randomUUID(),
        walls: [],
        rooms: [],
        furniture: [],
        windows: [],
        doors: [],
        lights: [],
        groups: [],
      },

    // ==================== Wall Actions ====================

    addWall: (wall) => {
      const id = crypto.randomUUID()
      set((state) => {
        state.floorPlan.walls.push({
          ...wall,
          id,
          openings: [],
        })
      })
      return id
    },

    updateWall: (id, updates) => {
      set((state) => {
        const wall = state.floorPlan.walls.find((w) => w.id === id)
        if (wall) {
          Object.assign(wall, updates)
        }
      })
    },

    moveWallEndpoint: (id, endpoint, position) => {
      set((state) => {
        const wall = state.floorPlan.walls.find((w) => w.id === id)
        if (wall) {
          wall[endpoint] = position
        }
      })
    },

    removeWall: (id) => {
      set((state) => {
        state.floorPlan.walls = state.floorPlan.walls.filter((w) => w.id !== id)
        // Also remove any windows/doors on this wall
        state.floorPlan.windows = state.floorPlan.windows.filter(
          (w) => w.wallId !== id
        )
        state.floorPlan.doors = state.floorPlan.doors.filter(
          (d) => d.wallId !== id
        )
      })
    },

    // ==================== Room Actions ====================

    addRoom: (room) => {
      const id = crypto.randomUUID()
      set((state) => {
        const maxZIndex = state.floorPlan.rooms.reduce((max, r) => Math.max(max, r.zIndex ?? 0), -1)
        state.floorPlan.rooms.push({
          ...room,
          id,
          area: 0, // Will be calculated
          perimeter: 0, // Will be calculated
          zIndex: maxZIndex + 1,
        })
      })
      return id
    },

    updateRoom: (id, updates) => {
      set((state) => {
        const room = state.floorPlan.rooms.find((r) => r.id === id)
        if (room) {
          Object.assign(room, updates)
        }
      })
    },

    renameRoom: (id, name) => {
      set((state) => {
        const room = state.floorPlan.rooms.find((r) => r.id === id)
        if (room) {
          room.name = name
        }
      })
    },

    setRoomType: (id, type) => {
      set((state) => {
        const room = state.floorPlan.rooms.find((r) => r.id === id)
        if (room) {
          room.type = type
        }
      })
    },

    setRoomFloorMaterial: (id, material) => {
      set((state) => {
        const room = state.floorPlan.rooms.find((r) => r.id === id)
        if (room) {
          room.floorMaterial = material
        }
      })
    },

    removeRoom: (id) => {
      set((state) => {
        const room = state.floorPlan.rooms.find((r) => r.id === id)
        if (!room) return

        // Collect all wall IDs to delete (from room.wallIds + ownerRoomId match)
        const wallIdsToDelete = new Set(room.wallIds)
        for (const w of state.floorPlan.walls) {
          if (w.ownerRoomId === id) {
            wallIdsToDelete.add(w.id)
          }
        }

        // Collect all room IDs to delete (this room + all nested rooms recursively)
        const roomIdsToDelete = new Set<string>([id])

        // Recursively collect nested rooms and their walls
        const collectNestedRooms = (parentId: string) => {
          const nestedRooms = state.floorPlan.rooms.filter(
            (r) => r.parentRoomId === parentId
          )
          for (const nested of nestedRooms) {
            roomIdsToDelete.add(nested.id)
            // Add nested room's walls to delete set
            for (const wallId of nested.wallIds) {
              wallIdsToDelete.add(wallId)
            }
            // Also add walls by ownerRoomId
            for (const w of state.floorPlan.walls) {
              if (w.ownerRoomId === nested.id) {
                wallIdsToDelete.add(w.id)
              }
            }
            // Recursively handle deeper nesting
            collectNestedRooms(nested.id)
          }
        }
        collectNestedRooms(id)

        // Delete furniture inside this room and all nested rooms
        state.floorPlan.furniture = state.floorPlan.furniture.filter(
          (f) => !f.parentRoomId || !roomIdsToDelete.has(f.parentRoomId)
        )

        // Delete walls
        state.floorPlan.walls = state.floorPlan.walls.filter(
          (w) => !wallIdsToDelete.has(w.id)
        )

        // Delete windows and doors on deleted walls
        state.floorPlan.windows = state.floorPlan.windows.filter(
          (w) => !wallIdsToDelete.has(w.wallId)
        )
        state.floorPlan.doors = state.floorPlan.doors.filter(
          (d) => !wallIdsToDelete.has(d.wallId)
        )

        // Clean up containedRoomIds references in remaining rooms
        for (const r of state.floorPlan.rooms) {
          if (!roomIdsToDelete.has(r.id)) {
            r.containedRoomIds = r.containedRoomIds.filter(
              (cid) => !roomIdsToDelete.has(cid)
            )
          }
        }

        // Finally, remove the room and all nested rooms
        state.floorPlan.rooms = state.floorPlan.rooms.filter(
          (r) => !roomIdsToDelete.has(r.id)
        )
      })
    },

    detectRooms: () => {
      const walls = get().floorPlan.walls
      const detectedRooms = detectRoomsFromWalls(walls)

      set((state) => {
        // Add detected rooms that don't already exist
        const maxZIndex = state.floorPlan.rooms.reduce((max, r) => Math.max(max, r.zIndex ?? 0), -1)
        for (let i = 0; i < detectedRooms.length; i++) {
          const roomData = detectedRooms[i]
          const id = crypto.randomUUID()
          state.floorPlan.rooms.push({
            ...roomData,
            id,
            area: 0,
            perimeter: 0,
            zIndex: maxZIndex + 1 + i,
          })
        }
      })
    },

    createRoomFromBounds: (bounds, name) => {
      const roomId = crypto.randomUUID()
      const roomName = name || `Room ${get().floorPlan.rooms.length + 1}`

      // Calculate area in m² (bounds are in cm)
      const areaCm2 = bounds.width * bounds.height
      const areaM2 = areaCm2 / 10000

      // Calculate perimeter in m
      const perimeterCm = 2 * (bounds.width + bounds.height)
      const perimeterM = perimeterCm / 100

      // Generate walls from bounds
      const wallData = generateWallsFromBounds(bounds, roomId)
      const wallIds: string[] = []

      // Find the smallest room that fully contains this new room
      const parentRoom = findParentRoomForBounds(bounds, get().floorPlan.rooms)

      set((state) => {
        // Add walls
        for (const wall of wallData) {
          const wallId = crypto.randomUUID()
          wallIds.push(wallId)
          state.floorPlan.walls.push({
            ...wall,
            id: wallId,
          })
        }

        // Add room with next zIndex
        const maxZIndex = state.floorPlan.rooms.reduce((max, r) => Math.max(max, r.zIndex ?? 0), -1)
        state.floorPlan.rooms.push({
          id: roomId,
          name: roomName,
          type: 'custom',
          bounds,
          wallIds,
          floorMaterial: { materialId: 'wood-light', colorOverride: '#E8DCC4' },
          ceilingMaterial: { materialId: 'white-paint' },
          area: areaM2,
          perimeter: perimeterM,
          containedFurnitureIds: [],
          containedRoomIds: [],
          zIndex: maxZIndex + 1,
          parentRoomId: parentRoom?.id,
        })

        // Update the parent room's containedRoomIds
        if (parentRoom) {
          const parent = state.floorPlan.rooms.find((r) => r.id === parentRoom.id)
          if (parent && !parent.containedRoomIds.includes(roomId)) {
            parent.containedRoomIds.push(roomId)
          }
        }
      })

      // Calculate initial containment (for furniture and nested rooms inside this new room)
      get().updateRoomContainment(roomId)

      return roomId
    },

    moveRoom: (roomId, delta) => {
      const room = get().getRoomById(roomId)
      if (!room) return

      set((state) => {
        const r = state.floorPlan.rooms.find((r) => r.id === roomId)
        if (!r) return

        // Move room bounds
        r.bounds.x += delta.x
        r.bounds.y += delta.y

        // Move owned walls
        for (const wallId of r.wallIds) {
          const wall = state.floorPlan.walls.find((w) => w.id === wallId)
          if (wall) {
            wall.start.x += delta.x
            wall.start.y += delta.y
            wall.end.x += delta.x
            wall.end.y += delta.y
          }
        }

        // Move furniture with explicit parentRoomId (hierarchy-based)
        for (const f of state.floorPlan.furniture) {
          if (f.parentRoomId === roomId && !f.locked) {
            f.position.x += delta.x
            f.position.y += delta.y
          }
        }

        // Move nested rooms recursively (using parentRoomId)
        const moveNestedRoom = (nestedId: string) => {
          const nested = state.floorPlan.rooms.find((r) => r.id === nestedId)
          if (!nested) return

          // Move nested room bounds
          nested.bounds.x += delta.x
          nested.bounds.y += delta.y

          // Move nested room's walls
          for (const wallId of nested.wallIds) {
            const wall = state.floorPlan.walls.find((w) => w.id === wallId)
            if (wall) {
              wall.start.x += delta.x
              wall.start.y += delta.y
              wall.end.x += delta.x
              wall.end.y += delta.y
            }
          }

          // Move nested room's furniture (by parentRoomId)
          for (const f of state.floorPlan.furniture) {
            if (f.parentRoomId === nestedId && !f.locked) {
              f.position.x += delta.x
              f.position.y += delta.y
            }
          }

          // Recursively move deeper nested rooms (by parentRoomId)
          for (const deeperRoom of state.floorPlan.rooms) {
            if (deeperRoom.parentRoomId === nestedId) {
              moveNestedRoom(deeperRoom.id)
            }
          }
        }

        // Find and move all nested rooms (by parentRoomId)
        for (const nestedRoom of state.floorPlan.rooms) {
          if (nestedRoom.parentRoomId === roomId) {
            moveNestedRoom(nestedRoom.id)
          }
        }
      })
    },

    moveRoomTo: (roomId, position) => {
      const room = get().getRoomById(roomId)
      if (!room) return

      // Calculate delta from current position to target position
      const delta = {
        x: position.x - room.bounds.x,
        y: position.y - room.bounds.y,
      }

      // Use existing moveRoom with the calculated delta
      get().moveRoom(roomId, delta)
    },

    resizeRoom: (roomId, newBounds) => {
      const room = get().getRoomById(roomId)
      if (!room) return

      set((state) => {
        const r = state.floorPlan.rooms.find((r) => r.id === roomId)
        if (!r) return

        // Update bounds
        r.bounds = { ...newBounds }

        // Recalculate area and perimeter
        r.area = (newBounds.width * newBounds.height) / 10000
        r.perimeter = (2 * (newBounds.width + newBounds.height)) / 100

        // Get old walls and their IDs before removing them
        const oldWalls = state.floorPlan.walls.filter(
          (w) => w.ownerRoomId === roomId
        )
        const oldWallIds = oldWalls.map((w) => w.id)

        // Save windows/doors attached to old walls
        const affectedWindows = state.floorPlan.windows.filter((w) =>
          oldWallIds.includes(w.wallId)
        )
        const affectedDoors = state.floorPlan.doors.filter((d) =>
          oldWallIds.includes(d.wallId)
        )

        // Remove old walls owned by this room
        state.floorPlan.walls = state.floorPlan.walls.filter(
          (w) => w.ownerRoomId !== roomId
        )

        // Generate new walls from new bounds
        const wallData = generateWallsFromBounds(newBounds, roomId)
        const newWallIds: string[] = []

        for (const wall of wallData) {
          const wallId = crypto.randomUUID()
          newWallIds.push(wallId)
          state.floorPlan.walls.push({
            ...wall,
            id: wallId,
          })
        }

        r.wallIds = newWallIds

        // Map old walls to new walls by position (top, right, bottom, left)
        // generateWallsFromBounds creates walls in order: top, right, bottom, left
        const wallMapping = new Map<string, string>()
        for (let i = 0; i < oldWallIds.length && i < newWallIds.length; i++) {
          wallMapping.set(oldWallIds[i], newWallIds[i])
        }

        // Reassign windows to new walls
        for (const window of affectedWindows) {
          const newWallId = wallMapping.get(window.wallId)
          if (newWallId) {
            window.wallId = newWallId
            // Find new wall and clamp position if needed
            const newWall = state.floorPlan.walls.find((w) => w.id === newWallId)
            if (newWall) {
              const dx = newWall.end.x - newWall.start.x
              const dy = newWall.end.y - newWall.start.y
              const wallLength = Math.sqrt(dx * dx + dy * dy)
              // Clamp position to stay within wall bounds
              const minPos = window.width / 2
              const maxPos = wallLength - window.width / 2
              window.position = Math.max(minPos, Math.min(maxPos, window.position))
              // Add opening to the new wall
              newWall.openings.push({
                id: crypto.randomUUID(),
                type: 'window',
                position: window.position,
                width: window.width,
                height: window.height,
                elevationFromFloor: window.elevationFromFloor,
                referenceId: window.id,
              })
            }
          }
        }

        // Reassign doors to new walls
        for (const door of affectedDoors) {
          const newWallId = wallMapping.get(door.wallId)
          if (newWallId) {
            door.wallId = newWallId
            // Find new wall and clamp position if needed
            const newWall = state.floorPlan.walls.find((w) => w.id === newWallId)
            if (newWall) {
              const dx = newWall.end.x - newWall.start.x
              const dy = newWall.end.y - newWall.start.y
              const wallLength = Math.sqrt(dx * dx + dy * dy)
              // Clamp position to stay within wall bounds
              const minPos = door.width / 2
              const maxPos = wallLength - door.width / 2
              door.position = Math.max(minPos, Math.min(maxPos, door.position))
              // Add opening to the new wall
              newWall.openings.push({
                id: crypto.randomUUID(),
                type: 'door',
                position: door.position,
                width: door.width,
                height: door.height,
                elevationFromFloor: 0,
                referenceId: door.id,
              })
            }
          }
        }
      })

      // Update containment after resize
      get().updateRoomContainment(roomId)
    },

    updateRoomContainment: (roomId) => {
      const state = get()
      const room = state.floorPlan.rooms.find((r) => r.id === roomId)
      if (!room) return

      const containedFurnitureIds = getContainedFurnitureIds(
        room.bounds,
        state.floorPlan.furniture
      )
      const containedRoomIds = getContainedRoomIds(
        room.bounds,
        state.floorPlan.rooms,
        roomId
      )

      set((draft) => {
        const r = draft.floorPlan.rooms.find((r) => r.id === roomId)
        if (r) {
          r.containedFurnitureIds = containedFurnitureIds
          r.containedRoomIds = containedRoomIds
        }

        // Update parentRoomId for contained rooms
        for (const containedId of containedRoomIds) {
          const contained = draft.floorPlan.rooms.find((r) => r.id === containedId)
          if (contained) {
            contained.parentRoomId = roomId
          }
        }

        // Clear parentRoomId for rooms that are no longer contained
        for (const r of draft.floorPlan.rooms) {
          if (r.parentRoomId === roomId && !containedRoomIds.includes(r.id)) {
            delete r.parentRoomId
          }
        }

        // Sync parentRoomId on furniture for consistency
        // Only set parentRoomId if this room is the innermost containing room
        for (const fId of containedFurnitureIds) {
          const furniture = draft.floorPlan.furniture.find((f) => f.id === fId)
          if (furniture) {
            // Check if there's a smaller room that also contains this furniture
            const innerRoom = findParentRoomForPoint(
              furniture.position,
              draft.floorPlan.rooms,
              roomId
            )
            // Only set parentRoomId if this room is the innermost
            if (!innerRoom || innerRoom.bounds.width * innerRoom.bounds.height >= room.bounds.width * room.bounds.height) {
              furniture.parentRoomId = roomId
            }
          }
        }

        // Clear parentRoomId for furniture that is no longer contained
        for (const f of draft.floorPlan.furniture) {
          if (f.parentRoomId === roomId && !containedFurnitureIds.includes(f.id)) {
            delete f.parentRoomId
          }
        }
      })
    },

    updateAllRoomContainment: () => {
      const rooms = get().floorPlan.rooms
      for (const room of rooms) {
        get().updateRoomContainment(room.id)
      }
    },

    // ==================== Furniture Actions ====================

    addFurniture: (furniture) => {
      const id = crypto.randomUUID()
      const rooms = get().floorPlan.rooms
      const parentRoom = findParentRoomForPoint(furniture.position, rooms)

      set((state) => {
        // Get next zIndex
        const maxZIndex = state.floorPlan.furniture.reduce((max, f) => Math.max(max, f.zIndex ?? 0), -1)
        state.floorPlan.furniture.push({
          ...furniture,
          id,
          parentRoomId: parentRoom?.id,
          zIndex: maxZIndex + 1,
        })
      })
      return id
    },

    updateFurniture: (id, updates) => {
      set((state) => {
        const furniture = state.floorPlan.furniture.find((f) => f.id === id)
        if (furniture) {
          Object.assign(furniture, updates)
        }
      })
    },

    moveFurniture: (id, position) => {
      set((state) => {
        const furniture = state.floorPlan.furniture.find((f) => f.id === id)
        if (furniture && !furniture.locked) {
          furniture.position = position
        }
      })
    },

    rotateFurniture: (id, rotation) => {
      set((state) => {
        const furniture = state.floorPlan.furniture.find((f) => f.id === id)
        if (furniture && !furniture.locked) {
          furniture.rotation = rotation % 360
        }
      })
    },

    resizeFurniture: (id, dimensions) => {
      set((state) => {
        const furniture = state.floorPlan.furniture.find((f) => f.id === id)
        if (furniture && !furniture.locked) {
          furniture.dimensions = dimensions
        }
      })
    },

    setFurnitureMaterial: (id, partName, material) => {
      set((state) => {
        const furniture = state.floorPlan.furniture.find((f) => f.id === id)
        if (furniture) {
          furniture.partMaterials[partName] = material
        }
      })
    },

    toggleFurnitureLock: (id) => {
      set((state) => {
        const furniture = state.floorPlan.furniture.find((f) => f.id === id)
        if (furniture) {
          furniture.locked = !furniture.locked
        }
      })
    },

    removeFurniture: (id) => {
      set((state) => {
        state.floorPlan.furniture = state.floorPlan.furniture.filter(
          (f) => f.id !== id
        )
      })
    },

    duplicateFurniture: (id) => {
      const state = get()
      const original = state.floorPlan.furniture.find((f) => f.id === id)
      if (!original) return null

      const newId = crypto.randomUUID()
      set((draft) => {
        const maxZIndex = draft.floorPlan.furniture.reduce((max, f) => Math.max(max, f.zIndex ?? 0), -1)
        draft.floorPlan.furniture.push({
          ...original,
          id: newId,
          position: {
            x: original.position.x + 50,
            y: original.position.y + 50,
          },
          locked: false,
          parentGroupId: undefined, // Don't inherit group membership on duplicate
          zIndex: maxZIndex + 1,
        })
      })
      return newId
    },

    // ==================== Window Actions ====================

    addWindow: (window) => {
      const id = crypto.randomUUID()
      set((state) => {
        state.floorPlan.windows.push({
          ...window,
          id,
        })
        // Add opening to the wall
        const wall = state.floorPlan.walls.find((w) => w.id === window.wallId)
        if (wall) {
          wall.openings.push({
            id: crypto.randomUUID(),
            type: 'window',
            position: window.position,
            width: window.width,
            height: window.height,
            elevationFromFloor: window.elevationFromFloor,
            referenceId: id,
          })
        }
      })
      return id
    },

    updateWindow: (id, updates) => {
      set((state) => {
        const window = state.floorPlan.windows.find((w) => w.id === id)
        if (window) {
          Object.assign(window, updates)
          // Update corresponding wall opening
          const wall = state.floorPlan.walls.find((w) => w.id === window.wallId)
          if (wall) {
            const opening = wall.openings.find((o) => o.referenceId === id)
            if (opening) {
              if (updates.position !== undefined)
                opening.position = updates.position
              if (updates.width !== undefined) opening.width = updates.width
              if (updates.height !== undefined) opening.height = updates.height
              if (updates.elevationFromFloor !== undefined)
                opening.elevationFromFloor = updates.elevationFromFloor
            }
          }
        }
      })
    },

    removeWindow: (id) => {
      set((state) => {
        const window = state.floorPlan.windows.find((w) => w.id === id)
        if (window) {
          // Remove opening from wall
          const wall = state.floorPlan.walls.find(
            (w) => w.id === window.wallId
          )
          if (wall) {
            wall.openings = wall.openings.filter((o) => o.referenceId !== id)
          }
        }
        state.floorPlan.windows = state.floorPlan.windows.filter(
          (w) => w.id !== id
        )
      })
    },

    // ==================== Door Actions ====================

    addDoor: (door) => {
      const id = crypto.randomUUID()
      set((state) => {
        state.floorPlan.doors.push({
          ...door,
          id,
        })
        // Add opening to the wall
        const wall = state.floorPlan.walls.find((w) => w.id === door.wallId)
        if (wall) {
          wall.openings.push({
            id: crypto.randomUUID(),
            type: 'door',
            position: door.position,
            width: door.width,
            height: door.height,
            elevationFromFloor: 0,
            referenceId: id,
          })
        }
      })
      return id
    },

    updateDoor: (id, updates) => {
      set((state) => {
        const door = state.floorPlan.doors.find((d) => d.id === id)
        if (door) {
          Object.assign(door, updates)
          // Update corresponding wall opening
          const wall = state.floorPlan.walls.find((w) => w.id === door.wallId)
          if (wall) {
            const opening = wall.openings.find((o) => o.referenceId === id)
            if (opening) {
              if (updates.position !== undefined)
                opening.position = updates.position
              if (updates.width !== undefined) opening.width = updates.width
              if (updates.height !== undefined) opening.height = updates.height
            }
          }
        }
      })
    },

    toggleDoorOpen: (id) => {
      set((state) => {
        const door = state.floorPlan.doors.find((d) => d.id === id)
        if (door) {
          door.isOpen = !door.isOpen
          door.openAngle = door.isOpen ? 90 : 0
        }
      })
    },

    removeDoor: (id) => {
      set((state) => {
        const door = state.floorPlan.doors.find((d) => d.id === id)
        if (door) {
          // Remove opening from wall
          const wall = state.floorPlan.walls.find((w) => w.id === door.wallId)
          if (wall) {
            wall.openings = wall.openings.filter((o) => o.referenceId !== id)
          }
        }
        state.floorPlan.doors = state.floorPlan.doors.filter((d) => d.id !== id)
      })
    },

    // ==================== Light Actions ====================

    addLight: (light) => {
      const id = crypto.randomUUID()
      set((state) => {
        state.floorPlan.lights.push({
          ...light,
          id,
        })
      })
      return id
    },

    updateLight: (id, updates) => {
      set((state) => {
        const light = state.floorPlan.lights.find((l) => l.id === id)
        if (light) {
          Object.assign(light, updates)
        }
      })
    },

    removeLight: (id) => {
      set((state) => {
        state.floorPlan.lights = state.floorPlan.lights.filter(
          (l) => l.id !== id
        )
      })
    },

    // ==================== Bulk Actions ====================

    clearFloorPlan: () => {
      set((state) => {
        state.floorPlan = {
          id: crypto.randomUUID(),
          walls: [],
          rooms: [],
          furniture: [],
          windows: [],
          doors: [],
          lights: [],
          groups: [],
        }
      })
    },

    loadFloorPlan: (floorPlan) => {
      set((state) => {
        state.floorPlan = floorPlan
      })
    },

    removeSelected: (ids) => {
      const state = get()
      const idSet = new Set(ids)

      // Find room IDs in the selection and delete them using removeRoom
      // (which handles cascading deletion of walls, furniture, windows, doors)
      const roomIdsToDelete = state.floorPlan.rooms
        .filter((r) => idSet.has(r.id))
        .map((r) => r.id)

      for (const roomId of roomIdsToDelete) {
        get().removeRoom(roomId)
      }

      // Remove remaining items that weren't part of room cascading deletion
      set((draft) => {
        draft.floorPlan.walls = draft.floorPlan.walls.filter(
          (w) => !idSet.has(w.id)
        )
        draft.floorPlan.furniture = draft.floorPlan.furniture.filter(
          (f) => !idSet.has(f.id)
        )
        draft.floorPlan.windows = draft.floorPlan.windows.filter(
          (w) => !idSet.has(w.id)
        )
        draft.floorPlan.doors = draft.floorPlan.doors.filter(
          (d) => !idSet.has(d.id)
        )
        draft.floorPlan.lights = draft.floorPlan.lights.filter(
          (l) => !idSet.has(l.id)
        )
      })
    },

    // ==================== Batch Operations ====================

    moveMultipleFurniture: (ids, delta) => {
      set((state) => {
        const idSet = new Set(ids)
        for (const f of state.floorPlan.furniture) {
          if (idSet.has(f.id) && !f.locked) {
            f.position.x += delta.x
            f.position.y += delta.y
          }
        }
      })
    },

    duplicateMultiple: (ids) => {
      const state = get()
      const newIds: string[] = []

      set((draft) => {
        const maxFurnitureZIndex = draft.floorPlan.furniture.reduce((max, f) => Math.max(max, f.zIndex ?? 0), -1)

        for (const id of ids) {
          // Try furniture first
          const furniture = state.floorPlan.furniture.find((f) => f.id === id)
          if (furniture) {
            const newId = crypto.randomUUID()
            newIds.push(newId)
            const cloned = JSON.parse(JSON.stringify(furniture))
            draft.floorPlan.furniture.push({
              ...cloned,
              id: newId,
              position: {
                x: furniture.position.x + 50,
                y: furniture.position.y + 50,
              },
              locked: false,
              parentGroupId: undefined, // Don't inherit group membership
              zIndex: maxFurnitureZIndex + newIds.length,
            })
            continue
          }

          // Try walls (duplicating walls is trickier, offset both endpoints)
          const wall = state.floorPlan.walls.find((w) => w.id === id)
          if (wall) {
            const newId = crypto.randomUUID()
            newIds.push(newId)
            draft.floorPlan.walls.push({
              ...JSON.parse(JSON.stringify(wall)),
              id: newId,
              start: { x: wall.start.x + 50, y: wall.start.y + 50 },
              end: { x: wall.end.x + 50, y: wall.end.y + 50 },
              openings: [], // Don't duplicate openings
            })
          }
        }
      })

      return newIds
    },

    // ==================== Group Operations ====================

    createGroup: (memberIds, name) => {
      // Need at least 2 items to form a group
      if (memberIds.length < 2) return null

      const state = get()
      // Filter to only furniture items that exist and aren't already in a group
      const validIds = memberIds.filter((id) => {
        const furniture = state.floorPlan.furniture.find((f) => f.id === id)
        return furniture && !furniture.parentGroupId
      })

      if (validIds.length < 2) return null

      const groupId = crypto.randomUUID()
      const groupName = name || `Group ${state.floorPlan.groups.length + 1}`

      // Get parentRoomId from first item (if any)
      const firstItem = state.floorPlan.furniture.find((f) => f.id === validIds[0])
      const parentRoomId = firstItem?.parentRoomId

      set((draft) => {
        // Calculate zIndex (above highest member)
        const memberZIndexes = validIds.map((id) => {
          const f = draft.floorPlan.furniture.find((f) => f.id === id)
          return f?.zIndex ?? 0
        })
        const maxMemberZIndex = Math.max(...memberZIndexes, 0)
        const maxGroupZIndex = draft.floorPlan.groups.reduce((max, g) => Math.max(max, g.zIndex ?? 0), -1)
        const groupZIndex = Math.max(maxMemberZIndex, maxGroupZIndex) + 1

        // Create the group
        draft.floorPlan.groups.push({
          id: groupId,
          name: groupName,
          locked: false,
          zIndex: groupZIndex,
          parentRoomId,
        })

        // Update furniture items with parentGroupId
        for (const f of draft.floorPlan.furniture) {
          if (validIds.includes(f.id)) {
            f.parentGroupId = groupId
          }
        }
      })

      return groupId
    },

    dissolveGroup: (groupId) => {
      const state = get()
      const group = state.floorPlan.groups.find((g) => g.id === groupId)
      if (!group) return

      set((draft) => {
        // Clear parentGroupId on children and set their parentRoomId to group's parentRoomId
        for (const f of draft.floorPlan.furniture) {
          if (f.parentGroupId === groupId) {
            delete f.parentGroupId
            if (group.parentRoomId) {
              f.parentRoomId = group.parentRoomId
            }
          }
        }

        // Handle nested groups - reparent them to the dissolved group's parent
        for (const g of draft.floorPlan.groups) {
          if (g.parentGroupId === groupId) {
            delete g.parentGroupId
            if (group.parentRoomId) {
              g.parentRoomId = group.parentRoomId
            }
          }
        }

        // Remove the group
        draft.floorPlan.groups = draft.floorPlan.groups.filter(
          (g) => g.id !== groupId
        )
      })
    },

    toggleGroupLock: (groupId) => {
      set((draft) => {
        const group = draft.floorPlan.groups.find((g) => g.id === groupId)
        if (group) {
          group.locked = !group.locked
        }
      })
    },

    renameGroup: (groupId, name) => {
      set((draft) => {
        const group = draft.floorPlan.groups.find((g) => g.id === groupId)
        if (group) {
          group.name = name
        }
      })
    },

    getGroupById: (groupId) =>
      get().floorPlan.groups.find((g) => g.id === groupId),

    getGroupForItem: (itemId) => {
      const state = get()
      const furniture = state.floorPlan.furniture.find((f) => f.id === itemId)
      if (!furniture?.parentGroupId) return undefined
      return state.floorPlan.groups.find((g) => g.id === furniture.parentGroupId)
    },

    getGroupMembers: (groupId) => {
      const state = get()
      return state.floorPlan.furniture.filter((f) => f.parentGroupId === groupId)
    },

    getChildrenOfGroup: (groupId) => {
      const state = get()
      return {
        furniture: state.floorPlan.furniture.filter((f) => f.parentGroupId === groupId),
        groups: state.floorPlan.groups.filter((g) => g.parentGroupId === groupId),
      }
    },

    reparentToGroup: (itemId, groupId) => {
      set((draft) => {
        // Check if it's furniture
        const furniture = draft.floorPlan.furniture.find((f) => f.id === itemId)
        if (furniture) {
          if (groupId === null) {
            delete furniture.parentGroupId
          } else {
            furniture.parentGroupId = groupId
            // When adding to a group, the group's room becomes the furniture's room
            const group = draft.floorPlan.groups.find((g) => g.id === groupId)
            if (group?.parentRoomId) {
              furniture.parentRoomId = group.parentRoomId
            }
          }
          return
        }

        // Check if it's a group (for nesting)
        const nestedGroup = draft.floorPlan.groups.find((g) => g.id === itemId)
        if (nestedGroup) {
          if (groupId === null) {
            delete nestedGroup.parentGroupId
          } else {
            // Prevent circular nesting
            if (itemId === groupId) return
            nestedGroup.parentGroupId = groupId
          }
        }
      })
    },

    moveGroup: (groupId, delta) => {
      const state = get()
      const group = state.floorPlan.groups.find((g) => g.id === groupId)
      if (!group || group.locked) return

      set((draft) => {
        // Move all furniture in this group
        for (const f of draft.floorPlan.furniture) {
          if (f.parentGroupId === groupId && !f.locked) {
            f.position.x += delta.x
            f.position.y += delta.y
          }
        }

        // Recursively move nested groups
        const moveNestedGroup = (nestedGroupId: string) => {
          for (const f of draft.floorPlan.furniture) {
            if (f.parentGroupId === nestedGroupId && !f.locked) {
              f.position.x += delta.x
              f.position.y += delta.y
            }
          }
          // Find and move deeper nested groups
          for (const g of draft.floorPlan.groups) {
            if (g.parentGroupId === nestedGroupId) {
              moveNestedGroup(g.id)
            }
          }
        }

        for (const g of draft.floorPlan.groups) {
          if (g.parentGroupId === groupId) {
            moveNestedGroup(g.id)
          }
        }
      })
    },

    // ==================== Z-Index / Ordering Operations ====================

    reorderFurniture: (id, newZIndex) => {
      set((draft) => {
        const furniture = draft.floorPlan.furniture.find((f) => f.id === id)
        if (furniture) {
          furniture.zIndex = newZIndex
        }
      })
    },

    reorderRoom: (id, newZIndex) => {
      set((draft) => {
        const room = draft.floorPlan.rooms.find((r) => r.id === id)
        if (room) {
          room.zIndex = newZIndex
        }
      })
    },

    reorderGroup: (id, newZIndex) => {
      set((draft) => {
        const group = draft.floorPlan.groups.find((g) => g.id === id)
        if (group) {
          group.zIndex = newZIndex
        }
      })
    },

    getNextZIndex: (type) => {
      const state = get()
      switch (type) {
        case 'furniture':
          return state.floorPlan.furniture.reduce((max, f) => Math.max(max, f.zIndex ?? 0), -1) + 1
        case 'room':
          return state.floorPlan.rooms.reduce((max, r) => Math.max(max, r.zIndex ?? 0), -1) + 1
        case 'group':
          return state.floorPlan.groups.reduce((max, g) => Math.max(max, g.zIndex ?? 0), -1) + 1
      }
    },

    // ==================== Getters ====================

    getWallById: (id) => get().floorPlan.walls.find((w) => w.id === id),
    getRoomById: (id) => get().floorPlan.rooms.find((r) => r.id === id),
    getFurnitureById: (id) =>
      get().floorPlan.furniture.find((f) => f.id === id),
    getWindowById: (id) => get().floorPlan.windows.find((w) => w.id === id),
    getDoorById: (id) => get().floorPlan.doors.find((d) => d.id === id),

    getWallsForRoom: (roomId) => {
      const state = get()
      const room = state.floorPlan.rooms.find((r) => r.id === roomId)
      if (!room) return []
      return room.wallIds
        .map((id) => state.floorPlan.walls.find((w) => w.id === id))
        .filter((w): w is Wall => w !== undefined)
    },

    // ==================== Furniture Hierarchy Actions ====================

    reparentFurniture: (furnitureId, newParentRoomId) => {
      set((state) => {
        const furniture = state.floorPlan.furniture.find((f) => f.id === furnitureId)
        if (furniture) {
          if (newParentRoomId === null) {
            delete furniture.parentRoomId
          } else {
            furniture.parentRoomId = newParentRoomId
          }
        }
      })
    },

    reparentFurnitureByPosition: (furnitureId) => {
      const state = get()
      const furniture = state.floorPlan.furniture.find((f) => f.id === furnitureId)
      if (!furniture) return

      const parentRoom = findParentRoomForPoint(
        furniture.position,
        state.floorPlan.rooms
      )

      set((draft) => {
        const f = draft.floorPlan.furniture.find((f) => f.id === furnitureId)
        if (f) {
          if (parentRoom) {
            f.parentRoomId = parentRoom.id
          } else {
            delete f.parentRoomId
          }
        }
      })
    },

    finishFurnitureMove: (furnitureIds) => {
      const state = get()
      const rooms = state.floorPlan.rooms

      set((draft) => {
        for (const fId of furnitureIds) {
          const furniture = draft.floorPlan.furniture.find((f) => f.id === fId)
          if (!furniture) continue

          const parentRoom = findParentRoomForPoint(furniture.position, rooms)
          if (parentRoom) {
            furniture.parentRoomId = parentRoom.id
          } else {
            delete furniture.parentRoomId
          }
        }
      })
    },

    // ==================== Room Hierarchy Actions ====================

    finishRoomMove: (roomId) => {
      const state = get()
      const room = state.floorPlan.rooms.find((r) => r.id === roomId)
      if (!room) return

      // Find the new parent room (if any)
      const newParent = findParentRoomForBounds(
        room.bounds,
        state.floorPlan.rooms,
        roomId
      )

      set((draft) => {
        const r = draft.floorPlan.rooms.find((r) => r.id === roomId)
        if (!r) return

        const oldParentId = r.parentRoomId

        // Update parentRoomId
        if (newParent) {
          r.parentRoomId = newParent.id
        } else {
          delete r.parentRoomId
        }

        // Remove from old parent's containedRoomIds
        if (oldParentId && oldParentId !== newParent?.id) {
          const oldParent = draft.floorPlan.rooms.find((r) => r.id === oldParentId)
          if (oldParent) {
            oldParent.containedRoomIds = oldParent.containedRoomIds.filter(
              (id) => id !== roomId
            )
          }
        }

        // Add to new parent's containedRoomIds
        if (newParent && newParent.id !== oldParentId) {
          const parent = draft.floorPlan.rooms.find((r) => r.id === newParent.id)
          if (parent && !parent.containedRoomIds.includes(roomId)) {
            parent.containedRoomIds.push(roomId)
          }
        }
      })

      // Update containment for this room's children
      get().updateRoomContainment(roomId)
    },

    reparentRoom: (roomId, newParentRoomId) => {
      set((draft) => {
        const room = draft.floorPlan.rooms.find((r) => r.id === roomId)
        if (!room) return

        const oldParentId = room.parentRoomId

        // Remove from old parent's containedRoomIds
        if (oldParentId) {
          const oldParent = draft.floorPlan.rooms.find((r) => r.id === oldParentId)
          if (oldParent) {
            oldParent.containedRoomIds = oldParent.containedRoomIds.filter(
              (id) => id !== roomId
            )
          }
        }

        // Set new parent
        if (newParentRoomId === null) {
          delete room.parentRoomId
        } else {
          // Prevent circular nesting
          if (roomId === newParentRoomId) return

          room.parentRoomId = newParentRoomId
          // Add to new parent's containedRoomIds
          const newParent = draft.floorPlan.rooms.find((r) => r.id === newParentRoomId)
          if (newParent && !newParent.containedRoomIds.includes(roomId)) {
            newParent.containedRoomIds.push(roomId)
          }
        }
      })
    },

    getFurnitureForRoom: (roomId) => {
      // Get furniture directly in this room (not in a group)
      return get().floorPlan.furniture.filter((f) =>
        f.parentRoomId === roomId && !f.parentGroupId
      )
    },

    getRootFurniture: () => {
      // Get furniture not in any room or group
      return get().floorPlan.furniture.filter((f) => !f.parentRoomId && !f.parentGroupId)
    },

    getGroupsForRoom: (roomId) => {
      // Get groups directly in this room (not nested in another group)
      return get().floorPlan.groups.filter((g) =>
        g.parentRoomId === roomId && !g.parentGroupId
      )
    },

    getRootGroups: () => {
      // Get groups not in any room or parent group
      return get().floorPlan.groups.filter((g) => !g.parentRoomId && !g.parentGroupId)
    },
  })),
    {
      name: 'home-planner-floorplan',
      version: 3,
      migrate: (persistedState: unknown, version: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = persistedState as { floorPlan: FloorPlan & { furniture: any[]; groups: any[]; rooms: any[] } }

        if (version === 1) {
          // Migration from v1 to v2: calculate parentRoomId for furniture
          const { rooms, furniture } = state.floorPlan
          for (const f of furniture) {
            const parentRoom = findParentRoomForPoint(f.position, rooms)
            if (parentRoom) {
              f.parentRoomId = parentRoom.id
            }
          }
        }

        if (version <= 2) {
          // Migration from v2 to v3:
          // 1. Add zIndex to all items based on array position
          state.floorPlan.rooms.forEach((r, i) => {
            r.zIndex = r.zIndex ?? i
          })
          state.floorPlan.furniture.forEach((f, i) => {
            f.zIndex = f.zIndex ?? i
          })
          state.floorPlan.groups.forEach((g, i) => {
            g.zIndex = g.zIndex ?? i
          })

          // 2. Convert groupId → parentGroupId on furniture
          for (const f of state.floorPlan.furniture) {
            if (f.groupId) {
              f.parentGroupId = f.groupId
              delete f.groupId
            }
          }

          // 3. Clean up groups (remove memberIds, add hierarchy fields)
          for (const g of state.floorPlan.groups) {
            // Find first member to get parentRoomId
            const firstMember = state.floorPlan.furniture.find(
              (f: { parentGroupId?: string }) => f.parentGroupId === g.id
            )
            if (firstMember?.parentRoomId) {
              g.parentRoomId = firstMember.parentRoomId
            }
            delete g.memberIds
          }
        }

        return state
      },
    }
  )
)
