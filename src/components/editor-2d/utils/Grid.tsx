import { memo, useMemo } from 'react'
import { Line, Group } from 'react-konva'
import { COLORS_2D } from '@/constants/colors'
import { GRID_SIZE } from '../types'

interface GridProps {
  width: number
  height: number
  offsetX: number
  offsetY: number
  scale: number
}

export const Grid = memo(function Grid({
  width,
  height,
  offsetX,
  offsetY,
  scale,
}: GridProps) {
  const lines = useMemo(() => {
    // Calculate adaptive grid size based on zoom
    let effectiveGridSize = GRID_SIZE

    // When zoomed out, use larger grid cells
    if (scale < 0.5) {
      effectiveGridSize = GRID_SIZE * 4 // 2m grid
    } else if (scale < 0.25) {
      effectiveGridSize = GRID_SIZE * 8 // 4m grid
    } else if (scale < 0.1) {
      effectiveGridSize = GRID_SIZE * 20 // 10m grid
    }

    // Ensure we don't draw too many lines
    const maxLines = 200
    const visibleWidth = width / scale
    const visibleHeight = height / scale
    const numVerticalLines = Math.ceil(visibleWidth / effectiveGridSize)
    const numHorizontalLines = Math.ceil(visibleHeight / effectiveGridSize)

    if (numVerticalLines > maxLines || numHorizontalLines > maxLines) {
      return null
    }

    const result: Array<{
      key: string
      points: number[]
      stroke: string
      strokeWidth: number
    }> = []

    const worldStartX = -offsetX / scale
    const worldStartY = -offsetY / scale
    const worldEndX = worldStartX + visibleWidth
    const worldEndY = worldStartY + visibleHeight

    const gridStartX = Math.floor(worldStartX / effectiveGridSize) * effectiveGridSize
    const gridStartY = Math.floor(worldStartY / effectiveGridSize) * effectiveGridSize

    let i = 0

    // Vertical lines
    for (let x = gridStartX; x <= worldEndX + effectiveGridSize; x += effectiveGridSize) {
      const isMajor = Math.round(x / effectiveGridSize) % 5 === 0
      result.push({
        key: `v-${i++}`,
        points: [x, gridStartY - effectiveGridSize, x, worldEndY + effectiveGridSize],
        stroke: isMajor ? COLORS_2D.gridLineMajor : COLORS_2D.gridLine,
        strokeWidth: (isMajor ? 1 : 0.5) / scale,
      })
    }

    // Horizontal lines
    for (let y = gridStartY; y <= worldEndY + effectiveGridSize; y += effectiveGridSize) {
      const isMajor = Math.round(y / effectiveGridSize) % 5 === 0
      result.push({
        key: `h-${i++}`,
        points: [gridStartX - effectiveGridSize, y, worldEndX + effectiveGridSize, y],
        stroke: isMajor ? COLORS_2D.gridLineMajor : COLORS_2D.gridLine,
        strokeWidth: (isMajor ? 1 : 0.5) / scale,
      })
    }

    return result
  }, [width, height, offsetX, offsetY, scale])

  if (!lines) return null

  return (
    <Group listening={false}>
      {lines.map((line) => (
        <Line
          key={line.key}
          points={line.points}
          stroke={line.stroke}
          strokeWidth={line.strokeWidth}
          listening={false}
        />
      ))}
    </Group>
  )
})
