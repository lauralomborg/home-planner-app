import { memo, useMemo } from 'react'
import { Grid } from '@react-three/drei'
import { COLORS_3D } from '@/constants/colors'
import { useFloorPlanStore } from '@/stores'

export const GroundGrid = memo(function GroundGrid() {
  return (
    <Grid
      args={[30, 30]}
      cellSize={0.5}
      cellThickness={0.3}
      cellColor="#E0DCD5"
      sectionSize={2.5}
      sectionThickness={0.6}
      sectionColor="#D5D0C8"
      fadeDistance={40}
      fadeStrength={1}
      followCamera={false}
      infiniteGrid
    />
  )
})

export const GroundPlane = memo(function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color={COLORS_3D.ground} roughness={1} />
    </mesh>
  )
})

export const Floor3D = memo(function Floor3D() {
  const walls = useFloorPlanStore((state) => state.floorPlan.walls)
  const rooms = useFloorPlanStore((state) => state.floorPlan.rooms)

  const bounds = useMemo(() => {
    if (walls.length === 0) {
      return { minX: -500, maxX: 500, minY: -500, maxY: 500 }
    }

    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity

    walls.forEach((wall) => {
      minX = Math.min(minX, wall.start.x, wall.end.x)
      maxX = Math.max(maxX, wall.start.x, wall.end.x)
      minY = Math.min(minY, wall.start.y, wall.end.y)
      maxY = Math.max(maxY, wall.start.y, wall.end.y)
    })

    const padding = 100
    return {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding,
    }
  }, [walls])

  if (walls.length === 0 || rooms.length > 0) return null

  const width = (bounds.maxX - bounds.minX) / 100
  const depth = (bounds.maxY - bounds.minY) / 100
  const centerX = (bounds.minX + bounds.maxX) / 2 / 100
  const centerZ = (bounds.minY + bounds.maxY) / 2 / 100

  return (
    <mesh
      position={[centerX, 0.001, centerZ]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial color={COLORS_3D.floor} roughness={0.85} />
    </mesh>
  )
})
