// ============================================================================
// 📂 File Import Dialog Hook
// Provides file/folder import dialogs using browser capabilities
// ============================================================================

import { useRef, useCallback } from 'react';
import type { RefObject } from 'react';

import {
  readFolderFiles,
  readFileContent,
  isValidImportFile,
  formatImportStats,
} from '../utils/fileSystem';

import type { ImportedFile, ImportStats } from '../utils/fileSystem';

export interface ImportFilesResult {
  files: ImportedFile[];
  skipped: string[];
  stats?: ImportStats;
}

export interface ImportFolderResult {
  files: ImportedFile[];
  skipped: string[];
  stats?: ImportStats;
}

/**
 * اختياري: خيارات استيراد المجلد.
 * (مكتوبة هنا محليًا لتجنب كسر البناء لو لم تكن مُعرّفة داخل fileSystem.ts عندك)
 */
export type FolderImportOptions = {
  preserveRootFolder?: boolean;
  maxDepth?: number;
  excludeDotFiles?: boolean;
  excludeDotDirs?: boolean;
  excludedDirs?: string[];
  excludedFiles?: string[];
};

const toErrorMessage = (e: unknown): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'حدث خطأ غير معروف';
};

const resetInputValue = (ref: RefObject<HTMLInputElement>) => {
  if (ref.current) ref.current.value = '';
};

export const useFileImport = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  /**
   * Trigger file selection dialog
   */
  const openFileDialog = useCallback(() => {
    resetInputValue(fileInputRef);
    fileInputRef.current?.click();
  }, []);

  /**
   * Trigger folder selection dialog (webkitdirectory)
   */
  const openFolderDialog = useCallback(() => {
    resetInputValue(folderInputRef);
    folderInputRef.current?.click();
  }, []);

  /**
   * Trigger project import dialog (JSON)
   */
  const openImportDialog = useCallback(() => {
    resetInputValue(jsonInputRef);
    jsonInputRef.current?.click();
  }, []);

  /**
   * Handle file import (single/multi select)
   */
  const importFiles = useCallback(
    async (fileList: FileList | null): Promise<ImportFilesResult> => {
      if (!fileList || fileList.length === 0) {
        return { files: [], skipped: [] };
      }

      const files: ImportedFile[] = [];
      const skipped: string[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];

        if (!isValidImportFile(file)) {
          skipped.push(`${file.name} (نوع غير مدعوم/ثنائي/كبير)`);
          continue;
        }

        try {
          const content = await readFileContent(file);
          files.push({
            name: file.name,
            content,
            path: [],
            size: file.size,
            lastModified: file.lastModified,
          });
        } catch (e) {
          skipped.push(`${file.name} (فشل القراءة: ${toErrorMessage(e)})`);
        }
      }

      return { files, skipped };
    },
    []
  );

  /**
   * Handle folder import with webkitdirectory
   *
   * ملاحظة: بعض نسخ readFolderFiles عندك قد لا تدعم options (باراميتر ثاني).
   * لذلك نستدعيها بطريقة safe عبر (as any) لتفادي أخطاء TypeScript.
   */
  const importFolder = useCallback(
    async (
      fileList: FileList | null,
      options: Partial<FolderImportOptions> = {}
    ): Promise<ImportFolderResult> => {
      if (!fileList || fileList.length === 0) {
        return { files: [], skipped: [] };
      }

      try {
        // دعم النسختين:
        // - readFolderFiles(fileList)
        // - readFolderFiles(fileList, options)
        const result = await (readFolderFiles as any)(fileList, {
          preserveRootFolder: true,
          ...options,
        });

        const rawFiles: ImportedFile[] = result?.files ?? [];
        const stats: ImportStats | undefined = result?.stats;

        const skipped =
          stats?.skippedReasons?.map(({ file, reason }: any) => `${file} (${reason})`) ?? [];

        if (stats) {
          // eslint-disable-next-line no-console
          console.log(formatImportStats(stats));
        }

        return { files: rawFiles, skipped, stats };
      } catch (e) {
        return {
          files: [],
          skipped: [`فشل استيراد المجلد: ${toErrorMessage(e)}`],
        };
      }
    },
    []
  );

  /**
   * Read JSON file for project import
   */
  const readJSON = useCallback(async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        try {
          resolve(JSON.parse(String(reader.result ?? '')));
        } catch {
          reject(new Error('ملف JSON غير صالح'));
        }
      };

      reader.onerror = () => reject(new Error('فشل قراءة الملف'));
      reader.readAsText(file);
    });
  }, []);

  return {
    fileInputRef,
    folderInputRef,
    jsonInputRef,

    openFileDialog,
    openFolderDialog,
    openImportDialog,

    importFiles,
    importFolder,
    readJSON,
  };
};