import type { Dimensions3D } from '@/models'
import {
  SofaGenerator,
  TableGenerator,
  ChairGenerator,
  BedGenerator,
  BookshelfGenerator,
  WardrobeGenerator,
  DeskGenerator,
  ArmchairGenerator,
  BoxFallbackGenerator,
} from './generators'

export type FurnitureGeneratorComponent = React.FC<{
  dimensions: Dimensions3D
  color: string
}>

// Map catalog item IDs or keywords to their procedural generators
const furnitureGeneratorMap: Record<string, FurnitureGeneratorComponent> = {
  // Seating
  sofa: SofaGenerator,
  couch: SofaGenerator,
  'sofa-2seater': SofaGenerator,
  'sofa-3seater': SofaGenerator,
  armchair: ArmchairGenerator,
  'arm-chair': ArmchairGenerator,
  lounger: ArmchairGenerator,
  chair: ChairGenerator,
  'dining-chair': ChairGenerator,
  'office-chair': ChairGenerator,

  // Tables
  table: TableGenerator,
  'dining-table': TableGenerator,
  'coffee-table': TableGenerator,
  'side-table': TableGenerator,
  'end-table': TableGenerator,
  desk: DeskGenerator,
  'office-desk': DeskGenerator,
  'writing-desk': DeskGenerator,

  // Beds
  bed: BedGenerator,
  'single-bed': BedGenerator,
  'double-bed': BedGenerator,
  'queen-bed': BedGenerator,
  'king-bed': BedGenerator,

  // Storage
  bookshelf: BookshelfGenerator,
  'book-shelf': BookshelfGenerator,
  shelving: BookshelfGenerator,
  bookcase: BookshelfGenerator,
  wardrobe: WardrobeGenerator,
  closet: WardrobeGenerator,
  cabinet: WardrobeGenerator,
  armoire: WardrobeGenerator,
}

/**
 * Get the appropriate furniture generator component for a given catalog item ID
 * Falls back to BoxFallbackGenerator for unknown furniture types
 */
export function getFurnitureGenerator(catalogItemId: string): FurnitureGeneratorComponent {
  // Normalize the ID to lowercase for matching
  const normalizedId = catalogItemId.toLowerCase()

  // Direct match
  if (furnitureGeneratorMap[normalizedId]) {
    return furnitureGeneratorMap[normalizedId]
  }

  // Partial match - check if any key is contained in the ID
  for (const [key, generator] of Object.entries(furnitureGeneratorMap)) {
    if (normalizedId.includes(key) || key.includes(normalizedId)) {
      return generator
    }
  }

  // Default fallback
  return BoxFallbackGenerator
}

/**
 * Check if a furniture type has a procedural model
 */
export function hasProceduralModel(catalogItemId: string): boolean {
  const generator = getFurnitureGenerator(catalogItemId)
  return generator !== BoxFallbackGenerator
}

// Re-export generators for direct use if needed
export {
  SofaGenerator,
  TableGenerator,
  ChairGenerator,
  BedGenerator,
  BookshelfGenerator,
  WardrobeGenerator,
  DeskGenerator,
  ArmchairGenerator,
  BoxFallbackGenerator,
} from './generators'
