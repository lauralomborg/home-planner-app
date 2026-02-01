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
    // GRID_SIZE = 1cm, we want minor lines at 1cm and major lines at 100cm (1m)
    let effectiveGridSize = GRID_SIZE
    let majorInterval = 100 // Major line every 100cm (1m)

    // When zoomed out, use larger grid cells to avoid too many lines
    if (scale < 0.03) {
      effectiveGridSize = GRID_SIZE * 1000 // 10m grid
      majorInterval = 10 // Major every 100m
    } else if (scale < 0.05) {
      effectiveGridSize = GRID_SIZE * 500 // 5m grid
      majorInterval = 10 // Major every 50m
    } else if (scale < 0.1) {
      effectiveGridSize = GRID_SIZE * 100 // 1m grid
      majorInterval = 10 // Major every 10m
    } else if (scale < 0.25) {
      effectiveGridSize = GRID_SIZE * 10 // 10cm grid
      majorInterval = 10 // Major every 1m
    } else if (scale < 0.5) {
      effectiveGridSize = GRID_SIZE * 5 // 5cm grid
      majorInterval = 20 // Major every 1m
    }

    // Calculate visible area
    const visibleWidth = width / scale
    const visibleHeight = height / scale
    const numVerticalLines = Math.ceil(visibleWidth / effectiveGridSize)
    const numHorizontalLines = Math.ceil(visibleHeight / effectiveGridSize)

    // Limit total lines to prevent performance issues
    const maxLines = 500
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
      const gridIndex = Math.round(x / effectiveGridSize)
      const isMajor = gridIndex % majorInterval === 0
      result.push({
        key: `v-${i++}`,
        points: [x, gridStartY - effectiveGridSize, x, worldEndY + effectiveGridSize],
        stroke: isMajor ? COLORS_2D.gridLineMajor : COLORS_2D.gridLine,
        strokeWidth: (isMajor ? 1 : 0.5) / scale,
      })
    }

    // Horizontal lines
    for (let y = gridStartY; y <= worldEndY + effectiveGridSize; y += effectiveGridSize) {
      const gridIndex = Math.round(y / effectiveGridSize)
      const isMajor = gridIndex % majorInterval === 0
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
