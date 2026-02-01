import type {
  Point2D,
  Wall,
  Room,
  RoomBounds,
  RoomType,
  MaterialRef,
  FurnitureInstance,
  RoomConnection,
  RoomSide,
} from '@/models'
import { DEFAULT_WALL_THICKNESS } from '@/models'

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
 * Walls are positioned OUTSIDE the room bounds - the room bounds represent
 * the interior floor space, and walls extend outward from these bounds.
 * Wall centerlines are offset outward by wallThickness/2.
 */
export function generateWallsFromBounds(
  bounds: RoomBounds,
  roomId: string,
  wallThickness: number = 15,
  wallHeight: number = 280
): Omit<Wall, 'id'>[] {
  const { x, y, width, height } = bounds
  const halfT = wallThickness / 2

  // Wall centerlines are offset outward from room bounds by half wall thickness
  // This means the inner edge of the wall aligns with the room boundary
  const corners = [
    { x: x - halfT, y: y - halfT }, // top-left (offset up and left)
    { x: x + width + halfT, y: y - halfT }, // top-right (offset up and right)
    { x: x + width + halfT, y: y + height + halfT }, // bottom-right (offset down and right)
    { x: x - halfT, y: y + height + halfT }, // bottom-left (offset down and left)
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
    // Bottom wall (left to right)
    {
      start: corners[3],
      end: corners[2],
      thickness: wallThickness,
      height: wallHeight,
      material: defaultMaterial,
      openings: [],
      ownerRoomId: roomId,
    },
    // Left wall (top to bottom)
    {
      start: corners[0],
      end: corners[3],
      thickness: wallThickness,
      height: wallHeight,
      material: defaultMaterial,
      openings: [],
      ownerRoomId: roomId,
    },
  ]
}

/**
 * Represents an exclusion range along an edge where no wall should be generated.
 * Coordinates are relative to the room bounds (0 = edge start, width/height = edge end).
 */
export interface EdgeExclusion {
  start: number  // Start coordinate along the edge
  end: number    // End coordinate along the edge
}

/**
 * Exclusion ranges for each edge of a room.
 * For horizontal edges (top/bottom): coordinates are x-values
 * For vertical edges (left/right): coordinates are y-values
 */
export interface EdgeExclusions {
  top: EdgeExclusion[]
  right: EdgeExclusion[]
  bottom: EdgeExclusion[]
  left: EdgeExclusion[]
}

/**
 * Determines which portions of each edge should NOT have walls based on room connections.
 * Returns exclusion ranges per edge. Wall generation should skip these ranges.
 *
 * For 'direct' connections: exclude the overlapping portion on both rooms
 * For 'wall' connections: exclude the overlapping portion on the room with higher ID
 *                         (lower ID room generates the shared wall)
 *
 * @param roomId - The room to compute exclusions for
 * @param roomBounds - The bounds of the room
 * @param connections - All connections involving this room
 * @param allRooms - All rooms (needed to compute dynamic overlap)
 */
export function getWallExclusionsForRoom(
  roomId: string,
  roomBounds: RoomBounds,
  connections: RoomConnection[],
  allRooms: Room[]
): EdgeExclusions {
  const exclusions: EdgeExclusions = {
    top: [],
    right: [],
    bottom: [],
    left: [],
  }

  for (const conn of connections) {
    // Check if this connection involves our room
    if (!conn.roomIds.includes(roomId)) continue

    const otherRoomId = conn.roomIds[0] === roomId ? conn.roomIds[1] : conn.roomIds[0]
    const otherRoom = allRooms.find((r) => r.id === otherRoomId)
    if (!otherRoom) continue

    // For direct connections: both rooms lose their wall on the overlapping portion
    // For wall connections: only the room with higher ID loses its wall (lower ID generates shared wall)
    const shouldExclude = conn.type === 'direct' || roomId > otherRoomId
    if (!shouldExclude) continue

    // Compute the overlap dynamically from current room positions
    const overlap = computeConnectionOverlap(roomBounds, otherRoom.bounds, conn, roomId)
    if (!overlap) continue

    // Add to the appropriate edge
    exclusions[overlap.side].push(overlap.exclusion)
  }

  // Merge overlapping exclusions on each edge
  for (const edge of ['top', 'right', 'bottom', 'left'] as const) {
    exclusions[edge] = mergeExclusions(exclusions[edge])
  }

  return exclusions
}

/**
 * Merges overlapping exclusion ranges into non-overlapping ranges.
 */
function mergeExclusions(exclusions: EdgeExclusion[]): EdgeExclusion[] {
  if (exclusions.length <= 1) return exclusions

  // Sort by start position
  const sorted = [...exclusions].sort((a, b) => a.start - b.start)
  const merged: EdgeExclusion[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    const last = merged[merged.length - 1]

    if (current.start <= last.end) {
      // Overlapping or adjacent - extend the last exclusion
      last.end = Math.max(last.end, current.end)
    } else {
      // No overlap - add as new exclusion
      merged.push(current)
    }
  }

  return merged
}

/**
 * Computes the connection overlap dynamically from current room positions.
 * Returns the exclusion range (in room-local coordinates) for the specified room's side.
 *
 * @param roomBounds - The bounds of the room to compute exclusion for
 * @param otherRoomBounds - The bounds of the other connected room
 * @param connection - The connection metadata
 * @param forRoomId - Which room's perspective we're computing for
 * @returns EdgeExclusion with start/end in room-local coordinates, or null if no overlap
 */
