document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Renderer.js Loaded and DOM Ready!");

  // Configure Monaco editor paths
  require.config({ paths: { vs: 'node_modules/monaco-editor/min/vs' } });

  // Initialize Monaco editor
  require(['vs/editor/editor.main'], function() {
    // Create editor instance
    window.editor = monaco.editor.create(document.getElementById('editor'), {
      value: '// Type your code here',
      language: 'javascript',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: {
        enabled: true,
        renderCharacters: false,
        maxColumn: 120,
        scale: 0.8,
        showSlider: 'mouseover'
      },
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, Consolas, monospace',
      scrollBeyondLastLine: false,
      roundedSelection: false,
      renderIndentGuides: true,
      occurrencesHighlight: true,
      renderLineHighlight: 'all',
      scrollbar: {
        verticalScrollbarSize: 12,
        horizontalScrollbarSize: 12
      }
    });

    // Add language detection
    window.editor.onDidChangeModelContent(() => {
      const model = window.editor.getModel();
      if (!model) return;

      const content = model.getValue();
      const detectedLanguage = detectLanguage(content);
      
      if (detectedLanguage && detectedLanguage !== model.getLanguageId()) {
        monaco.editor.setModelLanguage(model, detectedLanguage);
        updateStatusBar(detectedLanguage);
      }
    });

    // Function to detect language based on content
    function detectLanguage(content) {
      // Common language patterns
      const patterns = {
        javascript: /^(const|let|var|function|import|export|class)\s|^\s*\/\/|^\s*\/\*|\.js$/i,
        typescript: /^(interface|type|enum|namespace)|:\s*(string|number|boolean|any)\s*[,;=]|\.ts$/i,
        html: /^<!DOCTYPE|<html|<head|<body|<script|<style|<div|<p|<span/i,
        css: /^(\.|#|@media|@import|body|html|div|span)\s*{|\s*{\s*[\w-]+\s*:/i,
        python: /^(def|class|import|from|if\s+__name__|print|#)\s|\.py$/i,
        java: /^(public|private|protected|class|interface|enum|package)\s|\.java$/i,
        php: /<\?php|\$[a-zA-Z_]|\.php$/i,
        ruby: /^(def|class|module|require|gem|puts)\s|\.rb$/i,
        sql: /^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|FROM|WHERE)\s/i,
        markdown: /^#\s|^-\s|^>\s|^```|\.md$/i,
        json: /^[\s\n]*[{\[]/
      };

      for (const [language, pattern] of Object.entries(patterns)) {
        if (pattern.test(content)) {
          return language;
        }
      }

      return 'plaintext';
    }

    // Function to update status bar
    function updateStatusBar(language) {
      const languageElement = document.querySelector('#status-bar .language-name');
      if (languageElement) {
        // Convert language ID to display name
        const displayName = getLanguageDisplayName(language);
        languageElement.textContent = displayName;
        
        // Update icon based on language
        const icon = languageElement.parentElement.querySelector('i');
        icon.className = getLanguageIcon(language);
      }
    }

    function getLanguageDisplayName(language) {
      const languageMap = {
        'javascript': 'JavaScript',
        'typescript': 'TypeScript',
        'html': 'HTML',
        'css': 'CSS',
        'scss': 'SCSS',
        'less': 'Less',
        'json': 'JSON',
        'xml': 'XML',
        'python': 'Python',
        'java': 'Java',
        'cpp': 'C++',
        'c': 'C',
        'csharp': 'C#',
        'go': 'Go',
        'rust': 'Rust',
        'ruby': 'Ruby',
        'php': 'PHP',
        'shell': 'Shell Script',
        'yaml': 'YAML',
        'toml': 'TOML',
        'ini': 'INI',
        'sql': 'SQL',
        'markdown': 'Markdown',
        'plaintext': 'Plain Text'
      };
      return languageMap[language] || language;
    }

    function getLanguageIcon(language) {
      const iconMap = {
        'javascript': 'fab fa-js',
        'typescript': 'fab fa-js',
        'html': 'fab fa-html5',
        'css': 'fab fa-css3',
        'scss': 'fab fa-sass',
        'less': 'fab fa-css3',
        'python': 'fab fa-python',
        'java': 'fab fa-java',
        'php': 'fab fa-php',
        'ruby': 'fab fa-ruby',
        'markdown': 'fas fa-file-alt',
        'shell': 'fas fa-terminal',
        'sql': 'fas fa-database'
      };
      return iconMap[language] || 'fas fa-code';
    }

    // Register common languages
    monaco.languages.register({ id: 'python' });
    monaco.languages.register({ id: 'javascript' });
    monaco.languages.register({ id: 'typescript' });
    monaco.languages.register({ id: 'html' });
    monaco.languages.register({ id: 'css' });
    monaco.languages.register({ id: 'scss' });
    monaco.languages.register({ id: 'less' });
    monaco.languages.register({ id: 'json' });
    monaco.languages.register({ id: 'xml' });
    monaco.languages.register({ id: 'java' });
    monaco.languages.register({ id: 'cpp' });
    monaco.languages.register({ id: 'c' });
    monaco.languages.register({ id: 'csharp' });
    monaco.languages.register({ id: 'go' });
    monaco.languages.register({ id: 'rust' });
    monaco.languages.register({ id: 'ruby' });
    monaco.languages.register({ id: 'php' });
    monaco.languages.register({ id: 'shell' });
    monaco.languages.register({ id: 'yaml' });
    monaco.languages.register({ id: 'toml' });
    monaco.languages.register({ id: 'ini' });
    monaco.languages.register({ id: 'sql' });
    monaco.languages.register({ id: 'markdown' });
    monaco.languages.register({ id: 'plaintext' });

    // Load language features
    require(['vs/language/typescript/tsWorker'], function() {
        // TypeScript/JavaScript language features
        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false,
        });
        
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false,
        });
    });

    // Set language configuration for better editing experience
    const languages = ['javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp', 'go', 'rust', 'ruby', 'php'];
    languages.forEach(language => {
        monaco.languages.setLanguageConfiguration(language, {
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ],
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '"', close: '"' },
                { open: "'", close: "'" },
                { open: '`', close: '`' }
            ],
            surroundingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '"', close: '"' },
                { open: "'", close: "'" },
                { open: '`', close: '`' }
            ]
        });
    });

    // Initialize tab manager after Monaco is ready
    window.tabManager = new TabManager();

    // Set editor ready flag
    window.editorReady = true;
    console.log("✅ Monaco Editor Initialized");
  });

  // Initialize other components
  initializeChatFunctionality();
  initializeResizableSidebar();
  initializeTerminalPanel();
  
  // Initialize file explorer after Monaco and tab manager
  window.fileExplorer = new FileExplorer();

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
    if (!response) return;

    // Extract code blocks and commands
    const codeBlocks = extractCodeBlocks(response);
    const commands = extractCommands(response);

    // Handle any code changes
    if (codeBlocks.length > 0) {
        const changes = codeBlocks.map(block => ({
            type: block.type || 'update',
            path: block.path,
            content: block.code,
            language: block.language
        }));
        window.changesHandler.showChanges(changes);
    }

    // Handle any commands
    if (commands.length > 0) {
        handleCommands(commands);
    }
    
    // Display the response in chat
    appendMessage('ai', response);
}

