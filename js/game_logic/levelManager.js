// js/game_logic/levelManager.js

'use strict';

/**
 * Manages loading and providing level data for the game.
 * Initially uses hardcoded level definitions.
 */
export default class LevelManager {
    constructor() {
        // Store level definitions directly here for simplicity
        this.levels = {
            1: this._defineLevel1(),
            2: this._defineLevel2(),
            // Add more levels here by calling definition functions
        };
        this.currentLevelId = null;
        console.log(`LevelManager initialized with ${Object.keys(this.levels).length} levels defined.`);
    }

    /**
     * Retrieves the data for a specific level.
     * @param {number | string} levelId - The ID of the level to load.
     * @returns {object | null} A deep copy of the level data object, or null if not found.
     */
    loadLevel(levelId) {
        const levelDefinition = this.levels[levelId];

        if (!levelDefinition) {
            console.error(`Level with ID ${levelId} not found.`);
            return null;
        }

        console.log(`Loading level: ${levelId} - ${levelDefinition.name}`);
        this.currentLevelId = levelId;

        // Return a deep copy
        try {
            // Ensure enemySpawns array exists, even if empty, before stringifying
             const definitionCopy = { ...levelDefinition, enemySpawns: levelDefinition.enemySpawns || [] };
             return JSON.parse(JSON.stringify(definitionCopy));
        } catch (e) {
            console.error("Failed to deep copy level data:", e);
            return null;
        }
    }

    /**
     * Gets the ID of the currently loaded level.
     * @returns {number | string | null}
     */
    getCurrentLevelId() {
        return this.currentLevelId;
    }

    // --- Level Definition Functions ---

    _defineLevel1() {
        const width = 20;
        const height = 5;
        const tiles = this._createEmptyGrid(width, height);

        const levelData = {
            id: 1,
            name: "STREAM::INIT",
            width: width,
            height: height,
            playerStart: { x: 1, y: 2 },
            tiles: tiles,
            // --- ADD ENEMY SPAWNS ---
            enemySpawns: [
                // Add one chaser
                { type: 'chaser', x: 15, y: 2 } // Starts on the same row as the path
            ]
            // --------------------------
        };

        // Layout Tiles
        this._stringToTiles(tiles, 1, 2, "TYPE:");
        this._stringToTiles(tiles, 7, 2, "RUN", true, "RUN");
        this._placeTile(tiles, 11, 2, { char: '@', type: 'exit-node' });

        // Barriers
        this._fillRow(tiles, 0, '|', 'barrier');
        this._fillRow(tiles, height - 1, '|', 'barrier');

        return levelData;
    }

    _defineLevel2() {
        const width = 30;
        const height = 8;
        const tiles = this._createEmptyGrid(width, height);

        const levelData = {
            id: 2,
            name: "STREAM::FWD",
            width: width,
            height: height,
            playerStart: { x: 1, y: 1 },
            tiles: tiles,
             // --- ADD ENEMY SPAWNS ---
            enemySpawns: [
                { type: 'chaser', x: 20, y: 1, char: 'c' }, // lowercase 'c' chaser
                { type: 'chaser', x: 10, y: 4, speed: 1.0 }, // Slower chaser
                { type: 'chaser', x: 25, y: 5 }
            ]
            // --------------------------
        };

        // Layout
        this._stringToTiles(tiles, 1, 1, "GO", true, "GO");
        this._stringToTiles(tiles, 5, 1, "FORWARD", true, "FORWARD");
        this._placeTile(tiles, 13, 1, '|', 'barrier');

        this._stringToTiles(tiles, 1, 3, "USE", true, "USE");
        this._stringToTiles(tiles, 6, 3, "DELETE", true, "DELETE");
        this._placeTile(tiles, 13, 3, '#', 'corrupted');

        this._stringToTiles(tiles, 1, 5, "REACH", true, "REACH");
        this._stringToTiles(tiles, 8, 5, "EXIT", true, "EXIT");
        this._placeTile(tiles, 14, 5, '@', 'exit-node');

        // Barriers
        this._fillColumn(tiles, 0, '|', 'barrier');
        this._fillColumn(tiles, width - 1, '|', 'barrier');
        this._fillRow(tiles, height - 1, '|', 'barrier');

        return levelData;
    }


    // --- Helper methods --- (remain the same)
     _createEmptyGrid(width, height, defaultChar = '.', defaultType = 'pathway') {
        const grid = [];
        for (let y = 0; y < height; y++) {
            grid[y] = [];
            for (let x = 0; x < width; x++) {
                grid[y][x] = { char: defaultChar, type: defaultType };
            }
        }
        return grid;
    }
     _placeTile(tiles, x, y, tileData) {
        const height = tiles.length;
        const width = tiles[0]?.length;
        if (y >= 0 && y < height && x >= 0 && x < width) {
            tiles[y][x] = { ...tiles[y][x], ...tileData };
        } else {
            console.warn(`Attempted to place tile outside grid bounds at (${x}, ${y})`);
        }
    }
     _stringToTiles(tiles, startX, startY, str, isTypeableWord = false, requiredWord = null) {
        for (let i = 0; i < str.length; i++) {
            const x = startX + i;
            const y = startY;
            const char = str[i];
            let tileData = { char: char, type: 'data-node' };
            if (isTypeableWord) {
                if (i === 0) {
                     tileData.requiredWord = requiredWord || str;
                     tileData.isWordStart = true;
                } else {
                     tileData.isPartOfWord = true;
                 }
            } else {
                tileData.type = 'decoration';
            }
            this._placeTile(tiles, x, y, tileData);
        }
    }
      _fillRow(tiles, rowIndex, char, type) {
         if (rowIndex >= 0 && rowIndex < tiles.length) {
             const width = tiles[rowIndex].length;
             for (let x = 0; x < width; x++) {
                 this._placeTile(tiles, x, rowIndex, { char, type });
             }
         }
     }
      _fillColumn(tiles, colIndex, char, type) {
         const height = tiles.length;
         if (height > 0) {
             const width = tiles[0].length;
             if (colIndex >= 0 && colIndex < width) {
                 for (let y = 0; y < height; y++) {
                    this._placeTile(tiles, colIndex, y, { char, type });
                }
             }
         }
     }
}