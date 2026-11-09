export const playgroundKeys = {
  all: ['playground'] as const,
  targets: () => [...playgroundKeys.all, 'targets'] as const,
}
