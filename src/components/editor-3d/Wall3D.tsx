import { memo, useMemo } from 'react'
import type { Wall } from '@/models'
import { COLORS_3D } from '@/constants/colors'

// Wall segment for rendering walls with cutouts
interface WallSegment {
  startPos: number
  endPos: number
  bottomY: number
  topY: number
}

// Generate wall segments with gaps for openings
function generateWallSegments(wall: Wall): WallSegment[] {
  const openings = wall.openings

  if (openings.length === 0) {
    return [{ startPos: 0, endPos: 1, bottomY: 0, topY: wall.height }]
  }

  const wallLength = Math.sqrt(
    Math.pow(wall.end.x - wall.start.x, 2) + Math.pow(wall.end.y - wall.start.y, 2)
  )

  const sortedOpenings = [...openings].sort((a, b) => a.position - b.position)
  const segments: WallSegment[] = []
  let currentPos = 0

  for (const opening of sortedOpenings) {
    const openingStart = (opening.position - opening.width / 2) / wallLength
    const openingEnd = (opening.position + opening.width / 2) / wallLength
    const openingBottom = opening.elevationFromFloor
    const openingTop = opening.elevationFromFloor + opening.height

    if (openingStart > currentPos) {
      segments.push({
        startPos: currentPos,
        endPos: openingStart,
        bottomY: 0,
        topY: wall.height,
      })
    }

    if (openingBottom > 0) {
      segments.push({
        startPos: openingStart,
        endPos: openingEnd,
        bottomY: 0,
        topY: openingBottom,
      })
    }

    if (openingTop < wall.height) {
      segments.push({
        startPos: openingStart,
        endPos: openingEnd,
        bottomY: openingTop,
        topY: wall.height,
      })
    }

    currentPos = openingEnd
  }

  if (currentPos < 1) {
    segments.push({
      startPos: currentPos,
      endPos: 1,
      bottomY: 0,
      topY: wall.height,
    })
  }

  return segments
}

interface Wall3DProps {
  wall: Wall
  isSelected: boolean
}

export const Wall3D = memo(function Wall3D({ wall, isSelected }: Wall3DProps) {
  const segments = useMemo(() => generateWallSegments(wall), [wall])

  const { dx, dy, wallLength, angle, thickness, color } = useMemo(() => {
    const dx = wall.end.x - wall.start.x
    const dy = wall.end.y - wall.start.y
    const wallLength = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)
    const thickness = wall.thickness / 100
    const color = isSelected
      ? COLORS_3D.wallSelected
      : wall.material.colorOverride || COLORS_3D.wall

    return { dx, dy, wallLength, angle, thickness, color }
  }, [wall, isSelected])

  return (
    <group>
      {segments.map((segment, index) => {
        const segmentLength = (segment.endPos - segment.startPos) * wallLength / 100
        const segmentHeight = (segment.topY - segment.bottomY) / 100
        const segmentCenterAlongWall = (segment.startPos + segment.endPos) / 2
        const segmentCenterX = (wall.start.x + dx * segmentCenterAlongWall) / 100
        const segmentCenterZ = (wall.start.y + dy * segmentCenterAlongWall) / 100
        const segmentCenterY = (segment.bottomY + segment.topY) / 2 / 100

        return (
          <mesh
            key={`wall-segment-${wall.id}-${index}`}
            position={[segmentCenterX, segmentCenterY, segmentCenterZ]}
            rotation={[0, -angle, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[segmentLength, segmentHeight, thickness]} />
            <meshStandardMaterial color={color} roughness={0.9} metalness={0} />
          </mesh>
        )
      })}
    </group>
  )
})
