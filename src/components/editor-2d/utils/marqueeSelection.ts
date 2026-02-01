import type { Point2D, Wall, Room, FurnitureInstance, WindowInstance, DoorInstance } from '@/models'

// Helper: Check if line segment intersects rectangle
function lineIntersectsRect(
  x1: number, y1: number, x2: number, y2: number,
  rectMinX: number, rectMinY: number, rectMaxX: number, rectMaxY: number
): boolean {
  // Check if either endpoint is inside the rect
  if ((x1 >= rectMinX && x1 <= rectMaxX && y1 >= rectMinY && y1 <= rectMaxY) ||
      (x2 >= rectMinX && x2 <= rectMaxX && y2 >= rectMinY && y2 <= rectMaxY)) {
    return true
  }

  // Check if line crosses any of the 4 rectangle edges
  const linesCross = (ax1: number, ay1: number, ax2: number, ay2: number,
                      bx1: number, by1: number, bx2: number, by2: number): boolean => {
    const d1 = (bx2 - bx1) * (ay1 - by1) - (by2 - by1) * (ax1 - bx1)
    const d2 = (bx2 - bx1) * (ay2 - by1) - (by2 - by1) * (ax2 - bx1)
    const d3 = (ax2 - ax1) * (by1 - ay1) - (ay2 - ay1) * (bx1 - ax1)
    const d4 = (ax2 - ax1) * (by2 - ay1) - (ay2 - ay1) * (bx2 - ax1)
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
           ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  }

  return linesCross(x1, y1, x2, y2, rectMinX, rectMinY, rectMaxX, rectMinY) ||
         linesCross(x1, y1, x2, y2, rectMaxX, rectMinY, rectMaxX, rectMaxY) ||
         linesCross(x1, y1, x2, y2, rectMinX, rectMaxY, rectMaxX, rectMaxY) ||
         linesCross(x1, y1, x2, y2, rectMinX, rectMinY, rectMinX, rectMaxY)
}

// Helper: Check if two rectangles intersect
function rectsIntersect(
  aMinX: number, aMinY: number, aMaxX: number, aMaxY: number,
  bMinX: number, bMinY: number, bMaxX: number, bMaxY: number
): boolean {
  return aMinX < bMaxX && aMaxX > bMinX && aMinY < bMaxY && aMaxY > bMinY
}

interface MarqueeSelectionParams {
  start: Point2D
  end: Point2D
  rooms: Room[]
  furniture: FurnitureInstance[]
  walls: Wall[]
  windows: WindowInstance[]
  doors: DoorInstance[]
  wallsById: Map<string, Wall>
}

/**
 * Get items within a marquee rectangle (Figma-like: touch to select)
 */
export function getItemsInMarquee({
  start,
  end,
  rooms,
  furniture,
  walls,
  windows,
  doors,
  wallsById,
}: MarqueeSelectionParams): string[] {
  const minX = Math.min(start.x, end.x)
  const maxX = Math.max(start.x, end.x)
  const minY = Math.min(start.y, end.y)
  const maxY = Math.max(start.y, end.y)

  const ids: string[] = []

  // Check rooms
  for (const r of rooms) {
    if (rectsIntersect(minX, minY, maxX, maxY,
        r.bounds.x, r.bounds.y, r.bounds.x + r.bounds.width, r.bounds.y + r.bounds.height)) {
      ids.push(r.id)
    }
  }

  // Check furniture
  for (const f of furniture) {
    const hw = f.dimensions.width / 2
    const hd = f.dimensions.depth / 2
    if (f.position.x - hw < maxX && f.position.x + hw > minX &&
        f.position.y - hd < maxY && f.position.y + hd > minY) {
      ids.push(f.id)
    }
  }

  // Check walls
  for (const w of walls) {
    if (lineIntersectsRect(w.start.x, w.start.y, w.end.x, w.end.y, minX, minY, maxX, maxY)) {
      ids.push(w.id)
    }
  }

  // Check windows
  for (const win of windows) {
    const wall = wallsById.get(win.wallId)
    if (wall) {
      const dx = wall.end.x - wall.start.x
      const dy = wall.end.y - wall.start.y
      const length = Math.sqrt(dx * dx + dy * dy)
      const t = win.position / length
      const wx = wall.start.x + dx * t
      const wy = wall.start.y + dy * t
      const halfWidth = win.width / 2
      if (rectsIntersect(minX, minY, maxX, maxY,
          wx - halfWidth, wy - halfWidth, wx + halfWidth, wy + halfWidth)) {
        ids.push(win.id)
      }
    }
  }

  // Check doors
  for (const door of doors) {
    const wall = wallsById.get(door.wallId)
    if (wall) {
      const dx = wall.end.x - wall.start.x
      const dy = wall.end.y - wall.start.y
      const length = Math.sqrt(dx * dx + dy * dy)
      const t = door.position / length
      const doorX = wall.start.x + dx * t
      const doorY = wall.start.y + dy * t
      const halfWidth = door.width / 2
      if (rectsIntersect(minX, minY, maxX, maxY,
          doorX - halfWidth, doorY - halfWidth, doorX + halfWidth, doorY + halfWidth)) {
        ids.push(door.id)
      }
    }
  }

  return ids
}
