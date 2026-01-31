import { Suspense, useMemo, useState, useCallback, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, PerspectiveCamera, Sky } from '@react-three/drei'
import * as THREE from 'three'
import { useFloorPlanStore, useEditorStore, useProjectStore } from '@/stores'
import { useCamera3DMode, useWalkthroughPosition } from '@/stores/useEditorStore'
import type { Wall } from '@/models'

// Import extracted components
import { HybridCameraControls } from './controls'
import { Wall3D } from './Wall3D'
import { Room3D } from './Room3D'
import { Furniture3D } from './Furniture3D'
import { GroundPlane, GroundGrid, Floor3D } from './GroundPlane'
import { Window3D } from './Window3D'
import { Door3D } from './Door3D'
import { WalkthroughController, WalkthroughOverlay } from './WalkthroughController'

// Calculate sun position from time of day and azimuth
function calculateSunPosition(timeOfDay: number, azimuth: number): [number, number, number] {
  const hourAngle = ((timeOfDay - 12) / 12) * Math.PI
  const elevation = Math.cos(hourAngle) * 0.8 + 0.2
  const azimuthRad = (azimuth * Math.PI) / 180
  const distance = 100
  const x = distance * Math.cos(azimuthRad) * Math.cos(hourAngle * 0.5)
  const y = distance * Math.max(0.1, elevation)
  const z = distance * Math.sin(azimuthRad) * Math.cos(hourAngle * 0.5)
  return [x, y, z]
}

// Scene content
function SceneContent({ onExitWalkthrough }: { onExitWalkthrough: () => void }) {
  const walls = useFloorPlanStore((state) => state.floorPlan.walls)
  const rooms = useFloorPlanStore((state) => state.floorPlan.rooms)
  const furniture = useFloorPlanStore((state) => state.floorPlan.furniture)
  const windows = useFloorPlanStore((state) => state.floorPlan.windows)
  const doors = useFloorPlanStore((state) => state.floorPlan.doors)
  const selectedIds = useEditorStore((state) => state.selectedIds)
  const currentProject = useProjectStore((state) => state.currentProject)

  const cameraMode = useCamera3DMode()
  const walkthroughPosition = useWalkthroughPosition()

  const wallsById = useMemo(() => {
    const map = new Map<string, Wall>()
    walls.forEach((wall) => map.set(wall.id, wall))
    return map
  }, [walls])

  const sunSettings = currentProject?.settings.sunSettings ?? {
    enabled: true,
    timeOfDay: 12,
    azimuth: 180,
    intensity: 1,
    color: '#ffffff',
  }

  const sunPosition = useMemo(
    () => calculateSunPosition(sunSettings.timeOfDay, sunSettings.azimuth),
    [sunSettings.timeOfDay, sunSettings.azimuth]
  )

  const skyInclination = useMemo(() => {
    const hourAngle = ((sunSettings.timeOfDay - 12) / 12) * Math.PI
    return 0.5 - Math.cos(hourAngle) * 0.3
  }, [sunSettings.timeOfDay])

  return (
    <>
      {/* Camera */}
      {cameraMode === 'orbit' && <HybridCameraControls />}
      {cameraMode === 'walkthrough' && (
        <>
          <PerspectiveCamera makeDefault fov={75} />
          <WalkthroughController
            onExit={onExitWalkthrough}
            initialPosition={walkthroughPosition ?? undefined}
          />
        </>
      )}

      {/* Dynamic lighting */}
      <ambientLight
        intensity={sunSettings.enabled ? 0.4 + (1 - Math.abs(sunSettings.timeOfDay - 12) / 12) * 0.3 : 0.6}
        color={sunSettings.enabled ? sunSettings.color : "#FFF8F0"}
      />
      {sunSettings.enabled && (
        <directionalLight
          position={sunPosition}
          intensity={sunSettings.intensity}
          color={sunSettings.color}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={60}
          shadow-camera-left={-25}
          shadow-camera-right={25}
          shadow-camera-top={25}
          shadow-camera-bottom={-25}
          shadow-bias={-0.0001}
        />
      )}
      {!sunSettings.enabled && (
        <directionalLight
          position={[15, 25, 15]}
          intensity={1.2}
          color="#FFFAF5"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={60}
          shadow-camera-left={-25}
          shadow-camera-right={25}
          shadow-camera-top={25}
          shadow-camera-bottom={-25}
          shadow-bias={-0.0001}
        />
      )}
      <hemisphereLight color="#F5F8FF" groundColor="#E8E0D5" intensity={0.4} />

      {/* Dynamic sky */}
      <Sky
        distance={450000}
        sunPosition={sunSettings.enabled ? sunPosition : [100, 50, 100]}
        inclination={sunSettings.enabled ? skyInclination : 0.6}
        azimuth={sunSettings.enabled ? sunSettings.azimuth / 360 : 0.25}
        rayleigh={sunSettings.enabled ? 0.5 : 0.5}
        turbidity={8}
      />

      {/* Ground */}
      <GroundPlane />
      <GroundGrid />
      <Floor3D />

      {/* Room floors */}
      {rooms.map((room) => (
        <Room3D key={room.id} room={room} isSelected={selectedIds.includes(room.id)} />
      ))}

      {/* Walls */}
      {walls.map((wall) => (
        <Wall3D key={wall.id} wall={wall} isSelected={selectedIds.includes(wall.id)} />
      ))}

      {/* Windows */}
      {windows.map((window) => {
        const wall = wallsById.get(window.wallId)
        if (!wall) return null
        return (
          <Window3D
            key={window.id}
            window={window}
            wall={wall}
            isSelected={selectedIds.includes(window.id)}
          />
        )
      })}

      {/* Doors */}
      {doors.map((door) => {
        const wall = wallsById.get(door.wallId)
        if (!wall) return null
        return (
          <Door3D
            key={door.id}
            door={door}
            wall={wall}
            isSelected={selectedIds.includes(door.id)}
          />
        )
      })}

      {/* Furniture */}
      {furniture.map((f) => (
        <Furniture3D key={f.id} furniture={f} isSelected={selectedIds.includes(f.id)} />
      ))}

      {/* Environment */}
      <Environment preset="apartment" background={false} />
    </>
  )
}

// Loading fallback
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#E8E0D5" />
    </mesh>
  )
}

export function Scene3D() {
  const cameraMode = useCamera3DMode()
  const setCamera3DMode = useEditorStore((state) => state.setCamera3DMode)
  const [isPointerLocked, setIsPointerLocked] = useState(false)

  const handlePointerLockChange = useCallback(() => {
    setIsPointerLocked(document.pointerLockElement !== null)
  }, [])

  useEffect(() => {
    document.addEventListener('pointerlockchange', handlePointerLockChange)
    return () => document.removeEventListener('pointerlockchange', handlePointerLockChange)
  }, [handlePointerLockChange])

  const handleExitWalkthrough = useCallback(() => {
    setCamera3DMode('orbit')
    setIsPointerLocked(false)
  }, [setCamera3DMode])

  const handleClickToStart = useCallback(() => {
    // The PointerLockControls will handle the actual lock when clicked inside canvas
  }, [])

  return (
    <div className="w-full h-full relative" style={{ background: 'linear-gradient(to bottom, #F0EDE8, #FAF9F7)' }}>
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <SceneContent onExitWalkthrough={handleExitWalkthrough} />
        </Suspense>
      </Canvas>

      {cameraMode === 'walkthrough' && (
        <WalkthroughOverlay
          isLocked={isPointerLocked}
          onClickToStart={handleClickToStart}
        />
      )}
    </div>
  )
}
