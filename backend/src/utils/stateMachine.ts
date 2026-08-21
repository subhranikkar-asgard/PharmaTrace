// State machine — from DATABASE.md §3
// Defines valid unit status transitions

export const VALID_TRANSITIONS: Record<string, string[]> = {
  REGISTERED:      ['MANUFACTURED'],
  MANUFACTURED:    ['IN_DISTRIBUTION'],
  IN_DISTRIBUTION: ['AT_DISTRIBUTOR'],
  AT_DISTRIBUTOR:  ['AT_WHOLESALER'],
  AT_WHOLESALER:   ['AT_PHARMACY'],
  AT_PHARMACY:     ['SOLD', 'RECALLED', 'SUSPICIOUS'],
  SOLD:            ['RECALLED'],
  SUSPICIOUS:      ['RECALLED'],
  RECALLED:        [],
  EXPIRED:         [],
  BLOCKED:         [],
};

// Maps sender org type to the resulting unit status after transfer
export const ORG_TYPE_TO_STATUS: Record<string, string> = {
  MANUFACTURER: 'AT_DISTRIBUTOR',
  DISTRIBUTOR:  'AT_WHOLESALER',
  WHOLESALER:   'AT_PHARMACY',
};

export function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