export function computeConnectionOverlap(
  roomBounds: RoomBounds,
  otherRoomBounds: RoomBounds,
  connection: RoomConnection,
  forRoomId: string
): { exclusion: EdgeExclusion; side: RoomSide } | null {
  const roomIndex = connection.roomIds[0] === forRoomId ? 0 : 1
  const mySide = connection.roomSides[roomIndex]

  if (connection.axis === 'horizontal') {
    // Top/bottom connection - overlap is along the X axis
    const overlapStart = Math.max(roomBounds.x, otherRoomBounds.x)
    const overlapEnd = Math.min(
      roomBounds.x + roomBounds.width,
      otherRoomBounds.x + otherRoomBounds.width
    )

    if (overlapEnd <= overlapStart) return null

    // Convert to room-local coordinates (relative to room's X origin)
    return {
      exclusion: {
        start: overlapStart - roomBounds.x,
        end: overlapEnd - roomBounds.x,
      },
      side: mySide,
    }
  } else {
    // Left/right connection - overlap is along the Y axis
    const overlapStart = Math.max(roomBounds.y, otherRoomBounds.y)
    const overlapEnd = Math.min(
      roomBounds.y + roomBounds.height,
      otherRoomBounds.y + otherRoomBounds.height
    )

    if (overlapEnd <= overlapStart) return null

    // Convert to room-local coordinates (relative to room's Y origin)
    return {
      exclusion: {
        start: overlapStart - roomBounds.y,
        end: overlapEnd - roomBounds.y,
      },
      side: mySide,
    }
  }
}

/**
 * Represents a wall segment along an edge, with flags indicating whether
 * the segment starts/ends at a room corner (edge boundary).
 */
export interface EdgeSegment {
  start: number
  end: number
  startsAtEdge: boolean  // true if this segment starts at the room corner (0)
  endsAtEdge: boolean    // true if this segment ends at the room corner (edgeLength)
}

/**
 * Generates wall segments for an edge, skipping exclusion zones.
 * Returns segments with boundary flags indicating if they start/end at room corners.
 * This is important for applying halfT offsets only at actual room corners.
 */
function generateEdgeSegments(
  edgeLength: number,
  exclusions: EdgeExclusion[]
): EdgeSegment[] {
  if (exclusions.length === 0) {
    return [{ start: 0, end: edgeLength, startsAtEdge: true, endsAtEdge: true }]
  }

  const segments: EdgeSegment[] = []
  let currentPos = 0

  for (const exclusion of exclusions) {
    // Add segment before this exclusion
    if (exclusion.start > currentPos) {
      segments.push({
        start: currentPos,
        end: exclusion.start,
        startsAtEdge: currentPos === 0,
        endsAtEdge: false,  // ends at an exclusion boundary, not room edge
      })
    }
    currentPos = exclusion.end
  }

  // Add final segment after last exclusion
  if (currentPos < edgeLength) {
    segments.push({
      start: currentPos,
      end: edgeLength,
      startsAtEdge: false,  // starts at an exclusion boundary
      endsAtEdge: true,
    })
  }

  return segments
}

/**
 * Generates walls from rectangular bounds, taking into account room connections.
 * Uses exclusion zones to generate partial wall segments where connections exist.
 *
 * - For 'direct' connections: no wall on the overlapping portion for either room
 * - For 'wall' connections: only the room with lower ID generates wall segments
 *                           (higher ID room has exclusion on that portion)
 *
 * The halfT offset is only applied at actual room corners, not at exclusion boundaries.
 * This prevents wall protrusion at connection edges.
 *
 * @param bounds - The room bounds
 * @param roomId - The room ID
 * @param connections - Connections involving this room
 * @param allRooms - All rooms (for dynamic overlap computation)
 * @param wallThickness - Wall thickness (default 15cm)
 * @param wallHeight - Wall height (default 280cm)
 */
/**
 * Checks if an edge has a wall segment at a specific position.
 * Used to determine if corner extensions should be applied.
 */
function hasWallAtPosition(exclusions: EdgeExclusion[], position: number): boolean {
  // If no exclusions, wall exists everywhere
  if (exclusions.length === 0) return true

  // Check if the position is NOT covered by any exclusion
  for (const excl of exclusions) {
    if (position >= excl.start && position < excl.end) {
      return false  // Position is within an exclusion
    }
  }
  return true  // Position is not excluded
}

/**
 * Checks if a corner should have wall extension applied.
 * Returns true if either:
 * 1. A wall segment exists at that corner position, OR
 * 2. An exclusion touches that corner (meaning a connecting room's wall exists there)
 *
 * This ensures proper T-junction formation when rooms connect at corners.
 */
function hasWallOrConnectionAtCorner(
  exclusions: EdgeExclusion[],
  position: number,
  edgeLength: number
): boolean {
  // If no exclusions, wall exists everywhere
  if (exclusions.length === 0) return true

  // Check if any exclusion touches this corner position
  // If so, a connecting room's wall exists there and we should extend
  for (const excl of exclusions) {
    if (position === 0 && excl.start === 0) return true  // Connection at start corner
    if (position === edgeLength && excl.end === edgeLength) return true  // Connection at end corner
  }

  // Otherwise, check if position is NOT covered by any exclusion
  for (const excl of exclusions) {
    if (position >= excl.start && position < excl.end) {
      return false  // Position is within an exclusion interior
    }
  }
  return true
}

