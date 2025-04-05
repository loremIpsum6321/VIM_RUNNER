// js/core/stateManager.js

'use strict';

// --- Imports ---
import InputHandler from '../input/inputHandler.js'; // Keep for INPUT_MODE if needed
import Chaser from '../game_objects/enemies/chaser.js';
// ... other potential imports ...

// --- BaseState Class --- (remains the same)
class BaseState {
    constructor(stateManager, dependencies) {
        this.stateManager = stateManager;
        this.renderer = dependencies.renderer;
        this.inputHandler = dependencies.inputHandler;
        this.uiManager = dependencies.uiManager;
        this.levelManager = dependencies.levelManager;
        this.player = dependencies.player;
        if (!this.renderer || !this.inputHandler || !this.uiManager || !this.levelManager || !this.player) {
            throw new Error(`State ${this.constructor.name} missing core dependencies!`);
        }
    }
    enter(params) {}
    exit() {}
    update(deltaTime) {}
    render() {}
}

// --- LoadingState Class --- (remains the same)
class LoadingState extends BaseState {
    // ... (constructor, enter, update, render, exit as defined before) ...
     constructor(stateManager, dependencies) { super(stateManager, dependencies); /* ... */ console.log("LoadingState instantiated."); }
     enter(params) { /* ... */ console.log("Entering LoadingState"); /* ... */ }
     update(deltaTime) { /* ... */ if (this.levelLoaded && this.assetsLoaded) { this.stateManager.switchTo('PLAYING', { levelData: this.levelData }); } }
     render() { /* ... */ this.renderer.clearAll?.(); /* ... draw loading text ... */ }
     exit() { /* ... */ console.log("Exiting LoadingState"); }
}

// --- PlayingState Class --- (Modify pause handling, win/loss switching)
class PlayingState extends BaseState {
    // ... (constructor, most methods remain similar to previous version) ...
     constructor(stateManager, dependencies) {
         super(stateManager, dependencies);
         this.currentLevel = null;
         // Remove internal paused flag: this.paused = false;
         this.elapsedTime = 0;
         this.enemies = [];
         console.log("PlayingState instantiated.");
     }

     enter(params) {
         // ... (Most of enter remains the same: check params, set level, reset time/enemies, init UI, init Renderer, init Player) ...
         console.log("Entering PlayingState");
         // ...
         this.enemies = []; // Ensure cleared
         // ... Spawn Enemies ... (remains same)
         // ... Initialize Input ...
         this.inputHandler.setActive(true);
         this.inputHandler.setMode(INPUT_MODE.NORMAL);
         this.inputHandler.clearCommandBuffer();
         // Register pause listener (e.g., Escape key)
         this.inputHandler.registerActionListener('pause', () => {
              // --- SWITCH TO PAUSED STATE ---
              this.stateManager.switchTo('PAUSED');
              // ---------------------------
         });
     }

    // REMOVE togglePause() method - handled by state switching now

    update(deltaTime) {
        // If we are in this state's update, we are not paused (pause is a separate state)

        // Update Timer
        this.elapsedTime += deltaTime;
        this.uiManager.updateTimer(this.elapsedTime);

        // Get Input Commands & Process Player Actions (remains the same)
        const commands = this.inputHandler.getCommands();
        const playerActions = this.player.handleInput(commands, deltaTime);
        this.processPlayerActions(playerActions);

        // Player State Update (remains the same)
        this.player.update(deltaTime);

        // Update Enemies & Check Defeat (remains the same)
        for (let i = this.enemies.length - 1; i >= 0; i--) { /* ... */ }

        // Check Collisions (remains the same)
        for (const enemy of this.enemies) { /* ... */ }

        // Tile Interaction (remains the same)
        this.checkTileInteraction();

        // Update UI (remains the same)
        this.uiManager.updateIntegrity(this.player.getIntegrity());
        // ... etc ...

        // --- Check Win/Loss Conditions --- (Switch to new states)
        if (this.player.getState() === 'defeated') {
            // --- SWITCH TO GAME_OVER STATE ---
            this.stateManager.switchTo('GAME_OVER', {
                score: this.player.getScore(),
                levelId: this.currentLevel?.id || 1 // Pass level ID for retry
            });
            // -------------------------------
        }
        const playerTile = this.getTileAt(this.player.x, this.player.y);
        if (playerTile?.type === 'exit-node') {
            // TODO: Check objectives?
            console.log("Player reached Exit Node!");
            // --- SWITCH TO LEVEL_COMPLETE STATE ---
            this.stateManager.switchTo('LEVEL_COMPLETE', {
                 score: this.player.getScore(),
                 levelId: this.currentLevel?.id || 0,
                 nextLevelId: (this.currentLevel?.id || 0) + 1 // Simple next level logic
            });
            // ------------------------------------
        }
    }

