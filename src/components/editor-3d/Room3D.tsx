import { memo } from 'react'
import * as THREE from 'three'
import type { Room } from '@/models'
import { COLORS_3D } from '@/constants/colors'

interface Room3DProps {
  room: Room
  isSelected: boolean
}

export const Room3D = memo(function Room3D({ room, isSelected }: Room3DProps) {
  const { x, y, width, height } = room.bounds

  const centerX = (x + width / 2) / 100
  const centerZ = (y + height / 2) / 100
  const widthM = width / 100
  const depthM = height / 100

  const floorColor = room.floorMaterial.colorOverride || COLORS_3D.floor

  return (
    <mesh
      position={[centerX, 0.002, centerZ]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[widthM, depthM]} />
      <meshStandardMaterial
        color={isSelected ? COLORS_3D.furnitureSelected : floorColor}
        roughness={0.85}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
})