export function generateWallsFromBoundsWithConnections(
  bounds: RoomBounds,
  roomId: string,
  connections: RoomConnection[],
  allRooms: Room[],
  wallThickness: number = 15,
  wallHeight: number = 280
): Omit<Wall, 'id'>[] {
  const { x, y, width, height } = bounds
  const halfT = wallThickness / 2

  // Get exclusion zones for each edge (using dynamic computation)
  const exclusions = getWallExclusionsForRoom(roomId, bounds, connections, allRooms)

  const defaultMaterial: MaterialRef = { materialId: 'white-paint' }
  const walls: Omit<Wall, 'id'>[] = []

  // Check which corners have perpendicular walls or connections
  // Apply halfT corner extension if perpendicular wall exists OR a connection touches that corner
  // This ensures proper T-junction formation when rooms connect at corners
  const leftHasWallAtTop = hasWallOrConnectionAtCorner(exclusions.left, 0, height)
  const leftHasWallAtBottom = hasWallOrConnectionAtCorner(exclusions.left, height, height)
  const rightHasWallAtTop = hasWallOrConnectionAtCorner(exclusions.right, 0, height)
  const rightHasWallAtBottom = hasWallOrConnectionAtCorner(exclusions.right, height, height)
  const topHasWallAtLeft = hasWallOrConnectionAtCorner(exclusions.top, 0, width)
  const topHasWallAtRight = hasWallOrConnectionAtCorner(exclusions.top, width, width)
  const bottomHasWallAtLeft = hasWallOrConnectionAtCorner(exclusions.bottom, 0, width)
  const bottomHasWallAtRight = hasWallOrConnectionAtCorner(exclusions.bottom, width, width)

  // Generate top wall segments
  // Top wall: horizontal, y = bounds.y - halfT, x goes from left to right
  const topSegments = generateEdgeSegments(width, exclusions.top)
  for (const segment of topSegments) {
    // Calculate start offset:
    // - At room corner (startsAtEdge): extend outward (-halfT) if perpendicular wall exists
    // - At exclusion boundary (!startsAtEdge): extend inward (+halfT) to reach connecting room's wall
    let startOffset = 0
    if (segment.startsAtEdge) {
      if (leftHasWallAtTop) startOffset = -halfT  // Room corner: extend outward (left)
    } else {
      startOffset = halfT  // Exclusion boundary: extend inward (right, toward gap)
    }

    // Calculate end offset:
    // - At room corner (endsAtEdge): extend outward (+halfT) if perpendicular wall exists
    // - At exclusion boundary (!endsAtEdge): extend inward (-halfT) to reach connecting room's wall
    let endOffset = 0
    if (segment.endsAtEdge) {
      if (rightHasWallAtTop) endOffset = halfT  // Room corner: extend outward (right)
    } else {
      endOffset = -halfT  // Exclusion boundary: extend inward (left, toward gap)
    }

    walls.push({
      start: {
        x: x + segment.start + startOffset,
        y: y - halfT,
      },
      end: {
        x: x + segment.end + endOffset,
        y: y - halfT,
      },
      thickness: wallThickness,
      height: wallHeight,
      material: defaultMaterial,
      openings: [],
      ownerRoomId: roomId,
    })
  }

  // Generate right wall segments
  // Right wall: vertical, x = bounds.x + width + halfT, y goes from top to bottom
  const rightSegments = generateEdgeSegments(height, exclusions.right)
  for (const segment of rightSegments) {
    // Calculate start offset:
    // - At room corner (startsAtEdge): extend outward (-halfT) if perpendicular wall exists
    // - At exclusion boundary (!startsAtEdge): extend inward (+halfT) to reach connecting room's wall
    let startOffset = 0
    if (segment.startsAtEdge) {
      if (topHasWallAtRight) startOffset = -halfT  // Room corner: extend outward (up)
    } else {
      startOffset = halfT  // Exclusion boundary: extend inward (down, toward gap)
    }

    // Calculate end offset:
    // - At room corner (endsAtEdge): extend outward (+halfT) if perpendicular wall exists
    // - At exclusion boundary (!endsAtEdge): extend inward (-halfT) to reach connecting room's wall
    let endOffset = 0
    if (segment.endsAtEdge) {
      if (bottomHasWallAtRight) endOffset = halfT  // Room corner: extend outward (down)
    } else {
      endOffset = -halfT  // Exclusion boundary: extend inward (up, toward gap)
    }

    walls.push({
      start: {
        x: x + width + halfT,
        y: y + segment.start + startOffset,
      },
      end: {
        x: x + width + halfT,
        y: y + segment.end + endOffset,
      },
      thickness: wallThickness,
      height: wallHeight,
      material: defaultMaterial,
      openings: [],
      ownerRoomId: roomId,
    })
  }

  // Generate bottom wall segments
  // Bottom wall: horizontal, y = bounds.y + height + halfT, x goes from left to right
  const bottomSegments = generateEdgeSegments(width, exclusions.bottom)
  for (const segment of bottomSegments) {
    // Calculate start offset:
    // - At room corner (startsAtEdge): extend outward (-halfT) if perpendicular wall exists
    // - At exclusion boundary (!startsAtEdge): extend inward (+halfT) to reach connecting room's wall
    let startOffset = 0
    if (segment.startsAtEdge) {
      if (leftHasWallAtBottom) startOffset = -halfT  // Room corner: extend outward (left)
    } else {
      startOffset = halfT  // Exclusion boundary: extend inward (right, toward gap)
    }

    // Calculate end offset:
    // - At room corner (endsAtEdge): extend outward (+halfT) if perpendicular wall exists
    // - At exclusion boundary (!endsAtEdge): extend inward (-halfT) to reach connecting room's wall
    let endOffset = 0
    if (segment.endsAtEdge) {
      if (rightHasWallAtBottom) endOffset = halfT  // Room corner: extend outward (right)
    } else {
      endOffset = -halfT  // Exclusion boundary: extend inward (left, toward gap)
    }

    walls.push({
      start: {
        x: x + segment.start + startOffset,
        y: y + height + halfT,
      },
      end: {
        x: x + segment.end + endOffset,
        y: y + height + halfT,
      },
      thickness: wallThickness,
      height: wallHeight,
      material: defaultMaterial,
      openings: [],
      ownerRoomId: roomId,
    })
  }

  // Generate left wall segments
  // Left wall: vertical, x = bounds.x - halfT, y goes from top to bottom
  const leftSegments = generateEdgeSegments(height, exclusions.left)
  for (const segment of leftSegments) {
    // Calculate start offset:
    // - At room corner (startsAtEdge): extend outward (-halfT) if perpendicular wall exists
    // - At exclusion boundary (!startsAtEdge): extend inward (+halfT) to reach connecting room's wall
    let startOffset = 0
    if (segment.startsAtEdge) {
      if (topHasWallAtLeft) startOffset = -halfT  // Room corner: extend outward (up)
    } else {
      startOffset = halfT  // Exclusion boundary: extend inward (down, toward gap)
    }

    // Calculate end offset:
    // - At room corner (endsAtEdge): extend outward (+halfT) if perpendicular wall exists
    // - At exclusion boundary (!endsAtEdge): extend inward (-halfT) to reach connecting room's wall
    let endOffset = 0
    if (segment.endsAtEdge) {
      if (bottomHasWallAtLeft) endOffset = halfT  // Room corner: extend outward (down)
    } else {
      endOffset = -halfT  // Exclusion boundary: extend inward (up, toward gap)
    }

    walls.push({
      start: {
        x: x - halfT,
        y: y + segment.start + startOffset,
      },
      end: {
        x: x - halfT,
        y: y + segment.end + endOffset,
      },
      thickness: wallThickness,
      height: wallHeight,
      material: defaultMaterial,
      openings: [],
      ownerRoomId: roomId,
    })
  }

  return walls
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
 * Finds the smallest (innermost) room that fully contains the given bounds.
 * Used for automatic parent assignment when creating nested rooms.
 */
export function findParentRoomForBounds(
  bounds: RoomBounds,
  rooms: Room[],
  excludeId?: string
): Room | null {
  // Find all rooms that fully contain these bounds
  const candidates = rooms.filter(
    (r) => r.id !== excludeId && isBoundsFullyContained(bounds, r.bounds)
  )

  if (candidates.length === 0) return null

  // Return the smallest (most specific) containing room
  return candidates.reduce((smallest, r) =>
    r.bounds.width * r.bounds.height < smallest.bounds.width * smallest.bounds.height
      ? r
      : smallest
  )
}

// ==================== Wall Connection/Joint Utilities ====================

/**
 * Tolerance for considering two wall endpoints as connected (in cm).
 */
export const WALL_CONNECTION_TOLERANCE = 5

/**
 * Checks if two points are within connection tolerance (considered "connected").
 */
export function pointsAreConnected(
  a: Point2D,
  b: Point2D,
  tolerance: number = WALL_CONNECTION_TOLERANCE
): boolean {
  return Math.abs(a.x - b.x) < tolerance && Math.abs(a.y - b.y) < tolerance
}

/**
 * Finds all walls that have an endpoint at or near the given point.
 * Returns array of {wallId, endpoint, point} objects.
 */
export function getWallsAtPoint(
  point: Point2D,
  walls: Wall[],
  tolerance: number = WALL_CONNECTION_TOLERANCE
): Array<{ wallId: string; endpoint: 'start' | 'end'; point: Point2D }> {
  const results: Array<{ wallId: string; endpoint: 'start' | 'end'; point: Point2D }> = []

  for (const wall of walls) {
    if (pointsAreConnected(wall.start, point, tolerance)) {
      results.push({ wallId: wall.id, endpoint: 'start', point: wall.start })
    }
    if (pointsAreConnected(wall.end, point, tolerance)) {
      results.push({ wallId: wall.id, endpoint: 'end', point: wall.end })
    }
  }

  return results
}

/**
 * Builds a map of all wall joints (connection points where 2+ walls meet).
 * Key: normalized point string "x,y"
 * Value: array of connected wall endpoints
 */
export function buildWallJointMap(
  walls: Wall[],
  tolerance: number = WALL_CONNECTION_TOLERANCE
): Map<string, Array<{ wallId: string; endpoint: 'start' | 'end' }>> {
  const joints = new Map<string, Array<{ wallId: string; endpoint: 'start' | 'end' }>>()

  // Collect all endpoints
  const endpoints: Array<{ wallId: string; endpoint: 'start' | 'end'; point: Point2D }> = []
  for (const wall of walls) {
    endpoints.push({ wallId: wall.id, endpoint: 'start', point: wall.start })
    endpoints.push({ wallId: wall.id, endpoint: 'end', point: wall.end })
  }

  // Group endpoints by proximity
  const visited = new Set<number>()

  for (let i = 0; i < endpoints.length; i++) {
    if (visited.has(i)) continue

    const group: typeof endpoints = [endpoints[i]]
    visited.add(i)

    for (let j = i + 1; j < endpoints.length; j++) {
      if (visited.has(j)) continue
      if (pointsAreConnected(endpoints[i].point, endpoints[j].point, tolerance)) {
        group.push(endpoints[j])
        visited.add(j)
      }
    }

    // Only create joint if 2+ walls meet here
    if (group.length >= 2) {
      // Use average position as joint key
      const avgX = group.reduce((sum, e) => sum + e.point.x, 0) / group.length
      const avgY = group.reduce((sum, e) => sum + e.point.y, 0) / group.length
      const key = `${Math.round(avgX)},${Math.round(avgY)}`

      joints.set(
        key,
        group.map(({ wallId, endpoint }) => ({ wallId, endpoint }))
      )
    }
  }

  return joints
}

/**
 * Gets all unique joint positions from walls (where 2+ walls connect).
 * Returns array of Point2D representing joint centers.
 */
export function getWallJointPositions(
  walls: Wall[],
  tolerance: number = WALL_CONNECTION_TOLERANCE
): Point2D[] {
  const jointMap = buildWallJointMap(walls, tolerance)
  const positions: Point2D[] = []

  for (const key of jointMap.keys()) {
    const [x, y] = key.split(',').map(Number)
    positions.push({ x, y })
  }

  return positions
}

/**
 * Finds the nearest wall endpoint to a given position.
 * Used for snapping during wall drawing.
 */
export function findNearestWallEndpoint(
  pos: Point2D,
  walls: Wall[],
  tolerance: number
): Point2D | null {
  let nearest: Point2D | null = null
  let nearestDist = tolerance

  for (const wall of walls) {
    const distToStart = Math.sqrt(
      Math.pow(pos.x - wall.start.x, 2) + Math.pow(pos.y - wall.start.y, 2)
    )
    if (distToStart < nearestDist) {
      nearestDist = distToStart
      nearest = wall.start
    }

    const distToEnd = Math.sqrt(
      Math.pow(pos.x - wall.end.x, 2) + Math.pow(pos.y - wall.end.y, 2)
    )
    if (distToEnd < nearestDist) {
      nearestDist = distToEnd
      nearest = wall.end
    }
  }

  return nearest
}

// ==================== Wall Position Utilities ====================

/**
 * Calculates the position of an item (window/door) along a wall.
 * @param wall The wall the item is attached to
 * @param positionAlongWall Distance from wall start to item center (in same units as wall coords)
 * @returns Object containing center position, wall angle, and wall length
 */
export function calculatePositionOnWall(wall: Wall, positionAlongWall: number): {
  centerX: number
  centerY: number
  wallAngle: number
  wallLength: number
} {
  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  const wallLength = Math.sqrt(dx * dx + dy * dy)
  const wallAngle = Math.atan2(dy, dx)

  // Normalize position along wall (0-1)
  const t = positionAlongWall / wallLength

  // Calculate center position
  const centerX = wall.start.x + dx * t
  const centerY = wall.start.y + dy * t

  return {
    centerX,
    centerY,
    wallAngle,
    wallLength,
  }
}

// ==================== Opening Wall Detection ====================

/**
 * Projects a point onto a line segment and returns the distance and position along the segment.
 */
function projectPointOntoSegment(
  point: Point2D,
  segStart: Point2D,
  segEnd: Point2D
): { distance: number; t: number; projectedPoint: Point2D } {
  const dx = segEnd.x - segStart.x
  const dy = segEnd.y - segStart.y
  const segLengthSq = dx * dx + dy * dy

  if (segLengthSq === 0) {
    // Segment is a point
    const dist = Math.sqrt(
      Math.pow(point.x - segStart.x, 2) + Math.pow(point.y - segStart.y, 2)
    )
    return { distance: dist, t: 0, projectedPoint: { ...segStart } }
  }

  // Calculate t (position along segment, 0-1)
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / segLengthSq
    )
  )

  // Calculate projected point
  const projX = segStart.x + t * dx
  const projY = segStart.y + t * dy

  // Calculate distance from point to projected point
  const distance = Math.sqrt(
    Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2)
  )

  return {
    distance,
    t,
    projectedPoint: { x: projX, y: projY },
  }
}

