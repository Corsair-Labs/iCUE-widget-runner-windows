'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('icueWindow', {
  minimize() {
    ipcRenderer.send('window:minimize');
  },
  toggleMaximize() {
    ipcRenderer.send('window:toggle-maximize');
  },
  close() {
    ipcRenderer.send('window:close');
  }
});
