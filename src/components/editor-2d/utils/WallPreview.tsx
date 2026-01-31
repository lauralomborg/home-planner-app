import { memo } from 'react'
import { Line, Circle, Group } from 'react-konva'
import { COLORS_2D } from '@/constants/colors'
import { MeasurementLabel } from './MeasurementLabel'
import type { Point2D } from '@/models'

interface WallPreviewProps {
  start: Point2D
  end: Point2D
  thickness: number
  scale: number
}

export const WallPreview = memo(function WallPreview({
  start,
  end,
  thickness,
  scale,
}: WallPreviewProps) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx)
  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2

  return (
    <Group>
      <Line
        points={[start.x, start.y, end.x, end.y]}
        stroke={COLORS_2D.wallPreview}
        strokeWidth={thickness}
        lineCap="round"
        opacity={0.6}
      />
      <Circle
        x={start.x}
        y={start.y}
        radius={4 / scale}
        fill={COLORS_2D.wallPreview}
      />
      <Circle
        x={end.x}
        y={end.y}
        radius={6 / scale}
        fill={COLORS_2D.handleFill}
        stroke={COLORS_2D.wallPreview}
        strokeWidth={2 / scale}
      />
      {length > 30 && (
        <MeasurementLabel
          x={midX}
          y={midY}
          length={length}
          angle={angle}
          scale={scale}
        />
      )}
    </Group>
  )
})