/**
 * Finds the nearest wall to a given position within a threshold distance.
 * Used for dragging doors/windows between walls.
 * @param pos The position to check
 * @param walls Array of walls to search
 * @param excludeWallId Optional wall ID to exclude from search (e.g., current wall)
 * @param threshold Maximum distance to consider (default 30cm)
 * @returns The nearest wall info or null if none found within threshold
 */
export function findNearestWall(
  pos: Point2D,
  walls: Wall[],
  excludeWallId?: string,
  threshold: number = 30
): { wall: Wall; position: number; distance: number } | null {
  let nearestWall: Wall | null = null
  let nearestDistance = threshold
  let nearestPosition = 0

  for (const wall of walls) {
    if (excludeWallId && wall.id === excludeWallId) continue

    const { distance, t } = projectPointOntoSegment(pos, wall.start, wall.end)

    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestWall = wall

      // Calculate position along wall in actual units
      const dx = wall.end.x - wall.start.x
      const dy = wall.end.y - wall.start.y
      const wallLength = Math.sqrt(dx * dx + dy * dy)
      nearestPosition = t * wallLength
    }
  }

  if (!nearestWall) return null

  return {
    wall: nearestWall,
    position: nearestPosition,
    distance: nearestDistance,
  }
}

// ==================== Room Detection ====================

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