    /** Handles actions requested by the player object */
    processPlayerActions(actions) {
        for (const action of actions) {
            switch (action.type) {
                // --- UPDATED/ADDED CASES ---
                case 'DELETE_RANGE':
                case 'CHANGE_RANGE':
                    this.handleRangeAction(action.target, action.cost, action.type);
                    // If it was a CHANGE action, trigger typing mode
                    if (action.type === 'CHANGE_RANGE') {
                         // TODO: Determine the correct starting position after deletion (usually startX, startY)
                         // TODO: Determine what the target phrase should be (usually empty unless replacing specific text)
                         console.log("Change action completed, requesting TYPING mode.");
                         this.inputHandler.setMode(INPUT_MODE.TYPING, { targetPhrase: '' }); // Start typing empty space
                         // Maybe move player cursor explicitly?
                         // this.player.setPosition(action.target.startX, action.target.startY);
                    }
                    break;
                  case 'REPLACE_CHAR':
                     const replaceTarget = action.target;
                     const replTile = this.getTileAt(replaceTarget.x, replaceTarget.y);
                     // Add rules? Only replace certain types? Cost CPU?
                     if(replTile && replTile.type !== 'barrier'){ // Can't replace barriers
                        console.log(`Replacing char at (${replaceTarget.x}, ${replaceTarget.y}) with ${replaceTarget.char}`);
                        this.updateGridTile(replaceTarget.x, replaceTarget.y, { char: replaceTarget.char /*, maybe change type? */ });
                        // No score/cost for basic replace?
                     }
                     break;
                 // ...(Other cases like MODE_CHANGE_REQUEST, FEEDBACK remain same)...
                case 'MODE_CHANGE_REQUEST': /* ... */ break;
                case 'FEEDBACK': /* ... */ break;
                default: console.warn("Unhandled player action type:", action.type);
            }
        }
    }

    /** Helper method to process actions affecting a range of tiles */
    handleRangeAction(targetRange, cost, actionType) {
         console.log(`${actionType} requested for range:`, targetRange);
         if (!this.currentLevel || !this.currentLevel.tiles) return;

         let scoreGained = 0;
         const { startX, startY, endX, endY } = targetRange;

         // Determine iteration bounds and direction (handle potential reversed ranges)
         const minX = Math.min(startX, endX);
         const maxX = Math.max(startX, endX);
         const minY = Math.min(startY, endY);
         const maxY = Math.max(startY, endY);

         for (let y = minY; y <= maxY; y++) {
             for (let x = minX; x <= maxX; x++) {
                 // Check bounds just in case range was calculated beyond grid
                 if (y < 0 || y >= this.currentLevel.height || x < 0 || x >= this.currentLevel.width) {
                     continue;
                 }

                 let enemyHit = false;
                 // Check for enemy at target
                 for (let i = this.enemies.length - 1; i >= 0; i--) {
                     const enemy = this.enemies[i];
                     if (enemy.x === x && enemy.y === y) {
                         console.log(`Action ${actionType} hit enemy ${enemy.getId()} at (${x},${y})`);
                         enemy.takeDamage(5); // Example: 5 damage per tile in range action
                         enemyHit = true;
                         // Should hitting an enemy stop the tile action? For now, yes.
                         break;
                     }
                 }

                 if (enemyHit) continue; // Move to next tile if enemy was hit

                 // Check and act on the tile itself
                 const tile = this.getTileAt(x, y);
                 if (tile && tile.type === 'corrupted') { // Only affect 'corrupted' tiles
                     const newTileData = { char: '.', type: 'pathway' }; // Replace with pathway
                     this.updateGridTile(x, y, newTileData);
                     scoreGained += 5; // Add score per tile cleared
                 } else if (tile && tile.type !== 'barrier' && tile.type !== 'pathway' && tile.type !== 'exit-node') {
                     // Optionally delete other types of tiles (like data-nodes)
                     // const newTileData = { char: '.', type: 'pathway' };
                     // this.updateGridTile(x, y, newTileData);
                     // scoreGained += 1; // Less score for non-corrupted
                 }
             }
         }

         if (scoreGained > 0) {
             this.player.addScore(scoreGained);
             this.uiManager.showMessage(`Cleared ${scoreGained / 5} nodes!`, 1000); // Example message
         }
         // Note: CPU cost was already deducted by the Player when making the request
     }

