import { useRef, useCallback, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { useCameraHeightCommand } from '@/stores/useEditorStore'

// Constants for camera controls
const MIN_CAMERA_HEIGHT = 0.5 // Minimum height above ground (meters)
const MOUSE_SENSITIVITY = 0.003
const MOVE_SPEED = 0.15
const ZOOM_SPEED = 0.5
const MAX_PITCH = Math.PI / 2 - 0.1 // Prevent looking straight up/down

export function HybridCameraControls() {
  const { camera, gl } = useThree()
  const isDragging = useRef(false)
  const previousMousePosition = useRef({ x: 0, y: 0 })
  const heightCommand = useCameraHeightCommand()
  const lastHeightCommand = useRef<'up' | 'down' | null>(null)

  // Euler angles for camera rotation
  const yaw = useRef(Math.PI / 4) // Initial yaw (looking at origin from [10,10,10])
  const pitch = useRef(-Math.PI / 6) // Initial pitch (looking down slightly)

  // Key state for movement
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  })

  // Initialize camera position and rotation
  useEffect(() => {
    camera.position.set(10, 10, 10)
    updateCameraRotation()
  }, [camera])

  // Update camera rotation from yaw/pitch
  const updateCameraRotation = useCallback(() => {
    // Create rotation from yaw and pitch
    const euler = new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ')
    camera.quaternion.setFromEuler(euler)
  }, [camera])

  // Mouse handlers for first-person look
  useEffect(() => {
    const canvas = gl.domElement

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) { // Left mouse button
        isDragging.current = true
        previousMousePosition.current = { x: e.clientX, y: e.clientY }
        canvas.style.cursor = 'grabbing'
      }
    }

    const handleMouseUp = () => {
      isDragging.current = false
      canvas.style.cursor = 'grab'
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return

      const deltaX = e.clientX - previousMousePosition.current.x
      const deltaY = e.clientY - previousMousePosition.current.y

      // Update yaw (horizontal) and pitch (vertical)
      yaw.current -= deltaX * MOUSE_SENSITIVITY
      pitch.current -= deltaY * MOUSE_SENSITIVITY

      // Clamp pitch to prevent flipping
      pitch.current = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch.current))

      updateCameraRotation()

      previousMousePosition.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseLeave = () => {
      isDragging.current = false
      canvas.style.cursor = 'grab'
    }

    // Scroll for zoom (move forward/backward)
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()

      const direction = new THREE.Vector3()
      camera.getWorldDirection(direction)

      const zoomDelta = -e.deltaY * 0.01 * ZOOM_SPEED
      camera.position.addScaledVector(direction, zoomDelta)

      // Enforce ground constraint
      if (camera.position.y < MIN_CAMERA_HEIGHT) {
        camera.position.y = MIN_CAMERA_HEIGHT
      }
    }

    canvas.style.cursor = 'grab'
    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)
    canvas.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
      canvas.removeEventListener('wheel', handleWheel)
    }
  }, [camera, gl, updateCameraRotation])

  // Keyboard handlers for WASD movement and Q/E orbit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

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
        case 'KeyQ':
          keys.current.down = true
          break
        case 'KeyE':
          keys.current.up = true
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
        case 'KeyQ':
          keys.current.down = false
          break
        case 'KeyE':
          keys.current.up = false
          break
      }
    }

    const handleBlur = () => {
      keys.current = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        up: false,
        down: false,
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
  }, [])

  // Apply movement and orbit each frame
  useFrame(() => {
    const { forward, backward, left, right, up, down } = keys.current

    // Handle height command from UI buttons
    if (heightCommand && heightCommand !== lastHeightCommand.current) {
      const heightDelta = heightCommand === 'up' ? 1 : -1
      camera.position.y += heightDelta

      // Enforce ground constraint
      if (camera.position.y < MIN_CAMERA_HEIGHT) {
        camera.position.y = MIN_CAMERA_HEIGHT
      }
      lastHeightCommand.current = heightCommand
    } else if (!heightCommand) {
      lastHeightCommand.current = null
    }

    // WASD Movement (relative to camera facing direction) + Q/E for up/down
    if (forward || backward || left || right || up || down) {
      const direction = new THREE.Vector3()
      camera.getWorldDirection(direction)
      direction.y = 0
      direction.normalize()

      const rightDir = new THREE.Vector3()
      rightDir.crossVectors(direction, new THREE.Vector3(0, 1, 0))
      rightDir.normalize()

      const delta = new THREE.Vector3()
      if (forward) delta.add(direction.clone().multiplyScalar(MOVE_SPEED))
      if (backward) delta.add(direction.clone().multiplyScalar(-MOVE_SPEED))
      if (left) delta.add(rightDir.clone().multiplyScalar(-MOVE_SPEED))
      if (right) delta.add(rightDir.clone().multiplyScalar(MOVE_SPEED))
      if (up) delta.y += MOVE_SPEED
      if (down) delta.y -= MOVE_SPEED

      camera.position.add(delta)

      // Enforce ground constraint
      if (camera.position.y < MIN_CAMERA_HEIGHT) {
        camera.position.y = MIN_CAMERA_HEIGHT
      }
    }
  })

  return <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={45} />
}
