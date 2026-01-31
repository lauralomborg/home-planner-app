import { useMemo, useCallback } from 'react'
import { Vector3, Raycaster, Mesh, BoxGeometry, MeshBasicMaterial } from 'three'
import type { Wall, DoorInstance } from '@/models'

const BODY_RADIUS = 0.3 // Collision radius in meters (30cm)
const BODY_HEIGHT = 1.7 // Eye height in meters
const RAY_COUNT = 8 // Number of rays to cast in a circle

interface CollisionResult {
  blocked: boolean
  slideDirection: Vector3 | null
}

export function useWalkthroughCollision(
  walls: Wall[],
  doors: DoorInstance[]
) {
  // Create collision meshes from walls (excluding door openings)
  const collisionMeshes = useMemo(() => {
    const meshes: Mesh[] = []
    const material = new MeshBasicMaterial({ visible: false })

    walls.forEach((wall) => {
      // Convert from cm to meters
      const startX = wall.start.x / 100
      const startZ = wall.start.y / 100 // 2D y becomes 3D z
      const endX = wall.end.x / 100
      const endZ = wall.end.y / 100
      const thickness = wall.thickness / 100
      const height = wall.height / 100

      // Calculate wall direction and length
      const dx = endX - startX
      const dz = endZ - startZ
      const length = Math.sqrt(dx * dx + dz * dz)

      if (length < 0.01) return // Skip zero-length walls

      const angle = Math.atan2(dz, dx)

      // Get door openings on this wall (converted to meters)
      const doorOpenings = doors
        .filter((door) => door.wallId === wall.id && door.isOpen)
        .map((door) => ({
          start: door.position / 100,
          end: (door.position + door.width) / 100,
        }))

      // Sort openings by position
      doorOpenings.sort((a, b) => a.start - b.start)

      // Create wall segments around door openings
      const segments: { start: number; end: number }[] = []
      let currentPos = 0

      doorOpenings.forEach((opening) => {
        if (opening.start > currentPos) {
          segments.push({ start: currentPos, end: opening.start })
        }
        currentPos = opening.end
      })

      // Add final segment
      if (currentPos < length) {
        segments.push({ start: currentPos, end: length })
      }

      // If no doors, use full wall
      if (segments.length === 0) {
        segments.push({ start: 0, end: length })
      }

      // Create mesh for each segment
      segments.forEach((segment) => {
        const segmentLength = segment.end - segment.start
        if (segmentLength < 0.01) return

        const geometry = new BoxGeometry(segmentLength, height, thickness)
        const mesh = new Mesh(geometry, material)

        // Position at segment center
        const segmentCenter = segment.start + segmentLength / 2
        const centerX = startX + Math.cos(angle) * segmentCenter
        const centerZ = startZ + Math.sin(angle) * segmentCenter

        mesh.position.set(centerX, height / 2, centerZ)
        mesh.rotation.y = -angle

        meshes.push(mesh)
      })
    })

    return meshes
  }, [walls, doors])

  // Check collision at a given position
  const checkCollision = useCallback(
    (position: Vector3, direction: Vector3): CollisionResult => {
      if (collisionMeshes.length === 0) {
        return { blocked: false, slideDirection: null }
      }

      const raycaster = new Raycaster()
      const normalizedDir = direction.clone().normalize()

      // Cast rays at body height
      const rayOrigin = new Vector3(position.x, BODY_HEIGHT * 0.5, position.z)

      // Check primary direction
      raycaster.set(rayOrigin, normalizedDir)
      raycaster.far = BODY_RADIUS + 0.1

      const intersects = raycaster.intersectObjects(collisionMeshes)
      if (intersects.length > 0 && intersects[0].distance < BODY_RADIUS) {
        // Try to find slide direction
        const hitNormal = intersects[0].face?.normal?.clone()
        if (hitNormal) {
          // Transform normal to world space
          hitNormal.applyQuaternion(intersects[0].object.quaternion)
          hitNormal.y = 0
          hitNormal.normalize()

          // Calculate slide direction (perpendicular to normal, in movement direction)
          const dot = normalizedDir.dot(hitNormal)
          const slideDir = normalizedDir.clone().sub(hitNormal.multiplyScalar(dot))
          slideDir.y = 0

          if (slideDir.length() > 0.1) {
            slideDir.normalize()
            return { blocked: true, slideDirection: slideDir }
          }
        }

        return { blocked: true, slideDirection: null }
      }

      return { blocked: false, slideDirection: null }
    },
    [collisionMeshes]
  )

  // Constrain movement based on collisions
  const constrainMovement = useCallback(
    (currentPos: Vector3, desiredPos: Vector3): Vector3 => {
      const direction = new Vector3().subVectors(desiredPos, currentPos)

      if (direction.length() < 0.001) {
        return currentPos.clone()
      }

      const result = checkCollision(currentPos, direction)

      if (!result.blocked) {
        return desiredPos.clone()
      }

      // Try sliding along the wall
      if (result.slideDirection) {
        const slideDistance = direction.length() * 0.8
        const slidePos = currentPos
          .clone()
          .add(result.slideDirection.multiplyScalar(slideDistance))

        // Check if slide position is valid
        const slideResult = checkCollision(
          currentPos,
          new Vector3().subVectors(slidePos, currentPos)
        )

        if (!slideResult.blocked) {
          return slidePos
        }
      }

      // Blocked, stay in place
      return currentPos.clone()
    },
    [checkCollision]
  )

  // Check if a position is inside a room (not blocked)
  const isValidPosition = useCallback(
    (position: Vector3): boolean => {
      // Cast rays in all directions to check for nearby walls
      const rayOrigin = new Vector3(position.x, BODY_HEIGHT * 0.5, position.z)
      const raycaster = new Raycaster()

      for (let i = 0; i < RAY_COUNT; i++) {
        const angle = (i / RAY_COUNT) * Math.PI * 2
        const direction = new Vector3(Math.cos(angle), 0, Math.sin(angle))

        raycaster.set(rayOrigin, direction)
        raycaster.far = BODY_RADIUS

        const intersects = raycaster.intersectObjects(collisionMeshes)
        if (intersects.length > 0 && intersects[0].distance < BODY_RADIUS * 0.5) {
          return false
        }
      }

      return true
    },
    [collisionMeshes]
  )

  return {
    constrainMovement,
    isValidPosition,
    checkCollision,
  }
}