// Function to extract code blocks from response
function extractCodeBlocks(response) {
    const blocks = [];
    const regex = /```(\w+):([^\n]+)\n([\s\S]+?)```/g;
    let match;
    
    while ((match = regex.exec(response)) !== null) {
        blocks.push({
            language: match[1],
            path: match[2],
            code: match[3].trim()
        });
    }

    return blocks;
}

// Function to extract commands from response
function extractCommands(response) {
    const commands = [];
    const regex = /\$ (.*?)(?:\n|$)/g;
    let match;
    
    while ((match = regex.exec(response)) !== null) {
        commands.push(match[1].trim());
    }

    return commands;
}

// Function to handle commands
async function handleCommands(commands) {
    for (const command of commands) {
        try {
            const result = await window.changesHandler.executeCommand(command);
            
            // Create command execution message
            const messageDiv = document.createElement('div');
            messageDiv.className = 'chat-message system';
            
            let content = `<div class="command-execution">`;
            content += `<div class="command">$ ${command}</div>`;
            
            if (result.stdout) {
                content += `<pre class="command-output">${result.stdout}</pre>`;
            }
            
            if (result.stderr) {
                content += `<pre class="command-error">${result.stderr}</pre>`;
            }
            
            content += `</div>`;
            messageDiv.innerHTML = content;
            
            document.getElementById('chat-messages').appendChild(messageDiv);
        } catch (error) {
            console.error('Error executing command:', error);
            showToast('Failed to execute command: ' + error.message);
        }
    }
}

