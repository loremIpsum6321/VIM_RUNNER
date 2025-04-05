// js/main.js

// Strict mode helps catch common coding errors
'use strict';

// --- Import Core Modules ---
// Assuming ES6 module structure in other files
import GameLoop from './core/gameLoop.js';
import StateManager from './core/stateManager.js';
import Renderer from './core/renderer.js';
import InputHandler from './input/inputHandler.js'; // Start with a combined handler
import LevelManager from './game_logic/levelManager.js';
import UIManager from './game_logic/uiManager.js';
import Player from './game_objects/player.js';
// Example import for constants (adjust path/content as needed)
// import { GAME_STATES, RENDERER_TYPE } from './data/constants.js';

// --- Main Game Initialization Function ---
function initializeGame() {
    console.log("VIM://RUNNER - Initializing subsystems...");

    try {
        // --- 1. Get Essential DOM Element References ---
        const gameScreenElement = document.getElementById('game-screen');
        const uiElements = {
            // Pass references for UIManager to manage
            score: document.querySelector('#score span'),
            timer: document.querySelector('#timer span'),
            levelName: document.querySelector('#level-name span'),
            integrityBar: document.querySelector('#integrity .bar-value'),
            integrityPercent: document.querySelector('#integrity .percent'),
            integrityContainer: document.getElementById('integrity'), // For adding classes like 'low'
            cpuCyclesBar: document.querySelector('#cpu-cycles .bar-value'),
            cpuCyclesPercent: document.querySelector('#cpu-cycles .percent'),
            statusMessage: document.getElementById('status-message'),
            commandBuffer: document.getElementById('command-buffer'),
        };

        // --- 2. Validate DOM References ---
        if (!gameScreenElement) {
            throw new Error("Fatal Error: #game-screen element not found in HTML!");
        }
        // Basic check for UI elements (more robust checks can be added in UIManager)
        if (!uiElements.score || !uiElements.integrityBar) {
            console.warn("Warning: Some UI elements might be missing.");
        }

        // --- 3. Instantiate Core Game Components ---

        // Renderer: Handles drawing to the screen (DOM or Canvas)
        // Pass the container element. Add config if needed (e.g., grid size hints)
        const renderer = new Renderer(gameScreenElement /*, { type: RENDERER_TYPE.DOM } */);
        console.log("Renderer instantiated.");

        // Input Handler: Manages keyboard input and command parsing
        const inputHandler = new InputHandler();
        console.log("InputHandler instantiated.");

        // UI Manager: Updates score, health, messages etc.
        const uiManager = new UIManager(uiElements);
        console.log("UIManager instantiated.");

        // Level Manager: Loads and provides level data
        const levelManager = new LevelManager(/* Pass level data source if needed */);
        console.log("LevelManager instantiated.");

        // Player: Represents the player state and logic
        const player = new Player(/* Pass initial player config if needed */);
        console.log("Player instantiated.");

        // State Manager: Controls the overall game state (menu, playing, paused)
        // This is a crucial component that orchestrates interactions based on state.
        // We inject dependencies into it.
        const stateManager = new StateManager({
            renderer,
            inputHandler,
            uiManager,
            levelManager,
            player,
            // Pass any other shared components needed by different states
        });
        console.log("StateManager instantiated.");

        // Game Loop: Drives the game's update/render cycle
        // It needs functions to call for update and render, provided by the StateManager
        const gameLoop = new GameLoop(
            stateManager.update.bind(stateManager), // Use .bind to maintain 'this' context
            stateManager.render.bind(stateManager)
        );
        console.log("GameLoop instantiated.");


        // --- 4. Initialize Subsystems ---
        // Order can be important here

        // Attach keyboard listeners
        inputHandler.init();
        console.log("Input listeners attached.");

        // Set initial UI display
        uiManager.init(); // e.g., Reset score to 0, health to 100%
        console.log("UI initialized.");

        // Set the initial game state (e.g., loading screen, main menu)
        // This might trigger initial level loading or menu display via the StateManager
        stateManager.init(/* GAME_STATES.LOADING */); // Or MENU, depending on flow
        console.log("StateManager initialized, initial state set.");


        // --- 5. Start the Game Loop ---
        console.log("Initialization complete. Starting VIM://RUNNER game loop...");
        gameLoop.start();

    } catch (error) {
        console.error("FATAL ERROR DURING INITIALIZATION:", error);
        // Display error to the user fallback
        displayInitializationError(error);
    }
}

function displayInitializationError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.style.color = 'red';
    errorDiv.style.backgroundColor = 'black';
    errorDiv.style.padding = '20px';
    errorDiv.style.fontFamily = 'monospace';
    errorDiv.style.border = '2px solid red';
    errorDiv.style.position = 'absolute';
    errorDiv.style.top = '10px';
    errorDiv.style.left = '10px';
    errorDiv.style.right = '10px';
    errorDiv.innerHTML = `
        <h1>FATAL INITIALIZATION ERROR</h1>
        <p>VIM://RUNNER could not start.</p>
        <p><strong>Error:</strong> ${error.message}</p>
        <p>Check the browser console (F12) for more details.</p>
        <pre>${error.stack || ''}</pre>
    `;
    // Clear the body and append the error message
    document.body.innerHTML = '';
    document.body.appendChild(errorDiv);
    document.body.style.backgroundColor = 'black'; // Ensure background is visible
}

// --- Entry Point ---
// Wait for the basic HTML structure to be loaded before running the initialization.
// 'DOMContentLoaded' is generally preferred over 'load' as it doesn't wait for images/stylesheets.
document.addEventListener('DOMContentLoaded', initializeGame);