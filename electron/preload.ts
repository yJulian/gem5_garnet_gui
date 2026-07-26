import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (filename: string, content: string, filters: any[]) =>
    ipcRenderer.invoke('dialog:saveFile', filename, content, filters),
  openFile: (filters: any[]) => ipcRenderer.invoke('dialog:openFile', filters),
});
