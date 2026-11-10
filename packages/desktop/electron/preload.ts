import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  setWindowSize: (width: number, height: number) => {
    ipcRenderer.send('set-window-size', { width, height });
  },
  minimizeToTray: () => {
    ipcRenderer.send('minimize-to-tray');
  },
});
