import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/app/session'
import { profileApi } from '@/services/profile'

export const profileKey = (userId?: string) => ['profile', userId ?? 'anon'] as const

export function useProfile() {
  const { session } = useSession()
  return useQuery({ queryKey: profileKey(session?.user.id), queryFn: ({ signal }) => profileApi.get(signal), enabled: !!session })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  const { session, updateUser } = useSession()
  return useMutation({
    mutationFn: (name: string) => profileApi.update(name),
    onSuccess: (user) => {
      qc.setQueryData(profileKey(session?.user.id), user)
      updateUser(user) // mantém a sessão (ex.: nome pré-preenchido no checkout) em sincronia
    },
  })
}
