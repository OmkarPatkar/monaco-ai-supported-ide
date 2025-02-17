document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Renderer.js Loaded and DOM Ready!");

  // const fileInput = document.getElementById("right-file-input");
  // const uploadBtn = document.getElementById("right-upload-btn");

  // if (!fileInput || !uploadBtn) {
  //   console.error("File input or upload button not found in DOM!");
  //   return;
  // }

  // uploadBtn.addEventListener("click", () => fileInput.click());

  // fileInput.addEventListener("change", function () {
  //   if (fileInput.files.length > 0) {
  //     const file = fileInput.files[0];
  //     const formData = new FormData();
  //     formData.append("file", file);

  //     fetch("http://127.0.0.1:5000/upload", {
  //       method: "POST",
  //       body: formData,
  //     })
  //       .then((response) => response.json())
  //       .then((data) => {
  //         console.log("File uploaded:", data);
  //         alert(`✅ ${data.message}`);
  //       })
  //       .catch((error) => console.error("Error uploading file:", error));
  //   }
  // });  
  // console.log("✅ Event Listeners Attached!");
});

// Add this function to process AI responses
function processAIResponse(response) {
    // Check if response contains code changes
    const codeChanges = extractCodeChanges(response);
    if (codeChanges.length > 0) {
        window.changesHandler.showChanges(codeChanges);
    }
    
    // Display the response in chat
    appendMessage('ai', response);
}

