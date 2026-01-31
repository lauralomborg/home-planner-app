import type {
  Point2D,
  Wall,
  Room,
  RoomBounds,
  RoomType,
  MaterialRef,
  FurnitureInstance,
} from '@/models'

/**
 * Extracts a closed polygon from a set of connected walls.
 * Returns an array of points forming the polygon boundary.
 */
export function getPolygonFromWalls(walls: Wall[], wallIds: string[]): Point2D[] {
  if (wallIds.length === 0) return []

  // Get the walls that form this room
  const roomWalls = walls.filter((w) => wallIds.includes(w.id))
  if (roomWalls.length === 0) return []

  // Build a graph of connected points
  const points: Point2D[] = []
  const visited = new Set<string>()

  // Helper to create a unique key for a point
  const pointKey = (p: Point2D) => `${Math.round(p.x)},${Math.round(p.y)}`

  // Helper to check if two points are approximately equal
  const pointsEqual = (a: Point2D, b: Point2D, tolerance = 1) => {
    return Math.abs(a.x - b.x) < tolerance && Math.abs(a.y - b.y) < tolerance
  }

  // Start from the first wall
  let currentPoint = roomWalls[0].start
  points.push({ ...currentPoint })
  visited.add(pointKey(currentPoint))

  // Follow the walls to form a closed polygon
  let iterations = 0
  const maxIterations = wallIds.length * 2

  while (iterations < maxIterations) {
    iterations++

    // Find a wall that connects to the current point
    let foundNext = false

    for (const wall of roomWalls) {
      if (pointsEqual(wall.start, currentPoint)) {
        const nextPoint = wall.end
        const key = pointKey(nextPoint)

        if (!visited.has(key)) {
          points.push({ ...nextPoint })
          visited.add(key)
          currentPoint = nextPoint
          foundNext = true
          break
        } else if (points.length > 2 && pointsEqual(nextPoint, points[0])) {
          // We've completed the loop
          return points
        }
      } else if (pointsEqual(wall.end, currentPoint)) {
        const nextPoint = wall.start
        const key = pointKey(nextPoint)

        if (!visited.has(key)) {
          points.push({ ...nextPoint })
          visited.add(key)
          currentPoint = nextPoint
          foundNext = true
          break
        } else if (points.length > 2 && pointsEqual(nextPoint, points[0])) {
          // We've completed the loop
          return points
        }
      }
    }

    if (!foundNext) {
      // No more connections found, return what we have
      break
    }
  }

  return points
}

/**
 * Calculates the centroid (center of mass) of a polygon.
 */
export function getPolygonCentroid(polygon: Point2D[]): Point2D {
  if (polygon.length === 0) {
    return { x: 0, y: 0 }
  }

  if (polygon.length === 1) {
    return { ...polygon[0] }
  }

  if (polygon.length === 2) {
    return {
      x: (polygon[0].x + polygon[1].x) / 2,
      y: (polygon[0].y + polygon[1].y) / 2,
    }
  }

  // Calculate centroid using the shoelace formula
  let area = 0
  let cx = 0
  let cy = 0

  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length
    const cross = polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y
    area += cross
    cx += (polygon[i].x + polygon[j].x) * cross
    cy += (polygon[i].y + polygon[j].y) * cross
  }

  area /= 2

  if (Math.abs(area) < 0.0001) {
    // Degenerate polygon, return simple average
    const sumX = polygon.reduce((sum, p) => sum + p.x, 0)
    const sumY = polygon.reduce((sum, p) => sum + p.y, 0)
    return {
      x: sumX / polygon.length,
      y: sumY / polygon.length,
    }
  }

  cx /= 6 * area
  cy /= 6 * area

  return { x: cx, y: cy }
}

/**
 * Calculates the area of a polygon using the shoelace formula.
 */
export function getPolygonArea(polygon: Point2D[]): number {
  if (polygon.length < 3) return 0

  let area = 0
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length
    area += polygon[i].x * polygon[j].y
    area -= polygon[j].x * polygon[i].y
  }

  return Math.abs(area / 2)
}

