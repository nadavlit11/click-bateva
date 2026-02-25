export type Strength = 'weak' | 'medium' | 'strong'

export function getStrength(pw: string): Strength {
  if (pw.length < 8) return 'weak'
  const hasLetter = /[a-zA-Z]/.test(pw)
  const hasNumber = /[0-9]/.test(pw)
  if (!hasLetter || !hasNumber) return 'medium'
  return 'strong'
}

export function isPasswordValid(pw: string): boolean {
  return pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw)
}

export const PASSWORD_ERROR = 'הסיסמה חייבת להכיל לפחות 8 תווים, אות אחת ומספר אחד'

export const strengthLabel: Record<Strength, string> = {
  weak: 'חלשה',
  medium: 'בינונית',
  strong: 'חזקה',
}

export const strengthColor: Record<Strength, string> = {
  weak: 'bg-red-500',
  medium: 'bg-yellow-500',
  strong: 'bg-green-500',
}

export const strengthWidth: Record<Strength, string> = {
  weak: 'w-1/3',
  medium: 'w-2/3',
  strong: 'w-full',
}
