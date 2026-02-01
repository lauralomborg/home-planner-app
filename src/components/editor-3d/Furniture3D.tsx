import { memo, useMemo } from 'react'
import * as THREE from 'three'
import type { FurnitureInstance } from '@/models'
import { COLORS_3D } from '@/constants/colors'
import { getFurnitureGenerator } from './furniture'

interface Furniture3DProps {
  furniture: FurnitureInstance
  isSelected: boolean
}

export const Furniture3D = memo(function Furniture3D({ furniture, isSelected }: Furniture3DProps) {
  // Position at top-left corner (rotation pivot point, matching 2D behavior)
  const position: [number, number, number] = [
    furniture.position.x / 100,
    0,
    furniture.position.y / 100,
  ]

  // Offset to center the mesh relative to the rotation pivot
  const meshOffset: [number, number, number] = [
    furniture.dimensions.width / 2 / 100,
    0,
    furniture.dimensions.depth / 2 / 100,
  ]

  const color = isSelected ? COLORS_3D.furnitureSelected : COLORS_3D.furniture

  const FurnitureGenerator = useMemo(
    () => getFurnitureGenerator(furniture.catalogItemId),
    [furniture.catalogItemId]
  )

  return (
    <group
      position={position}
      rotation={[0, THREE.MathUtils.degToRad(-furniture.rotation), 0]}
    >
      {/* Inner group offsets the mesh so rotation happens around top-left corner */}
      <group position={meshOffset}>
        <FurnitureGenerator dimensions={furniture.dimensions} color={color} />
      </group>
    </group>
  )
})