    processPlayerActions(actions) { /* ... (remains the same) ... */ }
    checkTileInteraction() { /* ... (remains the same) ... */ }
    getTileAt(x, y) { /* ... (remains the same) ... */ }
    updateGridTile(x, y, newTileData) { /* ... (remains the same) ... */ }
    render() { /* ... (remains the same - draw enemies, player) ... */ }

    exit() {
        console.log("Exiting PlayingState");
        this.inputHandler.setActive(false); // Deactivate input
        this.inputHandler.unregisterActionListener('pause'); // Clean up listener
        this.enemies = []; // Clear enemies
        // Don't clear renderer here, Pause/Menu might want to overlay it
    }
}

// +++ NEW STATE: MenuState +++
class MenuState extends BaseState {
    constructor(stateManager, dependencies) {
        super(stateManager, dependencies);
        console.log("MenuState instantiated.");
    }

    enter(params) {
        console.log("Entering MenuState");
        this.renderer.clearAll?.(); // Clear screen
        this.uiManager.hideElement(this.uiManager.elements.commandBuffer);
        this.uiManager.hideElement(this.uiManager.elements.integrityContainer);
        this.uiManager.hideElement(this.uiManager.elements.cpuCyclesContainer); // Assuming you add this ID
        this.uiManager.updateLevelName("MAIN MENU");
        this.uiManager.updateScore(''); // Clear score display maybe
        this.uiManager.showMessage("Press [Enter] to Start", 0);
        this.inputHandler.setActive(true); // Listen for Enter
        this.inputHandler.setMode(INPUT_MODE.NORMAL); // Ensure normal mode

        // Listen for confirm action (Enter key)
        this.inputHandler.registerActionListener('confirm', () => {
            console.log("Confirm action triggered in Menu");
            // Start game by going to loading state for level 1
            this.stateManager.switchTo('LOADING', { levelId: 1 });
        });
    }

    update(deltaTime) {
        // Check for Enter key press via InputHandler command queue if not using action listener
        const commands = this.inputHandler.getCommands();
        for (const command of commands) {
            if (command.type === 'CONFIRM') { // Assume InputHandler generates 'CONFIRM' for Enter
                 this.stateManager.switchTo('LOADING', { levelId: 1 });
                 break; // Exit loop once action is taken
            }
        }
        // Or rely solely on the action listener set up in enter()
    }

    render() {
        // Renderer could draw a title graphic here
        const titleText = "VIM://RUNNER";
        const screenWidth = this.renderer.container?.offsetWidth || 600;
        // const screenHeight = this.renderer.container?.offsetHeight || 400;
        const textX = screenWidth / 2 - (titleText.length * 5); // Estimate center
        const textY = 100; // Position title
        this.renderer.drawText?.(titleText, textX, textY, { color: '#0F0', fontSize: '2em' });

        // "Press Enter" message is handled by UIManager status message
    }

    exit() {
        console.log("Exiting MenuState");
        this.inputHandler.unregisterActionListener('confirm'); // Clean up listener
        this.uiManager.clearMessage();
         this.uiManager.showElement(this.uiManager.elements.integrityContainer);
         this.uiManager.showElement(this.uiManager.elements.cpuCyclesContainer);
    }
}

// +++ NEW STATE: PausedState +++
class PausedState extends BaseState {
     constructor(stateManager, dependencies) {
        super(stateManager, dependencies);
        console.log("PausedState instantiated.");
    }

    enter(params) {
        console.log("Entering PausedState");
        // Don't deactivate input handler completely, needs to listen for unpause
        this.inputHandler.setActive(true); // Keep active
        this.inputHandler.clearCommandBuffer(); // Clear any partial commands
        this.uiManager.showMessage("PAUSED - Press [Escape] to Resume", 0);

        // Register listener specifically for unpausing
         this.inputHandler.registerActionListener('unpause', () => {
             // Switch back to Playing state
             this.stateManager.switchTo('PLAYING'); // Assumes PlayingState retains its own internal state
         });
    }

    update(deltaTime) {
        // Primarily listening for the unpause action via the listener
        // Or check command queue if not using listener
         const commands = this.inputHandler.getCommands();
         // Potentially handle other pause menu options here later
    }

