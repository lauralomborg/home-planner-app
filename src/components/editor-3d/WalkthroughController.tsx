import { useRef, useEffect, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import { Vector3 } from 'three'
import type { PointerLockControls as PointerLockControlsImpl } from 'three-stdlib'
import { useWalkthroughCollision } from './hooks/useWalkthroughCollision'
import { useFloorPlanStore } from '@/stores/useFloorPlanStore'
import { useEditorStore } from '@/stores/useEditorStore'

const EYE_HEIGHT = 1.7 // 170cm in meters
const WALK_SPEED = 3.0 // meters per second
const RUN_SPEED = 6.0 // meters per second when holding Shift

interface KeyState {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  shift: boolean
}

interface WalkthroughControllerProps {
  onExit: () => void
  initialPosition?: { x: number; y: number; z: number }
}

export function WalkthroughController({
  onExit,
  initialPosition,
}: WalkthroughControllerProps) {
  const controlsRef = useRef<PointerLockControlsImpl>(null)
  const { camera } = useThree()
  const [isLocked, setIsLocked] = useState(false)

  // Get floor plan data for collision detection
  const walls = useFloorPlanStore((state) => state.floorPlan.walls)
  const doors = useFloorPlanStore((state) => state.floorPlan.doors)

  // Set up collision detection
  const { constrainMovement, isValidPosition } = useWalkthroughCollision(walls, doors)

  // Store walkthrough position when exiting
  const setWalkthroughPosition = useEditorStore((state) => state.setWalkthroughPosition)

  // Track key state
  const keys = useRef<KeyState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    shift: false,
  })

  // Set initial camera position
  useEffect(() => {
    if (initialPosition) {
      camera.position.set(initialPosition.x, EYE_HEIGHT, initialPosition.z)
    } else {
      // Default position: find a valid spawn point
      const testPos = new Vector3(0, EYE_HEIGHT, 0)
      if (isValidPosition(testPos)) {
        camera.position.set(0, EYE_HEIGHT, 0)
      } else {
        // Try to find a valid position by scanning
        for (let x = -5; x <= 5; x += 1) {
          for (let z = -5; z <= 5; z += 1) {
            testPos.set(x, EYE_HEIGHT, z)
            if (isValidPosition(testPos)) {
              camera.position.set(x, EYE_HEIGHT, z)
              break
            }
          }
        }
      }
    }
  }, [camera, initialPosition, isValidPosition])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLocked) return

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = true
          break
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = true
          break
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = true
          break
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = true
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          keys.current.shift = true
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = false
          break
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = false
          break
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = false
          break
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = false
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          keys.current.shift = false
          break
      }
    }

    const handleBlur = () => {
      keys.current = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        shift: false,
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [isLocked])

  // Handle lock/unlock
  const handleLock = useCallback(() => {
    setIsLocked(true)
  }, [])

  const handleUnlock = useCallback(() => {
    setIsLocked(false)
    // Save position for next time
    setWalkthroughPosition({
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    })
    // Exit walkthrough mode
    onExit()
  }, [camera, setWalkthroughPosition, onExit])

  // Apply movement on each frame
  useFrame((_, delta) => {
    if (!isLocked || !controlsRef.current) return

    const { forward, backward, left, right, shift } = keys.current

    // Skip if no movement
    if (!forward && !backward && !left && !right) return

    const speed = shift ? RUN_SPEED : WALK_SPEED
    const moveDistance = speed * delta

    // Get camera direction vectors
    const direction = new Vector3()
    camera.getWorldDirection(direction)
    direction.y = 0
    direction.normalize()

    const right3D = new Vector3()
    right3D.crossVectors(direction, new Vector3(0, 1, 0))
    right3D.normalize()

    // Calculate desired movement
    const movement = new Vector3()
    if (forward) movement.add(direction)
    if (backward) movement.sub(direction)
    if (left) movement.sub(right3D)
    if (right) movement.add(right3D)

    if (movement.length() > 0) {
      movement.normalize().multiplyScalar(moveDistance)

      const currentPos = camera.position.clone()
      const desiredPos = currentPos.clone().add(movement)

      // Apply collision detection
      const constrainedPos = constrainMovement(currentPos, desiredPos)

      // Keep at eye height
      constrainedPos.y = EYE_HEIGHT

      camera.position.copy(constrainedPos)
    }
  })

  return (
    <PointerLockControls
      ref={controlsRef}
      onLock={handleLock}
      onUnlock={handleUnlock}
    />
  )
}

// Overlay component for walkthrough mode UI hints
export function WalkthroughOverlay({
  isLocked,
  onClickToStart,
}: {
  isLocked: boolean
  onClickToStart: () => void
}) {
  if (isLocked) {
    // Show exit hint when locked
    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-lg text-sm pointer-events-none">
        Press <kbd className="bg-white/20 px-2 py-0.5 rounded mx-1">ESC</kbd> to exit walkthrough
      </div>
    )
  }

  // Show click to enter prompt
  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
      onClick={onClickToStart}
    >
      <div className="bg-white rounded-xl p-8 text-center shadow-2xl max-w-md">
        <h3 className="text-xl font-semibold mb-3 text-gray-900">Walkthrough Mode</h3>
        <p className="text-gray-600 mb-4">
          Experience your floor plan from a human perspective.
        </p>
        <div className="text-sm text-gray-500 space-y-1 mb-6">
          <p>
            <kbd className="bg-gray-100 px-2 py-0.5 rounded">W A S D</kbd> or arrow keys to move
          </p>
          <p>Move mouse to look around</p>
          <p>
            Hold <kbd className="bg-gray-100 px-2 py-0.5 rounded">Shift</kbd> to run
          </p>
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
          Click to Enter
        </button>
      </div>
    </div>
  )
}
