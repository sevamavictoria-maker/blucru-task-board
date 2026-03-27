import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TaskActivity } from '@/types/database'

export function useTaskActivity(taskId: string | undefined) {
  return useQuery<TaskActivity[]>({
    queryKey: ['task-activity', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_activity')
        .select('*, user:profiles(id, full_name, avatar)')
        .eq('task_id', taskId!)
        .order('timestamp', { ascending: true })

      if (error) throw error
      return data as TaskActivity[]
    },
    enabled: !!taskId,
  })
}

export function useAddComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      taskId,
      userId,
      comment,
    }: {
      taskId: string
      userId: string
      comment: string
    }) => {
      const { data, error } = await supabase
        .from('task_activity')
        .insert({
          task_id: taskId,
          type: 'comment',
          user_id: userId,
          data: { comment },
        })
        .select('*, user:profiles(id, full_name, avatar)')
        .single()

      if (error) throw error
      return data as TaskActivity
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-activity', variables.taskId] })
    },
  })
}

export function useAddActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (activity: Omit<TaskActivity, 'id' | 'timestamp' | 'user'>) => {
      const { data, error } = await supabase
        .from('task_activity')
        .insert(activity)
        .select('*, user:profiles(id, full_name, avatar)')
        .single()

      if (error) throw error
      return data as TaskActivity
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-activity', variables.task_id] })
    },
  })
}