    render() {
        // Render the underlying PlayingState (optional, depends on desired effect)
        // this.stateManager.states.PLAYING.render(); // Re-render playing state underneath?

        // Overlay a pause message/graphic using the renderer
        const pauseText = "|| PAUSED ||";
        const screenWidth = this.renderer.container?.offsetWidth || 600;
        const screenHeight = this.renderer.container?.offsetHeight || 400;
        const textX = screenWidth / 2 - (pauseText.length * 5); // Estimate center
        const textY = screenHeight / 2;
        this.renderer.drawText?.(pauseText, textX, textY, { color: '#FF0', fontSize: '1.5em', background: 'rgba(0,0,0,0.5)' });
        // Note: The UIManager status message also shows pause text
    }

    exit() {
        console.log("Exiting PausedState");
        this.inputHandler.unregisterActionListener('unpause'); // Clean up listener
        this.uiManager.clearMessage(); // Clear the "PAUSED" message
        // Ensure input handler is fully active for playing state if needed
         this.inputHandler.setActive(true);
    }
}

// +++ NEW STATE: GameOverState +++
class GameOverState extends BaseState {
     constructor(stateManager, dependencies) {
        super(stateManager, dependencies);
        this.finalScore = 0;
        this.levelId = 1; // Level to retry
        console.log("GameOverState instantiated.");
    }

    enter(params) {
        console.log("Entering GameOverState");
        this.finalScore = params?.score || 0;
        this.levelId = params?.levelId || 1; // Get level ID for retry

        this.renderer.clearAll?.(); // Clear screen
        this.uiManager.hideElement(this.uiManager.elements.commandBuffer);
        this.uiManager.updateLevelName("GAME OVER");
        this.uiManager.updateScore(this.finalScore); // Show final score
        this.uiManager.showMessage(`Integrity Failure! [Enter]=Retry Lvl ${this.levelId}, [M]=Menu`, 0);
        this.inputHandler.setActive(true); // Listen for input

        this.inputHandler.registerActionListener('confirm', () => { // Enter
             this.stateManager.switchTo('LOADING', { levelId: this.levelId });
         });
         this.inputHandler.registerActionListener('menu', () => { // Assume 'm' triggers this
             this.stateManager.switchTo('MENU');
         });
    }

    update(deltaTime) {
        // Handle input via listeners or command queue ('m' key check?)
         const commands = this.inputHandler.getCommands();
         for(const command of commands) {
             if(command.type === 'KEY' && command.key === 'm') { // Example if not using listener
                 this.stateManager.switchTo('MENU');
                 break;
             }
         }
    }

    render() {
         // Draw GAME OVER text etc.
        const gameOverText = "GAME OVER";
        const scoreText = `Final Score: ${this.finalScore}`;
        const screenWidth = this.renderer.container?.offsetWidth || 600;
        // const screenHeight = this.renderer.container?.offsetHeight || 400;
        const textX = screenWidth / 2 - (gameOverText.length * 5); // Estimate center
        this.renderer.drawText?.(gameOverText, textX, 150, { color: '#F00', fontSize: '2em' });
        this.renderer.drawText?.(scoreText, textX, 180, { color: '#FFF', fontSize: '1.2em' });
    }

    exit() {
        console.log("Exiting GameOverState");
        this.inputHandler.unregisterActionListener('confirm');
        this.inputHandler.unregisterActionListener('menu');
        this.uiManager.clearMessage();
        this.uiManager.showElement(this.uiManager.elements.commandBuffer);
    }
}


// +++ NEW STATE: LevelCompleteState +++
class LevelCompleteState extends BaseState {
    constructor(stateManager, dependencies) {
        super(stateManager, dependencies);
        this.finalScore = 0;
        this.nextLevelId = null;
        this.currentLevelId = null;
        console.log("LevelCompleteState instantiated.");
    }

     enter(params) {
        console.log("Entering LevelCompleteState");
        this.finalScore = params?.score || 0;
        this.nextLevelId = params?.nextLevelId || null;
        this.currentLevelId = params?.levelId || 0;

        this.renderer.clearAll?.();
        this.uiManager.hideElement(this.uiManager.elements.commandBuffer);
        this.uiManager.updateLevelName(`STREAM ${this.currentLevelId} // COMPLETE`);
        this.uiManager.updateScore(this.finalScore);
        this.uiManager.showMessage(this.nextLevelId ? `Proceed to Stream ${this.nextLevelId}? [Enter]=Yes, [M]=Menu` : "All Streams Complete! [M]=Menu", 0);
        this.inputHandler.setActive(true);

         this.inputHandler.registerActionListener('confirm', () => { // Enter
             if (this.nextLevelId) {
                // Check if next level exists? Assume LevelManager handles invalid IDs
                 this.stateManager.switchTo('LOADING', { levelId: this.nextLevelId });
             } else {
                 this.stateManager.switchTo('MENU'); // No next level, go to menu
             }
         });
          this.inputHandler.registerActionListener('menu', () => { // Assume 'm' triggers this
             this.stateManager.switchTo('MENU');
         });
     }

