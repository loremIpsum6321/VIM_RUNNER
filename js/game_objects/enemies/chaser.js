// js/game_objects/enemies/chaser.js

'use strict';

import Enemy from '../enemy.js'; // Import the base Enemy class

/**
 * A simple enemy type that attempts to move towards the player.
 */
export default class Chaser extends Enemy {
    /**
     * Creates a new Chaser instance.
     * @param {object} config - Configuration object (passed to base Enemy constructor).
     * Typically includes x, y. Defaults char to 'C', type to 'chaser'.
     */
    constructor(config) {
        // Set defaults specific to Chaser before calling super
        const chaserConfig = {
            char: 'C',
            type: 'chaser',
            health: 2, // Chasers might be slightly tougher than base
            speed: 1.5, // Example speed: 1.5 tiles per second
            ...config, // Allow overriding defaults with passed config
        };
        super(chaserConfig); // Call the base Enemy constructor
        this.state = 'chasing'; // Chasers are generally always chasing
        // console.log(`Chaser ${this.id} created.`);
    }

    /**
     * Updates the Chaser's position based on the player's location.
     * Overrides the base Enemy update method.
     * @param {number} deltaTime - Time elapsed since the last frame.
     * @param {object} playerPosition - The player's current position { x, y }.
     */
    update(deltaTime, playerPosition) {
        // First, check if the base class logic allows a move based on speed/cooldown
        const canAttemptMove = super.update(deltaTime, playerPosition);

        if (!canAttemptMove || !playerPosition || this.isDefeated()) {
            // Either cooldown isn't ready, player position is unknown, or enemy is defeated
            return;
        }

        // --- Simple Chasing Logic ---
        const dx = playerPosition.x - this.x;
        const dy = playerPosition.y - this.y;

        let moveX = 0;
        let moveY = 0;

        // Determine preferred direction (prioritize axis with greater distance)
        if (Math.abs(dx) > Math.abs(dy)) {
            // Prefer horizontal movement
            moveX = Math.sign(dx); // Move 1 step towards player horizontally
        } else if (Math.abs(dy) > 0) { // Use else if to avoid moving diagonally in one step unless abs(dx)===abs(dy)
            // Prefer vertical movement
            moveY = Math.sign(dy); // Move 1 step towards player vertically
        } else if (Math.abs(dx) > 0) { // Handles the case where dy is 0 but dx is not
             moveX = Math.sign(dx);
        }
        // If dx and dy are both 0, the chaser is on the player, no move needed.

        if (moveX === 0 && moveY === 0) {
            // Already at player's position (or no direction determined)
            return;
        }

        // --- Check if the preferred move is valid ---
        let targetX = this.x + moveX;
        let targetY = this.y + moveY;

        if (this._isValidMove(targetX, targetY)) {
            // Move in the preferred direction
            this.x = targetX;
            this.y = targetY;
            // console.log(`Chaser ${this.id} moved to (${this.x}, ${this.y})`);
        } else {
            // --- Preferred move blocked, try the alternate direction ---
            if (moveX !== 0 && moveY === 0) { // Was trying horizontal, try vertical
                moveY = Math.sign(dy); // What was the vertical difference?
                moveX = 0; // Don't move horizontally now
            } else if (moveY !== 0 && moveX === 0) { // Was trying vertical, try horizontal
                moveX = Math.sign(dx); // What was the horizontal difference?
                moveY = 0; // Don't move vertically now
            } else {
                // This case might occur if initial move was diagonal attempt (abs(dx)==abs(dy)) and it failed.
                // Let's try just horizontal first, then just vertical as fallbacks.
                if (Math.sign(dx) !== 0 && this._isValidMove(this.x + Math.sign(dx), this.y)) {
                    this.x += Math.sign(dx);
                    return;
                } else if (Math.sign(dy) !== 0 && this._isValidMove(this.x, this.y + Math.sign(dy))) {
                    this.y += Math.sign(dy);
                    return;
                }
                // If both individual axis moves fail, do nothing this turn.
                 moveX = 0;
                 moveY = 0;
            }

            // Check validity of the alternate move (if determined)
            if (moveX !== 0 || moveY !== 0) {
                targetX = this.x + moveX;
                targetY = this.y + moveY;
                if (this._isValidMove(targetX, targetY)) {
                    this.x = targetX;
                    this.y = targetY;
                     // console.log(`Chaser ${this.id} moved (alt) to (${this.x}, ${this.y})`);
                } else {
                    // Both preferred and alternate moves blocked
                    // console.log(`Chaser ${this.id} blocked at (${this.x}, ${this.y})`);
                }
            }
        }
    }

    // Chaser might have specific reactions to damage or other states
    // takeDamage(amount) {
    //     super.takeDamage(amount);
    //     // Maybe briefly change state or appearance?
    // }
}