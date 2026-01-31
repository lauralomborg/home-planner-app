import { memo } from 'react'
import { Text, Tag, Label } from 'react-konva'
import { COLORS_2D } from '@/constants/colors'

interface MeasurementLabelProps {
  x: number
  y: number
  length: number
  angle: number
  scale: number
}

export const MeasurementLabel = memo(function MeasurementLabel({
  x,
  y,
  length,
  angle,
  scale,
}: MeasurementLabelProps) {
  const text = `${(length / 100).toFixed(2)} m`
  const fontSize = 11 / scale
  const padding = 6 / scale
  const offsetY = 24 / scale

  const perpAngle = angle + Math.PI / 2
  const labelX = x + Math.cos(perpAngle) * offsetY
  const labelY = y + Math.sin(perpAngle) * offsetY

  return (
    <Label x={labelX} y={labelY} listening={false}>
      <Tag
        fill={COLORS_2D.measureBg}
        cornerRadius={4 / scale}
        pointerDirection="down"
        pointerWidth={6 / scale}
        pointerHeight={4 / scale}
        shadowColor="black"
        shadowBlur={4}
        shadowOpacity={0.1}
        shadowOffsetY={2}
      />
      <Text
        text={text}
        fontSize={fontSize}
        fontFamily="system-ui, sans-serif"
        fontStyle="500"
        fill={COLORS_2D.measureText}
        padding={padding}
        align="center"
      />
    </Label>
  )
})