// Helper function to extract code changes from AI response
function extractCodeChanges(response) {
    const changes = [];
    
    // Example pattern for code blocks: ```language:filepath\ncode```
    const codeBlockRegex = /```(\w+):([^\n]+)\n([\s\S]+?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(response)) !== null) {
        const [_, language, filepath, code] = match;
        
        changes.push({
            type: 'create', // or 'update' based on file existence
            path: filepath,
            language,
            content: code.trim()
        });
    }
    
    return changes;
}

// Initialize Monaco Editor
require.config({ paths: { vs: 'node_modules/monaco-editor/min/vs' } });

document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ Renderer.js Loaded and DOM Ready!");

    // Initialize Monaco editor
    require(['vs/editor/editor.main'], function() {
    window.editor = monaco.editor.create(document.getElementById('editor'), {
            value: '// Type your code here',
        language: 'javascript',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: {
            enabled: true
            }
        });
    });

    // Initialize chat functionality
    const chatInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    const modelSelector = document.getElementById('model-selector');

    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        try {
            // Disable input while processing
            chatInput.disabled = true;
            sendButton.disabled = true;

            // Add user message to chat
            appendMessage('user', message);
            chatInput.value = '';

            // Add loading indicator
            const loadingMessage = document.createElement('div');
            loadingMessage.className = 'chat-message loading';
            loadingMessage.innerHTML = `
                <div class="chat-message-icon">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="chat-message-content">
                    <span>Generating</span>
                    <div class="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            `;
            chatMessages.appendChild(loadingMessage);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // Get editor content if available
            let editorContent = '';
            if (window.editor && typeof window.editor.getValue === 'function') {
                try {
                    editorContent = window.editor.getValue();
                } catch (e) {
                    console.warn('Failed to get editor content:', e);
                }
            }

            const response = await fetch('http://127.0.0.1:5000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    model: 'deepseek-r1:1.5b',  // Always use the local Deepseek model
                    context: editorContent
                })
            });

            // Remove loading indicator
            loadingMessage.remove();

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            // Process and display AI response
            processAIResponse(data.response);

        } catch (error) {
            console.error('Error:', error);
            appendMessage('system', `Error: ${error.message}`);
        } finally {
            // Re-enable input
            chatInput.disabled = false;
            sendButton.disabled = false;
        }
    }

    // Function to process AI response
    function processAIResponse(response) {
        if (!response) return;

        // Check for code changes in the response
        const codeChanges = extractCodeChanges(response);
        if (codeChanges.length > 0) {
            window.changesHandler.showChanges(codeChanges);
        }

        // Display the response in chat
        appendMessage('ai', response);
    }

    // Function to append messages to chat
    function appendMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}`;
        
        // Add message icon
        const iconDiv = document.createElement('div');
        iconDiv.className = 'chat-message-icon';
        iconDiv.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
        
        // Add message content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'chat-message-content';
        
        // Format code blocks if present
        const formattedContent = formatMessageContent(content);
        contentDiv.innerHTML = formattedContent;
        
        messageDiv.appendChild(iconDiv);
        messageDiv.appendChild(contentDiv);
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Function to format message content (handle code blocks)
    function formatMessageContent(content) {
        if (typeof content !== 'string') return '';
        
        return content.replace(/```(\w+)?\n([\s\S]+?)```/g, (match, language, code) => {
            const uniqueId = 'code-' + Math.random().toString(36).substr(2, 9);
            return `
                <div class="code-block" id="${uniqueId}">
                    <div class="code-block-header">
                        <div class="code-language">${language || 'plaintext'}</div>
                        <div class="code-actions">
                            <button class="code-action-btn accept" onclick="acceptCode('${uniqueId}')">
                                <i class="fas fa-check"></i>
                                Accept
                            </button>
                            <button class="code-action-btn copy" onclick="copyCode('${uniqueId}')">
                                <i class="fas fa-copy"></i>
                                Copy
                            </button>
                        </div>
                    </div>
                    <pre><code class="language-${language || 'plaintext'}">${escapeHtml(code.trim())}</code></pre>
                </div>
            `;
        });
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Function to copy code to clipboard
    window.copyCode = async function(blockId) {
        const codeBlock = document.getElementById(blockId);
        const code = codeBlock.querySelector('code').textContent;
        
        try {
            await navigator.clipboard.writeText(code);
            showToast('Code copied to clipboard');
        } catch (err) {
            console.error('Failed to copy code:', err);
            showToast('Failed to copy code');
        }
    }

    // Function to accept and apply code
    window.acceptCode = function(blockId) {
        const codeBlock = document.getElementById(blockId);
        const code = codeBlock.querySelector('code').textContent;
        const language = codeBlock.querySelector('.code-language').textContent;

        // If we have an editor instance, insert the code
        if (window.editor && typeof window.editor.getValue === 'function') {
            const currentValue = window.editor.getValue();
            const newValue = currentValue ? currentValue + '\n\n' + code : code;
            window.editor.setValue(newValue);
            showToast('Code applied to editor');
        } else {
            showToast('No editor available');
        }
    }

    // Function to show toast notification
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

    // Add event listeners for chat
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }

    if (chatInput) {
        chatInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });
    }

    // Initialize file explorer
    const fileTreeContainer = document.getElementById('file-tree-container');
    let selectedFilePath = null;

    function initializeFileExplorer() {
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
        fileTreeContainer.appendChild(header);

        // Add event listener for Open in Explorer button
        const openInExplorerBtn = header.querySelector('[title="Open in Explorer"]');
        openInExplorerBtn.addEventListener('click', () => {
            window.electron.ipcRenderer.send('open-in-explorer', process.cwd());
        });

        // Add event listener for Refresh button
        const refreshBtn = header.querySelector('.refresh-btn');
        refreshBtn.addEventListener('click', () => {
            loadFileTree();
        });

        // Add file tree container
        const treeContainer = document.createElement('div');
        treeContainer.className = 'file-tree';
        fileTreeContainer.appendChild(treeContainer);

        // Load initial file tree
        loadFileTree();
    }

    async function loadFileTree() {
        try {
            const response = await fetch('http://127.0.0.1:5000/files');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const files = await response.json();
            console.log('Loaded files:', files);  // Debug log
            
            const treeContainer = fileTreeContainer.querySelector('.file-tree') || fileTreeContainer;
            renderFileTree(files, treeContainer);
        } catch (error) {
            console.error('Error loading file tree:', error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = `Error loading files: ${error.message}`;
            fileTreeContainer.innerHTML = '';
            fileTreeContainer.appendChild(errorDiv);
        }
    }

    function getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
    }

    function renderFileTree(items, container) {
        container.innerHTML = ''; // Clear existing content
        
        if (!items || items.length === 0) {
            container.innerHTML = '<div class="empty-folder">No files</div>';
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'file-tree';

        // Sort items: folders first, then files, both alphabetically
        const sortedItems = items.sort((a, b) => {
            if (a.type === b.type) {
                return a.name.localeCompare(b.name);
            }
            return a.type === 'folder' ? -1 : 1;
        });

        sortedItems.forEach(item => {
            const li = document.createElement('li');
            const itemDiv = document.createElement('div');
            const itemType = item.type || 'file'; // Default to file if type is not specified
            itemDiv.className = `file-item ${itemType}`;
            
            if (itemType === 'file' && item.name) {
                const ext = getFileExtension(item.name);
                if (ext) {
                    itemDiv.classList.add(ext);
                }
            }

            const icon = document.createElement('i');
            icon.className = `fas ${itemType === 'folder' ? 'fa-folder' : 'fa-file'}`;
            
            const span = document.createElement('span');
            span.textContent = item.name || 'Unnamed';
            
            itemDiv.appendChild(icon);
            itemDiv.appendChild(span);
            li.appendChild(itemDiv);

            if (itemType === 'folder') {
                const folderContent = document.createElement('div');
                folderContent.className = 'folder-content';
                
                if (item.children && item.children.length > 0) {
                    renderFileTree(item.children, folderContent);
                } else {
                    folderContent.innerHTML = '<div class="empty-folder">Empty folder</div>';
                }
                
                li.appendChild(folderContent);

                itemDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    itemDiv.classList.toggle('expanded');
                    folderContent.classList.toggle('expanded');
                    
                    // Toggle folder icon
                    icon.classList.toggle('fa-folder');
                    icon.classList.toggle('fa-folder-open');
                });
            } else {
                itemDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Remove previous selection
                    const prevSelected = document.querySelector('.file-item.selected');
                    if (prevSelected) {
                        prevSelected.classList.remove('selected');
                    }
                    // Add selection to clicked item
                    itemDiv.classList.add('selected');
                    
                    // Load file content if path exists
                    if (item.path) {
                        loadFileContent(item.path);
                    }
                });
            }

            ul.appendChild(li);
        });

        container.appendChild(ul);
    }

    async function loadFileContent(filePath) {
        try {
            const response = await fetch(`http://127.0.0.1:5000/file?path=${encodeURIComponent(filePath)}`);
            const data = await response.json();
            
            if (data.content) {
                // Detect file type from extension
                const ext = getFileExtension(filePath);
                const language = getMonacoLanguage(ext);
                
                // Update editor content and language
                window.editor.setValue(data.content);
                monaco.editor.setModelLanguage(window.editor.getModel(), language);
            }
        } catch (error) {
            console.error('Error loading file:', error);
            showToast('Error loading file');
        }
    }

    function getMonacoLanguage(extension) {
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

    // Initialize the file explorer
    initializeFileExplorer();

    // Add resize functionality for the right sidebar
    function initializeResizableSidebar() {
        const sidebar = document.getElementById('right-sidebar');
        let isResizing = false;
        let startX;
        let startWidth;

        sidebar.addEventListener('mousedown', function(e) {
            // Check if we're clicking the resize handle (the ::before pseudo-element)
            if (e.offsetX < 8) {  // 8px is the width of our resize handle
                isResizing = true;
                startX = e.pageX;
                startWidth = parseInt(getComputedStyle(sidebar).width, 10);
            }
        });

        document.addEventListener('mousemove', function(e) {
            if (!isResizing) return;
            
            const width = startWidth - (e.pageX - startX);
            
            // Constrain the width between min and max values
            if (width >= 200 && width <= 600) {  // min: 200px, max: 600px
                sidebar.style.width = width + 'px';
            }
        });

        document.addEventListener('mouseup', function() {
            isResizing = false;
        });
    }

    // Initialize resizable sidebar
    initializeResizableSidebar();
});

