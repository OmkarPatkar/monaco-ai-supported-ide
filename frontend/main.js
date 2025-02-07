// // // main.js
// // const { app, BrowserWindow } = require('electron');
// // const path = require('path');

// // function createWindow() {
// //   const win = new BrowserWindow({
// //     width: 1200,
// //     height: 800,
// //     webPreferences: {
// //       nodeIntegration: true,
// //       contextIsolation: false
// //     }
// //   });

// //   win.loadFile('index.html');
// // }

// // app.whenReady().then(createWindow);

// // app.on('window-all-closed', () => {
// //   if (process.platform !== 'darwin') {
// //     app.quit();
// //   }
// // });






// const { app, BrowserWindow, ipcMain, dialog } = require('electron');
// const fs = require('fs');
// const path = require('path');

// let mainWindow;

// function createWindow() {
//   mainWindow = new BrowserWindow({
//     width: 1200,
//     height: 800,
//     webPreferences: {
//       nodeIntegration: true,
//       contextIsolation: false,
//       enableRemoteModule: true
//     }
//   });

//   mainWindow.loadFile('index.html');
// }

// // Handle file operations
// ipcMain.handle('open-file-dialog', async (event) => {
//   const result = await dialog.showOpenDialog({
//     properties: ['openFile', 'multiSelections']
//   });
//   return result.filePaths;
// });

// ipcMain.handle('read-file', async (event, filePath) => {
//   return fs.promises.readFile(filePath, 'utf-8');
// });

// ipcMain.handle('read-directory', async (event, dirPath) => {
//   const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
//   return files.map(dirent => ({
//     name: dirent.name,
//     path: path.join(dirPath, dirent.name),
//     isDirectory: dirent.isDirectory()
//   }));
// });

// app.whenReady().then(createWindow);


// 1

// const { app, BrowserWindow, Menu } = require('electron');

// function createWindow() {
//   const win = new BrowserWindow({
//     width: 1200,
//     height: 800,
//     webPreferences: {
//       nodeIntegration: true,
//       contextIsolation: false
//     }
//   });

//   win.loadFile('index.html');

//   // ✅ Fix: Show menu bar explicitly
//   win.setMenuBarVisibility(true);

//   // ✅ Fix: Set default menu
//   const menu = Menu.buildFromTemplate([
//     {
//       label: "File",
//       submenu: [
//         { role: "quit" }
//       ]
//     },
//     {
//       label: "Edit",
//       submenu: [
//         { role: "undo" },
//         { role: "redo" },
//         { type: "separator" },
//         { role: "cut" },
//         { role: "copy" },
//         { role: "paste" }
//       ]
//     },
//     {
//       label: "Help",
//       submenu: [
//         { label: "About" }
//       ]
//     }
//   ]);
//   Menu.setApplicationMenu(menu);
// }

// app.whenReady().then(createWindow);

// app.on('window-all-closed', () => {
//   if (process.platform !== 'darwin') {
//     app.quit();
//   }
// });



// 2

const { app, BrowserWindow, ipcMain, dialog } = require("electron");

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,  // Required for IPC communication
        },
    });

    mainWindow.loadFile("index.html");

    // Listen for file dialog request from renderer
    ipcMain.on("open-file-dialog", async (event) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ["openFile"],  // Allow selecting files only
        });

        if (!result.canceled && result.filePaths.length > 0) {
            event.sender.send("selected-file", result.filePaths[0]);  // Send file path to renderer
        }
    });
});

// Close app when all windows are closed
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
