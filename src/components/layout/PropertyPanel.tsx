import { X, Trash2, Lock, Unlock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useEditorStore, useFloorPlanStore } from '@/stores'
import type { Wall, Room, FurnitureInstance } from '@/models'

function PropertyRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-muted-foreground whitespace-nowrap">
        {label}
      </label>
      <div className="flex-1 max-w-[140px]">{children}</div>
    </div>
  )
}

function PropertySection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-3">
        {title}
      </h4>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function WallProperties({ wall }: { wall: Wall }) {
  const updateWall = useFloorPlanStore((state) => state.updateWall)
  const removeWall = useFloorPlanStore((state) => state.removeWall)
  const clearSelection = useEditorStore((state) => state.clearSelection)

  const length = Math.sqrt(
    Math.pow(wall.end.x - wall.start.x, 2) +
      Math.pow(wall.end.y - wall.start.y, 2)
  )

  const handleDelete = () => {
    removeWall(wall.id)
    clearSelection()
  }

  return (
    <div className="space-y-6">
      <PropertySection title="Dimensions">
        <PropertyRow label="Length">
          <Input
            value={`${(length / 100).toFixed(2)} m`}
            disabled
            className="h-8 text-sm bg-muted/30"
          />
        </PropertyRow>
        <PropertyRow label="Thickness">
          <Input
            type="number"
            value={wall.thickness}
            onChange={(e) =>
              updateWall(wall.id, { thickness: Number(e.target.value) })
            }
            className="h-8 text-sm"
          />
        </PropertyRow>
        <PropertyRow label="Height">
          <Input
            type="number"
            value={wall.height}
            onChange={(e) =>
              updateWall(wall.id, { height: Number(e.target.value) })
            }
            className="h-8 text-sm"
          />
        </PropertyRow>
      </PropertySection>

      <Separator className="bg-border/40" />

      <PropertySection title="Position">
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="p-2 bg-muted/30 rounded-lg">
            <div className="font-medium mb-1">Start</div>
            <div>X: {(wall.start.x / 100).toFixed(2)}m</div>
            <div>Y: {(wall.start.y / 100).toFixed(2)}m</div>
          </div>
          <div className="p-2 bg-muted/30 rounded-lg">
            <div className="font-medium mb-1">End</div>
            <div>X: {(wall.end.x / 100).toFixed(2)}m</div>
            <div>Y: {(wall.end.y / 100).toFixed(2)}m</div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground/60">
          Drag the handles in 2D view to adjust
        </p>
      </PropertySection>

      <Separator className="bg-border/40" />

      <PropertySection title="Material">
        <div className="flex flex-wrap gap-2">
          {[
            { color: '#FFFFFF', name: 'White' },
            { color: '#F5F0E8', name: 'Cream' },
            { color: '#E8E0D5', name: 'Warm Gray' },
            { color: '#D4C4B0', name: 'Beige' },
          ].map(({ color, name }) => (
            <button
              key={color}
              className="w-10 h-10 rounded-lg border-2 hover:scale-105 transition-all"
              style={{
                backgroundColor: color,
                borderColor:
                  wall.material.colorOverride === color
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--border) / 0.4)',
              }}
              onClick={() =>
                updateWall(wall.id, {
                  material: { materialId: 'color', colorOverride: color },
                })
              }
              title={name}
            />
          ))}
        </div>
      </PropertySection>

      <Separator className="bg-border/40" />

      <Button
        variant="outline"
        size="sm"
        onClick={handleDelete}
        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete Wall
      </Button>
    </div>
  )
}

function RoomProperties({ room }: { room: Room }) {
  const { renameRoom, setRoomType, updateRoom } = useFloorPlanStore()

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
        <div className="flex flex-wrap gap-2">
          {[
            { color: '#D4C4B0', name: 'Light Wood' },
            { color: '#B8A089', name: 'Oak' },
            { color: '#8B7355', name: 'Walnut' },
            { color: '#5C5650', name: 'Dark' },
          ].map(({ color, name }) => (
            <button
              key={color}
              className="w-10 h-10 rounded-lg border-2 hover:scale-105 transition-all"
              style={{
                backgroundColor: color,
                borderColor:
                  room.floorMaterial.colorOverride === color
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--border) / 0.4)',
              }}
              onClick={() =>
                updateRoom(room.id, {
                  floorMaterial: { materialId: 'color', colorOverride: color },
                })
              }
              title={name}
            />
          ))}
        </div>
      </PropertySection>
    </div>
  )
}

