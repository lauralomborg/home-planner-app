import { memo, useMemo } from 'react'
import * as THREE from 'three'
import type { WindowInstance, Wall } from '@/models'
import { calculatePositionOnWall } from '@/services/geometry'
import { COLORS_3D, NORDIC_COLORS } from '@/constants/colors'

interface Window3DProps {
  window: WindowInstance
  wall: Wall
  isSelected: boolean
}

export const Window3D = memo(function Window3D({ window: windowInstance, wall, isSelected }: Window3DProps) {
  // Memoize all calculated values
  const {
    windowCenterX,
    windowCenterZ,
    windowCenterY,
    wallAngle,
    windowWidth,
    windowHeight,
    frameThickness,
    frameDepth,
    hasCenterDivider,
    hasSlidingDivider,
  } = useMemo(() => {
    // Calculate wall position using shared utility
    const { centerX, centerY, wallAngle } = calculatePositionOnWall(wall, windowInstance.position)

    // Window dimensions in meters
    const windowWidth = windowInstance.width / 100
    const windowHeight = windowInstance.height / 100
    const frameThickness = 0.05 // 5cm frame
    const frameDepth = wall.thickness / 100 + 0.02 // Slightly thicker than wall

    // Calculate 3D position (convert cm to meters)
    const windowCenterX = centerX / 100
    const windowCenterZ = centerY / 100
    const windowCenterY = (windowInstance.elevationFromFloor + windowInstance.height / 2) / 100

    // Determine if this is a divided window (double type has center divider)
    const hasCenterDivider = windowInstance.type === 'double'
    const hasSlidingDivider = windowInstance.type === 'sliding'

    return {
      windowCenterX,
      windowCenterZ,
      windowCenterY,
      wallAngle,
      windowWidth,
      windowHeight,
      frameThickness,
      frameDepth,
      hasCenterDivider,
      hasSlidingDivider,
    }
  }, [windowInstance, wall])

  const frameColor = isSelected ? NORDIC_COLORS.wallSelected : windowInstance.frameMaterial.colorOverride || COLORS_3D.windowFrame
  const glassOpacity = windowInstance.glassOpacity

  return (
    <group
      position={[windowCenterX, windowCenterY, windowCenterZ]}
      rotation={[0, -wallAngle, 0]}
    >
      {/* Frame - 4 pieces forming rectangle */}
      {/* Top frame */}
      <mesh position={[0, windowHeight / 2 - frameThickness / 2, 0]} castShadow>
        <boxGeometry args={[windowWidth, frameThickness, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} />
      </mesh>

      {/* Bottom frame */}
      <mesh position={[0, -windowHeight / 2 + frameThickness / 2, 0]} castShadow>
        <boxGeometry args={[windowWidth, frameThickness, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} />
      </mesh>

      {/* Left frame */}
      <mesh position={[-windowWidth / 2 + frameThickness / 2, 0, 0]} castShadow>
        <boxGeometry args={[frameThickness, windowHeight - frameThickness * 2, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} />
      </mesh>

      {/* Right frame */}
      <mesh position={[windowWidth / 2 - frameThickness / 2, 0, 0]} castShadow>
        <boxGeometry args={[frameThickness, windowHeight - frameThickness * 2, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} />
      </mesh>

      {/* Center vertical divider for double windows */}
      {hasCenterDivider && (
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[frameThickness * 0.6, windowHeight - frameThickness * 2, frameDepth]} />
          <meshStandardMaterial color={frameColor} roughness={0.7} />
        </mesh>
      )}

      {/* Horizontal center divider for sliding windows */}
      {hasSlidingDivider && (
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[windowWidth - frameThickness * 2, frameThickness * 0.6, frameDepth]} />
          <meshStandardMaterial color={frameColor} roughness={0.7} />
        </mesh>
      )}

      {/* Glass pane(s) */}
      {hasCenterDivider ? (
        <>
          {/* Left glass pane */}
          <mesh position={[-windowWidth / 4, 0, 0]}>
            <planeGeometry args={[
              windowWidth / 2 - frameThickness * 1.3,
              windowHeight - frameThickness * 2
            ]} />
            <meshStandardMaterial
              color={COLORS_3D.windowGlass}
              transparent
              opacity={glassOpacity}
              roughness={0.1}
              metalness={0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Right glass pane */}
          <mesh position={[windowWidth / 4, 0, 0]}>
            <planeGeometry args={[
              windowWidth / 2 - frameThickness * 1.3,
              windowHeight - frameThickness * 2
            ]} />
            <meshStandardMaterial
              color={COLORS_3D.windowGlass}
              transparent
              opacity={glassOpacity}
              roughness={0.1}
              metalness={0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      ) : hasSlidingDivider ? (
        <>
          {/* Top glass pane */}
          <mesh position={[0, windowHeight / 4, 0]}>
            <planeGeometry args={[
              windowWidth - frameThickness * 2,
              windowHeight / 2 - frameThickness * 1.3
            ]} />
            <meshStandardMaterial
              color={COLORS_3D.windowGlass}
              transparent
              opacity={glassOpacity}
              roughness={0.1}
              metalness={0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Bottom glass pane */}
          <mesh position={[0, -windowHeight / 4, 0]}>
            <planeGeometry args={[
              windowWidth - frameThickness * 2,
              windowHeight / 2 - frameThickness * 1.3
            ]} />
            <meshStandardMaterial
              color={COLORS_3D.windowGlass}
              transparent
              opacity={glassOpacity}
              roughness={0.1}
              metalness={0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      ) : (
        /* Single glass pane */
        <mesh>
          <planeGeometry args={[
            windowWidth - frameThickness * 2,
            windowHeight - frameThickness * 2
          ]} />
          <meshStandardMaterial
            color={COLORS_3D.windowGlass}
            transparent
            opacity={glassOpacity}
            roughness={0.1}
            metalness={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Window sill */}
      <mesh position={[0, -windowHeight / 2 - 0.02, frameDepth / 2 + 0.03]} castShadow>
        <boxGeometry args={[windowWidth + 0.04, 0.04, 0.1]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} />
      </mesh>
    </group>
  )
})
