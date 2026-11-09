import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { playgroundKeys } from '../model/queryKeys'
import type { PlaygroundMode, PlaygroundTarget } from '../model/types'
import { playgroundApi } from './playgroundApi'

export function usePlaygroundTargets() {
  return useQuery({ queryKey: playgroundKeys.targets(), queryFn: playgroundApi.targets })
}

export function useSetPlaygroundMode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slug, mode }: { slug: string; mode: PlaygroundMode }) => playgroundApi.setMode(slug, mode),
    onSuccess: (target) =>
      queryClient.setQueryData<PlaygroundTarget[]>(playgroundKeys.targets(), (targets) =>
        targets?.map((item) => (item.slug === target.slug ? target : item)),
      ),
  })
}