function FurnitureProperties({ furniture }: { furniture: FurnitureInstance }) {
  const { moveFurniture, rotateFurniture, resizeFurniture, toggleFurnitureLock, removeFurniture } =
    useFloorPlanStore()
  const clearSelection = useEditorStore((state) => state.clearSelection)

  const handleDelete = () => {
    removeFurniture(furniture.id)
    clearSelection()
  }

  return (
    <div className="space-y-6">
      <PropertySection title="Position">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">X</label>
            <Input
              type="number"
              value={Math.round(furniture.position.x)}
              onChange={(e) =>
                moveFurniture(furniture.id, {
                  ...furniture.position,
                  x: Number(e.target.value),
                })
              }
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Y</label>
            <Input
              type="number"
              value={Math.round(furniture.position.y)}
              onChange={(e) =>
                moveFurniture(furniture.id, {
                  ...furniture.position,
                  y: Number(e.target.value),
                })
              }
              className="h-8 text-sm"
            />
          </div>
        </div>
        <PropertyRow label="Rotation">
          <Input
            type="number"
            value={furniture.rotation}
            onChange={(e) =>
              rotateFurniture(furniture.id, Number(e.target.value))
            }
            className="h-8 text-sm"
            min={0}
            max={360}
            step={15}
          />
        </PropertyRow>
      </PropertySection>

      <Separator className="bg-border/40" />

      <PropertySection title="Size (cm)">
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Width</label>
            <Input
              type="number"
              value={Math.round(furniture.dimensions.width)}
              onChange={(e) =>
                resizeFurniture(furniture.id, {
                  ...furniture.dimensions,
                  width: Number(e.target.value),
                })
              }
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Depth</label>
            <Input
              type="number"
              value={Math.round(furniture.dimensions.depth)}
              onChange={(e) =>
                resizeFurniture(furniture.id, {
                  ...furniture.dimensions,
                  depth: Number(e.target.value),
                })
              }
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Height</label>
            <Input
              type="number"
              value={Math.round(furniture.dimensions.height)}
              onChange={(e) =>
                resizeFurniture(furniture.id, {
                  ...furniture.dimensions,
                  height: Number(e.target.value),
                })
              }
              className="h-8 text-sm"
            />
          </div>
        </div>
      </PropertySection>

      <Separator className="bg-border/40" />

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleFurnitureLock(furniture.id)}
          className="flex-1"
        >
          {furniture.locked ? (
            <>
              <Lock className="w-4 h-4 mr-2" />
              Locked
            </>
          ) : (
            <>
              <Unlock className="w-4 h-4 mr-2" />
              Unlocked
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

function NoSelection() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-muted-foreground/50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
          />
        </svg>
      </div>
      <p className="text-sm text-muted-foreground/70">
        Select an element to view
        <br />
        and edit its properties
      </p>
    </div>
  )
}

function MultipleSelection({ count }: { count: number }) {
  const { removeSelected } = useFloorPlanStore()
  const { selectedIds, clearSelection } = useEditorStore()

  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted/30 rounded-xl text-center">
        <div className="text-2xl font-medium">{count}</div>
        <div className="text-sm text-muted-foreground">items selected</div>
      </div>
      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={clearSelection}
        >
          Clear Selection
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
          onClick={() => {
            removeSelected(selectedIds)
            clearSelection()
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete All
        </Button>
      </div>
    </div>
  )
}

export function PropertyPanel() {
  const selectedIds = useEditorStore((state) => state.selectedIds)
  const floorPlan = useFloorPlanStore((state) => state.floorPlan)

  const selectedWalls = floorPlan.walls.filter((w) => selectedIds.includes(w.id))
  const selectedRooms = floorPlan.rooms.filter((r) => selectedIds.includes(r.id))
  const selectedFurniture = floorPlan.furniture.filter((f) =>
    selectedIds.includes(f.id)
  )

  const totalSelected =
    selectedWalls.length + selectedRooms.length + selectedFurniture.length

  // Determine what type is selected for the header
  const getSelectionType = () => {
    if (selectedWalls.length === 1) return 'Wall'
    if (selectedRooms.length === 1) return 'Room'
    if (selectedFurniture.length === 1) return 'Furniture'
    return 'Properties'
  }

  return (
    <aside className="w-72 border-l border-border/50 bg-card/50 flex flex-col">
      <div className="p-4 border-b border-border/40 flex items-center justify-between">
        <h2 className="font-medium text-sm">{getSelectionType()}</h2>
        {totalSelected > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => useEditorStore.getState().clearSelection()}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        {totalSelected === 0 && <NoSelection />}

        {totalSelected === 1 && (
          <>
            {selectedWalls.length === 1 && (
              <WallProperties wall={selectedWalls[0]} />
            )}
            {selectedRooms.length === 1 && (
              <RoomProperties room={selectedRooms[0]} />
            )}
            {selectedFurniture.length === 1 && (
              <FurnitureProperties furniture={selectedFurniture[0]} />
            )}
          </>
        )}

        {totalSelected > 1 && <MultipleSelection count={totalSelected} />}
      </ScrollArea>
    </aside>
  )
}