/**
 * Calculates the perimeter of a polygon.
 */
export function getPolygonPerimeter(polygon: Point2D[]): number {
  if (polygon.length < 2) return 0

  let perimeter = 0
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length
    const dx = polygon[j].x - polygon[i].x
    const dy = polygon[j].y - polygon[i].y
    perimeter += Math.sqrt(dx * dx + dy * dy)
  }

  return perimeter
}

/**
 * Checks if a point is inside a polygon using ray casting.
 */
export function pointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  if (polygon.length < 3) return false

  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y

    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside
    }
  }

  return inside
}

/**
 * Checks if a point is inside rectangular bounds.
 */
export function isPointInBounds(point: Point2D, bounds: RoomBounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  )
}

/**
 * Checks if bounds A is fully contained within bounds B.
 */
export function isBoundsFullyContained(inner: RoomBounds, outer: RoomBounds): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  )
}

/**
 * Generates 4 walls from rectangular bounds.
 */
export function generateWallsFromBounds(
  bounds: RoomBounds,
  roomId: string,
  wallThickness: number = 15,
  wallHeight: number = 280
): Omit<Wall, 'id'>[] {
  const { x, y, width, height } = bounds

  const corners = [
    { x, y }, // top-left
    { x: x + width, y }, // top-right
    { x: x + width, y: y + height }, // bottom-right
    { x, y: y + height }, // bottom-left
  ]

  const defaultMaterial: MaterialRef = { materialId: 'white-paint' }

  return [
    // Top wall
    {
      start: corners[0],
      end: corners[1],
      thickness: wallThickness,
      height: wallHeight,
      material: defaultMaterial,
      openings: [],
      ownerRoomId: roomId,
    },
    // Right wall
    {
      start: corners[1],
      end: corners[2],
      thickness: wallThickness,
      height: wallHeight,
      material: defaultMaterial,
      openings: [],
      ownerRoomId: roomId,
    },
    // Bottom wall
    {
      start: corners[2],
      end: corners[3],
      thickness: wallThickness,
      height: wallHeight,
      material: defaultMaterial,
      openings: [],
      ownerRoomId: roomId,
    },
    // Left wall
    {
      start: corners[3],
      end: corners[0],
      thickness: wallThickness,
      height: wallHeight,
      material: defaultMaterial,
      openings: [],
      ownerRoomId: roomId,
    },
  ]
}

/**
 * Gets IDs of furniture items whose center is inside the given bounds.
 */
export function getContainedFurnitureIds(
  bounds: RoomBounds,
  furniture: FurnitureInstance[]
): string[] {
  return furniture
    .filter((f) => isPointInBounds(f.position, bounds))
    .map((f) => f.id)
}

/**
 * Gets IDs of rooms that are fully contained within the given bounds.
 */
export function getContainedRoomIds(
  parentBounds: RoomBounds,
  rooms: Room[],
  excludeId: string
): string[] {
  return rooms
    .filter((r) => r.id !== excludeId && isBoundsFullyContained(r.bounds, parentBounds))
    .map((r) => r.id)
}

/**
 * Calculates bounding box from a polygon.
 * Useful for migrating old rooms that don't have bounds.
 */
