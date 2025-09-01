/**
 * Converts a string to kebab case
 * @param str The input string
 * @returns The kebab-cased string
 */
export function toKebabCase(str: string): string {
  return str
    .replaceAll(/([a-z])([A-Z])/g, '$1-$2')
    .replaceAll(/[\s_]+/g, '-')
    .toLowerCase()
}

/**
 * Truncates a string to a maximum length with ellipsis
 * @param str The input string
 * @param maxLength The maximum length
 * @returns The truncated string
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return `${str.slice(0, maxLength - 3)}...`
}

/**
 * Generates a URL-friendly slug from a string
 * @param str The input string
 * @returns The slugified string
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replaceAll(/[^\w\s-]/g, '')
    .replaceAll(/[\s_-]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
}

/**
 * Capitalizes the first letter of each word in a string
 * @param str The input string
 * @returns The title-cased string
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
