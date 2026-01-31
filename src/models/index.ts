// ============================================
// Core Geometry Types
// ============================================

export interface Point2D {
  x: number
  y: number
}

export interface Point3D extends Point2D {
  z: number
}

export interface Dimensions3D {
  width: number
  depth: number
  height: number
}

// ============================================
// Material Types
// ============================================

export type MaterialCategory =
  | 'wall-paint'
  | 'wallpaper'
  | 'wood'
  | 'tile'
  | 'carpet'
  | 'fabric'
  | 'metal'
  | 'glass'
  | 'concrete'
  | 'stone'

export interface TextureConfig {
  diffuseMap: string
  normalMap?: string
  roughnessMap?: string
  repeatX: number
  repeatY: number
}

export interface MaterialProperties {
  roughness: number
  metalness: number
  opacity: number
}

export interface Material {
  id: string
  name: string
  category: MaterialCategory
  type: 'color' | 'texture' | 'pattern'
  color?: string
  texture?: TextureConfig
  properties: MaterialProperties
}

export interface MaterialRef {
  materialId: string
  colorOverride?: string
}

// ============================================
// Wall Types
// ============================================

export interface WallOpening {
  id: string
  type: 'window' | 'door'
  position: number // Distance from wall start along the wall
  width: number
  height: number
  elevationFromFloor: number
  referenceId: string // Links to WindowInstance or DoorInstance
}

export interface Wall {
  id: string
  start: Point2D
  end: Point2D
  thickness: number
  height: number
  material: MaterialRef
  openings: WallOpening[]
  ownerRoomId?: string // Which room owns this wall (if any)
}

// ============================================
// Room Types
// ============================================

export type RoomType =
  | 'living-room'
  | 'bedroom'
  | 'bathroom'
  | 'kitchen'
  | 'dining-room'
  | 'office'
  | 'hallway'
  | 'storage'
  | 'laundry'
  | 'garage'
  | 'custom'

export interface RoomBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface Room {
  id: string
  name: string
  type: RoomType
  bounds: RoomBounds // Room's own geometry
  wallIds: string[]
  floorMaterial: MaterialRef
  ceilingMaterial: MaterialRef
  area: number // Calculated in square meters/feet
  perimeter: number // Calculated
  containedFurnitureIds: string[] // Furniture inside this room
  containedRoomIds: string[] // Nested rooms inside this room
  parentRoomId?: string // If this room is nested inside another
}

// ============================================
// Furniture Types
// ============================================

export type FurnitureCategory =
  | 'seating'
  | 'tables'
  | 'storage'
  | 'beds'
  | 'lighting'
  | 'decor'
  | 'appliances'
  | 'bathroom'
  | 'outdoor'

export interface CustomizablePart {
  partName: string // Mesh name in GLB model
  acceptsMaterials: MaterialCategory[]
  defaultMaterial: MaterialRef
}

export interface FurnitureCatalogItem {
  id: string
  name: string
  category: FurnitureCategory
  modelPath: string
  thumbnail: string
  defaultDimensions: Dimensions3D
  canResize: boolean
  resizeConstraints?: {
    minWidth?: number
    maxWidth?: number
    minDepth?: number
    maxDepth?: number
    minHeight?: number
    maxHeight?: number
  }
  defaultMaterial: MaterialRef
  customizableParts: CustomizablePart[]
}

export interface FurnitureInstance {
  id: string
  catalogItemId: string
  position: Point2D
  rotation: number // Degrees, Y-axis rotation
  dimensions: Dimensions3D
  partMaterials: Record<string, MaterialRef> // partName -> material
  locked: boolean
  groupId?: string // Reference to parent group
  parentRoomId?: string // Explicit parent room for hierarchy
}

// ============================================
// Grouping Types
// ============================================

export interface FurnitureGroup {
  id: string
  name: string
  memberIds: string[] // IDs of furniture items in this group
  locked: boolean
}

// ============================================
// Window & Door Types
// ============================================

export type WindowType = 'single' | 'double' | 'sliding' | 'fixed' | 'bay'

