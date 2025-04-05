// js/core/renderer.js

'use strict';

/**
 * Handles rendering the game state to the DOM.
 * Creates and manages DOM elements for tiles, player, enemies, etc.
 * Assumes the container uses CSS Grid for layout.
 */
export default class Renderer {
    /**
     * Creates a Renderer instance.
     * @param {HTMLElement} gameScreenElement - The container element (e.g., #game-screen) where the game will be rendered.
     * @param {object} [config={}] - Optional configuration (e.g., tileSize hints).
     */
    constructor(gameScreenElement, config = {}) {
        if (!gameScreenElement || !(gameScreenElement instanceof HTMLElement)) {
            throw new Error("Renderer requires a valid HTML container element.");
        }
        this.container = gameScreenElement;
        this.config = config;

        // Store references to dynamically created elements (player, enemies)
        // Keyed by a unique ID (e.g., 'player', 'enemy-123')
        this.drawnElements = new Map();

        // Store references to grid tile elements if frequent updates are needed
        this.tileElements = []; // 2D array [y][x] potentially

        console.log("Renderer initialized (DOM Mode). Container:", this.container);
    }

    /**
     * Clears dynamic elements like player and enemies.
     * Note: The grid itself is usually cleared/redrawn only on level load by drawGrid.
     */
    clearDynamicElements() {
        this.drawnElements.forEach((element) => {
            if (element && element.parentNode === this.container) {
                this.container.removeChild(element);
            }
        });
        this.drawnElements.clear();
    }

    /**
     * Clears the entire game screen, including the grid.
     * Use cautiously, prefer clearDynamicElements during gameplay loop.
     */
    clearAll() {
        this.container.innerHTML = '';
        this.drawnElements.clear();
        this.tileElements = [];
    }

    /**
     * Draws the static level grid. Typically called once per level load.
     * @param {object} levelGrid - An object containing grid dimensions and tile data.
     * Example: { width: 80, height: 45, tiles: [[tile0_0, tile0_1...], [tile1_0, tile1_1...]] }
     */
    drawGrid(levelGrid) {
        if (!levelGrid || !levelGrid.tiles || !levelGrid.width || !levelGrid.height) {
            console.error("Invalid levelGrid data provided to drawGrid.");
            return;
        }

        console.log(`Drawing grid (${levelGrid.width}x${levelGrid.height})...`);
        this.clearAll(); // Clear everything before drawing a new grid

        // --- Configure CSS Grid on the container ---
        this.container.style.gridTemplateColumns = `repeat(${levelGrid.width}, 1fr)`;
        this.container.style.gridTemplateRows = `repeat(${levelGrid.height}, 1fr)`;
        // Calculate approximate font size based on cell size (optional refinement)
        // const approxCellWidth = this.container.offsetWidth / levelGrid.width;
        // const approxFontSize = Math.min(approxCellWidth * 0.8, 16); // Example calculation
        // this.container.style.fontSize = `${approxFontSize}px`;


        // --- Create and Append Tile Elements ---
        this.tileElements = []; // Reset internal tile references
        for (let y = 0; y < levelGrid.height; y++) {
            this.tileElements[y] = []; // Initialize row
            for (let x = 0; x < levelGrid.width; x++) {
                const tileData = levelGrid.tiles[y] ? levelGrid.tiles[y][x] : null;
                if (!tileData) {
                    console.warn(`Missing tile data for coordinates (${x}, ${y})`);
                    // Optionally create an empty placeholder tile
                     this.tileElements[y][x] = null;
                    continue;
                }

                const tileElement = document.createElement('div');
                tileElement.classList.add('tile');

                // Add specific class based on tile type
                tileElement.classList.add(tileData.type || 'pathway'); // e.g., 'pathway', 'data-node', 'corrupted'

                // Add content (the character)
                tileElement.textContent = tileData.char || '';

                // Set grid position (CSS Grid is 1-based)
                tileElement.style.gridColumn = x + 1;
                tileElement.style.gridRow = y + 1;

                // Add dataset attributes for easy querying if needed
                tileElement.dataset.x = x;
                tileElement.dataset.y = y;

                this.container.appendChild(tileElement);
                this.tileElements[y][x] = tileElement; // Store reference
            }
        }
        console.log("Grid drawing complete.");
    }