// Function to initialize chat functionality
function initializeChatFunctionality() {
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
                    model: modelSelector.value,  // Use the selected model from dropdown
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
            if (!response) return;

            // Extract code blocks and commands
            const codeBlocks = extractCodeBlocks(data.response);
            const commands = extractCommands(data.response);

            // Handle any code changes
            if (codeBlocks.length > 0) {
                const changes = codeBlocks.map(block => ({
                    type: block.type || 'update',
                    path: block.path,
                    content: block.code,
                    language: block.language
                }));
                window.changesHandler.showChanges(changes);
            }

            // Handle any commands
            if (commands.length > 0) {
                handleCommands(commands);
            }

            // Display the response in chat
            appendMessage('ai', data.response);

        } catch (error) {
            console.error('Error:', error);
            appendMessage('system', `Error: ${error.message}`);
        } finally {
            // Re-enable input and restore focus
            chatInput.disabled = false;
            sendButton.disabled = false;
            chatInput.focus(); // Restore focus to the input
        }
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
        
        // First, handle code blocks with file paths (```language:path)
        content = content.replace(/```(\w+):([^\n]+)\n([\s\S]+?)```/g, (match, language, path, code) => {
            const uniqueId = 'code-' + Math.random().toString(36).substr(2, 9);
            return `
                <div class="code-block" id="${uniqueId}">
                    <div class="code-block-header">
                        <div class="code-language">
                            <i class="fas fa-file-code"></i>
                            ${path}
                        </div>
                        <div class="code-actions">
                            <button class="code-action-btn accept" onclick="applyToFile('${uniqueId}', '${path}')">
                                <i class="fas fa-check"></i>
                                Accept
                            </button>
                            <button class="code-action-btn apply" onclick="suggestToFile('${uniqueId}', '${path}')">
                                <i class="fas fa-file-import"></i>
                                Suggest
                            </button>
                            <button class="code-action-btn copy" onclick="copyCode('${uniqueId}')">
                                <i class="fas fa-copy"></i>
                                Copy
                            </button>
                        </div>
                    </div>
                    <pre><code class="language-${language}">${escapeHtml(code.trim())}</code></pre>
                </div>
            `;
        });
        
        // Then handle regular code blocks (```language)
        content = content.replace(/```(\w+)\n([\s\S]+?)```/g, (match, language, code) => {
            const uniqueId = 'code-' + Math.random().toString(36).substr(2, 9);
            const isTerminalCommand = language === 'bash' || language === 'shell';
            
            return `
                <div class="code-block" id="${uniqueId}">
                    <div class="code-block-header">
                        <div class="code-language">
                            <i class="fas ${isTerminalCommand ? 'fa-terminal' : 'fa-code'}"></i>
                            ${language}
                        </div>
                        <div class="code-actions">
                            ${isTerminalCommand ? `
                                <button class="code-action-btn run" onclick="runInTerminal('${uniqueId}')">
                                    <i class="fas fa-play"></i>
                                    Run in Terminal
                                </button>
                                <button class="code-action-btn reject" onclick="rejectCommand('${uniqueId}')">
                                    <i class="fas fa-times"></i>
                                    Reject
                                </button>
                            ` : `
                                <button class="code-action-btn insert" onclick="insertInEditor('${uniqueId}')">
                                    <i class="fas fa-file-import"></i>
                                    Insert in Editor
                                </button>
                            `}
                            <button class="code-action-btn copy" onclick="copyCode('${uniqueId}')">
                                <i class="fas fa-copy"></i>
                                Copy
                            </button>
                        </div>
                    </div>
                    <pre><code class="language-${language}">${escapeHtml(code.trim())}</code></pre>
                </div>
            `;
        });

        // Handle inline commands ($ command)
        content = content.replace(/\$ (.*?)(?:\n|$)/g, (match, command) => {
            const uniqueId = 'cmd-' + Math.random().toString(36).substr(2, 9);
            return `
                <div class="command-block" id="${uniqueId}">
                    <div class="command-content">
                        <span class="command-prompt">$</span>
                        <span class="command-text">${escapeHtml(command)}</span>
                    </div>
                    <div class="command-actions">
                        <button class="code-action-btn run" onclick="runInTerminal('${uniqueId}')">
                            <i class="fas fa-play"></i>
                            Run
                        </button>
                        <button class="code-action-btn reject" onclick="rejectCommand('${uniqueId}')">
                            <i class="fas fa-times"></i>
                            Reject
                        </button>
                        <button class="code-action-btn copy" onclick="copyCode('${uniqueId}')">
                            <i class="fas fa-copy"></i>
                            Copy
                        </button>
                    </div>
                </div>
            `;
        });
        
        return content;
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

    // Function to apply code to a file with agentic behavior
    window.applyToFile = async function(blockId, filePath) {
        const codeBlock = document.getElementById(blockId);
        const code = codeBlock.querySelector('code').textContent;
        
        try {
            // Check if file exists
            const response = await fetch(`http://127.0.0.1:5000/file?path=${encodeURIComponent(filePath)}`);
            const fileExists = response.ok;
            
            if (fileExists) {
                // Show confirmation dialog for existing file
                if (!confirm(`File "${filePath}" already exists. Do you want to apply these changes?`)) {
                    return;
                }
                
                // Get current file content for comparison
                const currentContent = await response.json();
                if (currentContent.content === code) {
                    showToast('No changes to apply - content is identical');
                    return;
                }
            }
            
            // Use FileExplorer instance to create/update file
            const fileExplorer = FileExplorer.getInstance();
            const success = fileExists 
                ? await fileExplorer.updateFile(filePath, code)
                : await fileExplorer.createFile(filePath, code);
                
            if (success) {
                showToast(`${fileExists ? 'Updated' : 'Created'} file: ${filePath}`);
                // Refresh file tree
                await fileExplorer.loadFileTree();
                
                // Disable the accept button and add visual feedback
                const acceptBtn = codeBlock.querySelector('.code-action-btn.accept');
                if (acceptBtn) {
                    acceptBtn.disabled = true;
                    acceptBtn.innerHTML = '<i class="fas fa-check"></i> Applied';
                }
                
                // If the file is currently open in the editor, refresh its content
                if (window.tabManager) {
                    const model = window.tabManager.models.get(filePath);
                    if (model) {
                        model.setValue(code);
                    }
                }
            }
        } catch (error) {
            console.error('Error applying code to file:', error);
            showToast(`Error ${fileExists ? 'updating' : 'creating'} file: ${error.message}`);
        }
    }

    // Function to suggest changes to a file
    window.suggestToFile = async function(blockId, filePath) {
        const codeBlock = document.getElementById(blockId);
        const code = codeBlock.querySelector('code').textContent;
        
        try {
            // Create a change proposal
            const change = {
                type: 'update',
                path: filePath,
                content: code,
                language: codeBlock.querySelector('code').className.replace('language-', '')
            };
            
            // Show changes in the changes handler
            window.changesHandler.showChanges([change]);
            
            // Disable the suggest button and add visual feedback
            const suggestBtn = codeBlock.querySelector('.code-action-btn.apply');
            if (suggestBtn) {
                suggestBtn.disabled = true;
                suggestBtn.innerHTML = '<i class="fas fa-check"></i> Suggested';
            }
            
        } catch (error) {
            console.error('Error suggesting changes:', error);
            showToast(`Error suggesting changes: ${error.message}`);
        }
    }

    // Function to run code in terminal
    window.runInTerminal = async function(blockId) {
        const codeBlock = document.getElementById(blockId);
        const command = codeBlock.querySelector('code').textContent.trim();
        
        try {
            const result = await window.changesHandler.executeCommand(command);
            if (result.error) {
                throw new Error(result.error);
            }
            
            // Create command execution message
            const messageDiv = document.createElement('div');
            messageDiv.className = 'chat-message system';
            
            let content = `<div class="command-execution">`;
            content += `<div class="command-header"><i class="fas fa-terminal"></i> Terminal Output</div>`;
            content += `<div class="command">$ ${command}</div>`;
            
            if (result.stdout) {
                content += `<pre class="command-output">${result.stdout}</pre>`;
            }
            
            if (result.stderr) {
                content += `<pre class="command-error">${result.stderr}</pre>`;
            }
            
            content += `</div>`;
            messageDiv.innerHTML = content;
            
            document.getElementById('chat-messages').appendChild(messageDiv);
            messageDiv.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Error executing command:', error);
            showToast('Failed to execute command: ' + error.message);
        }
    }

    // Function to insert code in editor
    window.insertInEditor = function(blockId) {
        const codeBlock = document.getElementById(blockId);
        const code = codeBlock.querySelector('code').textContent;
        
        if (window.editor && typeof window.editor.getValue === 'function') {
            const currentValue = window.editor.getValue();
            const newValue = currentValue ? currentValue + '\n\n' + code : code;
            window.editor.setValue(newValue);
            showToast('Code inserted in editor');
        } else {
            showToast('No editor available');
        }
    }

    // Function to reject a command
    window.rejectCommand = function(blockId) {
        const block = document.getElementById(blockId);
        if (block) {
            // Add a visual indication that the command was rejected
            block.classList.add('rejected');
            // Add rejection message
            const rejectionMsg = document.createElement('div');
            rejectionMsg.className = 'command-rejection';
            rejectionMsg.innerHTML = '<i class="fas fa-times-circle"></i> Command rejected';
            block.appendChild(rejectionMsg);
            // Disable the action buttons
            const buttons = block.querySelectorAll('.code-action-btn');
            buttons.forEach(btn => btn.disabled = true);
            showToast('Command rejected');
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
}

function initializeResizableSidebar() {
    const sidebar = document.getElementById('right-sidebar');
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    sidebar.appendChild(resizeHandle);

    let isResizing = false;
    let startX;
    let startWidth;

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.pageX;
        startWidth = parseInt(getComputedStyle(sidebar).width, 10);
        resizeHandle.classList.add('resizing');
        document.body.style.cursor = 'ew-resize';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const width = startWidth - (e.pageX - startX);
        if (width >= 200 && width <= 600) {
            sidebar.style.width = width + 'px';
            
            // Adjust editor layout if it exists
            if (window.editor) {
                window.editor.layout();
            }
            
            // Adjust terminal if it exists
            if (window.terminal && window.terminal.fitAddon) {
                window.terminal.fitAddon.fit();
            }
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizeHandle.classList.remove('resizing');
            document.body.style.cursor = 'default';
        }
    });
}

function initializeTerminalPanel() {
    const terminalPanel = document.getElementById('terminal-panel');
    const toggleTerminalBtn = terminalPanel.querySelector('[title="Toggle Terminal"]');
    const clearTerminalBtn = terminalPanel.querySelector('[title="Clear Terminal"]');
    
    // Toggle terminal panel
    toggleTerminalBtn.addEventListener('click', () => {
        const isCollapsed = terminalPanel.classList.toggle('collapsed');
        toggleTerminalBtn.querySelector('i').className = 
            isCollapsed ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
        
        // Adjust editor layout
        if (window.editor) {
            window.editor.layout();
        }
    });
    
    // Clear terminal
    clearTerminalBtn.addEventListener('click', () => {
        if (window.terminal) {
            window.terminal.clear();
        }
    });
}

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
