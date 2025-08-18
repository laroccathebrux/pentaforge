import * as fs from 'fs/promises';
import * as path from 'path';
import { log } from './log.js';

export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    log.info(`Directory ensured: ${dirPath}`);
  } catch (error) {
    log.error(`Failed to create directory ${dirPath}: ${error}`);
    throw error;
  }
}

export async function writeFileAtomic(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  
  try {
    // Write to temp file first
    await fs.writeFile(tempPath, content, 'utf-8');
    
    // Rename atomically
    await fs.rename(tempPath, filePath);
    
    log.info(`File written successfully: ${filePath}`);
  } catch (error) {
    // Clean up temp file if it exists
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    
    log.error(`Failed to write file ${filePath}: ${error}`);
    throw error;
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readFile(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    log.error(`Failed to read file ${filePath}: ${error}`);
    throw error;
  }
}

export async function listFiles(dirPath: string): Promise<string[]> {
  try {
    const files = await fs.readdir(dirPath);
    return files;
  } catch (error) {
    log.error(`Failed to list files in ${dirPath}: ${error}`);
    throw error;
  }
}

export function resolvePath(...segments: string[]): string {
  return path.resolve(...segments);
}

export function joinPath(...segments: string[]): string {
  return path.join(...segments);
}

export function getBasename(filePath: string): string {
  return path.basename(filePath);
}

export function getDirname(filePath: string): string {
  return path.dirname(filePath);
}