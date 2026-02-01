import { Save, FolderOpen, Plus, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProjectStore } from '@/stores'
import { useState } from 'react'

export function Header() {
  const { currentProject, saveProject, isDirty, createProject } =
    useProjectStore()
  const [isEditing, setIsEditing] = useState(false)
  const [projectName, setProjectName] = useState(
    currentProject?.name || 'Untitled Project'
  )

  const handleSave = () => {
    saveProject()
  }

  const handleNewProject = () => {
    createProject()
  }

  const handleNameSubmit = () => {
    if (currentProject && projectName.trim()) {
      useProjectStore.getState().renameProject(currentProject.id, projectName.trim())
    }
    setIsEditing(false)
  }

  return (
    <header className="h-16 border-b border-border/50 bg-card/80 backdrop-blur-sm px-6 flex items-center justify-between">
      {/* Left: Logo and Project Name */}
      <div className="flex items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Home className="w-5 h-5 text-primary" />
          </div>
          <span className="font-medium text-base tracking-tight hidden md:inline text-foreground/80">
            Home Planner
          </span>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border/60 hidden sm:block" />

        {/* Project Name */}
        <div className="flex items-center">
          {isEditing ? (
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameSubmit()
                if (e.key === 'Escape') {
                  setProjectName(currentProject?.name || 'Untitled Project')
                  setIsEditing(false)
                }
              }}
              className="h-8 w-48 text-sm bg-background/50"
              autoFocus
            />
          ) : (
            <button
              onClick={() => {
                setProjectName(currentProject?.name || 'Untitled Project')
                setIsEditing(true)
              }}
              className="text-sm font-medium hover:bg-secondary/50 px-3 py-1.5 rounded-lg transition-colors"
            >
              {currentProject?.name || 'Untitled Project'}
              {isDirty && (
                <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewProject}
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span className="hidden sm:inline">New</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
        >
          <FolderOpen className="w-4 h-4 mr-1.5" />
          <span className="hidden sm:inline">Open</span>
        </Button>

        <div className="h-4 w-px bg-border/60 mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={!isDirty}
          className="text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <Save className="w-4 h-4 mr-1.5" />
          <span className="hidden sm:inline">Save</span>
        </Button>
      </div>
    </header>
  )
}
