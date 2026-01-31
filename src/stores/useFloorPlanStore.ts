import { create } from 'zustand'
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
  addRoom: (room: Omit<Room, 'id' | 'area' | 'perimeter'>) => string
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
  addFurniture: (furniture: Omit<FurnitureInstance, 'id'>) => string
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
  getGroupById: (groupId: string) => FurnitureGroup | undefined
  getGroupForItem: (itemId: string) => FurnitureGroup | undefined
  getGroupMembers: (groupId: string) => FurnitureInstance[]

  // Getters
  getWallById: (id: string) => Wall | undefined
  getRoomById: (id: string) => Room | undefined
  getFurnitureById: (id: string) => FurnitureInstance | undefined
  getWindowById: (id: string) => WindowInstance | undefined
  getDoorById: (id: string) => DoorInstance | undefined
  getWallsForRoom: (roomId: string) => Wall[]
}

export const useFloorPlanStore = create<FloorPlanState>()(
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
        state.floorPlan.rooms.push({
          ...room,
          id,
          area: 0, // Will be calculated
          perimeter: 0, // Will be calculated
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
        state.floorPlan.rooms = state.floorPlan.rooms.filter((r) => r.id !== id)
      })
    },

    detectRooms: () => {
      const walls = get().floorPlan.walls
      const detectedRooms = detectRoomsFromWalls(walls)

      set((state) => {
        // Add detected rooms that don't already exist
        for (const roomData of detectedRooms) {
          const id = crypto.randomUUID()
          state.floorPlan.rooms.push({
            ...roomData,
            id,
            area: 0,
            perimeter: 0,
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

        // Add room
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
        })
      })

      // Calculate initial containment
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

        // Move contained furniture
        for (const fId of r.containedFurnitureIds) {
          const f = state.floorPlan.furniture.find((f) => f.id === fId)
          if (f && !f.locked) {
            f.position.x += delta.x
            f.position.y += delta.y
          }
        }

        // Move nested rooms recursively
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

          // Move nested room's contained furniture
          for (const fId of nested.containedFurnitureIds) {
            const f = state.floorPlan.furniture.find((f) => f.id === fId)
            if (f && !f.locked) {
              f.position.x += delta.x
              f.position.y += delta.y
            }
          }

          // Recursively move deeper nested rooms
          for (const deeperId of nested.containedRoomIds) {
            moveNestedRoom(deeperId)
          }
        }

        for (const nestedId of r.containedRoomIds) {
          moveNestedRoom(nestedId)
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
      set((state) => {
        state.floorPlan.furniture.push({
          ...furniture,
          id,
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
      set((state) => {
        state.floorPlan.furniture.push({
          ...original,
          id: newId,
          position: {
            x: original.position.x + 50,
            y: original.position.y + 50,
          },
          locked: false,
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
      set((state) => {
        const idSet = new Set(ids)
        state.floorPlan.walls = state.floorPlan.walls.filter(
          (w) => !idSet.has(w.id)
        )
        state.floorPlan.rooms = state.floorPlan.rooms.filter(
          (r) => !idSet.has(r.id)
        )
        state.floorPlan.furniture = state.floorPlan.furniture.filter(
          (f) => !idSet.has(f.id)
        )
        state.floorPlan.windows = state.floorPlan.windows.filter(
          (w) => !idSet.has(w.id)
        )
        state.floorPlan.doors = state.floorPlan.doors.filter(
          (d) => !idSet.has(d.id)
        )
        state.floorPlan.lights = state.floorPlan.lights.filter(
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
        for (const id of ids) {
          // Try furniture first
          const furniture = state.floorPlan.furniture.find((f) => f.id === id)
          if (furniture) {
            const newId = crypto.randomUUID()
            newIds.push(newId)
            draft.floorPlan.furniture.push({
              ...JSON.parse(JSON.stringify(furniture)),
              id: newId,
              position: {
                x: furniture.position.x + 50,
                y: furniture.position.y + 50,
              },
              locked: false,
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
        return furniture && !furniture.groupId
      })

      if (validIds.length < 2) return null

      const groupId = crypto.randomUUID()
      const groupName = name || `Group ${state.floorPlan.groups.length + 1}`

      set((draft) => {
        // Create the group
        draft.floorPlan.groups.push({
          id: groupId,
          name: groupName,
          memberIds: validIds,
          locked: false,
        })

        // Update furniture items with groupId
        for (const f of draft.floorPlan.furniture) {
          if (validIds.includes(f.id)) {
            f.groupId = groupId
          }
        }
      })

      return groupId
    },

    dissolveGroup: (groupId) => {
      set((draft) => {
        // Remove groupId from all furniture in this group
        for (const f of draft.floorPlan.furniture) {
          if (f.groupId === groupId) {
            delete f.groupId
          }
        }

        // Remove the group
        draft.floorPlan.groups = draft.floorPlan.groups.filter(
          (g) => g.id !== groupId
        )
      })
    },

    getGroupById: (groupId) =>
      get().floorPlan.groups.find((g) => g.id === groupId),

    getGroupForItem: (itemId) => {
      const state = get()
      const furniture = state.floorPlan.furniture.find((f) => f.id === itemId)
      if (!furniture?.groupId) return undefined
      return state.floorPlan.groups.find((g) => g.id === furniture.groupId)
    },

    getGroupMembers: (groupId) => {
      const state = get()
      const group = state.floorPlan.groups.find((g) => g.id === groupId)
      if (!group) return []
      return state.floorPlan.furniture.filter((f) =>
        group.memberIds.includes(f.id)
      )
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
  }))
)
