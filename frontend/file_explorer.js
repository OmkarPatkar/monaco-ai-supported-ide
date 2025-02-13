// Utility function to show toast notifications
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger reflow
    toast.offsetHeight;

    // Show the toast
    toast.classList.add('show');

    // Hide and remove the toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

class FileExplorer {
    constructor() {
        this.container = document.getElementById('file-tree-container');
        this.initializeFileExplorer();
    }

    initializeFileExplorer() {
        // Add header with Open in Explorer button
        const header = document.createElement('div');
        header.className = 'file-tree-header';
        header.innerHTML = `
            <span>EXPLORER</span>
            <div class="tree-controls">
                <button class="tree-header-btn" title="Open in Explorer">
                    <i class="fas fa-folder-open"></i>
                </button>
                <button class="tree-header-btn refresh-btn" title="Refresh">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </div>
        `;
        this.container.appendChild(header);

        // Add event listener for Open in Explorer button
        const openInExplorerBtn = header.querySelector('[title="Open in Explorer"]');
        openInExplorerBtn.addEventListener('click', async () => {
            try {
                const result = await window.electron.ipcRenderer.invoke('open-folder-dialog');
                if (result && result.folderPath) {
                    await window.electron.ipcRenderer.invoke('set-working-directory', result.folderPath);
                    await this.loadFileTree();
                    showToast('Folder opened successfully');
                }
            } catch (error) {
                console.error('Error opening folder:', error);
                showToast('Failed to open folder');
            }
        });

        // Add event listener for Refresh button
        const refreshBtn = header.querySelector('.refresh-btn');
        refreshBtn.addEventListener('click', () => {
            this.loadFileTree();
        });

        // Add file tree container
        const treeContainer = document.createElement('div');
        treeContainer.className = 'file-tree';
        this.container.appendChild(treeContainer);

        // Load initial file tree
        this.loadFileTree();
    }

    async loadFileTree(path = '') {
        try {
            const url = path 
                ? `http://127.0.0.1:5000/api/files?path=${encodeURIComponent(path)}`
                : 'http://127.0.0.1:5000/api/files';
                
            const response = await fetch(url);
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to load files');
            }
            const files = await response.json();
            
            if (path) {
                // If path is provided, we're loading a subfolder
                return files;
            } else {
                // Initial load of the file tree
                const treeContainer = this.container.querySelector('.file-tree');
                this.renderFileTree(files, treeContainer);
            }
        } catch (error) {
            console.error('Error loading file tree:', error);
            const errorMessage = `Error loading files: ${error.message}`;
            
            if (path) {
                // If loading a subfolder, throw the error to be handled by the caller
                throw new Error(errorMessage);
            } else {
                // If initial load, show error in the main container
                const treeContainer = this.container.querySelector('.file-tree');
                treeContainer.innerHTML = `<div class="error">${errorMessage}</div>`;
                showToast('Failed to load files');
            }
        }
    }

    getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
    }

    renderFileTree(items, container) {
        // Clear the container first
        container.innerHTML = '';
        
        if (!items || items.length === 0) {
            container.innerHTML = '<div class="empty-folder">No files</div>';
            return;
        }
        
        // Sort items - folders first, then files, both alphabetically
        items.sort((a, b) => {
            if (a.type === b.type) {
                return a.name.localeCompare(b.name);
            }
            return a.type === 'folder' ? -1 : 1;
        });

        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = `file-item ${item.type}`;
            
            // Add appropriate icon
            const icon = document.createElement('i');
            icon.className = item.type === 'folder' 
                ? 'fas fa-folder' 
                : this.getFileIcon(item.name);
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = item.name;
            
            itemElement.appendChild(icon);
            itemElement.appendChild(nameSpan);
            
            if (item.type === 'folder') {
                itemElement.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const isExpanded = itemElement.classList.toggle('expanded');
                    icon.className = isExpanded ? 'fas fa-folder-open' : 'fas fa-folder';
                    
                    // Get or create the content container
                    let contentContainer = itemElement.nextElementSibling;
                    if (!contentContainer || !contentContainer.classList.contains('folder-content')) {
                        contentContainer = document.createElement('div');
                        contentContainer.className = 'folder-content';
                        itemElement.parentNode.insertBefore(contentContainer, itemElement.nextSibling);
                    }
                    
                    if (isExpanded) {
                        contentContainer.classList.add('expanded');
                        try {
                            const subItems = await this.loadFileTree(item.path);
                            if (subItems && subItems.length > 0) {
                                this.renderFileTree(subItems, contentContainer);
                            } else {
                                contentContainer.innerHTML = '<div class="empty-folder">Empty folder</div>';
                            }
                        } catch (error) {
                            console.error('Error loading subfolder:', error);
                            contentContainer.innerHTML = '<div class="error">Error loading folder contents</div>';
                            showToast('Error loading folder contents');
                        }
                    } else {
                        contentContainer.classList.remove('expanded');
                    }
                });
            } else {
                // File click handler
                itemElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Remove selected class from all items
                    document.querySelectorAll('.file-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                    // Add selected class to clicked item
                    itemElement.classList.add('selected');
                    // Load the file content
                    this.loadFileContent(item.path);
                });
            }
            
            container.appendChild(itemElement);
        });
    }

    getFileIcon(filename) {
        const ext = this.getFileExtension(filename);
        const iconMap = {
            'js': 'fab fa-js',
            'py': 'fab fa-python',
            'html': 'fab fa-html5',
            'css': 'fab fa-css3',
            'json': 'fas fa-code',
            'md': 'fas fa-file-alt',
            'txt': 'fas fa-file-alt'
        };
        return iconMap[ext] || 'fas fa-file-code';
    }

    async loadFileContent(filePath) {
        try {
            // Check if editor is initialized
            if (!window.editor || !window.editorReady) {
                throw new Error('Editor not initialized');
            }

            const response = await fetch(`http://127.0.0.1:5000/file?path=${encodeURIComponent(filePath)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.content !== undefined) {
                // Get the file extension and corresponding language
                const ext = this.getFileExtension(filePath);
                const language = this.getMonacoLanguage(ext);
                
                // Create or activate tab
                if (window.tabManager) {
                    window.tabManager.createTab(filePath, data.content, language);
                    showToast(`Opened ${filePath.split('/').pop()}`);
                } else {
                    throw new Error('Tab manager not initialized');
                }
            } else {
                throw new Error('File content is empty');
            }
        } catch (error) {
            console.error('Error loading file:', error);
            showToast(`Error loading file: ${error.message}`);
        }
    }

    getMonacoLanguage(extension) {
        const languageMap = {
            'js': 'javascript',
            'py': 'python',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown',
            'txt': 'plaintext'
        };
        return languageMap[extension] || 'plaintext';
    }
}

// Initialize file explorer when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.fileExplorer = new FileExplorer();
}); 