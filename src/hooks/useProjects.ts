import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Project } from '@/types/database'

export function useProjects(includeArchived = false) {
  return useQuery<Project[]>({
    queryKey: ['projects', includeArchived],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('*, creator:profiles!projects_created_by_fkey(id, full_name, email)')
        .order('name')

      if (!includeArchived) {
        query = query.eq('archived', false)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Project[]
    },
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (project: Omit<Project, 'id' | 'created_at' | 'creator'>) => {
      const { data, error } = await supabase
        .from('projects')
        .insert(project)
        .select('*, creator:profiles!projects_created_by_fkey(id, full_name, email)')
        .single()

      if (error) throw error
      return data as Project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { creator: _c, ...clean } = updates as Record<string, unknown>
      const { data, error } = await supabase
        .from('projects')
        .update(clean)
        .eq('id', id)
        .select('*, creator:profiles!projects_created_by_fkey(id, full_name, email)')
        .single()

      if (error) throw error
      return data as Project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
