import { LayersPanel } from './layers'

export function LeftPanel() {
  return (
    <aside className="w-60 border-r border-border/50 bg-card/50 flex flex-col">
      <div className="p-3 border-b border-border/40">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Layers
        </h2>
      </div>
      <LayersPanel />
    </aside>
  )
}
