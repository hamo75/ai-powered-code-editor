// Default file templates for new projects
// Updated to be completely empty to support real file system only

import { FileNode } from '../types';

/**
 * Empty default state. 
 * The application starts with no files until the user opens a real folder.
 */
export const emptyDefaultFiles: FileNode[] = [];

/**
 * Deprecated: Legacy demo files removed to enforce real file system usage.
 * Keeping the export for backward compatibility but returning empty array.
 */
export const defaultFiles: FileNode[] = [];
