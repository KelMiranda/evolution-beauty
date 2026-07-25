import { getFacilitators } from '@/services/api'

export type FacilitatorOption = { id: string; name: string }

let facilitatorsCache: FacilitatorOption[] | null = null
let facilitatorsPromise: Promise<FacilitatorOption[]> | null = null

export async function getFacilitatorsCached(): Promise<FacilitatorOption[]> {
  if (facilitatorsCache) return facilitatorsCache
  if (!facilitatorsPromise) {
    facilitatorsPromise = getFacilitators()
      .then(data => {
        facilitatorsCache = data
        return data
      })
      .finally(() => {
        facilitatorsPromise = null
      })
  }

  return facilitatorsPromise
}

export function resolveFacilitatorName(
  facilitatorId?: string | null,
  facilitators: FacilitatorOption[] = [],
): string {
  if (!facilitatorId) return ''
  return facilitators.find(facilitator => facilitator.id === facilitatorId)?.name ?? facilitatorId
}
