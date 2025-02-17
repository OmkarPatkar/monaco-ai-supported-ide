const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const fs = require('fs').promises;
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false, // Security: disable nodeIntegration
            contextIsolation: true, // Security: enable contextIsolation
            preload: path.join(__dirname, 'preload.js') // Use preload script
        }
    });

    mainWindow.loadFile("index.html");
    
    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
}

app.whenReady().then(createWindow);

// Listen for file dialog request from renderer
ipcMain.on("open-file-dialog", async (event) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openFile"],  // Allow selecting files only
    });

    if (!result.canceled && result.filePaths.length > 0) {
        event.sender.send("selected-file", result.filePaths[0]);  // Send file path to renderer
    }
});

// Add these IPC handlers inside the app.whenReady() callback
ipcMain.handle('create-file', async (event, { path: filePath, content }) => {
    try {
        // Ensure directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        // Write file
        await fs.writeFile(filePath, content);
        return { success: true };
    } catch (error) {
        console.error('Error creating file:', error);
        throw error;
    }
});

ipcMain.handle('update-file', async (event, { path: filePath, content }) => {
    try {
        // Update existing file
        await fs.writeFile(filePath, content);
        return { success: true };
    } catch (error) {
        console.error('Error updating file:', error);
        throw error;
    }
});

// Add these handlers inside app.whenReady()
ipcMain.handle('read-file', async (_, filePath) => {
    try {
        return await fs.readFile(filePath, 'utf8');
    } catch (error) {
        console.error('Error reading file:', error);
        throw error;
    }
});

ipcMain.handle('save-file', async (_, { path, content }) => {
    await fs.writeFile(path, content);
    return { success: true };
});

ipcMain.handle('get-workspace-files', async () => {
    const workspacePath = process.cwd(); // Or your project root
    const files = [];
    
    async function scanDirectory(dirPath) {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                files.push({ 
                    name: entry.name,
                    path: fullPath,
                    isDirectory: true
                });
                await scanDirectory(fullPath);
            } else {
                files.push({
                    name: entry.name,
                    path: fullPath,
                    isDirectory: false
                });
            }
        }
    }
    
    await scanDirectory(workspacePath);
    return files;
});

ipcMain.handle('rename-file', async (_, { oldPath, newPath }) => {
    await fs.rename(oldPath, newPath);
    return { success: true };
});

ipcMain.handle('delete-file', async (_, filePath) => {
    await fs.unlink(filePath);
    return { success: true };
});

// Add these dialog handlers
ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        return { filePath: result.filePaths[0] };
    }
    return { filePath: null };
});

ipcMain.handle('save-file-dialog', async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
        filters: [
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    
    if (!result.canceled) {
        return { filePath: result.filePath };
    }
    return { filePath: null };
});

// Close app when all windows are closed
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// File system operations
ipcMain.handle('get-directory-contents', async (_, dirPath) => {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        return Promise.all(entries.map(async entry => {
            const fullPath = path.join(dirPath, entry.name);
            return {
                name: entry.name,
                path: fullPath,
                isDirectory: entry.isDirectory()
            };
        }));
    } catch (error) {
        console.error('Error reading directory:', error);
        throw error;
    }
});
