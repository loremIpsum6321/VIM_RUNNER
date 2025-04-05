// js/core/gameLoop.js

'use strict';

/**
 * Manages the main game loop using requestAnimationFrame.
 * Provides a consistent update and render cycle.
 */
export default class GameLoop {
    /**
     * Creates a GameLoop instance.
     * @param {function(number): void} update - The function to call for game logic updates. Receives deltaTime in seconds.
     * @param {function(): void} render - The function to call for rendering the game state.
     */
    constructor(update, render) {
        if (typeof update !== 'function') {
            throw new Error('GameLoop requires an update function.');
        }
        if (typeof render !== 'function') {
            throw new Error('GameLoop requires a render function.');
        }

        this.update = update; // Function to update game state
        this.render = render; // Function to draw the game state

        this.isRunning = false; // Is the loop currently active?
        this.lastTime = 0;      // Timestamp of the last frame
        this.rafId = null;      // ID returned by requestAnimationFrame

        // Bind the loop method to ensure 'this' context is correct when called by requestAnimationFrame
        this._loop = this._loop.bind(this);
    }

    /**
     * Starts the game loop.
     */
    start() {
        if (this.isRunning) {
            console.warn("GameLoop already running.");
            return;
        }
        console.log("Starting GameLoop...");
        this.isRunning = true;
        // Initialize lastTime right before the first frame request
        this.lastTime = performance.now();
        // Use requestAnimationFrame to start the loop
        this.rafId = requestAnimationFrame(this._loop);
    }

    /**
     * Stops the game loop.
     */
    stop() {
        if (!this.isRunning) {
            console.warn("GameLoop already stopped.");
            return;
        }
        console.log("Stopping GameLoop...");
        this.isRunning = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        this.rafId = null;
    }

    /**
     * The core loop function, called recursively via requestAnimationFrame.
     * Calculates delta time and calls update/render.
     * @param {number} currentTime - The timestamp provided by requestAnimationFrame.
     * @private
     */
    _loop(currentTime) {
        // If the loop was stopped externally (e.g., via stop()), exit immediately.
        if (!this.isRunning) {
            return;
        }

        // --- Calculate Delta Time (time elapsed since the last frame in seconds) ---
        // performance.now() provides high-resolution timestamps
        const deltaTime = (currentTime - this.lastTime) / 1000; // Convert ms to seconds
        this.lastTime = currentTime;

        // Optional: Cap delta time to prevent huge jumps if the tab was inactive
        // const MAX_DELTA_TIME = 1 / 30; // Max update equivalent to 30fps
        // const cappedDeltaTime = Math.min(deltaTime, MAX_DELTA_TIME);

        // --- Call Update and Render ---
        try {
            // Pass delta time to the update function for frame-rate independent logic
            this.update(deltaTime /* or cappedDeltaTime */);
            this.render();
        } catch (error) {
            console.error("Error during game loop update/render:", error);
            this.stop(); // Stop the loop on critical error
            // Optionally display an error to the user
            alert("A critical error occurred in the game loop. Please check the console.");
            return; // Prevent requesting the next frame
        }


        // --- Request the next frame ---
        // Continue the loop by requesting the next animation frame
        this.rafId = requestAnimationFrame(this._loop);
    }
} 