     update(deltaTime) {
        // Handle input via listeners or command queue
        const commands = this.inputHandler.getCommands();
         for(const command of commands) {
             if(command.type === 'KEY' && command.key === 'm') { // Example if not using listener
                 this.stateManager.switchTo('MENU');
                 break;
             }
         }
     }

    render() {
        // Draw Level Complete text etc.
        const completeText = "STREAM COMPLETE";
        const scoreText = `Score: ${this.finalScore}`;
        const screenWidth = this.renderer.container?.offsetWidth || 600;
        const textX = screenWidth / 2 - (completeText.length * 5);
        this.renderer.drawText?.(completeText, textX, 150, { color: '#0F0', fontSize: '2em' });
        this.renderer.drawText?.(scoreText, textX, 180, { color: '#FFF', fontSize: '1.2em' });
    }

     exit() {
         console.log("Exiting LevelCompleteState");
         this.inputHandler.unregisterActionListener('confirm');
         this.inputHandler.unregisterActionListener('menu');
         this.uiManager.clearMessage();
         this.uiManager.showElement(this.uiManager.elements.commandBuffer);
    }
}


// --- StateManager Class --- (Add new states to this.states)
export default class StateManager {
    constructor(dependencies) {
        // ... (dependency check) ...
        this.dependencies = dependencies;
        this.states = {
            // --- ADD NEW STATES ---
            MENU: new MenuState(this, this.dependencies),
            LOADING: new LoadingState(this, this.dependencies),
            PLAYING: new PlayingState(this, this.dependencies),
            PAUSED: new PausedState(this, this.dependencies),
            GAME_OVER: new GameOverState(this, this.dependencies),
            LEVEL_COMPLETE: new LevelCompleteState(this, this.dependencies)
            // --------------------
        };
        this.currentState = null;
        this.currentStateName = null;
        // Optional: Track previous state for pause/resume logic if needed
        this.previousStateName = null;
    }

    init(initialStateName = 'MENU', initialParams = {}) { // --- START AT MENU ---
        console.log(`StateManager initializing with state: ${initialStateName}`);
        // No previous state initially
        this.previousStateName = null;
        this.switchTo(initialStateName, initialParams);
    }

      switchTo(stateName, params = {}) {
         if (!this.states[stateName]) {
            console.error(`Error: Attempted to switch to unknown state '${stateName}'. Falling back to MENU.`);
            stateName = 'MENU'; // Fallback to MENU if unknown state requested
            params = {};
            if (!this.states[stateName]) {
                 throw new Error("Critical Error: MENU state is not defined!");
             }
         }

        // Store previous state *before* changing
         if (this.currentStateName && this.currentStateName !== stateName) {
              // Don't set previous state if switching to PAUSED from PLAYING,
              // handle resume specifically if needed, or always store it.
              // Let's store it generally for now.
             this.previousStateName = this.currentStateName;
         }


         if (this.currentState && typeof this.currentState.exit === 'function') {
            console.log(`Exiting state: ${this.currentStateName}`);
            this.currentState.exit();
        }

        this.currentStateName = stateName;
        this.currentState = this.states[stateName];

        console.log(`Entering state: ${this.currentStateName}`);
        if (typeof this.currentState.enter === 'function') {
            // Pass dependencies AND specific params to enter method if needed
             this.currentState.enter(params);
        }
     }

    // --- Optional: Method to return to previous state (e.g., for unpausing) ---
    // switchToPrevious() {
    //     if (this.previousStateName) {
    //         console.log(`Returning to previous state: ${this.previousStateName}`);
    //         this.switchTo(this.previousStateName);
    //         // Potentially clear previousStateName after returning? Depends on desired logic.
    //         // this.previousStateName = null;
    //     } else {
    //         console.warn("No previous state recorded to switch back to. Going to MENU.");
    //         this.switchTo('MENU');
    //     }
    // }

     update(deltaTime) { /* ... (remains the same) ... */ }
     render() { /* ... (remains the same) ... */ }
}
