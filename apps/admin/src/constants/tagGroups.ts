export const GROUP_ORDER = ['location', 'kashrut', 'price', 'audience', null] as const

export const GROUP_LABELS: Record<string, string> = {
  location: 'אזור',
  kashrut:  'כשרות',
  price:    'מחיר',
  audience: 'קהל יעד',
}