// ==================== Room Snapping ====================

export interface RoomEdge {
  roomId: string
  side: 'top' | 'right' | 'bottom' | 'left'
  start: Point2D
  end: Point2D
}

export interface RoomSnapGuide {
  axis: 'horizontal' | 'vertical'
  position: number
  start: number
  end: number
}

export interface RoomSnapResult {
  snappedBounds: RoomBounds
  snapGuides: RoomSnapGuide[]
  adjacentEdges: RoomEdge[]
}

/**
 * Gets the 4 edges of a room from its bounds.
 */
export function getRoomEdges(room: Room): RoomEdge[] {
  const { x, y, width, height } = room.bounds
  return [
    {
      roomId: room.id,
      side: 'top',
      start: { x, y },
      end: { x: x + width, y },
    },
    {
      roomId: room.id,
      side: 'right',
      start: { x: x + width, y },
      end: { x: x + width, y: y + height },
    },
    {
      roomId: room.id,
      side: 'bottom',
      start: { x: x + width, y: y + height },
      end: { x, y: y + height },
    },
    {
      roomId: room.id,
      side: 'left',
      start: { x, y: y + height },
      end: { x, y },
    },
  ]
}

/**
 * Calculates room snapping during drawing or moving.
 * Returns snapped bounds and visual guides.
 */
