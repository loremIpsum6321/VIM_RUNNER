// js/game_objects/player.js

'use strict';

// ... PLAYER_DEFAULTS, constructor, setLevelGrid ...

export default class Player {
    // ... constructor, setLevelGrid ...

    handleInput(commands, deltaTime) {
        const generatedActions = [];
        for (const command of commands) {
            let actionResult = null;
            const count = command.count || 1;

            switch (command.type) {
                // ... MOVE, MOVE_TO cases ...
                case 'MOVE': /* ... */ break;
                case 'MOVE_TO': /* ... */ break;

                case 'DELETE_CHAR':
                    for (let i = 0; i < count; i++) {
                        // Use requestAction for consistency, even for single char
                        actionResult = this.requestAction('DELETE_RANGE', {
                            startX: this.x, startY: this.y, endX: this.x, endY: this.y
                        }, 1); // Cost 1 for single char
                        if (actionResult) generatedActions.push(actionResult);
                    }
                    break;

                case 'DELETE': // Operator + Motion
                case 'CHANGE': // Operator + Motion
                    // --- CALL THE ENHANCED HELPER ---
                    actionResult = this._handleDeleteOrChangeMotion(command.motion, count, command.type);
                    if (actionResult) generatedActions.push(actionResult);
                    break;

                // ... (TYPE cases, CLEAR_BUFFER remain the same) ...
                case 'TYPE_CORRECT': /* ... */ generatedActions.push({ type: 'FEEDBACK', feedbackType: 'TYPE_CORRECT', position: {x: this.x, y: this.y} }); break;
                case 'TYPE_INCORRECT': /* ... */ this.takeDamage(1); generatedActions.push({ type: 'FEEDBACK', feedbackType: 'TYPE_INCORRECT', position: {x: this.x, y: this.y} }); break;
                case 'TYPE_BACKSPACE': /* ... */ generatedActions.push({ type: 'FEEDBACK', feedbackType: 'TYPE_BACKSPACE', position: {x: this.x, y: this.y} }); break; // Position needs work
                case 'PHRASE_COMPLETE': /* ... */ generatedActions.push({ type: 'FEEDBACK', feedbackType: 'PHRASE_COMPLETE', position: {x: this.x, y: this.y} }); break;
                case 'EXIT_TYPING': /* ... */ generatedActions.push({ type: 'MODE_CHANGE_REQUEST', mode: 'NORMAL'}); break;
                case 'CLEAR_BUFFER': /* ... */ break;


                // TODO: Handle other commands like r, y, p, u
                case 'REPLACE_CHAR_EXECUTE':
                     actionResult = this.requestAction('REPLACE_CHAR', {x: this.x, y: this.y, char: command.char}, 0); // Replace usually low/no cost?
                     if (actionResult) generatedActions.push(actionResult);
                     break;

            }
             // Add actionResult to generatedActions if it exists
             // if (actionResult) generatedActions.push(actionResult); // Moved inside cases to handle loops/multiple actions
        }
        return generatedActions;
    }

    update(deltaTime) { /* ... (remains the same) ... */ }
    _handleMove(direction) { /* ... (remains the same) ... */ }
    _handleMoveTo(target) { /* ... (remains the same) ... */ }
    _move(dx, dy) { /* ... (remains the same) ... */ }
    _moveTo(targetX, targetY) { /* ... (remains the same) ... */ }

    // --- Vim Motion Helpers ---
    _isWhitespace(char) { /* ... (remains the same) ... */ }
    _findNextWordStart(startX, startY) { /* ... (remains the same) ... */ }
    _findPreviousWordStart(startX, startY) { /* ... (remains the same) ... */ }
    _findWordEnd(startX, startY) { /* ... (remains the same) ... */ }
    _findLineStart(startY) { /* ... (remains the same) ... */ }
    _findLineEnd(startY) { /* ... (remains the same) ... */ }
    _findLineFirstChar(startY) { /* ... (remains the same) ... */ }


