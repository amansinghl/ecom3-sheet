export function canAccessSheet(sheetId: string, email?: string | null): boolean {
  return sheetId !== 'leads' || email?.trim().toLowerCase() === 'radhika.kute@vamaship.com';
}
