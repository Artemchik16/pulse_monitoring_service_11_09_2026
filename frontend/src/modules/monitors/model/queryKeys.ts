export const monitorKeys = {
  all: ['monitors'] as const,
  list: () => [...monitorKeys.all, 'list'] as const,
  summary: () => [...monitorKeys.all, 'summary'] as const,
  detail: (id: number) => [...monitorKeys.all, 'detail', id] as const,
}
