import { NoCProject } from '../types/noc';
import { generateGem5PythonScript } from './pythonGenerator';

declare global {
  interface Window {
    electronAPI?: {
      saveFile: (filename: string, content: string, filters: Array<{ name: string; extensions: string[] }>) => Promise<boolean>;
      openFile: (filters: Array<{ name: string; extensions: string[] }>) => Promise<{ filename: string; content: string } | null>;
    };
  }
}

/**
 * Saves project configuration as .gnoc native file format
 */
export async function saveProjectGnoc(project: NoCProject): Promise<void> {
  const updatedProject: NoCProject = {
    ...project,
    modified: new Date().toISOString(),
  };

  const jsonString = JSON.stringify(updatedProject, null, 2);
  const filename = `${sanitizeFilename(project.name)}.gnoc`;

  if (window.electronAPI?.saveFile) {
    await window.electronAPI.saveFile(filename, jsonString, [
      { name: 'Garnet NoC Configuration (*.gnoc)', extensions: ['gnoc'] },
      { name: 'JSON Files (*.json)', extensions: ['json'] },
    ]);
  } else {
    // Web Fallback Blob Download
    downloadBlob(jsonString, filename, 'application/json');
  }
}

/**
 * Exports project as executable gem5 Python script (.py)
 */
export async function exportGem5Python(project: NoCProject): Promise<void> {
  const pyScript = generateGem5PythonScript(project);
  const filename = `garnet_${sanitizeFilename(project.name).toLowerCase()}_config.py`;

  if (window.electronAPI?.saveFile) {
    await window.electronAPI.saveFile(filename, pyScript, [
      { name: 'Python Scripts (*.py)', extensions: ['py'] },
    ]);
  } else {
    // Web Fallback Blob Download
    downloadBlob(pyScript, filename, 'text/x-python');
  }
}

/**
 * Loads project configuration from .gnoc native JSON file
 */
export async function openProjectGnoc(): Promise<NoCProject | null> {
  if (window.electronAPI?.openFile) {
    const file = await window.electronAPI.openFile([
      { name: 'Garnet NoC Configuration (*.gnoc, *.json)', extensions: ['gnoc', 'json'] },
    ]);
    if (!file) return null;
    return JSON.parse(file.content) as NoCProject;
  } else {
    // Web Fallback File Picker
    return new Promise<NoCProject | null>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.gnoc,.json';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const parsed = JSON.parse(event.target?.result as string) as NoCProject;
            resolve(parsed);
          } catch (err) {
            console.error('Failed to parse .gnoc file', err);
            alert('Invalid .gnoc file format.');
            resolve(null);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}
