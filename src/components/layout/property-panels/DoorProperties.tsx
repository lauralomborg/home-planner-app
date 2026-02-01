import { useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useEditorStore, useFloorPlanStore } from '@/stores'
import type { DoorInstance, DoorType } from '@/models'
import { PropertyRow, PropertySection } from './PropertyComponents'

const DOOR_TYPES: { value: DoorType; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'double', label: 'Double' },
  { value: 'sliding', label: 'Sliding' },
  { value: 'french', label: 'French' },
  { value: 'pocket', label: 'Pocket' },
]

const OPEN_DIRECTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'inward', label: 'Inward' },
  { value: 'outward', label: 'Outward' },
] as const

export function DoorProperties({ door }: { door: DoorInstance }) {
  const { updateDoor, removeDoor, getWallById } = useFloorPlanStore()
  const clearSelection = useEditorStore((state) => state.clearSelection)

  // Calculate wall length for bounds validation
  const wallLength = useMemo(() => {
    const wall = getWallById(door.wallId)
    if (!wall) return 0
    const dx = wall.end.x - wall.start.x
    const dy = wall.end.y - wall.start.y
    return Math.sqrt(dx * dx + dy * dy)
  }, [getWallById, door.wallId])

  // Calculate max position (left-edge based: position + width <= wallLength)
  const maxPosition = Math.max(0, wallLength - door.width)
  // Calculate max width (can't exceed wall length, also limited by current position)
  const maxWidth = Math.max(40, wallLength - door.position)

  const handleDelete = () => {
    removeDoor(door.id)
    clearSelection()
  }

  return (
    <div className="space-y-6">
      <PropertySection title="Position">
        <PropertyRow label="Along wall">
          <Input
            type="number"
            value={Math.round(door.position)}
            onChange={(e) => updateDoor(door.id, { position: Number(e.target.value) })}
            className="h-8 text-sm"
            min={0}
            max={Math.round(maxPosition)}
          />
        </PropertyRow>
      </PropertySection>

      <Separator className="bg-border/40" />

      <PropertySection title="Size (cm)">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Width</label>
            <Input
              type="number"
              value={Math.round(door.width)}
              onChange={(e) =>
                updateDoor(door.id, { width: Number(e.target.value) })
              }
              className="h-8 text-sm"
              min={40}
              max={Math.min(200, Math.round(maxWidth))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Height</label>
            <Input
              type="number"
              value={Math.round(door.height)}
              onChange={(e) =>
                updateDoor(door.id, { height: Number(e.target.value) })
              }
              className="h-8 text-sm"
              min={180}
              max={300}
            />
          </div>
        </div>
      </PropertySection>

      <Separator className="bg-border/40" />

      <PropertySection title="Door Settings">
        <PropertyRow label="Type">
          <select
            value={door.type}
            onChange={(e) =>
              updateDoor(door.id, { type: e.target.value as DoorType })
            }
            className="w-full h-8 rounded-lg border border-input bg-background px-3 text-sm"
          >
            {DOOR_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </PropertyRow>
        <PropertyRow label="Open direction">
          <select
            value={door.openDirection}
            onChange={(e) =>
              updateDoor(door.id, { openDirection: e.target.value as typeof door.openDirection })
            }
            className="w-full h-8 rounded-lg border border-input bg-background px-3 text-sm"
          >
            {OPEN_DIRECTIONS.map((dir) => (
              <option key={dir.value} value={dir.value}>
                {dir.label}
              </option>
            ))}
          </select>
        </PropertyRow>
      </PropertySection>

      <Separator className="bg-border/40" />

      <Button
        variant="outline"
        size="sm"
        onClick={handleDelete}
        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete Door
      </Button>
    </div>
  )
}
