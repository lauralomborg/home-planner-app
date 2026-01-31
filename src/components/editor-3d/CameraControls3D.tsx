import { useCamera3DMode, useEditorStore } from '@/stores/useEditorStore'

interface CameraModeButtonProps {
  label: string
  icon: React.ReactNode
  isActive: boolean
  onClick: () => void
}

function CameraModeButton({ label, icon, isActive, onClick }: CameraModeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
        ${isActive
          ? 'bg-emerald-600 text-white shadow-md'
          : 'bg-white/90 text-gray-700 hover:bg-white hover:shadow-md'
        }
      `}
      title={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

// Icons as simple SVG components
function OrbitIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <ellipse cx="12" cy="12" rx="9" ry="4" />
      <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(120 12 12)" />
    </svg>
  )
}

function WalkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="4" r="2" />
      <path d="M12 6v6" />
      <path d="M9 20l3-8 3 8" />
      <path d="M8 12h8" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

function ChevronUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 15l-6-6-6 6" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

interface CameraControls3DProps {
  onResetView?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

export function CameraControls3D({ onResetView, onMoveUp, onMoveDown }: CameraControls3DProps) {
  const currentMode = useCamera3DMode()
  const setCamera3DMode = useEditorStore((state) => state.setCamera3DMode)

  return (
    <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
      {/* Height adjustment buttons */}
      {currentMode === 'orbit' && (
        <div className="flex flex-col gap-1 bg-white/80 backdrop-blur-sm rounded-xl p-1 shadow-lg">
          <button
            onClick={onMoveUp}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-700 hover:bg-white hover:shadow-md transition-all"
            title="Move Up"
          >
            <ChevronUpIcon />
          </button>
          <button
            onClick={onMoveDown}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-700 hover:bg-white hover:shadow-md transition-all"
            title="Move Down"
          >
            <ChevronDownIcon />
          </button>
        </div>
      )}

      {/* Mode switching buttons */}
      <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-xl p-1 shadow-lg">
        <CameraModeButton
          label="Orbit"
          icon={<OrbitIcon />}
          isActive={currentMode === 'orbit'}
          onClick={() => setCamera3DMode('orbit')}
        />
        <CameraModeButton
          label="Walk"
          icon={<WalkIcon />}
          isActive={currentMode === 'walkthrough'}
          onClick={() => setCamera3DMode('walkthrough')}
        />
      </div>

      {/* Reset view button */}
      {onResetView && (
        <button
          onClick={onResetView}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white/90 text-gray-700 hover:bg-white hover:shadow-md transition-all"
          title="Reset View"
        >
          <ResetIcon />
        </button>
      )}
    </div>
  )
}
