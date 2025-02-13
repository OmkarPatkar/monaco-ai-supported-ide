const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let currentWorkingDirectory = process.cwd();

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('frontend/index.html');
    return win;
}

function createMenu() {
    const isMac = process.platform === 'darwin';
    const template = [
        // { role: 'appMenu' }
        ...(isMac ? [{
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        }] : []),
        // { role: 'fileMenu' }
        {
            label: 'File',
            submenu: [
                {
                    label: 'New File',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        BrowserWindow.getFocusedWindow()?.webContents.send('new-file');
                    }
                },
                {
                    label: 'New Window',
                    accelerator: 'CmdOrCtrl+Shift+N',
                    click: () => createWindow()
                },
                { type: 'separator' },
                {
                    label: 'Open File...',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        const result = await dialog.showOpenDialog({
                            properties: ['openFile'],
                            filters: [{ name: 'All Files', extensions: ['*'] }]
                        });
                        if (!result.canceled && result.filePaths.length > 0) {
                            BrowserWindow.getFocusedWindow()?.webContents.send('file-opened', result.filePaths[0]);
                        }
                    }
                },
                {
                    label: 'Open Folder...',
                    accelerator: 'CmdOrCtrl+K CmdOrCtrl+O',
                    click: async () => {
                        const result = await dialog.showOpenDialog({
                            properties: ['openDirectory']
                        });
                        if (!result.canceled && result.filePaths.length > 0) {
                            BrowserWindow.getFocusedWindow()?.webContents.send('folder-opened', result.filePaths[0]);
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        BrowserWindow.getFocusedWindow()?.webContents.send('save-file');
                    }
                },
                {
                    label: 'Save As...',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: async () => {
                        const result = await dialog.showSaveDialog({
                            filters: [{ name: 'All Files', extensions: ['*'] }]
                        });
                        if (!result.canceled && result.filePath) {
                            BrowserWindow.getFocusedWindow()?.webContents.send('save-file-as', result.filePath);
                        }
                    }
                },
                { type: 'separator' },
                isMac ? { role: 'close' } : { role: 'quit' }
            ]
        },
        // { role: 'editMenu' }
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                ...(isMac ? [
                    { role: 'pasteAndMatchStyle' },
                    { role: 'delete' },
                    { role: 'selectAll' },
                    { type: 'separator' },
                    {
                        label: 'Speech',
                        submenu: [
                            { role: 'startSpeaking' },
                            { role: 'stopSpeaking' }
                        ]
                    }
                ] : [
                    { role: 'delete' },
                    { type: 'separator' },
                    { role: 'selectAll' }
                ])
            ]
        },
        // { role: 'viewMenu' }
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        // { role: 'windowMenu' }
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                ...(isMac ? [
                    { type: 'separator' },
                    { role: 'front' },
                    { type: 'separator' },
                    { role: 'window' }
                ] : [
                    { role: 'close' }
                ])
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
    createMenu();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Add this with other IPC handlers
ipcMain.on('open-in-explorer', async (event, folderPath) => {
    try {
        await shell.openPath(folderPath);
        event.reply('open-in-explorer-result', true);
    } catch (error) {
        console.error('Failed to open in explorer:', error);
        event.reply('open-in-explorer-result', false);
    }
});

// IPC handlers for menu actions
ipcMain.on('new-file', () => {
    createWindow();
});

ipcMain.on('new-window', () => {
    createWindow();
});

ipcMain.on('open-file-dialog', async (event) => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        event.reply('file-opened', result.filePaths[0]);
    }
});

ipcMain.handle('open-folder-dialog', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Open Folder',
        buttonLabel: 'Open'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        return { folderPath: result.filePaths[0] };
    }
    return { folderPath: null };
});

ipcMain.on('save-file', async (event, content) => {
    // If file is already open, save to that path
    // Otherwise, trigger save-as
    event.reply('save-file-result', true);
});

ipcMain.on('save-file-as', async (event, content) => {
    const result = await dialog.showSaveDialog({
        filters: [
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    
    if (!result.canceled && result.filePath) {
        // Save content to file
        event.reply('save-file-result', true);
    }
});

// Add these IPC handlers
ipcMain.handle('set-working-directory', async (_, newPath) => {
    try {
        process.chdir(newPath);
        currentWorkingDirectory = newPath;
        return { success: true };
    } catch (error) {
        console.error('Error setting working directory:', error);
        throw error;
    }
});

ipcMain.handle('get-directory-contents', async (_, dirPath = currentWorkingDirectory) => {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const contents = await Promise.all(entries.map(async entry => {
            const fullPath = path.join(dirPath, entry.name);
            const stats = await fs.stat(fullPath);
            return {
                name: entry.name,
                type: entry.isDirectory() ? 'folder' : 'file',
                path: fullPath,
                children: entry.isDirectory() ? await getDirectoryContents(fullPath) : []
            };
        }));
        return contents;
    } catch (error) {
        console.error('Error reading directory:', error);
        throw error;
    }
});

async function getDirectoryContents(dirPath) {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        return await Promise.all(entries.map(async entry => {
            const fullPath = path.join(dirPath, entry.name);
            return {
                name: entry.name,
                type: entry.isDirectory() ? 'folder' : 'file',
                path: fullPath,
                children: entry.isDirectory() ? await getDirectoryContents(fullPath) : []
            };
        }));
    } catch (error) {
        console.error('Error reading subdirectory:', error);
        return [];
    }
}

// Add this with the other IPC handlers
ipcMain.handle('get-working-directory', async () => {
    return currentWorkingDirectory;
}); 