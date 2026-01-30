import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment, PerspectiveCamera, Sky } from '@react-three/drei'
import * as THREE from 'three'
import { useFloorPlanStore, useEditorStore, useProjectStore } from '@/stores'
import type { Wall, Room, FurnitureInstance } from '@/models'
import { getPolygonFromWalls } from '@/services/geometry'
import { Window3D } from './Window3D'
import { Door3D } from './Door3D'
import { getFurnitureGenerator } from './furniture'

// Nordic color palette for 3D
const COLORS = {
  wall: '#F5F0E8',
  wallSelected: '#5B8A72',
  floor: '#E8E0D5',
  furniture: '#C4A77D',
  furnitureSelected: '#5B8A72',
  ground: '#FAF9F7',
  windowFrame: '#E8E0D5',
  windowGlass: '#87CEEB',
  doorFrame: '#D4C4B0',
  doorPanel: '#B8A082',
}

// Wall segment for rendering walls with cutouts
interface WallSegment {
  // Position along wall (0-1 normalized)
  startPos: number
  endPos: number
  // Vertical bounds (in cm from floor)
  bottomY: number
  topY: number
}

// Generate wall segments with gaps for openings
function generateWallSegments(wall: Wall): WallSegment[] {
  const openings = wall.openings

  if (openings.length === 0) {
    // No openings - return full wall
    return [{ startPos: 0, endPos: 1, bottomY: 0, topY: wall.height }]
  }

  const wallLength = Math.sqrt(
    Math.pow(wall.end.x - wall.start.x, 2) + Math.pow(wall.end.y - wall.start.y, 2)
  )

  // Sort openings by position along wall
  const sortedOpenings = [...openings].sort((a, b) => a.position - b.position)

  const segments: WallSegment[] = []

  // For each horizontal section between openings
  let currentPos = 0

  for (const opening of sortedOpenings) {
    // Position is the center of the opening, so calculate start/end symmetrically
    const openingStart = (opening.position - opening.width / 2) / wallLength
    const openingEnd = (opening.position + opening.width / 2) / wallLength
    const openingBottom = opening.elevationFromFloor
    const openingTop = opening.elevationFromFloor + opening.height

    // Segment before this opening (full height)
    if (openingStart > currentPos) {
      segments.push({
        startPos: currentPos,
        endPos: openingStart,
        bottomY: 0,
        topY: wall.height,
      })
    }

    // Segment below the opening
    if (openingBottom > 0) {
      segments.push({
        startPos: openingStart,
        endPos: openingEnd,
        bottomY: 0,
        topY: openingBottom,
      })
    }

    // Segment above the opening
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

  // Segment after the last opening (full height)
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

// Wall 3D component with support for openings (doors/windows)
function Wall3D({ wall, isSelected }: { wall: Wall; isSelected: boolean }) {
  const segments = useMemo(() => generateWallSegments(wall), [wall])

  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  const wallLength = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx)
  const thickness = wall.thickness / 100

  const color = isSelected
    ? COLORS.wallSelected
    : wall.material.colorOverride || COLORS.wall

  return (
    <group>
      {segments.map((segment, index) => {
        // Calculate segment dimensions in meters
        const segmentLength = (segment.endPos - segment.startPos) * wallLength / 100
        const segmentHeight = (segment.topY - segment.bottomY) / 100

        // Calculate center position along wall
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
            <meshStandardMaterial
              color={color}
              roughness={0.9}
              metalness={0}
            />
          </mesh>
        )
      })}
    </group>
  )
}

// Room floor 3D component
function Room3D({
  room,
  walls,
  isSelected,
}: {
  room: Room
  walls: Wall[]
  isSelected: boolean
}) {
  const geometry = useMemo(() => {
    const polygon = getPolygonFromWalls(walls, room.wallIds)
    if (polygon.length < 3) return null

    // Create shape from polygon
    const shape = new THREE.Shape()
    shape.moveTo(polygon[0].x / 100, polygon[0].y / 100)
    for (let i = 1; i < polygon.length; i++) {
      shape.lineTo(polygon[i].x / 100, polygon[i].y / 100)
    }
    shape.closePath()

    return new THREE.ShapeGeometry(shape)
  }, [room.wallIds, walls])

  if (!geometry) return null

  const floorColor = room.floorMaterial.colorOverride || COLORS.floor

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.002, 0]}
      receiveShadow
    >
      <meshStandardMaterial
        color={isSelected ? COLORS.furnitureSelected : floorColor}
        roughness={0.85}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// Floor 3D component (fallback when no rooms defined)
