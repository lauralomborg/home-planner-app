import { memo } from 'react'
import { Line, Circle, Group } from 'react-konva'
import { COLORS_2D } from '@/constants/colors'

interface OriginMarkerProps {
  scale: number
}

export const OriginMarker = memo(function OriginMarker({ scale }: OriginMarkerProps) {
  const size = 20 / scale
  return (
    <Group listening={false} opacity={0.3}>
      <Line
        points={[-size, 0, size, 0]}
        stroke={COLORS_2D.wall}
        strokeWidth={1 / scale}
      />
      <Line
        points={[0, -size, 0, size]}
        stroke={COLORS_2D.wall}
        strokeWidth={1 / scale}
      />
      <Circle x={0} y={0} radius={3 / scale} fill={COLORS_2D.wall} />
    </Group>
  )
})
