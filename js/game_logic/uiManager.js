// js/game_logic/uiManager.js

'use strict';

/**
 * Manages updates to the game's user interface elements (score, health, timer, messages, etc.).
 */
export default class UIManager {
    /**
     * Creates a UIManager instance.
     * @param {object} uiElements - An object containing references to the relevant DOM elements for the UI.
     */
    constructor(uiElements) {
        if (!uiElements) {
            throw new Error("UIManager requires an object containing references to UI DOM elements.");
        }
        this.elements = uiElements; // Store references like { score: spanElement, timer: spanElement, ... }

        // Validate essential elements
        if (!this.elements.score || !this.elements.timer || !this.elements.integrityBar || !this.elements.cpuCyclesBar) {
            console.warn("UIManager is missing some expected UI element references. Some UI updates might fail.");
        }

        this.messageTimeoutId = null; // To store ID for clearing timed messages

        console.log("UIManager initialized with elements:", this.elements);
    }

    /**
     * Initializes the UI to its default state (e.g., score 0, full health).
     * Called once when the game starts.
     */
    init() {
        console.log("Initializing UI display...");
        this.updateScore(0);
        this.updateTimer(0);
        this.updateLevelName("STANDBY");
        this.updateIntegrity(100);
        this.updateCPUCycles(100);
        this.clearMessage();
        this.updateCommandBuffer(':'); // Default buffer display
        // Ensure elements that might be hidden initially are shown/hidden correctly
        if (this.elements.commandBuffer) this.showElement(this.elements.commandBuffer);
    }

    /**
     * Updates the displayed score.
     * @param {number} newScore - The player's current score.
     */
    updateScore(newScore) {
        if (this.elements.score) {
            this.elements.score.textContent = Math.floor(newScore); // Ensure integer display
        }
    }

    /**
     * Updates the displayed game timer.
     * @param {number} totalSeconds - The total elapsed game time in seconds.
     */
    updateTimer(totalSeconds) {
        if (this.elements.timer) {
            this.elements.timer.textContent = this._formatTime(totalSeconds);
        }
    }

    /**
     * Updates the displayed level name/identifier.
     * @param {string} name - The name or ID of the current level/stream.
     */
    updateLevelName(name) {
        if (this.elements.levelName) {
            this.elements.levelName.textContent = name;
        }
    }

    /**
     * Updates the player's integrity (health) bar and percentage text.
     * @param {number} percent - The player's integrity percentage (0-100).
     */
    updateIntegrity(percent) {
        this._updateResourceBar(
            this.elements.integrityBar,
            this.elements.integrityPercent,
            this.elements.integrityContainer, // Pass container for adding classes
            percent,
            { low: 40, critical: 20 } // Thresholds for adding classes
        );
    }

    /**
     * Updates the player's CPU Cycles (energy) bar and percentage text.
     * @param {number} percent - The player's current CPU cycles percentage (0-100).
     */
    updateCPUCycles(percent) {
        this._updateResourceBar(
            this.elements.cpuCyclesBar,
            this.elements.cpuCyclesPercent,
            null, // No container needed for special classes currently
            percent
        );
    }

    /**
     * Displays a message in the status area.
     * @param {string} message - The text to display.
     * @param {number} [duration=0] - How long to display the message in milliseconds. 0 means indefinitely until cleared or replaced.
     */
    showMessage(message, duration = 0) {
        if (this.elements.statusMessage) {
            this.clearMessage(); // Clear previous message and timeout
            this.elements.statusMessage.textContent = message;
            this.elements.statusMessage.style.opacity = 1; // Ensure visible

            if (duration > 0) {
                this.messageTimeoutId = setTimeout(() => {
                    // Fade out optionaly
                    // this.elements.statusMessage.style.opacity = 0;
                    this.elements.statusMessage.textContent = ''; // Clear text after duration
                    this.messageTimeoutId = null;
                }, duration);
            }
        }
    }

    /**
     * Clears the status message area and any pending timed clearance.
     */
    clearMessage() {
        if (this.messageTimeoutId) {
            clearTimeout(this.messageTimeoutId);
            this.messageTimeoutId = null;
        }
        if (this.elements.statusMessage) {
            this.elements.statusMessage.textContent = '';
            this.elements.statusMessage.style.opacity = 1; // Reset opacity if using fade out
        }
    }

    /**
     * Updates the display showing the current Vim command buffer content.
     * @param {string} bufferText - The text to display (e.g., ":", ":d", ":3d").
     */
    updateCommandBuffer(bufferText) {
        if (this.elements.commandBuffer) {
            this.elements.commandBuffer.textContent = bufferText || ':'; // Ensure it shows at least ':'
        }
    }

    /**
     * Helper to hide a specific UI element.
     * @param {HTMLElement} element - The DOM element to hide.
     */
    hideElement(element) {
        if (element) {
            element.style.display = 'none';
        }
    }

    /**
     * Helper to show a specific UI element (restores default display).
     * @param {HTMLElement} element - The DOM element to show.
     */
    showElement(element) {
        if (element) {
            element.style.display = ''; // Reset to default (usually block or inline-block based on CSS)
        }
    }


    // --- Private Helper Methods ---

    /**
     * Formats total seconds into MM:SS or M:SS format.
     * @param {number} totalSeconds - Total seconds elapsed.
     * @returns {string} Formatted time string.
     * @private
     */
    _formatTime(totalSeconds) {
        const time = Math.max(0, Math.floor(totalSeconds));
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Updates a resource bar's visual width and percentage text.
     * Optionally adds status classes to the container based on thresholds.
     * @param {HTMLElement} barElement - The element representing the bar's value (e.g., the inner div).
     * @param {HTMLElement} percentElement - The element displaying the percentage text.
     * @param {HTMLElement | null} containerElement - The container element to add status classes to (e.g., 'low', 'critical').
     * @param {number} percent - The percentage value (0-100).
     * @param {object} [thresholds={}] - Optional thresholds { low: number, critical: number }.
     * @private
     */
    _updateResourceBar(barElement, percentElement, containerElement, percent, thresholds = {}) {
        const clampedPercent = Math.max(0, Math.min(100, percent));

        if (barElement) {
            barElement.style.width = `${clampedPercent}%`;
        }
        if (percentElement) {
            percentElement.textContent = `${Math.floor(clampedPercent)}%`;
        }
        if (containerElement) {
            containerElement.classList.remove('low', 'critical');
            if (thresholds.critical !== undefined && clampedPercent <= thresholds.critical) {
                containerElement.classList.add('critical');
            } else if (thresholds.low !== undefined && clampedPercent <= thresholds.low) {
                containerElement.classList.add('low');
            }
        }
    }
}