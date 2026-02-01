import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useFloorPlanStore } from '@/stores'
import type { Room } from '@/models'
import { PropertyRow, PropertySection } from './PropertyComponents'
import { MaterialSelector, FLOOR_MATERIALS } from '@/components/ui/material-selector'

export function RoomProperties({ room }: { room: Room }) {
  const { renameRoom, setRoomType, updateRoom, moveRoom, resizeRoom } = useFloorPlanStore()

  return (
    <div className="space-y-6">
      <PropertySection title="Room Info">
        <PropertyRow label="Name">
          <Input
            value={room.name}
            onChange={(e) => renameRoom(room.id, e.target.value)}
            className="h-8 text-sm"
          />
        </PropertyRow>
        <PropertyRow label="Type">
          <select
            value={room.type}
            onChange={(e) =>
              setRoomType(room.id, e.target.value as typeof room.type)
            }
            className="w-full h-8 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="living-room">Living Room</option>
            <option value="bedroom">Bedroom</option>
            <option value="bathroom">Bathroom</option>
            <option value="kitchen">Kitchen</option>
            <option value="dining-room">Dining Room</option>
            <option value="office">Office</option>
            <option value="hallway">Hallway</option>
            <option value="custom">Custom</option>
          </select>
        </PropertyRow>
      </PropertySection>

      <Separator className="bg-border/40" />

      <PropertySection title="Position">
        <div className="grid grid-cols-2 gap-2">
          <PropertyRow label="X">
            <Input
              type="number"
              value={Math.round(room.bounds.x)}
              onChange={(e) => {
                const newX = Number(e.target.value)
                const delta = { x: newX - room.bounds.x, y: 0 }
                moveRoom(room.id, delta)
              }}
              className="h-8 text-sm"
            />
          </PropertyRow>
          <PropertyRow label="Y">
            <Input
              type="number"
              value={Math.round(room.bounds.y)}
              onChange={(e) => {
                const newY = Number(e.target.value)
                const delta = { x: 0, y: newY - room.bounds.y }
                moveRoom(room.id, delta)
              }}
              className="h-8 text-sm"
            />
          </PropertyRow>
        </div>
      </PropertySection>

      <Separator className="bg-border/40" />

      <PropertySection title="Size">
        <div className="grid grid-cols-2 gap-2">
          <PropertyRow label="Width">
            <Input
              type="number"
              value={Math.round(room.bounds.width)}
              onChange={(e) => {
                resizeRoom(room.id, { ...room.bounds, width: Number(e.target.value) })
              }}
              className="h-8 text-sm"
              min={1}
            />
          </PropertyRow>
          <PropertyRow label="Height">
            <Input
              type="number"
              value={Math.round(room.bounds.height)}
              onChange={(e) => {
                resizeRoom(room.id, { ...room.bounds, height: Number(e.target.value) })
              }}
              className="h-8 text-sm"
              min={1}
            />
          </PropertyRow>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Values in cm</p>
      </PropertySection>

      <Separator className="bg-border/40" />

      <PropertySection title="Measurements">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <div className="text-lg font-medium">{room.area.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">m² area</div>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <div className="text-lg font-medium">{room.perimeter.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">m perimeter</div>
          </div>
        </div>
      </PropertySection>

      <Separator className="bg-border/40" />

      <PropertySection title="Floor">
        <MaterialSelector
          options={FLOOR_MATERIALS}
          selectedColor={room.floorMaterial.colorOverride}
          onSelect={(color) =>
            updateRoom(room.id, {
              floorMaterial: { materialId: 'color', colorOverride: color },
            })
          }
        />
      </PropertySection>
    </div>
  )
}