export function calculateRoomSnap(
  proposedBounds: RoomBounds,
  existingRooms: Room[],
  excludeRoomId?: string,
  snapThreshold: number = 20
): RoomSnapResult {
  const snapGuides: RoomSnapGuide[] = []
  const adjacentEdges: RoomEdge[] = []
  let snappedBounds = { ...proposedBounds }

  // Get edges of proposed room
  const proposedEdges = {
    top: proposedBounds.y,
    bottom: proposedBounds.y + proposedBounds.height,
    left: proposedBounds.x,
    right: proposedBounds.x + proposedBounds.width,
  }

  // Track snap offsets (only apply one per axis)
  let snapOffsetX = 0
  let snapOffsetY = 0

  // Check against each existing room
  for (const room of existingRooms) {
    if (room.id === excludeRoomId) continue

    const roomEdges = {
      top: room.bounds.y,
      bottom: room.bounds.y + room.bounds.height,
      left: room.bounds.x,
      right: room.bounds.x + room.bounds.width,
    }

    // Check horizontal snaps (top/bottom edges aligning)
    // Proposed top to existing bottom (room below existing)
    if (Math.abs(proposedEdges.top - roomEdges.bottom) < snapThreshold && snapOffsetY === 0) {
      snapOffsetY = roomEdges.bottom - proposedEdges.top
      const overlapStart = Math.max(proposedBounds.x, room.bounds.x)
      const overlapEnd = Math.min(proposedBounds.x + proposedBounds.width, room.bounds.x + room.bounds.width)
      if (overlapEnd > overlapStart) {
        snapGuides.push({
          axis: 'horizontal',
          position: roomEdges.bottom,
          start: overlapStart - 20,
          end: overlapEnd + 20,
        })
        adjacentEdges.push({ roomId: room.id, side: 'bottom', start: { x: room.bounds.x, y: roomEdges.bottom }, end: { x: room.bounds.x + room.bounds.width, y: roomEdges.bottom } })
      }
    }
    // Proposed bottom to existing top (room above existing)
    if (Math.abs(proposedEdges.bottom - roomEdges.top) < snapThreshold && snapOffsetY === 0) {
      snapOffsetY = roomEdges.top - proposedEdges.bottom
      const overlapStart = Math.max(proposedBounds.x, room.bounds.x)
      const overlapEnd = Math.min(proposedBounds.x + proposedBounds.width, room.bounds.x + room.bounds.width)
      if (overlapEnd > overlapStart) {
        snapGuides.push({
          axis: 'horizontal',
          position: roomEdges.top,
          start: overlapStart - 20,
          end: overlapEnd + 20,
        })
        adjacentEdges.push({ roomId: room.id, side: 'top', start: { x: room.bounds.x, y: roomEdges.top }, end: { x: room.bounds.x + room.bounds.width, y: roomEdges.top } })
      }
    }

    // Check vertical snaps (left/right edges aligning)
    // Proposed left to existing right (room to right of existing)
    if (Math.abs(proposedEdges.left - roomEdges.right) < snapThreshold && snapOffsetX === 0) {
      snapOffsetX = roomEdges.right - proposedEdges.left
      const overlapStart = Math.max(proposedBounds.y, room.bounds.y)
      const overlapEnd = Math.min(proposedBounds.y + proposedBounds.height, room.bounds.y + room.bounds.height)
      if (overlapEnd > overlapStart) {
        snapGuides.push({
          axis: 'vertical',
          position: roomEdges.right,
          start: overlapStart - 20,
          end: overlapEnd + 20,
        })
        adjacentEdges.push({ roomId: room.id, side: 'right', start: { x: roomEdges.right, y: room.bounds.y }, end: { x: roomEdges.right, y: room.bounds.y + room.bounds.height } })
      }
    }
    // Proposed right to existing left (room to left of existing)
    if (Math.abs(proposedEdges.right - roomEdges.left) < snapThreshold && snapOffsetX === 0) {
      snapOffsetX = roomEdges.left - proposedEdges.right
      const overlapStart = Math.max(proposedBounds.y, room.bounds.y)
      const overlapEnd = Math.min(proposedBounds.y + proposedBounds.height, room.bounds.y + room.bounds.height)
      if (overlapEnd > overlapStart) {
        snapGuides.push({
          axis: 'vertical',
          position: roomEdges.left,
          start: overlapStart - 20,
          end: overlapEnd + 20,
        })
        adjacentEdges.push({ roomId: room.id, side: 'left', start: { x: roomEdges.left, y: room.bounds.y }, end: { x: roomEdges.left, y: room.bounds.y + room.bounds.height } })
      }
    }
  }

  // Apply snap offsets
  if (snapOffsetX !== 0 || snapOffsetY !== 0) {
    snappedBounds = {
      ...proposedBounds,
      x: proposedBounds.x + snapOffsetX,
      y: proposedBounds.y + snapOffsetY,
    }
  }

  return { snappedBounds, snapGuides, adjacentEdges }
}

// ==================== Two-Mode Room Snapping ====================

/**
 * Snap thresholds for room connections:
 * - SNAP_WITH_WALL: rooms snap with wall thickness gap between them (shared wall)
 * - SNAP_DIRECT: rooms snap directly (bounds touch, no wall between)
 */
export const SNAP_WITH_WALL_THRESHOLD = 20
export const SNAP_DIRECT_THRESHOLD = 5

export type ConnectionSnapType = 'wall' | 'direct' | null

export interface ConnectionSnapResult {
  snappedBounds: RoomBounds
  snapGuides: RoomSnapGuide[]
  connectionType: ConnectionSnapType
  adjacentRoomId: string | null
  connectionInfo: {
    axis: 'horizontal' | 'vertical'
    proposedSide: RoomSide
    adjacentSide: RoomSide
  } | null
}

