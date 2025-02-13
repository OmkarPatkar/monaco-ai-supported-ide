class Terminal {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.commandHistory = [];
        this.historyIndex = -1;
        this.currentInput = '';
        this.initializeTerminal();
        this.initializeButtons();
    }

    initializeTerminal() {
        // Create xterm.js instance with proper namespace
        this.xterm = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, Consolas, monospace',
            theme: {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
                cursor: '#d4d4d4',
                selection: '#264f78',
                black: '#1e1e1e',
                red: '#f44747',
                green: '#6a9955',
                yellow: '#d7ba7d',
                blue: '#569cd6',
                magenta: '#c586c0',
                cyan: '#4ec9b0',
                white: '#d4d4d4',
                brightBlack: '#808080',
                brightRed: '#f44747',
                brightGreen: '#6a9955',
                brightYellow: '#d7ba7d',
                brightBlue: '#569cd6',
                brightMagenta: '#c586c0',
                brightCyan: '#4ec9b0',
                brightWhite: '#d4d4d4'
            },
            allowTransparency: true,
            scrollback: 1000,
            rows: 20,
            cols: 80,
            convertEol: true,
            cursorStyle: 'block',
            cursorBlink: true,
            rendererType: 'canvas'
        });

        // Create and attach the fit addon with proper namespace
        this.fitAddon = new FitAddon.FitAddon();
        this.xterm.loadAddon(this.fitAddon);

        // Create and attach the web links addon with proper namespace
        this.webLinksAddon = new WebLinksAddon.WebLinksAddon();
        this.xterm.loadAddon(this.webLinksAddon);

        // Open terminal in container
        this.xterm.open(this.container);
        
        // Initial fit and focus
        setTimeout(() => {
            this.fitAddon.fit();
            this.xterm.focus();
            // Write welcome message after fit
            this.writeWelcomeMessage();
        }, 100);

        // Add resize listener
        const resizeObserver = new ResizeObserver(() => {
            this.fitAddon.fit();
        });
        resizeObserver.observe(this.container);
        resizeObserver.observe(document.getElementById('terminal-panel'));

        // Handle user input
        let currentLine = '';
        this.xterm.onData(data => {
            switch (data) {
                case '\r': // Enter
                    this.handleCommand(currentLine);
                    currentLine = '';
                    break;
                case '\u007F': // Backspace
                    if (currentLine.length > 0) {
                        currentLine = currentLine.slice(0, -1);
                        this.xterm.write('\b \b');
                    }
                    break;
                case '\u001b[A': // Up arrow
                    if (this.historyIndex < this.commandHistory.length - 1) {
                        // Clear current line
                        while (currentLine.length > 0) {
                            this.xterm.write('\b \b');
                            currentLine = currentLine.slice(0, -1);
                        }
                        this.historyIndex++;
                        currentLine = this.commandHistory[this.historyIndex];
                        this.xterm.write(currentLine);
                    }
                    break;
                case '\u001b[B': // Down arrow
                    if (this.historyIndex > -1) {
                        // Clear current line
                        while (currentLine.length > 0) {
                            this.xterm.write('\b \b');
                            currentLine = currentLine.slice(0, -1);
                        }
                        this.historyIndex--;
                        if (this.historyIndex === -1) {
                            currentLine = '';
                        } else {
                            currentLine = this.commandHistory[this.historyIndex];
                        }
                        this.xterm.write(currentLine);
                    }
                    break;
                default:
                    // Only handle printable characters
                    if (data >= ' ' && data <= '~') {
                        currentLine += data;
                        this.xterm.write(data);
                    }
            }
        });

        // Focus terminal on click
        this.container.addEventListener('click', () => {
            this.xterm.focus();
        });

        // Keep terminal focused
        this.xterm.focus();
    }

    initializeButtons() {
        const panel = document.getElementById('terminal-panel');
        const toggleBtn = panel.querySelector('[title="Toggle Terminal"]');
        const clearBtn = panel.querySelector('[title="Clear Terminal"]');

        // Toggle terminal panel
        toggleBtn.addEventListener('click', () => {
            const isCollapsed = panel.classList.toggle('collapsed');
            toggleBtn.querySelector('i').className = 
                isCollapsed ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
            
            // Adjust terminal size after toggle
            if (!isCollapsed) {
                setTimeout(() => this.fitAddon.fit(), 300);
            }
        });

        // Clear terminal
        clearBtn.addEventListener('click', () => {
            this.clear();
        });
    }

    prompt() {
        this.xterm.write('\r\n\x1b[1;32m$\x1b[0m ');
    }

    async handleCommand(command) {
        if (!command.trim()) {
            this.prompt();
            return;
        }

        // Add command to history
        this.commandHistory.unshift(command);
        this.historyIndex = -1;

        // Write the command with newline
        this.xterm.writeln('');

        if (command === 'clear') {
            this.clear();
            return;
        }

        if (command === 'help') {
            this.showHelp();
            return;
        }

        try {
            const response = await fetch('http://127.0.0.1:5000/api/execute_command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ command }),
            });

            const result = await response.json();
            
            if (result.stdout) {
                this.xterm.writeln(result.stdout);
            }
            if (result.stderr) {
                this.xterm.writeln(`\x1b[1;31m${result.stderr}\x1b[0m`);
            }
        } catch (error) {
            this.xterm.writeln(`\x1b[1;31mError: ${error.message}\x1b[0m`);
        }

        this.prompt();
    }

    showHelp() {
        this.xterm.writeln('\x1b[1;34mAvailable Commands:\x1b[0m');
        this.xterm.writeln('  clear    - Clear the terminal');
        this.xterm.writeln('  help     - Show this help message');
        this.xterm.writeln('  cd       - Change directory');
        this.xterm.writeln('  ls       - List directory contents');
        this.xterm.writeln('  pwd      - Print working directory');
        this.xterm.writeln('');
        this.prompt();
    }

    clear() {
        this.xterm.clear();
        this.prompt();
    }

    writeWelcomeMessage() {
        this.xterm.clear();
        this.xterm.writeln('\x1b[1;34m# Welcome to AI-Supported IDE Terminal\x1b[0m');
        this.xterm.writeln('\x1b[1;34m# Type "help" for available commands\x1b[0m');
        this.xterm.writeln('');
        this.prompt();
    }
}

// Initialize terminal when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.terminal = new Terminal('terminal-container');
}); 