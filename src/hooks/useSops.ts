import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { SopTemplate, SopTemplateTask } from '@/types/database'

const SOP_QUERY_KEY = ['sop-templates']

export function useSopTemplates() {
  return useQuery<SopTemplate[]>({
    queryKey: SOP_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sop_templates')
        .select('*, tasks:sop_template_tasks(*)')
        .order('name')
        .order('sequence', { referencedTable: 'sop_template_tasks', ascending: true })

      if (error) throw error

      // Sort tasks by sequence within each template
      const templates = (data as SopTemplate[]).map((template) => ({
        ...template,
        tasks: (template.tasks ?? []).sort((a, b) => a.sequence - b.sequence),
      }))

      return templates
    },
  })
}

export function useCreateSopTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      template: Pick<SopTemplate, 'name' | 'department' | 'description'>
    ) => {
      const { data, error } = await supabase
        .from('sop_templates')
        .insert(template)
        .select()
        .single()

      if (error) throw error
      return data as SopTemplate
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SOP_QUERY_KEY })
    },
  })
}

export function useUpdateSopTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Pick<SopTemplate, 'id'> &
      Partial<Pick<SopTemplate, 'name' | 'department' | 'description'>>) => {
      const { data, error } = await supabase
        .from('sop_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as SopTemplate
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SOP_QUERY_KEY })
    },
  })
}

export function useDeleteSopTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sop_templates')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SOP_QUERY_KEY })
    },
  })
}

export function useCreateSopTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      task: Pick<
        SopTemplateTask,
        'sop_template_id' | 'sequence' | 'title' | 'duration_hours' | 'default_urgency'
      >
    ) => {
      const { data, error } = await supabase
        .from('sop_template_tasks')
        .insert(task)
        .select()
        .single()

      if (error) throw error
      return data as SopTemplateTask
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SOP_QUERY_KEY })
    },
  })
}

export function useUpdateSopTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Pick<SopTemplateTask, 'id'> &
      Partial<
        Pick<SopTemplateTask, 'sequence' | 'title' | 'duration_hours' | 'default_urgency'>
      >) => {
      const { data, error } = await supabase
        .from('sop_template_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as SopTemplateTask
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SOP_QUERY_KEY })
    },
  })
}

export function useDeleteSopTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sop_template_tasks')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SOP_QUERY_KEY })
    },
  })
}
