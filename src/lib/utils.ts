import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for cleaner class names using tailwind-merge and clsx
 */
export function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}