function Floor3D() {
  const walls = useFloorPlanStore((state) => state.floorPlan.walls)
  const rooms = useFloorPlanStore((state) => state.floorPlan.rooms)

  const bounds = useMemo(() => {
    if (walls.length === 0) {
      return { minX: -500, maxX: 500, minY: -500, maxY: 500 }
    }

    let minX = Infinity,
      maxX = -Infinity
    let minY = Infinity,
      maxY = -Infinity

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

  const width = (bounds.maxX - bounds.minX) / 100
  const depth = (bounds.maxY - bounds.minY) / 100
  const centerX = (bounds.minX + bounds.maxX) / 2 / 100
  const centerZ = (bounds.minY + bounds.maxY) / 2 / 100

  // Only show fallback floor if no rooms are defined
  if (walls.length === 0 || rooms.length > 0) return null

  return (
    <mesh
      position={[centerX, 0.001, centerZ]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial color={COLORS.floor} roughness={0.85} />
    </mesh>
  )
}

// Furniture 3D component with procedural models
function Furniture3D({
  furniture,
  isSelected,
}: {
  furniture: FurnitureInstance
  isSelected: boolean
}) {
  const position: [number, number, number] = [
    furniture.position.x / 100,
    0, // Position at floor level, generators handle their own Y positioning
    furniture.position.y / 100,
  ]

  const color = isSelected ? COLORS.furnitureSelected : COLORS.furniture

  // Get the appropriate generator for this furniture type
  const FurnitureGenerator = useMemo(
    () => getFurnitureGenerator(furniture.catalogItemId),
    [furniture.catalogItemId]
  )

  return (
    <group
      position={position}
      rotation={[0, THREE.MathUtils.degToRad(-furniture.rotation), 0]}
    >
      <FurnitureGenerator
        dimensions={furniture.dimensions}
        color={color}
      />
    </group>
  )
}

// Ground grid - subtle and elegant
function GroundGrid() {
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
}

// Ground plane for shadows
function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color={COLORS.ground} roughness={1} />
    </mesh>
  )
}

// Calculate sun position from time of day and azimuth
function calculateSunPosition(timeOfDay: number, azimuth: number): [number, number, number] {
  // Convert time to angle (6am = sunrise, 12 = noon, 18 = sunset)
  const hourAngle = ((timeOfDay - 12) / 12) * Math.PI

  // Calculate elevation (highest at noon)
  const elevation = Math.cos(hourAngle) * 0.8 + 0.2

  // Convert azimuth to radians
  const azimuthRad = (azimuth * Math.PI) / 180

  // Calculate position
  const distance = 100
  const x = distance * Math.cos(azimuthRad) * Math.cos(hourAngle * 0.5)
  const y = distance * Math.max(0.1, elevation)
  const z = distance * Math.sin(azimuthRad) * Math.cos(hourAngle * 0.5)

  return [x, y, z]
}

// Scene content
function SceneContent() {
  const walls = useFloorPlanStore((state) => state.floorPlan.walls)
  const rooms = useFloorPlanStore((state) => state.floorPlan.rooms)
  const furniture = useFloorPlanStore((state) => state.floorPlan.furniture)
  const windows = useFloorPlanStore((state) => state.floorPlan.windows)
  const doors = useFloorPlanStore((state) => state.floorPlan.doors)
  const selectedIds = useEditorStore((state) => state.selectedIds)
  const currentProject = useProjectStore((state) => state.currentProject)

  // Create a wall lookup for efficient access
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

  // Calculate sky inclination based on time of day
  const skyInclination = useMemo(() => {
    const hourAngle = ((sunSettings.timeOfDay - 12) / 12) * Math.PI
    return 0.5 - Math.cos(hourAngle) * 0.3
  }, [sunSettings.timeOfDay])

  return (
    <>
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={45} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2 - 0.05}
        target={[0, 0, 0]}
      />

      {/* Dynamic lighting based on sun settings */}
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
      <hemisphereLight
        color="#F5F8FF"
        groundColor="#E8E0D5"
        intensity={0.4}
      />

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
        <Room3D
          key={room.id}
          room={room}
          walls={walls}
          isSelected={selectedIds.includes(room.id)}
        />
      ))}

      {/* Walls */}
      {walls.map((wall) => (
        <Wall3D
          key={wall.id}
          wall={wall}
          isSelected={selectedIds.includes(wall.id)}
        />
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
        <Furniture3D
          key={f.id}
          furniture={f}
          isSelected={selectedIds.includes(f.id)}
        />
      ))}

      {/* Environment for subtle reflections */}
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
  return (
    <div className="w-full h-full" style={{ background: 'linear-gradient(to bottom, #F0EDE8, #FAF9F7)' }}>
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  )
}