    /**
     * Updates the appearance of a specific tile.
     * @param {number} x - The x-coordinate (0-based).
     * @param {number} y - The y-coordinate (0-based).
     * @param {object} tileData - New data for the tile (e.g., { type: 'typed-correct', char: 'X' }).
     */
    updateTile(x, y, tileData) {
        if (this.tileElements[y] && this.tileElements[y][x]) {
            const tileElement = this.tileElements[y][x];

            // Example: Update classes based on new type
            if (tileData.type) {
                // Remove old type classes (you might need a list of possible types)
                tileElement.classList.remove('pathway', 'data-node', 'corrupted', 'highlight', 'typed-correct'); // Add all types
                tileElement.classList.add(tileData.type);
            }
            // Example: Update character content
            if (tileData.char !== undefined) {
                tileElement.textContent = tileData.char;
            }
            // Example: Add/Remove highlight class
             if (tileData.highlight !== undefined) {
                tileElement.classList.toggle('highlight', tileData.highlight);
            }

        } else {
            console.warn(`Attempted to update non-existent tile element at (${x}, ${y})`);
        }
    }

    /**
     * Draws or updates the player element on the grid.
     * @param {object} player - The player object, containing at least { x, y, char, state (optional) }.
     */
    drawPlayer(player) {
        const elementId = 'player'; // Unique ID for the player element
        let playerElement = this.drawnElements.get(elementId);

        if (!playerElement) {
            // Create element if it doesn't exist
            playerElement = document.createElement('div');
            playerElement.classList.add('tile', 'player'); // Base classes
            playerElement.id = elementId; // Assign ID for potential future reference
            this.container.appendChild(playerElement);
            this.drawnElements.set(elementId, playerElement);
        }

        // Update common properties
        playerElement.textContent = player.char || '@'; // Player character
        // Set position (Translate 0-based game coords to 1-based CSS grid coords)
        playerElement.style.gridColumn = player.x + 1;
        playerElement.style.gridRow = player.y + 1;

        // Update classes based on state (example)
        playerElement.classList.toggle('hit', player.state === 'hit');
        playerElement.classList.toggle('typing', player.state === 'typing');
    }

    /**
     * Draws or updates an enemy element on the grid.
     * @param {object} enemy - The enemy object, containing at least { id, x, y, char, type (optional), state (optional) }.
     */
    drawEnemy(enemy) {
        const elementId = `enemy-${enemy.id}`; // Unique ID for each enemy
        let enemyElement = this.drawnElements.get(elementId);

        if (!enemyElement) {
            // Create element
            enemyElement = document.createElement('div');
            enemyElement.classList.add('tile', 'enemy');
            if (enemy.type) enemyElement.classList.add(enemy.type); // e.g., 'chaser', 'sentinel'
            enemyElement.id = elementId;
            this.container.appendChild(enemyElement);
            this.drawnElements.set(elementId, enemyElement);
        }

        // Update properties
        enemyElement.textContent = enemy.char || 'E';
        enemyElement.style.gridColumn = enemy.x + 1;
        enemyElement.style.gridRow = enemy.y + 1;

        // Update state class (example)
        enemyElement.classList.toggle('alert', enemy.state === 'alert');
    }

    /**
     * Removes a specific dynamic element (like an enemy) by its ID.
     * @param {string} elementId - The unique ID used when drawing (e.g., 'enemy-123').
     */
    removeElementById(elementId) {
        const element = this.drawnElements.get(elementId);
        if (element && element.parentNode === this.container) {
            this.container.removeChild(element);
            this.drawnElements.delete(elementId);
        }
    }

    /**
      * Draws temporary text on the screen (e.g., for debug info).
      * Note: UI text like score/health is handled by UIManager.
      * @param {string} text - The text content.
      * @param {number} x - Screen X position (pixels).
      * @param {number} y - Screen Y position (pixels).
      * @param {object} [options={}] - Styling options (color, fontSize, etc.).
      */
    drawText(text, x, y, options = {}) {
        // For DOM rendering, creating temporary absolutely positioned elements
        // can be cumbersome. This is often easier with Canvas.
        // For now, log to console or use status message via UIManager.
        console.log(`DEBUG DRAW TEXT [${x},${y}]: ${text}`, options);
        // If really needed: create a temporary absolutely positioned div, style it,
        // add it to the container, and potentially remove it after a short delay.
    }
}