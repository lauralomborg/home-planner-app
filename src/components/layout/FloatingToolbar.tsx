import { useState } from 'react'
import {
  MousePointer2,
  PenLine,
  Square,
  Sofa,
  LayoutGrid,
  DoorOpen,
  Hand,
} from 'lucide-react'
import { useEditorStore, useActiveTool } from '@/stores'
import type { EditorTool } from '@/models'
import { cn } from '@/lib/utils'

interface ToolButtonProps {
  tool: EditorTool
  icon: React.ReactNode
  label: string
  shortcut?: string
}

function ToolButton({ tool, icon, label, shortcut }: ToolButtonProps) {
  const activeTool = useActiveTool()
  const setActiveTool = useEditorStore((state) => state.setActiveTool)
  const isActive = activeTool === tool
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setActiveTool(tool)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150',
          isActive
            ? 'bg-primary/15 text-primary shadow-sm ring-1 ring-primary/30'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
        )}
      >
        <span className={cn('w-5 h-5 transition-transform', isHovered && !isActive && 'scale-110')}>
          {icon}
        </span>
      </button>

      {/* Tooltip */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-foreground text-background text-xs font-medium px-2 py-1 rounded-md shadow-lg whitespace-nowrap animate-in fade-in-0 zoom-in-95 duration-150">
            {label}
            {shortcut && (
              <span className="ml-1.5 text-background/70 bg-background/20 px-1 py-0.5 rounded text-[10px]">
                {shortcut}
              </span>
            )}
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-foreground" />
        </div>
      )}
    </div>
  )
}

const tools: { tool: EditorTool; icon: React.ReactNode; label: string; shortcut?: string }[] = [
  { tool: 'select', icon: <MousePointer2 className="w-full h-full" />, label: 'Select', shortcut: 'V' },
  { tool: 'wall', icon: <PenLine className="w-full h-full" />, label: 'Draw Wall', shortcut: 'W' },
  { tool: 'room', icon: <Square className="w-full h-full" />, label: 'Room', shortcut: 'R' },
  { tool: 'furniture', icon: <Sofa className="w-full h-full" />, label: 'Furniture', shortcut: 'F' },
  { tool: 'window', icon: <LayoutGrid className="w-full h-full" />, label: 'Window' },
  { tool: 'door', icon: <DoorOpen className="w-full h-full" />, label: 'Door', shortcut: 'D' },
  { tool: 'pan', icon: <Hand className="w-full h-full" />, label: 'Pan View', shortcut: 'H' },
]

export function FloatingToolbar() {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-card/90 backdrop-blur-md border border-border/50 shadow-lg">
        {tools.map((t, index) => (
          <div key={t.tool} className="flex items-center">
            <ToolButton
              tool={t.tool}
              icon={t.icon}
              label={t.label}
              shortcut={t.shortcut}
            />
            {/* Add separator after Room tool (index 2) and after Door tool (index 5) */}
            {(index === 2 || index === 5) && (
              <div className="w-px h-6 bg-border/50 mx-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
