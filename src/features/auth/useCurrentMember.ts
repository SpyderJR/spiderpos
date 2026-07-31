import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'

export function useCurrentMember() {
  const session = useAuthStore((state) => state.session)
  const userId = session?.user.id

  return useQuery({
    queryKey: ['current-member', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_members')
        .select('*, stores(*)')
        .eq('user_id', userId!)
        .single()
      if (error) throw error
      return data
    },
    staleTime: 60_000,
  })
}
