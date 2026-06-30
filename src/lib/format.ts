export function formatMMK(n: number): string {
  const abs = Math.abs(n)
  return (n < 0 ? '-' : '') + abs.toLocaleString('en-US') + ' Ks'
}

export const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-GB')
}
