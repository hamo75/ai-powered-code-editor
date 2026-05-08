// Utility functions for the Store

import { FileNode } from '../types';

export const getLanguageFromName = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    html: 'html', css: 'css', js: 'javascript', ts: 'typescript',
    tsx: 'typescript', jsx: 'javascript', py: 'python', json: 'json',
    md: 'markdown', txt: 'plaintext', sh: 'shell', yaml: 'yaml',
    yml: 'yaml', xml: 'xml', sql: 'sql', rb: 'ruby', go: 'go',
    rs: 'rust', java: 'java', cpp: 'cpp', c: 'c', php: 'php',
    dart: 'dart', env: 'plaintext', gitignore: 'plaintext', dockerfile: 'dockerfile',
  };
  return map[ext] || 'plaintext';
};

export const normalizeProjectSegments = (input: string): string[] =>
  input
    .replace(/\\/g, '/')
    .split('/')
    .map(part => part.trim())
    .filter(part => part && part !== '.' && part !== '..');

export const getRootFolder = (files: FileNode[]): FileNode | undefined =>
  files.find(file => file.type === 'folder' && file.parentId === null);

export const getRelativeSegments = (files: FileNode[], input: string): string[] => {
  const segments = normalizeProjectSegments(input);
  const rootFolder = getRootFolder(files);
  if (rootFolder && segments[0] === rootFolder.name) {
    return segments.slice(1);
  }
  return segments;
};

export const buildRelativePath = (files: FileNode[], file: FileNode): string => {
  const rootId = getRootFolder(files)?.id;
  const parts = [file.name];
  let parentId = file.parentId;

  while (parentId) {
    const parent = files.find(node => node.id === parentId);
    if (!parent) break;
    if (parent.id !== rootId) {
      parts.push(parent.name);
    }
    parentId = parent.parentId;
  }

  return parts.reverse().join('/');
};

export const ensureFolderChain = (
  getFiles: () => FileNode[],
  createFolder: (parentId: string, name: string) => FileNode | null,
  parentId: string,
  folderNames: string[],
): string => {
  let currentParentId = parentId;

  for (const folderName of folderNames) {
    const existing = getFiles().find(
      file => file.type === 'folder' && file.name === folderName && file.parentId === currentParentId
    );

    if (existing) {
      currentParentId = existing.id;
      continue;
    }

    const created = createFolder(currentParentId, folderName);
    if (!created) break;
    currentParentId = created.id;
  }

  return currentParentId;
};

export const findFileByRelativePath = (files: FileNode[], rawPath: string): FileNode | undefined => {
  const segments = getRelativeSegments(files, rawPath);
  if (segments.length === 0) return undefined;

  const targetPath = segments.join('/');
  const fileName = segments[segments.length - 1];

  const exactMatch = files.find(
    file => file.type === 'file' && buildRelativePath(files, file) === targetPath
  );
  if (exactMatch) return exactMatch;

  if (segments.length === 1) {
    return files.find(file => file.type === 'file' && file.name === fileName);
  }

  return undefined;
};

export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 90000): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};
