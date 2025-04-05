// js/input/inputHandler.js

'use strict';

// Define constants for modes (optional, could also be strings)
const INPUT_MODE = {
    NORMAL: 'NORMAL',
    TYPING: 'TYPING'
};

/**
 * Handles keyboard input, parses Vim-like commands and typing sequences.
 * Maintains input mode (NORMAL/TYPING) and queues commands for processing.
 */
export default class InputHandler {
    constructor() {
        this.active = true; // Is input handling enabled?
        this.mode = INPUT_MODE.NORMAL; // Current input mode

        // State for NORMAL mode
        this.commandBuffer = ''; // Stores partial commands like 'd' waiting for motion
        this.numericPrefix = ''; // Stores numeric prefixes like '3' in '3j'

        // State for TYPING mode
        this.targetTypingPhrase = '';
        this.currentTypingIndex = 0;

        // Queue for processed commands
        this.commandQueue = []; // Stores objects like { type: 'MOVE', direction: 'DOWN' }

        // Registered actions for specific keys (e.g., pause)
        this.actionListeners = new Map(); // key: actionName, value: callback

        // Bind event handlers to 'this' instance
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this); // Although less used here, good practice

        console.log("InputHandler initialized.");
    }

    /**
     * Attaches keyboard event listeners to the window.
     */
    init() {
        console.log("Attaching input listeners...");
        // Use window to capture events globally, adjust if focus needs to be specific
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
    }

    /**
     * Enables or disables input processing.
     * @param {boolean} isActive - True to enable, false to disable.
     */
    setActive(isActive) {
        this.active = isActive;
        if (!isActive) {
            this.commandBuffer = ''; // Clear buffer when deactivated
            this.numericPrefix = '';
            this.commandQueue = []; // Clear queue
        }
        console.log(`InputHandler active: ${isActive}`);
    }

    /**
     * Switches the input mode between NORMAL and TYPING.
     * @param {string} newMode - The mode to switch to (INPUT_MODE.NORMAL or INPUT_MODE.TYPING).
     * @param {object} [options={}] - Additional options, e.g., { targetPhrase: 'hello' } for TYPING mode.
     */
    setMode(newMode, options = {}) {
        if (this.mode === newMode) return; // No change

        console.log(`Switching input mode from ${this.mode} to ${newMode}`);
        this.mode = newMode;
        this.commandBuffer = ''; // Clear buffer on mode switch
        this.numericPrefix = '';

        if (this.mode === INPUT_MODE.TYPING) {
            this.targetTypingPhrase = options.targetPhrase || '';
            this.currentTypingIndex = 0;
            if (!this.targetTypingPhrase) {
                console.warn("Switched to TYPING mode without a target phrase!");
            }
        } else {
            this.targetTypingPhrase = '';
            this.currentTypingIndex = 0;
        }
    }

    /**
     * Registers a callback for a specific action key/sequence.
     * @param {string} actionName - Identifier for the action (e.g., 'pause', 'confirm').
     * @param {function} callback - The function to call when the action is triggered.
     */
    registerActionListener(actionName, callback) {
        this.actionListeners.set(actionName, callback);
    }

    /**
     * Unregisters a callback for a specific action key/sequence.
     * @param {string} actionName - Identifier for the action to remove.
     */
    unregisterActionListener(actionName) {
        this.actionListeners.delete(actionName);
    }

    /**
     * Processes keydown events.
     * @param {KeyboardEvent} event - The native keyboard event.
     * @private
     */
    _onKeyDown(event) {
        if (!this.active) return;

        const key = event.key;
        // console.log(`Keydown: ${key}, Mode: ${this.mode}, Buffer: ${this.commandBuffer}, Prefix: ${this.numericPrefix}`);

        // --- Prevent Default Browser Actions for Game Keys ---
        // Adjust this list based on all keys your game uses
        const gameKeys = ['h', 'j', 'k', 'l', 'w', 'b', 'e', 'd', 'c', 'x', 'y', 'p', 'r', 'Escape', 'Enter', '0', '$', '^'];
        const typingKeys = /^[a-zA-Z0-9!"#$%&'()*+,-./:;<=>?@[\\\]^_`{|}~ ]$/; // Printable chars + space

        if (gameKeys.includes(key) || (this.mode === INPUT_MODE.TYPING && typingKeys.test(key)) || key === 'Backspace') {
             event.preventDefault();
        }
         // Allow F keys, Tab (maybe?), etc. for browser dev tools


        // --- Handle Mode-Specific Input ---
        if (this.mode === INPUT_MODE.NORMAL) {
            this._handleNormalMode(key);
        } else if (this.mode === INPUT_MODE.TYPING) {
            this._handleTypingMode(key);
        }
    }

    /** Handles keydown events in NORMAL mode */
    _handleNormalMode(key) {
        let command = null;
        let count = parseInt(this.numericPrefix || '1', 10); // Default count is 1

        // --- Check for Action Listeners first (e.g., Escape for pause) ---
        if (key === 'Escape') {
             if (this.actionListeners.has('pause')) {
                 this.actionListeners.get('pause')();
                 this.commandBuffer = ''; // Clear buffer on pause potentially
                 this.numericPrefix = '';
                 return; // Don't process further if paused handled it
             }
            // Default Escape behavior: clear buffer/prefix
            this.commandBuffer = '';
            this.numericPrefix = '';
             this.queueCommand({ type: 'CLEAR_BUFFER' }); // Inform game logic buffer was cleared
            return;
        }

        // --- Handle Numeric Prefixes ---
        if (/^[1-9]$/.test(key) && this.commandBuffer === '') { // Start prefix
             this.numericPrefix += key;
             return; // Wait for next key
        }
        if (/^[0]$/.test(key) && this.commandBuffer === '' && this.numericPrefix !== '') { // Allow 0 after starting prefix
             this.numericPrefix += key;
             return;
        }
        // Handle '0' as motion if not part of prefix
        if (key === '0' && this.commandBuffer === '' && this.numericPrefix === '') {
             command = { type: 'MOVE_TO', target: 'LINE_START', count: 1 };
        }

        // --- Handle Operators (d, c, y, etc.) ---
        if (['d', 'c', 'y'].includes(key) && this.commandBuffer === '') {
            this.commandBuffer = key; // Start the command (e.g., 'd')
             // If the next key is the same (e.g., 'dd'), handle it as line operation
             setTimeout(() => { // Check shortly after if buffer is still just 'd'
                 if (this.commandBuffer === key) { // If next key wasn't the same operator immediately
                    // Normal operator waiting for motion
                 }
             }, 0); // Tiny delay for dd/cc/yy check (or handle in next key press)
            return; // Wait for motion or second operator
        }
        // Handle dd, cc, yy (if pressed quickly after the first d/c/y)
        if (['d', 'c', 'y'].includes(key) && this.commandBuffer === key) {
             const typeMap = { 'd': 'DELETE', 'c': 'CHANGE', 'y': 'YANK' };
             command = { type: typeMap[key], motion: 'LINE', count: count };
             this.commandBuffer = ''; // Command complete
        }

        // --- Handle Simple Commands / Motions ---
        if (!command) { // Only process if not already handled (like '0' or 'dd')
             const motionMap = {
                 'h': 'LEFT', 'j': 'DOWN', 'k': 'UP', 'l': 'RIGHT',
                 'w': 'WORD_FORWARD', 'b': 'WORD_BACKWARD', 'e': 'WORD_END',
                 '$': 'LINE_END', '^': 'LINE_FIRST_CHAR' // Note: '^' might need specific logic
             };
             const simpleCommandMap = {
                 'x': 'DELETE_CHAR',
                 'r': 'REPLACE_CHAR_START', // Needs next char
                 'p': 'PASTE_AFTER',
                 'P': 'PASTE_BEFORE', // Requires Yank implementation later
                 'u': 'UNDO' // Requires undo system
             };

             if (motionMap[key]) {
                 const motion = motionMap[key];
                 if (this.commandBuffer === 'd') command = { type: 'DELETE', motion: motion, count: count };
                 else if (this.commandBuffer === 'c') command = { type: 'CHANGE', motion: motion, count: count };
                 else if (this.commandBuffer === 'y') command = { type: 'YANK', motion: motion, count: count };
                 else command = { type: 'MOVE', direction: motion, count: count }; // Default is move
                 this.commandBuffer = ''; // Motion completes the command
             } else if (simpleCommandMap[key] && this.commandBuffer === '') {
                 const type = simpleCommandMap[key];
                 command = { type: type, count: count }; // Count for 'x' is relevant
                 if (type === 'REPLACE_CHAR_START') {
                      this.commandBuffer = 'r'; // Wait for the replacement char
                      command = null; // Don't queue yet
                 }
             } else if (this.commandBuffer === 'r' && key.length === 1) { // Character after 'r'
                 command = { type: 'REPLACE_CHAR_EXECUTE', char: key };
                 this.commandBuffer = '';
             }
         }

        // --- Queue Command and Reset ---
        if (command) {
            this.queueCommand(command);
            this.commandBuffer = '';
            this.numericPrefix = '';
        } else if (!['d', 'c', 'y', 'r'].includes(this.commandBuffer) && !/^[0-9]$/.test(key)) {
             // If an invalid key was pressed after waiting for motion/char, reset
             this.commandBuffer = '';
             this.numericPrefix = '';
        }
    }

    /** Handles keydown events in TYPING mode */
    _handleTypingMode(key) {
        if (key === 'Escape') {
            this.queueCommand({ type: 'EXIT_TYPING' });
            // Game logic should call setMode(NORMAL) upon receiving this
            return;
        }

        if (key === 'Backspace') {
            if (this.currentTypingIndex > 0) {
                 this.currentTypingIndex--;
                 this.queueCommand({ type: 'TYPE_BACKSPACE', index: this.currentTypingIndex });
             }
             return;
         }

        // Ignore keys like Shift, Ctrl, Alt, etc.
        if (key.length > 1) return;

        // Check against the target phrase
        if (this.currentTypingIndex < this.targetTypingPhrase.length) {
            const expectedChar = this.targetTypingPhrase[this.currentTypingIndex];
            if (key === expectedChar) {
                this.queueCommand({
                    type: 'TYPE_CORRECT',
                    char: key,
                    index: this.currentTypingIndex
                });
                this.currentTypingIndex++;
                // Check for phrase completion
                if (this.currentTypingIndex === this.targetTypingPhrase.length) {
                    this.queueCommand({ type: 'PHRASE_COMPLETE' });
                    // Game logic should decide if mode switches back automatically
                }
            } else {
                this.queueCommand({
                    type: 'TYPE_INCORRECT',
                    char: key,
                    expected: expectedChar,
                    index: this.currentTypingIndex
                });
                // Game logic decides how to handle incorrect types (e.g., penalty, reset word?)
            }
        } else {
            // Typed past the end of the phrase? Ignore or handle as error?
            console.log("Typed past end of phrase.");
        }
    }

    /** Processes keyup events (primarily for tracking held keys if needed). */
    _onKeyUp(event) {
        if (!this.active) return;
        // Can be used for tracking modifier keys (Shift, Ctrl, Alt) if needed later
        // Or for logic that depends on key release
    }

    /**
     * Adds a command object to the queue.
     * @param {object} command - The command object to queue.
     */
    queueCommand(command) {
        if (command) {
             // console.log("Queueing command:", command); // Debug log
             this.commandQueue.push(command);
         }
    }

    /**
     * Retrieves all commands queued since the last call and clears the queue.
     * @returns {Array<object>} An array of command objects.
     */
    getCommands() {
        if (this.commandQueue.length === 0) {
            return [];
        }
        const commandsToProcess = [...this.commandQueue]; // Shallow copy
        this.commandQueue = []; // Clear the queue
        return commandsToProcess;
    }

    /**
     * Gets the current command buffer content for UI display (e.g., shows ':d').
     * @returns {string} The command buffer string (e.g., ":", ":d", ":3").
     */
    getCommandBufferDisplay() {
         // Add a prefix like ':' for visual feedback if desired
         const prefix = ':';
         return prefix + this.numericPrefix + this.commandBuffer;
     }

    /**
     * Clears the internal command buffer and numeric prefix.
     */
    clearCommandBuffer() {
        this.commandBuffer = '';
        this.numericPrefix = '';
    }
}