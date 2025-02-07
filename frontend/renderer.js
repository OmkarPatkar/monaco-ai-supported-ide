// document.addEventListener("DOMContentLoaded", async () => {
//   const sidebar = document.getElementById("sidebar");
//   const chatbotBtn = document.getElementById("chatbot-btn");
//   const fileExplorerBtn = document.getElementById("file-explorer-btn");
//   const fileContainer = document.getElementById("file-container");
//   const editorContainer = document.getElementById("editor-container");
  
//   let activeView = ""; // Keeps track of which view is active

//   function toggleSidebar(view) {
//     if (activeView === view) {
//       sidebar.classList.toggle("hidden");
//       activeView = sidebar.classList.contains("hidden") ? "" : view;
//     } else {
//       sidebar.classList.remove("hidden");
//       activeView = view;
//     }

//     // Ensure the editor resizes properly
//     setTimeout(() => {
//       editorContainer.style.width = sidebar.classList.contains("hidden") ? "100%" : "calc(100% - 350px)";
//       if (window.editor) {
//         window.editor.layout(); // Ensures Monaco Editor resizes correctly
//       }
//     }, 300);
//   }

//   chatbotBtn.addEventListener("click", () => toggleSidebar("chatbot"));
//   fileExplorerBtn.addEventListener("click", () => toggleSidebar("file-explorer"));

//   async function loadFiles(dirPath) {
//     console.log(`🗂️ Loading files from: ${dirPath}`);
//     fileContainer.innerHTML = "Loading...";
    
//     try {
//       const files = await window.electronAPI.getFiles(dirPath);
//       console.log("📁 Files received:", files);

//       fileContainer.innerHTML = "";

//       if (files.length === 0) {
//         fileContainer.innerHTML = "<p>No files found</p>";
//         return;
//       }

//       files.forEach((item) => {
//         const element = document.createElement("div");
//         element.classList.add(item.type);
//         element.innerHTML = `<i class="fas ${item.type === 'folder' ? 'fa-folder' : 'fa-file'}"></i> ${item.name}`;

//         if (item.type === "folder") {
//           element.addEventListener("click", () => {
//             loadFiles(item.path);
//           });
//         }

//         fileContainer.appendChild(element);
//       });
//     } catch (error) {
//       console.error("❌ Error fetching files:", error);
//       fileContainer.innerHTML = `<p style="color:red;">Error loading files</p>`;
//     }
//   }

//   // Fetch current working directory and load files
//   const rootPath = await window.electronAPI.getCWD();
//   loadFiles(rootPath);
// });




// 1

// const fileList = document.getElementById('file-list');
// const { ipcRenderer } = require("electron");

// // Sample File Structure (Replace with dynamic data from backend)
// const fileStructure = [
//   {
//     name: 'src',
//     type: 'folder',
//     children: [
//       { name: 'index.js', type: 'file' },
//       { name: 'styles.css', type: 'file' },
//       {
//         name: 'components',
//         type: 'folder',
//         children: [{ name: 'Sidebar.js', type: 'file' }]
//       }
//     ]
//   },
//   { name: 'README.md', type: 'file' },
//   { name: 'package.json', type: 'file' }
// ];

// // Function to Create File Explorer UI
// function createFileExplorer(files, parentElement) {
//   files.forEach(file => {
//     const item = document.createElement('div');
//     item.classList.add('file-item');

//     if (file.type === 'folder') {
//       item.classList.add('folder');
//       item.innerHTML = `<span class="folder-label"><i class="fas fa-folder folder-icon"></i>${file.name}</span>`;
//       const subList = document.createElement('div');
//       subList.classList.add('file-tree');
//       item.appendChild(subList);
//       item.addEventListener('click', () => {
//         item.classList.toggle('open');
//       });
//       createFileExplorer(file.children, subList);
//     } else {
//       item.innerHTML = `<i class="fas fa-file file-icon"></i>${file.name}`;
//     }

//     parentElement.appendChild(item);
//   });
// }

// // Load Files into Explorer
// createFileExplorer(fileStructure, fileList);


// document.getElementById("upload-btn").addEventListener("click", function () {
//   document.getElementById("file-input").click();
// });

// document.getElementById("file-input").addEventListener("change", async function () {
//   // const file = this.files[0];
//   const file = event.target.files[0];
//   if (!file) return;

//   if (file) {
//     console.log("📂 File selected:", file.name);

//   const formData = new FormData();
//   formData.append("file", file);

//   try {
//     const response = await fetch("http://127.0.0.1:5000/upload", {
//       method: "POST",
//       body: formData,
//     });

//     const result = await response.json();
//     alert(result.message);
//   } catch (error) {
//     console.error("File upload failed", error);
//   }
// });

// // Handle file upload button click
// document.getElementById("upload-btn").addEventListener("click", () => {
//   ipcRenderer.send("open-file-dialog");
// });

// // Receive selected file path from main process
// ipcRenderer.on("selected-file", (event, filePath) => {
//   if (filePath) {
//       console.log("📂 File selected:", filePath);
//       // TODO: Send file to backend for ChromaDB processing
//   }
// });


// 2

const { ipcRenderer } = require("electron");

// Handle file upload button click
document.getElementById("upload-btn").addEventListener("click", () => {
    ipcRenderer.send("open-file-dialog");
});

// Receive selected file path from main process
ipcRenderer.on("selected-file", (event, filePath) => {
    if (filePath) {
        console.log("📂 File selected:", filePath);

        // Send file path to backend for processing with ChromaDB
        fetch("http://127.0.0.1:5000/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file_path: filePath }),
        })
        .then(response => response.json())
        .then(data => {
            console.log("✅ Server response:", data);
        })
        .catch(error => {
            console.error("❌ Error sending file:", error);
        });
    }
});

document.getElementById("toggle-right-sidebar").addEventListener("click", () => {
  const rightSidebar = document.getElementById("right-sidebar");
  rightSidebar.classList.toggle("hidden");
});