    // --- ENHANCED: Handle Delete/Change Motions ---
    /**
     * Calculates the range affected by a motion and generates a DELETE_RANGE or CHANGE_RANGE action request.
     * @param {string} motion - e.g., 'LINE', 'WORD_FORWARD', 'LINE_END'.
     * @param {number} count - Number of times to apply the motion.
     * @param {string} baseActionType - 'DELETE' or 'CHANGE'.
     * @returns {object | null} An action request object or null if invalid.
     * @private
     */
    _handleDeleteOrChangeMotion(motion, count, baseActionType) {
        if (!this.currentLevelGrid) return null;

        let startX = this.x, startY = this.y;
        let endX = this.x, endY = this.y;
        let targetPos = null; // To store results from find helpers
        let cost = 0; // Calculate cost based on affected area
        const actionType = baseActionType + '_RANGE'; // e.g., DELETE_RANGE

        switch (motion) {
            case 'LINE': // dd, cc
                 startX = 0;
                 endX = this.currentLevelGrid.width - 1;
                 // Affect 'count' lines starting from current
                 startY = this.y;
                 endY = Math.min(this.y + count - 1, this.currentLevelGrid.height - 1);
                 cost = 10 * count * (endX - startX + 1); // Example cost
                 break;

            case 'LEFT': // dh, ch
                 startX = Math.max(0, this.x - count);
                 endX = this.x; // Include current char? Vim often excludes start for d/c
                 endY = this.y;
                 // Adjust: Vim's 'dh' deletes count chars to the left, *including* start if count>0? Let's delete *before* cursor.
                 if (count > 0) {
                     startX = Math.max(0, this.x - count);
                     endX = this.x - 1; // Delete *before* current pos
                 } else { startX = this.x; endX = this.x -1; } // Invalid count? do nothing
                 if (startX > endX) return null; // Nothing to delete
                 cost = (endX - startX + 1);
                 break;
             case 'RIGHT': // dl, cl
                 startX = this.x;
                 endX = Math.min(this.currentLevelGrid.width - 1, this.x + count -1); // Delete *including* current pos
                 endY = this.y;
                 cost = (endX - startX + 1);
                 break;
             case 'UP': // dk, ck
             case 'DOWN': // dj, cj
                  // Vim d/c with up/down often behaves like dd/cc on affected lines including current
                  const isDown = motion === 'DOWN';
                  const targetLineY = isDown ? Math.min(this.currentLevelGrid.height - 1, this.y + count) : Math.max(0, this.y - count);
                  startX = 0;
                  endX = this.currentLevelGrid.width - 1;
                  startY = isDown ? this.y : targetLineY;
                  endY = isDown ? targetLineY : this.y;
                  cost = 10 * (Math.abs(targetLineY - this.y) + 1); // Cost based on lines affected
                 break;

             case 'WORD_FORWARD': // dw, cw
                 targetPos = {x: this.x, y: this.y}; // Start search from current pos
                 for (let i = 0; i < count; i++){
                     targetPos = this._findNextWordStart(targetPos.x, targetPos.y);
                     if (!targetPos) { // Reached end of line/grid
                         targetPos = this._findLineEnd(this.y); // Treat 'dw' at end like 'd$'
                         break;
                      }
                 }
                 endX = targetPos ? targetPos.x - 1 : this._findLineEnd(this.y).x; // End before next word or at line end
                 endY = this.y; // Assume same line for now
                 cost = 3 * count + Math.abs(endX - startX);
                 break;
             case 'WORD_END': // de, ce
                  targetPos = {x: this.x, y: this.y};
                  for(let i=0; i<count; i++){
                      targetPos = this._findWordEnd(targetPos.x, targetPos.y);
                      if (!targetPos) break; // Should not happen unless grid error
                      // Need to advance cursor slightly for next iteration if count > 1
                      if(i < count - 1 && targetPos.x < this.currentLevelGrid.width - 1) targetPos.x++;
                  }
                  endX = targetPos ? targetPos.x : this.x; // End at the end char of the word
                  endY = this.y;
                  cost = 3 * count + Math.abs(endX - startX);
                 break;
             case 'WORD_BACKWARD': // db, cb
                  targetPos = {x: this.x, y: this.y};
                  for (let i = 0; i < count; i++){
                      targetPos = this._findPreviousWordStart(targetPos.x, targetPos.y);
                      if (!targetPos) { // Reached start of line/grid
                          targetPos = this._findLineStart(this.y);
                          break;
                      }
                  }
                  startX = targetPos ? targetPos.x : 0; // Start of the target word
                  // endX = this.x -1 ??? Vim behavior here is tricky - usually from start of word to cursor? Let's simplify
                  endX = this.x - 1; // Delete from target word start up to character before cursor
                  endY = this.y;
                  if(startX > endX) return null; // Nothing to delete if cursor is at start of word
                  cost = 3 * count + Math.abs(endX - startX);
                 break;

             case 'LINE_END': // d$, c$
                 targetPos = this._findLineEnd(this.y);
                 startX = this.x;
                 endX = targetPos.x;
                 endY = this.y;
                 cost = 5 + Math.abs(endX - startX);
                 break;
              case 'LINE_START': // d0, c0
                 targetPos = this._findLineStart(this.y);
                 startX = targetPos.x;
                 endX = this.x -1; // Delete from start up to char before cursor
                 endY = this.y;
                 if(startX > endX) return null;
                 cost = 5 + Math.abs(endX - startX);
                  break;
             case 'LINE_FIRST_CHAR': // d^, c^
                 targetPos = this._findLineFirstChar(this.y);
                 startX = targetPos.x;
                 endX = this.x -1; // Delete from first char up to char before cursor
                 endY = this.y;
                  if(startX > endX) return null;
                 cost = 5 + Math.abs(endX - startX);
                 break;

            default:
                console.warn(`Unhandled motion for ${baseActionType}: ${motion}`);
                return null;
        }

        // Ensure start/end coordinates are ordered correctly if needed by range logic
        // For simplicity now, assume PlayingState handles potentially reversed ranges

        // Request the action
        return this.requestAction(actionType, { startX, startY, endX, endY }, cost);
    }

    requestAction(actionType, targetData, cost) { /* ... (remains the same) ... */ }
    takeDamage(amount) { /* ... (remains the same) ... */ }
    // ... other methods and getters remain the same ...
}