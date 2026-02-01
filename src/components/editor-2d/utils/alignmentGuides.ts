import type { FurnitureInstance, Point2D } from '@/models'

export interface AlignmentGuide {
  type: 'horizontal' | 'vertical'
  position: number // x for vertical, y for horizontal
  start: number // start of line
  end: number // end of line
}

const SNAP_THRESHOLD = 8 // pixels

export function calculateAlignmentGuides(
  draggedItems: FurnitureInstance[],
  otherItems: FurnitureInstance[],
  scale: number
): { guides: AlignmentGuide[]; snapDelta: Point2D } {
  const guides: AlignmentGuide[] = []
  let snapDeltaX = 0
  let snapDeltaY = 0
  const threshold = SNAP_THRESHOLD / scale

  // Get bounding box of dragged items (using top-left anchor)
  if (draggedItems.length === 0) return { guides, snapDelta: { x: 0, y: 0 } }

  const draggedBounds = {
    left: Math.min(...draggedItems.map((f) => f.position.x)),
    right: Math.max(...draggedItems.map((f) => f.position.x + f.dimensions.width)),
    top: Math.min(...draggedItems.map((f) => f.position.y)),
    bottom: Math.max(...draggedItems.map((f) => f.position.y + f.dimensions.depth)),
  }
  const draggedCenterX = (draggedBounds.left + draggedBounds.right) / 2
  const draggedCenterY = (draggedBounds.top + draggedBounds.bottom) / 2

  // Check alignment with other items (using top-left anchor)
  for (const other of otherItems) {
    const otherBounds = {
      left: other.position.x,
      right: other.position.x + other.dimensions.width,
      top: other.position.y,
      bottom: other.position.y + other.dimensions.depth,
    }
    const otherCenterX = (otherBounds.left + otherBounds.right) / 2
    const otherCenterY = (otherBounds.top + otherBounds.bottom) / 2

    // Vertical guides (for X alignment)
    const verticalChecks = [
      { dragged: draggedBounds.left, other: otherBounds.left },
      { dragged: draggedBounds.right, other: otherBounds.right },
      { dragged: draggedBounds.left, other: otherBounds.right },
      { dragged: draggedBounds.right, other: otherBounds.left },
      { dragged: draggedCenterX, other: otherCenterX },
    ]

    for (const check of verticalChecks) {
      const diff = check.other - check.dragged
      if (Math.abs(diff) < threshold) {
        if (snapDeltaX === 0) snapDeltaX = diff
        guides.push({
          type: 'vertical',
          position: check.other,
          start: Math.min(draggedBounds.top, otherBounds.top) - 20,
          end: Math.max(draggedBounds.bottom, otherBounds.bottom) + 20,
        })
      }
    }

    // Horizontal guides (for Y alignment)
    const horizontalChecks = [
      { dragged: draggedBounds.top, other: otherBounds.top },
      { dragged: draggedBounds.bottom, other: otherBounds.bottom },
      { dragged: draggedBounds.top, other: otherBounds.bottom },
      { dragged: draggedBounds.bottom, other: otherBounds.top },
      { dragged: draggedCenterY, other: otherCenterY },
    ]

    for (const check of horizontalChecks) {
      const diff = check.other - check.dragged
      if (Math.abs(diff) < threshold) {
        if (snapDeltaY === 0) snapDeltaY = diff
        guides.push({
          type: 'horizontal',
          position: check.other,
          start: Math.min(draggedBounds.left, otherBounds.left) - 20,
          end: Math.max(draggedBounds.right, otherBounds.right) + 20,
        })
      }
    }
  }

  return { guides, snapDelta: { x: snapDeltaX, y: snapDeltaY } }
}
