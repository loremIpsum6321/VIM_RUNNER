// js/game_objects/enemy.js

'use strict';

let nextEnemyId = 0; // Simple unique ID generator

/**
 * Base class for all enemy types.
 */
export default class Enemy {
    /**
     * Creates a new Enemy instance.
     * @param {object} config - Configuration object.
     * @param {number} config.x - Starting X position.
     * @param {number} config.y - Starting Y position.
     * @param {string} [config.char='E'] - Character representation.
     * @param {string} [config.type='base'] - Type identifier (e.g., 'chaser', 'patroller').
     * @param {number} [config.health=1] - Enemy health points.
     * @param {number} [config.speed=2] - Tiles per second movement speed (can be fractional).
     * @param {string} [config.state='idle'] - Initial state ('idle', 'chasing', 'attacking').
     */
    constructor(config) {
        this.id = `enemy-${nextEnemyId++}`; // Assign a unique ID
        this.x = config.x;
        this.y = config.y;
        this.char = config.char || 'E';
        this.type = config.type || 'base';
        this.health = config.health || 1;
        this.speed = config.speed || 2; // Tiles per second
        this.state = config.state || 'idle';

        this.currentLevelGrid = null; // Reference to the level grid
        this.moveCooldown = 0; // Time until next potential move based on speed

        if (this.x === undefined || this.y === undefined) {
            throw new Error(`Enemy requires initial x, y coordinates.`);
        }
        // console.log(`Enemy ${this.id} (${this.type}) created at (${this.x}, ${this.y})`);
    }

    /**
     * Stores a reference to the current level's grid data. Essential for movement validation.
     * @param {object} gridData - The grid object from LevelManager.
     */
    setLevelGrid(gridData) {
        this.currentLevelGrid = gridData;
    }

    /**
     * Base update logic. Should be overridden by subclasses.
     * Handles move cooldown based on speed.
     * @param {number} deltaTime - Time elapsed since the last frame.
     * @param {object} playerPosition - The player's current position { x, y }.
     * @returns {boolean} True if the enemy decided to move this frame, false otherwise.
     */
    update(deltaTime, playerPosition) {
        this.moveCooldown -= deltaTime;
        if (this.moveCooldown <= 0) {
            // Reset cooldown based on speed (time = distance / speed; distance is 1 tile)
            this.moveCooldown += 1 / this.speed;
            // Return true to indicate subclass should attempt a move
            return true;
        }
        return false; // Didn't attempt to move this frame
    }

    /**
     * Reduces enemy health.
     * @param {number} amount - The amount of damage to take.
     */
    takeDamage(amount) {
        this.health -= amount;
        this.health = Math.max(0, this.health);
        console.log(`Enemy ${this.id} took ${amount} damage, health: ${this.health}`);
        if (this.health === 0) {
            this.state = 'defeated';
            console.log(`Enemy ${this.id} defeated!`);
        }
    }

    /**
     * Checks if a potential move target is valid (within bounds and not a barrier).
     * @param {number} targetX - The potential next X coordinate.
     * @param {number} targetY - The potential next Y coordinate.
     * @returns {boolean} True if the move is valid, false otherwise.
     * @protected
     */
    _isValidMove(targetX, targetY) {
        if (!this.currentLevelGrid) return false; // Cannot validate without grid context

        // Check boundaries
        if (targetX < 0 || targetX >= this.currentLevelGrid.width ||
            targetY < 0 || targetY >= this.currentLevelGrid.height) {
            return false;
        }

        // Check if target tile is traversable
        const targetTile = this.currentLevelGrid.tiles[targetY]?.[targetX];
        // Enemies might only be blocked by barriers, or maybe other things too?
        if (!targetTile || targetTile.type === 'barrier') {
            return false;
        }
        // TODO: Check for collision with other enemies?

        return true;
    }

    // --- Getters ---
    getPosition() { return { x: this.x, y: this.y }; }
    getId() { return this.id; }
    getChar() { return this.char; }
    getType() { return this.type; }
    getState() { return this.state; }
    getHealth() { return this.health; }
    isDefeated() { return this.health <= 0; }
}