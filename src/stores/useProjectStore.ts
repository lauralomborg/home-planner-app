import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Project, ProjectSettings } from '@/models'
import { createNewProject } from '@/models'
import { useFloorPlanStore } from './useFloorPlanStore'

interface ProjectSummary {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  thumbnail?: string
}

interface ProjectState {
  // Current project
  currentProjectId: string | null
  currentProject: Project | null

  // Project library
  projects: ProjectSummary[]

  // Settings
  isDirty: boolean
  autoSaveEnabled: boolean
  lastSavedAt: string | null

  // Project actions
  createProject: (name?: string) => string
  loadProject: (id: string) => boolean
  restoreProjectMetadataOnly: (id: string) => boolean
  saveProject: () => void
  deleteProject: (id: string) => void
  duplicateProject: (id: string) => string | null
  renameProject: (id: string, name: string) => void

  // Settings actions
  updateSettings: (settings: Partial<ProjectSettings>) => void

  // State actions
  setDirty: (dirty: boolean) => void
  setAutoSave: (enabled: boolean) => void

  // Internal
  _saveProjectData: (project: Project) => void
  _loadProjectData: (id: string) => Project | null
  _updateProjectList: () => void
}

const STORAGE_PREFIX = 'home-planner:'

// Helper to get project storage key
const getProjectKey = (id: string) => `${STORAGE_PREFIX}project:${id}`

export const useProjectStore = create<ProjectState>()(
  persist(
    immer((set, get) => ({
      currentProjectId: null,
      currentProject: null,
      projects: [],
      isDirty: false,
      autoSaveEnabled: true,
      lastSavedAt: null,

      // ==================== Project Actions ====================

      createProject: (name) => {
        const project = createNewProject(name)

        // Save to storage
        get()._saveProjectData(project)

        // Update state
        set((state) => {
          state.currentProjectId = project.id
          state.currentProject = project
          state.isDirty = false
          state.lastSavedAt = new Date().toISOString()
        })

        // Load floor plan into floor plan store
        useFloorPlanStore.getState().loadFloorPlan(project.floorPlan)

        // Update project list
        get()._updateProjectList()

        return project.id
      },

      loadProject: (id) => {
        const project = get()._loadProjectData(id)
        if (!project) return false

        set((state) => {
          state.currentProjectId = project.id
          state.currentProject = project
          state.isDirty = false
          state.lastSavedAt = project.updatedAt
        })

        // Load floor plan into floor plan store
        useFloorPlanStore.getState().loadFloorPlan(project.floorPlan)

        return true
      },

      // Restore project metadata without overwriting floor plan store
      // Used after hydration when floor plan is already restored from its own persistence
      restoreProjectMetadataOnly: (id) => {
        const project = get()._loadProjectData(id)
        if (!project) return false

        set((state) => {
          state.currentProjectId = project.id
          state.currentProject = project
          state.isDirty = false
          state.lastSavedAt = project.updatedAt
        })

        // DON'T call loadFloorPlan - floor plan store already has correct data from hydration
        return true
      },

      saveProject: () => {
        const state = get()
        if (!state.currentProject) return

        // Get current floor plan from floor plan store
        const floorPlan = useFloorPlanStore.getState().floorPlan

        const updatedProject: Project = {
          ...state.currentProject,
          floorPlan,
          updatedAt: new Date().toISOString(),
        }

        // Save to storage
        get()._saveProjectData(updatedProject)

        set((s) => {
          s.currentProject = updatedProject
          s.isDirty = false
          s.lastSavedAt = updatedProject.updatedAt
        })

        // Update project list
        get()._updateProjectList()
      },

      deleteProject: (id) => {
        // Remove from storage
        try {
          localStorage.removeItem(getProjectKey(id))
        } catch (e) {
          console.error('Failed to delete project:', e)
        }

        set((state) => {
          state.projects = state.projects.filter((p) => p.id !== id)

          // If deleting current project, clear it
          if (state.currentProjectId === id) {
            state.currentProjectId = null
            state.currentProject = null
            state.isDirty = false
            useFloorPlanStore.getState().clearFloorPlan()
          }
        })

        // Update project list in storage
        get()._updateProjectList()
      },

      duplicateProject: (id) => {
        const original = get()._loadProjectData(id)
        if (!original) return null

        const newProject: Project = {
          ...original,
          id: crypto.randomUUID(),
          name: `${original.name} (Copy)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          floorPlan: {
            ...original.floorPlan,
            id: crypto.randomUUID(),
          },
        }

        get()._saveProjectData(newProject)
        get()._updateProjectList()

        return newProject.id
      },

      renameProject: (id, name) => {
        const project = get()._loadProjectData(id)
        if (!project) return

        const updatedProject = {
          ...project,
          name,
          updatedAt: new Date().toISOString(),
        }

        get()._saveProjectData(updatedProject)

        set((state) => {
          if (state.currentProjectId === id && state.currentProject) {
            state.currentProject.name = name
          }
          const projectSummary = state.projects.find((p) => p.id === id)
          if (projectSummary) {
            projectSummary.name = name
          }
        })
      },

      // ==================== Settings Actions ====================

      updateSettings: (settings) => {
        set((state) => {
          if (state.currentProject) {
            state.currentProject.settings = {
              ...state.currentProject.settings,
              ...settings,
            }
            state.isDirty = true
          }
        })
      },

      // ==================== State Actions ====================

      setDirty: (dirty) => {
        set((state) => {
          state.isDirty = dirty
        })
      },

      setAutoSave: (enabled) => {
        set((state) => {
          state.autoSaveEnabled = enabled
        })
      },

      // ==================== Internal Methods ====================

      _saveProjectData: (project) => {
        try {
          localStorage.setItem(getProjectKey(project.id), JSON.stringify(project))
        } catch (e) {
          console.error('Failed to save project:', e)
        }
      },

      _loadProjectData: (id) => {
        try {
          const data = localStorage.getItem(getProjectKey(id))
          if (data) {
            return JSON.parse(data) as Project
          }
        } catch (e) {
          console.error('Failed to load project:', e)
        }
        return null
      },

      _updateProjectList: () => {
        // Scan localStorage for all projects
        const projects: ProjectSummary[] = []

        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key?.startsWith(`${STORAGE_PREFIX}project:`)) {
              const data = localStorage.getItem(key)
              if (data) {
                const project = JSON.parse(data) as Project
                projects.push({
                  id: project.id,
                  name: project.name,
                  createdAt: project.createdAt,
                  updatedAt: project.updatedAt,
                  thumbnail: project.thumbnail,
                })
              }
            }
          }
        } catch (e) {
          console.error('Failed to update project list:', e)
        }

        // Sort by updated date (most recent first)
        projects.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )

        set((state) => {
          state.projects = projects
        })
      },
    })),
    {
      name: 'home-planner-state',
      partialize: (state) => ({
        currentProjectId: state.currentProjectId,
        autoSaveEnabled: state.autoSaveEnabled,
      }),
    }
  )
)

// Auto-save hook
export function useAutoSave(intervalMs: number = 30000) {
  const { isDirty, autoSaveEnabled, saveProject } = useProjectStore()

  // Set up auto-save interval
  if (typeof window !== 'undefined') {
    setInterval(() => {
      if (isDirty && autoSaveEnabled) {
        saveProject()
      }
    }, intervalMs)
  }
}
