import type { KonvaEventObject } from 'konva/lib/Node'

export const GRID_SIZE = 1 // 1cm grid

// Handle selection with modifier keys (Figma-style)
export function handleSelectWithModifiers(
  e: KonvaEventObject<MouseEvent>,
  id: string,
  select: (ids: string[]) => void,
  addToSelection: (id: string) => void,
  toggleSelection: (id: string) => void
) {
  e.cancelBubble = true // Prevent stage click from clearing selection
  const isShift = e.evt.shiftKey
  const isCmd = e.evt.metaKey || e.evt.ctrlKey

  if (isCmd) {
    // Cmd/Ctrl+click toggles selection
    toggleSelection(id)
  } else if (isShift) {
    // Shift+click adds to selection
    addToSelection(id)
  } else {
    // Regular click replaces selection
    select([id])
  }
}

// Snap position to grid
export function snapToGrid(
  point: { x: number; y: number },
  gridSize: number,
  enabled: boolean
): { x: number; y: number } {
  if (!enabled) return point
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  }
}
