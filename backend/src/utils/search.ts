export const escapeSearch = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
