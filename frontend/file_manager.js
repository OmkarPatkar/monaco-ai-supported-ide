class FileManager {
    constructor() {
        this.currentPath = process.cwd();
        this.initializeFileTree();
    }

    initializeFileTree() {
        const treeContainer = document.getElementById('file-tree-container');
        
        // Add header with current path
        const header = document.createElement('div');
        header.className = 'file-tree-header';
        header.innerHTML = `
            <div class="current-path">${this.currentPath}</div>
            <div class="tree-controls">
                <button class="refresh-btn" title="Refresh"><i class="fas fa-sync"></i></button>
            </div>
        `;
        treeContainer.appendChild(header);

        // Create tree view container
        const treeView = document.createElement('div');
        treeView.className = 'file-tree-view';
        treeContainer.appendChild(treeView);

        this.refreshTree();
        this.bindEvents();
    }

    async refreshTree() {
        try {
            const files = await window.electron.ipcRenderer.invoke('get-directory-contents', this.currentPath);
            this.renderTree(files);
        } catch (error) {
            console.error('Error refreshing file tree:', error);
        }
    }

    renderTree(files) {
        const treeView = document.querySelector('.file-tree-view');
        treeView.innerHTML = '';

        // Sort files: directories first, then files, both alphabetically
        const sortedFiles = files.sort((a, b) => {
            if (a.isDirectory === b.isDirectory) {
                return a.name.localeCompare(b.name);
            }
            return a.isDirectory ? -1 : 1;
        });

        sortedFiles.forEach(file => {
            const item = document.createElement('div');
            item.className = `tree-item ${file.isDirectory ? 'directory' : 'file'}`;
            item.dataset.path = file.path;
            
            const icon = document.createElement('i');
            icon.className = `fas ${file.isDirectory ? 'fa-folder' : this.getFileIcon(file.name)}`;
            
            const name = document.createElement('span');
            name.textContent = file.name;
            
            item.appendChild(icon);
            item.appendChild(name);
            treeView.appendChild(item);
        });
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const iconMap = {
            'js': 'fa-js',
            'py': 'fa-python',
            'html': 'fa-html5',
            'css': 'fa-css3',
            'json': 'fa-code',
            'md': 'fa-markdown'
        };
        return iconMap[ext] || 'fa-file';
    }

    bindEvents() {
        // Refresh button
        document.querySelector('.refresh-btn').addEventListener('click', () => {
            this.refreshTree();
        });

        // File/Directory click handling
        document.querySelector('.file-tree-view').addEventListener('click', async (e) => {
            const item = e.target.closest('.tree-item');
            if (!item) return;

            const path = item.dataset.path;
            if (item.classList.contains('directory')) {
                this.currentPath = path;
                this.refreshTree();
            } else {
                try {
                    const content = await window.electron.ipcRenderer.invoke('read-file', path);
                    window.editor.setValue(content);
                    // Set language based on file extension
                    const language = this.getLanguageFromPath(path);
                    monaco.editor.setModelLanguage(window.editor.getModel(), language);
                } catch (error) {
                    console.error('Error opening file:', error);
                }
            }
        });
    }

    getLanguageFromPath(filepath) {
        const ext = filepath.split('.').pop().toLowerCase();
        const languageMap = {
            'js': 'javascript',
            'py': 'python',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown'
        };
        return languageMap[ext] || 'plaintext';
    }
} 