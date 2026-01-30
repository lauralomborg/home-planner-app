import * as THREE from 'three'
import type { DoorInstance, Wall } from '@/models'

// Nordic color palette
const COLORS = {
  frame: '#D4C4B0',
  frameSelected: '#5B8A72',
  panel: '#B8A082',
  panelSelected: '#4A7A62',
  handle: '#8B7355',
}

interface Door3DProps {
  door: DoorInstance
  wall: Wall
  isSelected: boolean
}

export function Door3D({ door, wall, isSelected }: Door3DProps) {
  // Calculate wall properties
  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  const wallLength = Math.sqrt(dx * dx + dy * dy)
  const wallAngle = Math.atan2(dy, dx)

  // Door dimensions in meters
  const doorWidth = door.width / 100
  const doorHeight = door.height / 100
  const frameThickness = 0.06 // 6cm frame
  const frameDepth = wall.thickness / 100 + 0.02
  const panelThickness = 0.04 // 4cm door panel
  const handleSize = 0.03

  // Position along wall (normalized 0-1) - position is already the center
  const positionAlongWall = door.position / wallLength

  // Calculate 3D position
  const doorCenterX = (wall.start.x + dx * positionAlongWall) / 100
  const doorCenterZ = (wall.start.y + dy * positionAlongWall) / 100
  const doorCenterY = doorHeight / 2 // Doors start at floor level

  const frameColor = isSelected ? COLORS.frameSelected : door.material.colorOverride || COLORS.frame
  const panelColor = isSelected ? COLORS.panelSelected : COLORS.panel

  // Door open angle in radians
  const openAngleRad = THREE.MathUtils.degToRad(door.isOpen ? door.openAngle : 0)

  // Determine hinge side based on openDirection
  const hingeOnLeft = door.openDirection === 'left' || door.openDirection === 'inward'
  const hingeX = hingeOnLeft ? -doorWidth / 2 + frameThickness : doorWidth / 2 - frameThickness
  const rotationSign = hingeOnLeft ? 1 : -1
  const swingDirection = door.openDirection === 'inward' || door.openDirection === 'left' ? 1 : -1

  // Is this a double door?
  const isDoubleDoor = door.type === 'double' || door.type === 'french'
  const isSlidingDoor = door.type === 'sliding'

  // Panel width for single vs double doors
  const panelWidth = isDoubleDoor ? (doorWidth - frameThickness * 2) / 2 - 0.01 : doorWidth - frameThickness * 2

  return (
    <group
      position={[doorCenterX, doorCenterY, doorCenterZ]}
      rotation={[0, -wallAngle, 0]}
    >
      {/* Frame - 3 pieces (top + 2 sides, no bottom) */}
      {/* Top frame */}
      <mesh position={[0, doorHeight / 2 - frameThickness / 2, 0]} castShadow>
        <boxGeometry args={[doorWidth, frameThickness, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} />
      </mesh>

      {/* Left frame */}
      <mesh position={[-doorWidth / 2 + frameThickness / 2, 0, 0]} castShadow>
        <boxGeometry args={[frameThickness, doorHeight - frameThickness, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} />
      </mesh>

      {/* Right frame */}
      <mesh position={[doorWidth / 2 - frameThickness / 2, 0, 0]} castShadow>
        <boxGeometry args={[frameThickness, doorHeight - frameThickness, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} />
      </mesh>

      {/* Door panel(s) */}
      {isSlidingDoor ? (
        // Sliding door - panels slide sideways, don't pivot
        <>
          {/* Fixed panel */}
          <mesh position={[-doorWidth / 4 + frameThickness / 2, 0, 0.01]} castShadow>
            <boxGeometry args={[panelWidth, doorHeight - frameThickness - 0.02, panelThickness]} />
            <meshStandardMaterial color={panelColor} roughness={0.6} />
          </mesh>
          {/* Sliding panel (offset when open) */}
          <mesh
            position={[
              doorWidth / 4 - frameThickness / 2 - (door.isOpen ? panelWidth * 0.7 : 0),
              0,
              -0.01
            ]}
            castShadow
          >
            <boxGeometry args={[panelWidth, doorHeight - frameThickness - 0.02, panelThickness]} />
            <meshStandardMaterial color={panelColor} roughness={0.6} />
          </mesh>
        </>
      ) : isDoubleDoor ? (
        // Double door - two panels that pivot from opposite sides
        <>
          {/* Left panel - pivots from left side */}
          <group position={[-doorWidth / 2 + frameThickness + 0.01, 0, 0]}>
            <group rotation={[0, openAngleRad * swingDirection, 0]}>
              <mesh position={[panelWidth / 2, 0, 0]} castShadow>
                <boxGeometry args={[panelWidth, doorHeight - frameThickness - 0.02, panelThickness]} />
                <meshStandardMaterial color={panelColor} roughness={0.6} />
              </mesh>
              {/* Left door handle */}
              <mesh position={[panelWidth - 0.06, 0, panelThickness / 2 + handleSize / 2]} castShadow>
                <boxGeometry args={[0.02, 0.12, handleSize]} />
                <meshStandardMaterial color={COLORS.handle} roughness={0.3} metalness={0.5} />
              </mesh>
            </group>
          </group>
          {/* Right panel - pivots from right side */}
          <group position={[doorWidth / 2 - frameThickness - 0.01, 0, 0]}>
            <group rotation={[0, -openAngleRad * swingDirection, 0]}>
              <mesh position={[-panelWidth / 2, 0, 0]} castShadow>
                <boxGeometry args={[panelWidth, doorHeight - frameThickness - 0.02, panelThickness]} />
                <meshStandardMaterial color={panelColor} roughness={0.6} />
              </mesh>
              {/* Right door handle */}
              <mesh position={[-panelWidth + 0.06, 0, panelThickness / 2 + handleSize / 2]} castShadow>
                <boxGeometry args={[0.02, 0.12, handleSize]} />
                <meshStandardMaterial color={COLORS.handle} roughness={0.3} metalness={0.5} />
              </mesh>
            </group>
          </group>
        </>
      ) : (
        // Single door - pivots from hinge side
        <group position={[hingeX, 0, 0]}>
          <group rotation={[0, openAngleRad * rotationSign * swingDirection, 0]}>
            <mesh
              position={[hingeOnLeft ? panelWidth / 2 : -panelWidth / 2, 0, 0]}
              castShadow
            >
              <boxGeometry args={[panelWidth, doorHeight - frameThickness - 0.02, panelThickness]} />
              <meshStandardMaterial color={panelColor} roughness={0.6} />
            </mesh>
            {/* Door handle */}
            <mesh
              position={[
                hingeOnLeft ? panelWidth - 0.06 : -panelWidth + 0.06,
                0,
                panelThickness / 2 + handleSize / 2
              ]}
              castShadow
            >
              <boxGeometry args={[0.02, 0.12, handleSize]} />
              <meshStandardMaterial color={COLORS.handle} roughness={0.3} metalness={0.5} />
            </mesh>
          </group>
        </group>
      )}

      {/* Door threshold/saddle */}
      <mesh position={[0, -doorHeight / 2 + 0.01, 0]} castShadow receiveShadow>
        <boxGeometry args={[doorWidth - frameThickness * 2, 0.02, frameDepth + 0.02]} />
        <meshStandardMaterial color={frameColor} roughness={0.8} />
      </mesh>
    </group>
  )
}
