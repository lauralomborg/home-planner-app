import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { useFloorPlanStore } from '@/stores'
import type { RoomConnection } from '@/models'
import { PropertyRow, PropertySection } from './PropertyComponents'
import { Link2, Unlink, Plus, Trash2 } from 'lucide-react'

export function ConnectionProperties({ connection }: { connection: RoomConnection }) {
  const { updateRoomConnection, removeRoomConnection, getRoomById, addConnectionOpening, removeConnectionOpening } = useFloorPlanStore()

  const room1 = getRoomById(connection.roomIds[0])
  const room2 = getRoomById(connection.roomIds[1])

  const edgeLength = Math.sqrt(
    Math.pow(connection.sharedEdge.end.x - connection.sharedEdge.start.x, 2) +
    Math.pow(connection.sharedEdge.end.y - connection.sharedEdge.start.y, 2)
  )

  return (
    <div className="space-y-6">
      <PropertySection title="Connection">
        <PropertyRow label="Type">
          <select
            value={connection.type}
            onChange={(e) =>
              updateRoomConnection(connection.id, {
                type: e.target.value as 'wall' | 'direct',
              })
            }
            className="w-full h-8 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="wall">With Wall</option>
            <option value="direct">Direct (No Wall)</option>
          </select>
        </PropertyRow>
      </PropertySection>

      <Separator className="bg-border/40" />

      <PropertySection title="Connected Rooms">
        <div className="space-y-2">
          <div className="p-3 bg-muted/30 rounded-lg flex items-center gap-2">
            <Link2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{room1?.name || 'Unknown Room'}</span>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg flex items-center gap-2">
            <Link2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{room2?.name || 'Unknown Room'}</span>
          </div>
        </div>
      </PropertySection>

      <Separator className="bg-border/40" />

      <PropertySection title="Shared Edge">
        <div className="p-3 bg-muted/30 rounded-lg text-center">
          <div className="text-lg font-medium">{(edgeLength / 100).toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">meters</div>
        </div>
      </PropertySection>

      {connection.type === 'direct' && (
        <>
          <Separator className="bg-border/40" />
          <PropertySection title="Opening">
            <p className="text-xs text-muted-foreground mb-2">
              Direct connections have a full opening between rooms.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => updateRoomConnection(connection.id, { type: 'wall' })}
            >
              Convert to Wall
            </Button>
          </PropertySection>
        </>
      )}

      {connection.type === 'wall' && (
        <>
          <Separator className="bg-border/40" />
          <PropertySection title="Openings">
            {connection.openings.length > 0 ? (
              <div className="space-y-2">
                {connection.openings.map((opening, index) => (
                  <div key={opening.id} className="p-3 bg-muted/30 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Opening {index + 1}</div>
                      <div className="text-xs text-muted-foreground">
                        Position: {(opening.position * 100).toFixed(0)}% |
                        Width: {(opening.width * 100).toFixed(0)}%
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeConnectionOpening(connection.id, opening.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mb-2">
                No openings. Add an opening to create a passage in the wall.
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => addConnectionOpening(connection.id, { position: 0.25, width: 0.5 })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Opening
            </Button>
          </PropertySection>
        </>
      )}

      <Separator className="bg-border/40" />

      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={() => removeRoomConnection(connection.id)}
      >
        <Unlink className="w-4 h-4 mr-2" />
        Remove Connection
      </Button>
    </div>
  )
}
