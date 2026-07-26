"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    saveFile: (filename, content, filters) => electron_1.ipcRenderer.invoke('dialog:saveFile', filename, content, filters),
    openFile: (filters) => electron_1.ipcRenderer.invoke('dialog:openFile', filters),
});
