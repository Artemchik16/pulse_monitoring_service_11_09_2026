export const statusPageKeys = {
  all: ['status-pages'] as const,
  list: () => [...statusPageKeys.all, 'list'] as const,
  detail: (id: number) => [...statusPageKeys.all, 'detail', id] as const,
  public: (slug: string) => [...statusPageKeys.all, 'public', slug] as const,
}