/**
 * Calculates room snapping with two modes:
 * 1. Direct connection (bounds touch) when rooms are very close
 * 2. Wall connection (gap between rooms) when rooms are moderately close
 *
 * Returns connection info with axis and roomSides (not coordinates) for creating
 * connections that remain valid when rooms move.
 *
 * @param proposedBounds - The bounds of the room being moved/resized
 * @param existingRooms - All other rooms to check for snapping
 * @param excludeRoomId - ID of room being moved (to exclude from checks)
 */
export function calculateRoomSnapWithConnections(
  proposedBounds: RoomBounds,
  existingRooms: Room[],
  excludeRoomId?: string
): ConnectionSnapResult {
  const snapGuides: RoomSnapGuide[] = []
  let snappedBounds = { ...proposedBounds }
  let connectionType: ConnectionSnapType = null
  let adjacentRoomId: string | null = null
  let connectionInfo: ConnectionSnapResult['connectionInfo'] = null

  // Get edges of proposed room
  const proposedEdges = {
    top: proposedBounds.y,
    bottom: proposedBounds.y + proposedBounds.height,
    left: proposedBounds.x,
    right: proposedBounds.x + proposedBounds.width,
  }

  // Track snap offsets (only apply one per axis)
  let snapOffsetX = 0
  let snapOffsetY = 0
  let bestDistance = Infinity

  // Check against each existing room
  for (const room of existingRooms) {
    if (room.id === excludeRoomId) continue

    const roomEdges = {
      top: room.bounds.y,
      bottom: room.bounds.y + room.bounds.height,
      left: room.bounds.x,
      right: room.bounds.x + room.bounds.width,
    }

    // Calculate overlap ranges for each axis
    const horizontalOverlapStart = Math.max(proposedBounds.x, room.bounds.x)
    const horizontalOverlapEnd = Math.min(proposedBounds.x + proposedBounds.width, room.bounds.x + room.bounds.width)
    const hasHorizontalOverlap = horizontalOverlapEnd > horizontalOverlapStart

    const verticalOverlapStart = Math.max(proposedBounds.y, room.bounds.y)
    const verticalOverlapEnd = Math.min(proposedBounds.y + proposedBounds.height, room.bounds.y + room.bounds.height)
    const hasVerticalOverlap = verticalOverlapEnd > verticalOverlapStart

    // Check horizontal snaps (top/bottom edges) - only if there's horizontal overlap
    if (hasHorizontalOverlap) {
      // Proposed top to existing bottom
      const topToBottomDist = Math.abs(proposedEdges.top - roomEdges.bottom)
      if (topToBottomDist < SNAP_WITH_WALL_THRESHOLD && topToBottomDist < bestDistance && snapOffsetY === 0) {
        bestDistance = topToBottomDist

        if (topToBottomDist <= SNAP_DIRECT_THRESHOLD) {
          // Direct connection - snap to touch (bounds touch exactly, no wall between)
          snapOffsetY = roomEdges.bottom - proposedEdges.top
          connectionType = 'direct'
        } else {
          // Wall connection - snap with gap = wall thickness (single shared wall in gap)
          snapOffsetY = roomEdges.bottom - proposedEdges.top + DEFAULT_WALL_THICKNESS
          connectionType = 'wall'
        }

        adjacentRoomId = room.id
        connectionInfo = {
          axis: 'horizontal',
          proposedSide: 'top',
          adjacentSide: 'bottom',
        }

        snapGuides.push({
          axis: 'horizontal',
          position: roomEdges.bottom,
          start: horizontalOverlapStart - 20,
          end: horizontalOverlapEnd + 20,
        })
      }

      // Proposed bottom to existing top
      const bottomToTopDist = Math.abs(proposedEdges.bottom - roomEdges.top)
      if (bottomToTopDist < SNAP_WITH_WALL_THRESHOLD && bottomToTopDist < bestDistance && snapOffsetY === 0) {
        bestDistance = bottomToTopDist

        if (bottomToTopDist <= SNAP_DIRECT_THRESHOLD) {
          // Direct connection - snap to touch
          snapOffsetY = roomEdges.top - proposedEdges.bottom
          connectionType = 'direct'
        } else {
          // Wall connection - snap with gap = wall thickness
          snapOffsetY = roomEdges.top - proposedEdges.bottom - DEFAULT_WALL_THICKNESS
          connectionType = 'wall'
        }

        adjacentRoomId = room.id
        connectionInfo = {
          axis: 'horizontal',
          proposedSide: 'bottom',
          adjacentSide: 'top',
        }

        snapGuides.push({
          axis: 'horizontal',
          position: roomEdges.top,
          start: horizontalOverlapStart - 20,
          end: horizontalOverlapEnd + 20,
        })
      }
    }

    // Check vertical snaps (left/right edges) - only if there's vertical overlap
    if (hasVerticalOverlap) {
      // Proposed left to existing right
      const leftToRightDist = Math.abs(proposedEdges.left - roomEdges.right)
      if (leftToRightDist < SNAP_WITH_WALL_THRESHOLD && leftToRightDist < bestDistance && snapOffsetX === 0) {
        bestDistance = leftToRightDist

        if (leftToRightDist <= SNAP_DIRECT_THRESHOLD) {
          // Direct connection - snap to touch
          snapOffsetX = roomEdges.right - proposedEdges.left
          connectionType = 'direct'
        } else {
          // Wall connection - snap with gap = wall thickness
          snapOffsetX = roomEdges.right - proposedEdges.left + DEFAULT_WALL_THICKNESS
          connectionType = 'wall'
        }

        adjacentRoomId = room.id
        connectionInfo = {
          axis: 'vertical',
          proposedSide: 'left',
          adjacentSide: 'right',
        }

        snapGuides.push({
          axis: 'vertical',
          position: roomEdges.right,
          start: verticalOverlapStart - 20,
          end: verticalOverlapEnd + 20,
        })
      }

      // Proposed right to existing left
      const rightToLeftDist = Math.abs(proposedEdges.right - roomEdges.left)
      if (rightToLeftDist < SNAP_WITH_WALL_THRESHOLD && rightToLeftDist < bestDistance && snapOffsetX === 0) {
        bestDistance = rightToLeftDist

        if (rightToLeftDist <= SNAP_DIRECT_THRESHOLD) {
          // Direct connection - snap to touch
          snapOffsetX = roomEdges.left - proposedEdges.right
          connectionType = 'direct'
        } else {
          // Wall connection - snap with gap = wall thickness
          snapOffsetX = roomEdges.left - proposedEdges.right - DEFAULT_WALL_THICKNESS
          connectionType = 'wall'
        }

        adjacentRoomId = room.id
        connectionInfo = {
          axis: 'vertical',
          proposedSide: 'right',
          adjacentSide: 'left',
        }

        snapGuides.push({
          axis: 'vertical',
          position: roomEdges.left,
          start: verticalOverlapStart - 20,
          end: verticalOverlapEnd + 20,
        })
      }
    }
  }

  // Apply snap offsets
  if (snapOffsetX !== 0 || snapOffsetY !== 0) {
    snappedBounds = {
      ...proposedBounds,
      x: proposedBounds.x + snapOffsetX,
      y: proposedBounds.y + snapOffsetY,
    }
  }

  return { snappedBounds, snapGuides, connectionType, adjacentRoomId, connectionInfo }
}

