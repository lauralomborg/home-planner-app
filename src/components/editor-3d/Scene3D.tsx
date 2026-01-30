import { Suspense, useRef, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment, PerspectiveCamera, Sky } from '@react-three/drei'
import * as THREE from 'three'
import { useFloorPlanStore, useEditorStore } from '@/stores'
import type { Wall, FurnitureInstance } from '@/models'

// Nordic color palette for 3D
const COLORS = {
  wall: '#F5F0E8',
  wallSelected: '#5B8A72',
  floor: '#E8E0D5',
  furniture: '#C4A77D',
  furnitureSelected: '#5B8A72',
  ground: '#FAF9F7',
}

// Wall 3D component
function Wall3D({ wall, isSelected }: { wall: Wall; isSelected: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)

  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  const length = Math.sqrt(dx * dx + dy * dy) / 100
  const angle = Math.atan2(dy, dx)
  const height = wall.height / 100
  const thickness = wall.thickness / 100

  const centerX = (wall.start.x + wall.end.x) / 2 / 100
  const centerZ = (wall.start.y + wall.end.y) / 2 / 100
  const centerY = height / 2

  const color = isSelected
    ? COLORS.wallSelected
    : wall.material.colorOverride || COLORS.wall

  return (
    <mesh
      ref={meshRef}
      position={[centerX, centerY, centerZ]}
      rotation={[0, -angle, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[length, height, thickness]} />
      <meshStandardMaterial
        color={color}
        roughness={0.9}
        metalness={0}
      />
    </mesh>
  )
}

// Floor 3D component
function Floor3D() {
  const walls = useFloorPlanStore((state) => state.floorPlan.walls)

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

  if (walls.length === 0) return null

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

// Furniture 3D component
function Furniture3D({
  furniture,
  isSelected,
}: {
  furniture: FurnitureInstance
  isSelected: boolean
}) {
  const { width, height, depth } = furniture.dimensions
  const position: [number, number, number] = [
    furniture.position.x / 100,
    height / 200,
    furniture.position.y / 100,
  ]

  const color = isSelected ? COLORS.furnitureSelected : COLORS.furniture

  return (
    <mesh
      position={position}
      rotation={[0, THREE.MathUtils.degToRad(-furniture.rotation), 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[width / 100, height / 100, depth / 100]} />
      <meshStandardMaterial color={color} roughness={0.7} metalness={0} />
    </mesh>
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

// Scene content
function SceneContent() {
  const walls = useFloorPlanStore((state) => state.floorPlan.walls)
  const furniture = useFloorPlanStore((state) => state.floorPlan.furniture)
  const selectedIds = useEditorStore((state) => state.selectedIds)

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

      {/* Soft Nordic lighting */}
      <ambientLight intensity={0.6} color="#FFF8F0" />
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
      <hemisphereLight
        color="#F5F8FF"
        groundColor="#E8E0D5"
        intensity={0.4}
      />

      {/* Subtle sky */}
      <Sky
        distance={450000}
        sunPosition={[100, 50, 100]}
        inclination={0.6}
        azimuth={0.25}
        rayleigh={0.5}
        turbidity={8}
      />

      {/* Ground */}
      <GroundPlane />
      <GroundGrid />
      <Floor3D />

      {/* Walls */}
      {walls.map((wall) => (
        <Wall3D
          key={wall.id}
          wall={wall}
          isSelected={selectedIds.includes(wall.id)}
        />
      ))}

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
