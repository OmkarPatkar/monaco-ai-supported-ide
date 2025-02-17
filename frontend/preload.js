const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// specific electron APIs without exposing the entire API
contextBridge.exposeInMainWorld(
    'electron',
    {
        ipcRenderer: {
            invoke: (channel, data) => {
                const validChannels = [
                    'create-file',
                    'read-file',
                    'save-file',
                    'get-workspace-files',
                    'rename-file',
                    'delete-file',
                    'open-file-dialog',
                    'save-file-dialog'
                ];
                if (validChannels.includes(channel)) {
                    return ipcRenderer.invoke(channel, data);
                }
            }
        }
    }
);