// Ensure IPC is available
window.electron = {
    ipcRenderer: require('electron').ipcRenderer
};

// Update chat container structure
document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    
    // Add chat header
    const header = document.createElement('div');
    header.className = 'chat-header';
    header.innerHTML = `
        <div class="chat-header-title">CHAT</div>
        <div class="chat-header-actions">
            <button class="chat-header-btn" title="Open in Explorer">
                <i class="fas fa-folder-open"></i>
            </button>
            <button class="chat-header-btn" title="Clear chat">
                <i class="fas fa-trash"></i>
            </button>
            <button class="chat-header-btn" title="Show history">
                <i class="fas fa-history"></i>
            </button>
        </div>
    `;

    // Add event listener for open in explorer button
    const openInExplorerBtn = header.querySelector('[title="Open in Explorer"]');
    openInExplorerBtn.addEventListener('click', () => {
        window.electron.ipcRenderer.send('open-in-explorer', process.cwd());
    });

    // Add event listener for clear chat button
    const clearChatBtn = header.querySelector('[title="Clear chat"]');
    clearChatBtn.addEventListener('click', () => {
        // Implement clear chat functionality
        console.log('Clear chat button clicked');
    });

    // Add event listener for show history button
    const showHistoryBtn = header.querySelector('[title="Show history"]');
    showHistoryBtn.addEventListener('click', () => {
        // Implement show history functionality
        console.log('Show history button clicked');
    });

    chatContainer.appendChild(header);
});

// Listen for the result of opening in explorer
window.electron.ipcRenderer.on('open-in-explorer-result', (event, success) => {
    if (!success) {
        showToast('Failed to open in explorer');
    }
});