export interface WindowInstance {
  id: string
  type: WindowType
  wallId: string
  position: number // Position along wall from start
  width: number
  height: number
  elevationFromFloor: number
  frameMaterial: MaterialRef
  glassOpacity: number
}

export type DoorType = 'single' | 'double' | 'sliding' | 'french' | 'pocket'

export interface DoorInstance {
  id: string
  type: DoorType
  wallId: string
  position: number
  width: number
  height: number
  openDirection: 'left' | 'right' | 'inward' | 'outward'
  material: MaterialRef
  isOpen: boolean
  openAngle: number // 0-90 degrees
}

// ============================================
// Lighting Types
// ============================================

export type LightType = 'ambient' | 'directional' | 'point' | 'spot'

export interface LightInstance {
  id: string
  type: LightType
  position: Point3D
  color: string
  intensity: number
  castShadow: boolean
  // For directional/spot lights
  target?: Point3D
  // For spot lights
  angle?: number
  penumbra?: number
  // For point/spot lights
  distance?: number
  decay?: number
}

export interface SunSettings {
  enabled: boolean
  timeOfDay: number // 0-24 hours
  azimuth: number // Sun direction angle
  intensity: number
  color: string
}

// ============================================
// Floor Plan
// ============================================

export interface FloorPlan {
  id: string
  walls: Wall[]
  rooms: Room[]
  furniture: FurnitureInstance[]
  windows: WindowInstance[]
  doors: DoorInstance[]
  lights: LightInstance[]
  groups: FurnitureGroup[]
}

// ============================================
// Project Types
// ============================================

export type UnitSystem = 'metric' | 'imperial'

export interface ProjectSettings {
  unit: UnitSystem
  gridSize: number // Grid cell size in cm
  snapToGrid: boolean
  defaultWallHeight: number
  defaultWallThickness: number
  showDimensions: boolean
  sunSettings: SunSettings
}

export interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  thumbnail?: string
  floorPlan: FloorPlan
  settings: ProjectSettings
}

// ============================================
// Editor Types
// ============================================

export type EditorTool =
  | 'select'
  | 'wall'
  | 'room'
  | 'furniture'
  | 'window'
  | 'door'
  | 'light'
  | 'measure'
  | 'pan'
  | 'erase'

export type ViewMode = '2d' | '3d'

export type Camera3DMode = 'orbit' | 'walkthrough'

export interface EditorState {
  activeView: ViewMode
  activeTool: EditorTool
  selectedIds: string[]
  hoveredId: string | null
  zoom2D: number
  pan2D: Point2D
  showGrid: boolean
  snapToGrid: boolean
  isDrawingWall: boolean
  wallDrawStart: Point2D | null
}

// ============================================
// Default Values
// ============================================

export const DEFAULT_WALL_HEIGHT = 280 // cm
export const DEFAULT_WALL_THICKNESS = 15 // cm
export const DEFAULT_GRID_SIZE = 50 // cm
export const DEFAULT_WINDOW_HEIGHT = 120 // cm
export const DEFAULT_WINDOW_ELEVATION = 90 // cm
export const DEFAULT_DOOR_HEIGHT = 210 // cm

export const DEFAULT_MATERIAL: MaterialRef = {
  materialId: 'white-paint',
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  unit: 'metric',
  gridSize: DEFAULT_GRID_SIZE,
  snapToGrid: true,
  defaultWallHeight: DEFAULT_WALL_HEIGHT,
  defaultWallThickness: DEFAULT_WALL_THICKNESS,
  showDimensions: true,
  sunSettings: {
    enabled: true,
    timeOfDay: 12,
    azimuth: 180,
    intensity: 1,
    color: '#ffffff',
  },
}

export function createEmptyFloorPlan(): FloorPlan {
  return {
    id: crypto.randomUUID(),
    walls: [],
    rooms: [],
    furniture: [],
    windows: [],
    doors: [],
    lights: [],
    groups: [],
  }
}

export function createNewProject(name: string = 'Untitled Project'): Project {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    floorPlan: createEmptyFloorPlan(),
    settings: { ...DEFAULT_PROJECT_SETTINGS },
  }
}
