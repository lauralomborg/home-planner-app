import type { Dimensions3D } from '@/models'

interface FurnitureGeneratorProps {
  dimensions: Dimensions3D
  color: string
}

// Nordic color palette for furniture parts
const WOOD_DARK = '#8B7355'
const WOOD_LIGHT = '#C4A77D'
const METAL = '#9A9A9A'

// ============================================
// Sofa Generator
// ============================================
export function SofaGenerator({ dimensions, color }: FurnitureGeneratorProps) {
  const { width, height, depth } = dimensions
  const w = width / 100
  const h = height / 100
  const d = depth / 100

  const seatHeight = h * 0.4
  const backHeight = h * 0.6
  const armWidth = w * 0.12
  const legHeight = h * 0.08
  const cushionDepth = d * 0.7

  return (
    <group>
      {/* Base/frame */}
      <mesh position={[0, seatHeight / 2 + legHeight, 0]} castShadow receiveShadow>
        <boxGeometry args={[w - armWidth * 2, seatHeight * 0.3, d]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
      </mesh>

      {/* Seat cushion */}
      <mesh position={[0, seatHeight + legHeight, d * 0.1]} castShadow receiveShadow>
        <boxGeometry args={[w - armWidth * 2 - 0.02, seatHeight * 0.4, cushionDepth]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>

      {/* Back cushion */}
      <mesh position={[0, seatHeight + backHeight / 2 + legHeight, -d / 2 + d * 0.15]} castShadow receiveShadow>
        <boxGeometry args={[w - armWidth * 2 - 0.02, backHeight, d * 0.25]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>

      {/* Left arm */}
      <mesh position={[-w / 2 + armWidth / 2, seatHeight / 2 + backHeight / 4 + legHeight, 0]} castShadow>
        <boxGeometry args={[armWidth, seatHeight + backHeight / 2, d]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>

      {/* Right arm */}
      <mesh position={[w / 2 - armWidth / 2, seatHeight / 2 + backHeight / 4 + legHeight, 0]} castShadow>
        <boxGeometry args={[armWidth, seatHeight + backHeight / 2, d]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>

      {/* Legs */}
      {[
        [-w / 2 + 0.05, legHeight / 2, -d / 2 + 0.05],
        [w / 2 - 0.05, legHeight / 2, -d / 2 + 0.05],
        [-w / 2 + 0.05, legHeight / 2, d / 2 - 0.05],
        [w / 2 - 0.05, legHeight / 2, d / 2 - 0.05],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, legHeight, 8]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

// ============================================
// Table Generator
// ============================================
export function TableGenerator({ dimensions, color }: FurnitureGeneratorProps) {
  const { width, height, depth } = dimensions
  const w = width / 100
  const h = height / 100
  const d = depth / 100

  const topThickness = 0.03
  const legWidth = 0.04
  const legInset = 0.05

  return (
    <group>
      {/* Table top */}
      <mesh position={[0, h - topThickness / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, topThickness, d]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>

      {/* 4 Legs */}
      {[
        [-w / 2 + legInset, (h - topThickness) / 2, -d / 2 + legInset],
        [w / 2 - legInset, (h - topThickness) / 2, -d / 2 + legInset],
        [-w / 2 + legInset, (h - topThickness) / 2, d / 2 - legInset],
        [w / 2 - legInset, (h - topThickness) / 2, d / 2 - legInset],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <boxGeometry args={[legWidth, h - topThickness, legWidth]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

// ============================================
// Chair Generator
// ============================================
export function ChairGenerator({ dimensions, color }: FurnitureGeneratorProps) {
  const { width, height, depth } = dimensions
  const w = width / 100
  const h = height / 100
  const d = depth / 100

  const seatHeight = h * 0.45
  const seatThickness = 0.04
  const backHeight = h * 0.55
  const legWidth = 0.03
  const legInset = 0.03

  return (
    <group>
      {/* Seat */}
      <mesh position={[0, seatHeight, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, seatThickness, d]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>

      {/* Backrest */}
      <mesh position={[0, seatHeight + backHeight / 2 + seatThickness / 2, -d / 2 + 0.02]} castShadow>
        <boxGeometry args={[w * 0.9, backHeight, 0.03]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>

      {/* 4 Legs */}
      {[
        [-w / 2 + legInset, seatHeight / 2, -d / 2 + legInset],
        [w / 2 - legInset, seatHeight / 2, -d / 2 + legInset],
        [-w / 2 + legInset, seatHeight / 2, d / 2 - legInset],
        [w / 2 - legInset, seatHeight / 2, d / 2 - legInset],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <boxGeometry args={[legWidth, seatHeight, legWidth]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

// ============================================
// Bed Generator
// ============================================
export function BedGenerator({ dimensions, color }: FurnitureGeneratorProps) {
  const { width, height, depth } = dimensions
  const w = width / 100
  const h = height / 100
  const d = depth / 100

  const frameHeight = h * 0.35
  const mattressHeight = h * 0.35
  const headboardHeight = h * 0.3
  const legHeight = 0.1

  return (
    <group>
      {/* Bed frame */}
      <mesh position={[0, legHeight + frameHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, frameHeight, d]} />
        <meshStandardMaterial color={WOOD_LIGHT} roughness={0.7} />
      </mesh>

      {/* Mattress */}
      <mesh position={[0, legHeight + frameHeight + mattressHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w - 0.04, mattressHeight, d - 0.04]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>

      {/* Headboard */}
      <mesh position={[0, legHeight + frameHeight + mattressHeight + headboardHeight / 2, -d / 2 + 0.03]} castShadow>
        <boxGeometry args={[w, headboardHeight, 0.06]} />
        <meshStandardMaterial color={WOOD_LIGHT} roughness={0.7} />
      </mesh>

      {/* Pillow(s) */}
      <mesh position={[-w / 4, legHeight + frameHeight + mattressHeight + 0.08, -d / 2 + 0.3]} castShadow>
        <boxGeometry args={[w * 0.35, 0.12, 0.4]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.95} />
      </mesh>
      <mesh position={[w / 4, legHeight + frameHeight + mattressHeight + 0.08, -d / 2 + 0.3]} castShadow>
        <boxGeometry args={[w * 0.35, 0.12, 0.4]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.95} />
      </mesh>

      {/* Legs */}
      {[
        [-w / 2 + 0.05, legHeight / 2, -d / 2 + 0.05],
        [w / 2 - 0.05, legHeight / 2, -d / 2 + 0.05],
        [-w / 2 + 0.05, legHeight / 2, d / 2 - 0.05],
        [w / 2 - 0.05, legHeight / 2, d / 2 - 0.05],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, legHeight, 8]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

// ============================================
// Bookshelf Generator
// ============================================
export function BookshelfGenerator({ dimensions, color }: FurnitureGeneratorProps) {
  const { width, height, depth } = dimensions
  const w = width / 100
  const h = height / 100
  const d = depth / 100

  const panelThickness = 0.02
  const shelfCount = Math.max(2, Math.floor(h / 0.4))
  const shelfSpacing = h / shelfCount

  return (
    <group>
      {/* Back panel */}
      <mesh position={[0, h / 2, -d / 2 + panelThickness / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, h, panelThickness]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>

      {/* Left side */}
      <mesh position={[-w / 2 + panelThickness / 2, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[panelThickness, h, d]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>

      {/* Right side */}
      <mesh position={[w / 2 - panelThickness / 2, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[panelThickness, h, d]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>

      {/* Shelves (including top and bottom) */}
      {Array.from({ length: shelfCount + 1 }).map((_, i) => (
        <mesh key={i} position={[0, i * shelfSpacing + panelThickness / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w - panelThickness * 2, panelThickness, d]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      ))}

      {/* Some decorative books on shelves */}
      {Array.from({ length: shelfCount }).map((_, shelfIndex) => (
        <group key={`books-${shelfIndex}`}>
          {Array.from({ length: Math.floor(Math.random() * 4) + 3 }).map((_, bookIndex) => {
            const bookHeight = 0.15 + Math.random() * 0.1
            const bookWidth = 0.02 + Math.random() * 0.02
            const xOffset = -w / 2 + panelThickness + 0.02 + bookIndex * 0.05
            const bookColors = ['#8B4513', '#2F4F4F', '#800020', '#1C1C1C', '#4A4A4A']
            return (
              <mesh
                key={bookIndex}
                position={[xOffset, (shelfIndex + 0.5) * shelfSpacing + bookHeight / 2, 0]}
                castShadow
              >
                <boxGeometry args={[bookWidth, bookHeight, d * 0.8]} />
                <meshStandardMaterial
                  color={bookColors[Math.floor(Math.random() * bookColors.length)]}
                  roughness={0.9}
                />
              </mesh>
            )
          })}
        </group>
      ))}
    </group>
  )
}

// ============================================
// Wardrobe Generator
// ============================================
export function WardrobeGenerator({ dimensions, color }: FurnitureGeneratorProps) {
  const { width, height, depth } = dimensions
  const w = width / 100
  const h = height / 100
  const d = depth / 100

  const panelThickness = 0.02
  const doorGap = 0.005
  const handleOffset = 0.05
  const handleSize = 0.08

  const isDoubleDoor = w > 0.8

  return (
    <group>
      {/* Back panel */}
      <mesh position={[0, h / 2, -d / 2 + panelThickness / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, h, panelThickness]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>

      {/* Left side */}
      <mesh position={[-w / 2 + panelThickness / 2, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[panelThickness, h, d]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>

      {/* Right side */}
      <mesh position={[w / 2 - panelThickness / 2, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[panelThickness, h, d]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>

      {/* Top */}
      <mesh position={[0, h - panelThickness / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, panelThickness, d]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>

      {/* Bottom */}
      <mesh position={[0, panelThickness / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w - panelThickness * 2, panelThickness, d]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>

      {/* Door(s) */}
      {isDoubleDoor ? (
        <>
          {/* Left door */}
          <mesh position={[-w / 4, h / 2, d / 2 - panelThickness / 2]} castShadow>
            <boxGeometry args={[w / 2 - panelThickness - doorGap, h - panelThickness * 2 - doorGap * 2, panelThickness]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          {/* Right door */}
          <mesh position={[w / 4, h / 2, d / 2 - panelThickness / 2]} castShadow>
            <boxGeometry args={[w / 2 - panelThickness - doorGap, h - panelThickness * 2 - doorGap * 2, panelThickness]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          {/* Left handle */}
          <mesh position={[-doorGap, h / 2, d / 2]} castShadow>
            <boxGeometry args={[0.02, handleSize, 0.02]} />
            <meshStandardMaterial color={METAL} roughness={0.3} metalness={0.7} />
          </mesh>
          {/* Right handle */}
          <mesh position={[doorGap, h / 2, d / 2]} castShadow>
            <boxGeometry args={[0.02, handleSize, 0.02]} />
            <meshStandardMaterial color={METAL} roughness={0.3} metalness={0.7} />
          </mesh>
        </>
      ) : (
        <>
          {/* Single door */}
          <mesh position={[0, h / 2, d / 2 - panelThickness / 2]} castShadow>
            <boxGeometry args={[w - panelThickness * 2 - doorGap * 2, h - panelThickness * 2 - doorGap * 2, panelThickness]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          {/* Handle */}
          <mesh position={[w / 2 - handleOffset - panelThickness, h / 2, d / 2]} castShadow>
            <boxGeometry args={[0.02, handleSize, 0.02]} />
            <meshStandardMaterial color={METAL} roughness={0.3} metalness={0.7} />
          </mesh>
        </>
      )}
    </group>
  )
}

// ============================================
// Desk Generator
// ============================================
export function DeskGenerator({ dimensions, color }: FurnitureGeneratorProps) {
  const { width, height, depth } = dimensions
  const w = width / 100
  const h = height / 100
  const d = depth / 100

  const topThickness = 0.03
  const legWidth = 0.05
  const drawerHeight = 0.15
  const drawerWidth = w * 0.35

  return (
    <group>
      {/* Desktop */}
      <mesh position={[0, h - topThickness / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, topThickness, d]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>

      {/* Left legs (panel style) */}
      <mesh position={[-w / 2 + legWidth / 2, (h - topThickness) / 2, 0]} castShadow>
        <boxGeometry args={[legWidth, h - topThickness, d * 0.8]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>

      {/* Right legs (panel style) */}
      <mesh position={[w / 2 - legWidth / 2, (h - topThickness) / 2, 0]} castShadow>
        <boxGeometry args={[legWidth, h - topThickness, d * 0.8]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>

      {/* Drawer unit */}
      <mesh position={[w / 2 - drawerWidth / 2 - legWidth, h - topThickness - drawerHeight / 2 - 0.02, d * 0.1]} castShadow>
        <boxGeometry args={[drawerWidth, drawerHeight, d * 0.6]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>

      {/* Drawer handle */}
      <mesh position={[w / 2 - drawerWidth / 2 - legWidth, h - topThickness - drawerHeight / 2 - 0.02, d * 0.4 + 0.01]} castShadow>
        <boxGeometry args={[0.08, 0.02, 0.02]} />
        <meshStandardMaterial color={METAL} roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  )
}

// ============================================
// Armchair Generator
// ============================================
export function ArmchairGenerator({ dimensions, color }: FurnitureGeneratorProps) {
  const { width, height, depth } = dimensions
  const w = width / 100
  const h = height / 100
  const d = depth / 100

  const seatHeight = h * 0.4
  const backHeight = h * 0.6
  const armWidth = w * 0.15
  const legHeight = h * 0.08
  const cushionThickness = 0.12

  return (
    <group>
      {/* Base */}
      <mesh position={[0, legHeight + (seatHeight - cushionThickness) / 2, 0]} castShadow>
        <boxGeometry args={[w - armWidth * 2, seatHeight - cushionThickness, d]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
      </mesh>

      {/* Seat cushion */}
      <mesh position={[0, legHeight + seatHeight - cushionThickness / 2, d * 0.05]} castShadow receiveShadow>
        <boxGeometry args={[w - armWidth * 2 - 0.02, cushionThickness, d * 0.85]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>

      {/* Back cushion */}
      <mesh position={[0, legHeight + seatHeight + backHeight / 2, -d / 2 + 0.1]} castShadow>
        <boxGeometry args={[w - armWidth * 2 - 0.02, backHeight * 0.9, 0.15]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>

      {/* Left arm */}
      <mesh position={[-w / 2 + armWidth / 2, legHeight + seatHeight / 2 + 0.05, 0]} castShadow>
        <boxGeometry args={[armWidth, seatHeight + 0.1, d]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>

      {/* Right arm */}
      <mesh position={[w / 2 - armWidth / 2, legHeight + seatHeight / 2 + 0.05, 0]} castShadow>
        <boxGeometry args={[armWidth, seatHeight + 0.1, d]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>

      {/* Legs */}
      {[
        [-w / 2 + 0.05, legHeight / 2, -d / 2 + 0.05],
        [w / 2 - 0.05, legHeight / 2, -d / 2 + 0.05],
        [-w / 2 + 0.05, legHeight / 2, d / 2 - 0.05],
        [w / 2 - 0.05, legHeight / 2, d / 2 - 0.05],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

// ============================================
// Default Box Fallback
// ============================================
export function BoxFallbackGenerator({ dimensions, color }: FurnitureGeneratorProps) {
  const { width, height, depth } = dimensions

  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[width / 100, height / 100, depth / 100]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  )
}
