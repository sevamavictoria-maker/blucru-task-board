import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Subtask } from '@/types/database'

export function useSubtasks(taskId: string | undefined) {
  return useQuery<Subtask[]>({
    queryKey: ['subtasks', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subtasks')
        .select('*, assignee:profiles!subtasks_assignee_id_fkey(id, full_name, email)')
        .eq('task_id', taskId!)
        .order('sequence', { ascending: true })

      if (error) throw error
      return data as Subtask[]
    },
    enabled: !!taskId,
  })
}

export function useCreateSubtask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (subtask: Pick<Subtask, 'task_id' | 'title' | 'sequence' | 'assignee_id'>) => {
      const { data, error } = await supabase
        .from('subtasks')
        .insert({ ...subtask, completed: false })
        .select('*, assignee:profiles!subtasks_assignee_id_fkey(id, full_name, email)')
        .single()

      if (error) throw error
      return data as Subtask
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.task_id] })
    },
  })
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, task_id, ...updates }: Partial<Subtask> & { id: string; task_id: string }) => {
      const { assignee: _a, ...clean } = updates as Record<string, unknown>
      const { data, error } = await supabase
        .from('subtasks')
        .update(clean)
        .eq('id', id)
        .select('*, assignee:profiles!subtasks_assignee_id_fkey(id, full_name, email)')
        .single()

      if (error) throw error
      return { ...data, task_id } as Subtask
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.task_id] })
    },
  })
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, task_id }: { id: string; task_id: string }) => {
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { task_id }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.task_id] })
    },
  })
}
