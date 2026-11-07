import { sortByFields } from '@/utils'

// The number of the .group-tint-N classes defined in styles/common.scss
export const GROUP_TINT_COUNT = 8

// Keeps a patron and their dependents together, with the patron going first.
// A group takes the place of its patron among the others, whose position is
// determined the same way, since those paying for themselves are their own
// patrons. The patron's id doesn't let the groups of namesakes mix.
export function arrangeParticipants(participants) {
  const participantsMap = new Map(participants.map((item) => [item.id, item]))
  const rows = participants.map((participant) => {
    const patron = participantsMap.get(participant.patron) ?? participant
    return {
      participant,
      patronName: patron.name,
      patronId: patron.id,
      dependent: patron === participant ? 0 : 1,
      name: participant.name,
      id: participant.id
    }
  })
  sortByFields(rows, ['patronName', 'patronId', 'dependent', 'name', 'id'])
  return rows.map(({ participant }) => participant)
}

// The order of the tints depends on the hexadecimal seed only, so that a split
// looks the same for everyone, but not every split starts with the same tint
function shuffleTints(count, seed = '') {
  const tints = Array.from({ length: count }, (_, index) => index)
  for (let index = count - 1, byte = 0; index > 0; index--, byte++) {
    const value = parseInt(seed.slice(byte * 2, byte * 2 + 2), 16) || 0
    const other = value % (index + 1)
    ;[tints[index], tints[other]] = [tints[other], tints[index]]
  }
  return tints
}

// Maps the ids of the members of the groups to their tints, given in order of
// the groups' appearance, so neighboring groups always get different tints.
// Those paying only for themselves aren't in the map.
export function getGroupTints(participants, seed, count = GROUP_TINT_COUNT) {
  const tints = shuffleTints(count, seed)
  const participantsMap = new Map(participants.map((item) => [item.id, item]))
  const groups = new Map()
  const result = new Map()
  for (const { id, patron } of participants) {
    if (!participantsMap.has(patron)) continue
    if (!groups.has(patron)) groups.set(patron, tints[groups.size % count])
    result.set(id, groups.get(patron))
    result.set(patron, groups.get(patron))
  }
  return result
}