/**
 * Information about an adjacent room connection.
 */
export interface AdjacentRoomInfo {
  roomId: string
  axis: 'horizontal' | 'vertical'
  proposedSide: RoomSide
  adjacentSide: RoomSide
}

/**
 * Finds all rooms that are adjacent to the given room.
 * Detects both direct connections (edges touch) and wall connections (edges have gap = wallThickness).
 * Used to detect and create room connections.
 *
 * Returns axis and roomSides (not coordinates) for connections that remain valid when rooms move.
 *
 * @param roomBounds - The bounds of the room to check adjacency for
 * @param allRooms - All rooms to check against
 * @param excludeRoomId - ID of the room being checked (to exclude from results)
 * @param threshold - Tolerance for edge matching (default 1cm)
 */
export function findAdjacentRooms(
  roomBounds: RoomBounds,
  allRooms: Room[],
  excludeRoomId: string,
  threshold: number = 1
): AdjacentRoomInfo[] {
  const adjacent: AdjacentRoomInfo[] = []

  const edges = {
    top: roomBounds.y,
    bottom: roomBounds.y + roomBounds.height,
    left: roomBounds.x,
    right: roomBounds.x + roomBounds.width,
  }

  // Maximum distance to consider as adjacent:
  // - Direct connection: edges within threshold
  // - Wall connection: edges within wallThickness + threshold
  const maxAdjacentDistance = DEFAULT_WALL_THICKNESS + threshold

  for (const room of allRooms) {
    if (room.id === excludeRoomId) continue

    const roomEdges = {
      top: room.bounds.y,
      bottom: room.bounds.y + room.bounds.height,
      left: room.bounds.x,
      right: room.bounds.x + room.bounds.width,
    }

    // Check for horizontal adjacency (top/bottom)
    const horizontalOverlapStart = Math.max(roomBounds.x, room.bounds.x)
    const horizontalOverlapEnd = Math.min(roomBounds.x + roomBounds.width, room.bounds.x + room.bounds.width)
    const hasHorizontalOverlap = horizontalOverlapEnd - horizontalOverlapStart > threshold

    if (hasHorizontalOverlap) {
      // Check if top edge touches or is near other's bottom
      const topToBottomDist = edges.top - roomEdges.bottom
      if (topToBottomDist >= 0 && topToBottomDist <= maxAdjacentDistance) {
        adjacent.push({
          roomId: room.id,
          axis: 'horizontal',
          proposedSide: 'top',
          adjacentSide: 'bottom',
        })
      }

      // Check if bottom edge touches or is near other's top
      const bottomToTopDist = roomEdges.top - edges.bottom
      if (bottomToTopDist >= 0 && bottomToTopDist <= maxAdjacentDistance) {
        adjacent.push({
          roomId: room.id,
          axis: 'horizontal',
          proposedSide: 'bottom',
          adjacentSide: 'top',
        })
      }
    }

    // Check for vertical adjacency (left/right)
    const verticalOverlapStart = Math.max(roomBounds.y, room.bounds.y)
    const verticalOverlapEnd = Math.min(roomBounds.y + roomBounds.height, room.bounds.y + room.bounds.height)
    const hasVerticalOverlap = verticalOverlapEnd - verticalOverlapStart > threshold

    if (hasVerticalOverlap) {
      // Check if left edge touches or is near other's right
      const leftToRightDist = edges.left - roomEdges.right
      if (leftToRightDist >= 0 && leftToRightDist <= maxAdjacentDistance) {
        adjacent.push({
          roomId: room.id,
          axis: 'vertical',
          proposedSide: 'left',
          adjacentSide: 'right',
        })
      }

      // Check if right edge touches or is near other's left
      const rightToLeftDist = roomEdges.left - edges.right
      if (rightToLeftDist >= 0 && rightToLeftDist <= maxAdjacentDistance) {
        adjacent.push({
          roomId: room.id,
          axis: 'vertical',
          proposedSide: 'right',
          adjacentSide: 'left',
        })
      }
    }
  }

  return adjacent
}