export function getBoundsFromPolygon(polygon: Point2D[]): RoomBounds {
  if (polygon.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  let minX = polygon[0].x
  let maxX = polygon[0].x
  let minY = polygon[0].y
  let maxY = polygon[0].y

  for (const point of polygon) {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Finds the innermost (smallest) room that contains a given point.
 * Used for automatic reparenting during drag operations.
 */
export function findParentRoomForPoint(
  point: Point2D,
  rooms: Room[],
  excludeRoomId?: string
): Room | null {
  let smallestRoom: Room | null = null
  let smallestArea = Infinity

  for (const room of rooms) {
    // Skip the excluded room (e.g., when checking a room's own children)
    if (excludeRoomId && room.id === excludeRoomId) continue

    // Check if the point is inside the room bounds
    if (isPointInBounds(point, room.bounds)) {
      const area = room.bounds.width * room.bounds.height
      // Find the smallest (most nested) room containing the point
      if (area < smallestArea) {
        smallestArea = area
        smallestRoom = room
      }
    }
  }

  return smallestRoom
}

/**
 * Detects closed rooms formed by connected walls.
 * @deprecated Use createRoomFromBounds instead. This is kept for backward compatibility.
 */
export function detectRooms(
  walls: Wall[]
): Omit<Room, 'id' | 'area' | 'perimeter' | 'zIndex'>[] {
  if (walls.length < 3) return []

  const defaultFloorMaterial: MaterialRef = {
    materialId: 'wood-light',
    colorOverride: '#E8DCC4',
  }
  const defaultCeilingMaterial: MaterialRef = {
    materialId: 'white-paint',
    colorOverride: '#FFFFFF',
  }

  // Build adjacency graph from walls
  const pointKey = (p: Point2D) => `${Math.round(p.x)},${Math.round(p.y)}`
  const adjacency = new Map<string, { point: Point2D; neighbors: Set<string>; wallIds: Map<string, string> }>()

  for (const wall of walls) {
    const startKey = pointKey(wall.start)
    const endKey = pointKey(wall.end)

    if (!adjacency.has(startKey)) {
      adjacency.set(startKey, { point: wall.start, neighbors: new Set(), wallIds: new Map() })
    }
    if (!adjacency.has(endKey)) {
      adjacency.set(endKey, { point: wall.end, neighbors: new Set(), wallIds: new Map() })
    }

    adjacency.get(startKey)!.neighbors.add(endKey)
    adjacency.get(startKey)!.wallIds.set(endKey, wall.id)
    adjacency.get(endKey)!.neighbors.add(startKey)
    adjacency.get(endKey)!.wallIds.set(startKey, wall.id)
  }

  const rooms: Omit<Room, 'id' | 'area' | 'perimeter' | 'zIndex'>[] = []
  const foundCycles = new Set<string>()

  // Find minimal cycles using DFS
  function findCycles(startKey: string): string[][] {
    const cycles: string[][] = []
    const visited = new Set<string>()

    function dfs(currentKey: string, path: string[], wallPath: string[]): void {
      if (path.length > 2 && currentKey === startKey) {
        // Found a cycle - normalize it to avoid duplicates
        const sortedPath = [...path].sort()
        const cycleKey = sortedPath.join('|')
        if (!foundCycles.has(cycleKey)) {
          foundCycles.add(cycleKey)
          cycles.push([...wallPath])
        }
        return
      }

      if (path.length > 20) return // Limit cycle length
      if (path.length > 0 && visited.has(currentKey)) return

      visited.add(currentKey)

      const node = adjacency.get(currentKey)
      if (!node) return

      for (const neighborKey of node.neighbors) {
        // Don't go back immediately
        if (path.length > 0 && neighborKey === path[path.length - 1]) continue

        const wallId = node.wallIds.get(neighborKey)
        if (wallId) {
          dfs(neighborKey, [...path, currentKey], [...wallPath, wallId])
        }
      }

      visited.delete(currentKey)
    }

    dfs(startKey, [], [])
    return cycles
  }

  // Find cycles starting from each vertex
  for (const [key] of adjacency) {
    const cycles = findCycles(key)
    for (const wallIds of cycles) {
      // Remove duplicate wall IDs
      const uniqueWallIds = [...new Set(wallIds)]
      if (uniqueWallIds.length >= 3) {
        // Calculate bounds from the walls
        const polygon = getPolygonFromWalls(walls, uniqueWallIds)
        const bounds = getBoundsFromPolygon(polygon)

        rooms.push({
          name: `Room ${rooms.length + 1}`,
          type: 'custom' as RoomType,
          bounds,
          wallIds: uniqueWallIds,
          floorMaterial: { ...defaultFloorMaterial },
          ceilingMaterial: { ...defaultCeilingMaterial },
          containedFurnitureIds: [],
          containedRoomIds: [],
        })
      }
    }
  }

  return rooms
}
