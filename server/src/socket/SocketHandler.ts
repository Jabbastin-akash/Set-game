import { Server, Socket } from 'socket.io';
import { gameManager } from '../game/GameManager';
import {
    validatePlayerName,
    validateRoomCode,
    validateCardId,
    sanitizePlayerName,
    RateLimiter
} from '../utils/validation';

const rateLimiter = new RateLimiter(20, 1000); // 20 requests per second

export function setupSocketHandlers(io: Server): void {
    io.on('connection', (socket: Socket) => {
        console.log(`Client connected: ${socket.id}`);

        // Rate limiting middleware
        socket.use((packet, next) => {
            if (!rateLimiter.isAllowed(socket.id)) {
                return next(new Error('Rate limited'));
            }
            next();
        });

        // Create Room
        socket.on('CREATE_ROOM', (data: { playerName: string }) => {
            try {
                const nameValidation = validatePlayerName(data.playerName);
                if (!nameValidation.valid) {
                    socket.emit('ERROR', { message: nameValidation.error, code: 'INVALID_NAME' });
                    return;
                }

                const sanitizedName = sanitizePlayerName(data.playerName);
                const { game, player } = gameManager.createRoom(sanitizedName, socket.id);

                socket.join(game.roomCode);

                socket.emit('ROOM_CREATED', {
                    roomCode: game.roomCode,
                    playerId: player.id
                });

                socket.emit('GAME_STATE_UPDATE', { gameState: game.getPublicState() });

                console.log(`Room created: ${game.roomCode} by ${player.name}`);
            } catch (error) {
                console.error('CREATE_ROOM error:', error);
                socket.emit('ERROR', { message: 'Failed to create room', code: 'CREATE_FAILED' });
            }
        });

        // Join Room
        socket.on('JOIN_ROOM', (data: { roomCode: string; playerName: string }) => {
            try {
                const roomValidation = validateRoomCode(data.roomCode);
                if (!roomValidation.valid) {
                    socket.emit('ERROR', { message: roomValidation.error, code: 'INVALID_ROOM' });
                    return;
                }

                const nameValidation = validatePlayerName(data.playerName);
                if (!nameValidation.valid) {
                    socket.emit('ERROR', { message: nameValidation.error, code: 'INVALID_NAME' });
                    return;
                }

                const sanitizedName = sanitizePlayerName(data.playerName);
                const result = gameManager.joinRoom(data.roomCode, sanitizedName, socket.id);

                if (!result.success || !result.game || !result.player) {
                    socket.emit('ERROR', { message: result.error || 'Failed to join', code: 'JOIN_FAILED' });
                    return;
                }

                socket.join(result.game.roomCode);

                socket.emit('ROOM_JOINED', {
                    playerId: result.player.id,
                    gameState: result.game.getPublicState()
                });

                // Notify other players
                socket.to(result.game.roomCode).emit('PLAYER_JOINED', {
                    player: result.player.getPublicState()
                });

                // Send updated state to all
                io.to(result.game.roomCode).emit('GAME_STATE_UPDATE', {
                    gameState: result.game.getPublicState()
                });

                console.log(`${result.player.name} joined room ${result.game.roomCode}`);
            } catch (error) {
                console.error('JOIN_ROOM error:', error);
                socket.emit('ERROR', { message: 'Failed to join room', code: 'JOIN_FAILED' });
            }
        });

        // Leave Room
        socket.on('LEAVE_ROOM', () => {
            handleLeaveRoom(socket, io);
        });

        // Start Game
        socket.on('START_GAME', () => {
            try {
                const { game, player } = gameManager.getPlayerBySocketId(socket.id);

                if (!game || !player) {
                    socket.emit('ERROR', { message: 'Not in a room', code: 'NOT_IN_ROOM' });
                    return;
                }

                if (!player.isHost) {
                    socket.emit('ERROR', { message: 'Only host can start', code: 'NOT_HOST' });
                    return;
                }

                if (!game.canStart()) {
                    socket.emit('ERROR', {
                        message: 'Need at least 3 players to start',
                        code: 'NOT_ENOUGH_PLAYERS'
                    });
                    return;
                }

                if (!game.start()) {
                    socket.emit('ERROR', { message: 'Failed to start game', code: 'START_FAILED' });
                    return;
                }

                // Send cards to each player individually
                for (const p of game.getAllPlayers()) {
                    io.to(p.socketId).emit('CARDS_DEALT', { cards: game.getPlayerCards(p.id) });
                }

                io.to(game.roomCode).emit('GAME_STARTED', { gameState: game.getPublicState() });

                console.log(`Game started in room ${game.roomCode}`);
            } catch (error) {
                console.error('START_GAME error:', error);
                socket.emit('ERROR', { message: 'Failed to start game', code: 'START_FAILED' });
            }
        });

        // Select Card
        socket.on('SELECT_CARD', (data: { cardId: string }) => {
            try {
                const cardValidation = validateCardId(data.cardId);
                if (!cardValidation.valid) {
                    socket.emit('ERROR', { message: cardValidation.error, code: 'INVALID_CARD' });
                    return;
                }

                const { game, player } = gameManager.getPlayerBySocketId(socket.id);

                if (!game || !player) {
                    socket.emit('ERROR', { message: 'Not in a game', code: 'NOT_IN_GAME' });
                    return;
                }

                const previousPhase = game.getPhase();
                const result = game.selectCard(player.id, data.cardId);

                if (!result.success) {
                    socket.emit('ERROR', { message: result.error, code: 'SELECT_FAILED' });
                    return;
                }

                // Notify other players that this player selected (but not which card)
                socket.to(game.roomCode).emit('PLAYER_SELECTED', { playerId: player.id });

                // If cards were passed (phase changed from selecting)
                if (previousPhase === 'selecting' && game.getPhase() === 'selecting' &&
                    game.getPublicState().roundNumber > 1) {
                    // Cards were passed - send new cards to each player
                    for (const p of game.getAllPlayers()) {
                        if (p.connected) {
                            io.to(p.socketId).emit('CARDS_PASSED', {
                                cards: game.getPlayerCards(p.id),
                                gameState: game.getPublicState()
                            });
                        }
                    }
                }

                io.to(game.roomCode).emit('GAME_STATE_UPDATE', { gameState: game.getPublicState() });

            } catch (error) {
                console.error('SELECT_CARD error:', error);
                socket.emit('ERROR', { message: 'Failed to select card', code: 'SELECT_FAILED' });
            }
        });

        // Declare Win
        socket.on('DECLARE_WIN', () => {
            try {
                const { game, player } = gameManager.getPlayerBySocketId(socket.id);

                if (!game || !player) {
                    socket.emit('ERROR', { message: 'Not in a game', code: 'NOT_IN_GAME' });
                    return;
                }

                const result = game.declareWin(player.id);

                if (!result.success) {
                    socket.emit('ERROR', { message: result.error, code: 'DECLARE_FAILED' });
                    return;
                }

                io.to(game.roomCode).emit('WIN_DECLARED', {
                    playerId: player.id,
                    playerName: player.name
                });

                io.to(game.roomCode).emit('GAME_STATE_UPDATE', { gameState: game.getPublicState() });

                console.log(`${player.name} declared win in room ${game.roomCode}`);
            } catch (error) {
                console.error('DECLARE_WIN error:', error);
                socket.emit('ERROR', { message: 'Failed to declare win', code: 'DECLARE_FAILED' });
            }
        });

        // React to Win
        socket.on('REACT_TO_WIN', () => {
            try {
                const { game, player } = gameManager.getPlayerBySocketId(socket.id);

                if (!game || !player) {
                    socket.emit('ERROR', { message: 'Not in a game', code: 'NOT_IN_GAME' });
                    return;
                }

                const result = game.react(player.id);

                if (!result.success) {
                    socket.emit('ERROR', { message: result.error, code: 'REACT_FAILED' });
                    return;
                }

                io.to(game.roomCode).emit('PLAYER_REACTED', {
                    playerId: player.id,
                    reactionOrder: game.getReactionOrder()
                });

                // Check if match ended
                if (game.getPhase() === 'finished') {
                    // Check if this is the final match or just a match end
                    if (game.isGameComplete()) {
                        io.to(game.roomCode).emit('GAME_ENDED', {
                            winner: game.getGameWinner(),
                            loser: game.getLoser(),
                            gameState: game.getPublicState()
                        });
                        console.log(`Game completed in room ${game.roomCode}`);
                    } else {
                        io.to(game.roomCode).emit('MATCH_ENDED', {
                            matchWinner: game.getWinner(),
                            matchLoser: game.getLoser(),
                            matchNumber: game.getMatchNumber(),
                            gameState: game.getPublicState()
                        });
                        console.log(`Match ${game.getMatchNumber()} ended in room ${game.roomCode}`);
                    }
                } else {
                    io.to(game.roomCode).emit('GAME_STATE_UPDATE', { gameState: game.getPublicState() });
                }
            } catch (error) {
                console.error('REACT_TO_WIN error:', error);
                socket.emit('ERROR', { message: 'Failed to react', code: 'REACT_FAILED' });
            }
        });

        // Start Next Match
        socket.on('START_NEXT_MATCH', () => {
            try {
                const { game, player } = gameManager.getPlayerBySocketId(socket.id);

                if (!game || !player) {
                    socket.emit('ERROR', { message: 'Not in a game', code: 'NOT_IN_GAME' });
                    return;
                }

                if (!player.isHost) {
                    socket.emit('ERROR', { message: 'Only host can start next match', code: 'NOT_HOST' });
                    return;
                }

                if (!game.canStartNextMatch()) {
                    socket.emit('ERROR', { message: 'Cannot start next match', code: 'CANNOT_START_NEXT' });
                    return;
                }

                if (!game.startNextMatch()) {
                    socket.emit('ERROR', { message: 'Failed to start next match', code: 'START_NEXT_FAILED' });
                    return;
                }

                // Send new cards to each player
                for (const p of game.getAllPlayers()) {
                    if (p.connected) {
                        io.to(p.socketId).emit('CARDS_DEALT', { cards: game.getPlayerCards(p.id) });
                    }
                }

                io.to(game.roomCode).emit('NEXT_MATCH_STARTED', { gameState: game.getPublicState() });

                console.log(`Match ${game.getMatchNumber()} started in room ${game.roomCode}`);
            } catch (error) {
                console.error('START_NEXT_MATCH error:', error);
                socket.emit('ERROR', { message: 'Failed to start next match', code: 'START_NEXT_FAILED' });
            }
        });

        // Reconnect
        socket.on('RECONNECT', (data: { roomCode: string; playerId: string }) => {
            try {
                const roomValidation = validateRoomCode(data.roomCode);
                if (!roomValidation.valid) {
                    socket.emit('ERROR', { message: roomValidation.error, code: 'INVALID_ROOM' });
                    return;
                }

                const result = gameManager.reconnectPlayer(data.roomCode, data.playerId, socket.id);

                if (!result.success || !result.game || !result.player) {
                    socket.emit('ERROR', { message: result.error || 'Reconnection failed', code: 'RECONNECT_FAILED' });
                    return;
                }

                socket.join(result.game.roomCode);

                socket.emit('RECONNECT_SUCCESS', {
                    playerId: result.player.id,
                    gameState: result.game.getPublicState(),
                    cards: result.game.getPlayerCards(result.player.id)
                });

                socket.to(result.game.roomCode).emit('PLAYER_RECONNECTED', {
                    playerId: result.player.id
                });

                io.to(result.game.roomCode).emit('GAME_STATE_UPDATE', {
                    gameState: result.game.getPublicState()
                });

                console.log(`${result.player.name} reconnected to room ${result.game.roomCode}`);
            } catch (error) {
                console.error('RECONNECT error:', error);
                socket.emit('ERROR', { message: 'Reconnection failed', code: 'RECONNECT_FAILED' });
            }
        });

        // Disconnect
        socket.on('disconnect', () => {
            handleDisconnect(socket, io);
        });
    });

    // Cleanup interval
    setInterval(() => {
        gameManager.cleanup();
        rateLimiter.cleanup();
    }, 60000); // Every minute
}

function handleLeaveRoom(socket: Socket, io: Server): void {
    try {
        const result = gameManager.leaveRoom(socket.id);

        if (result.game && result.player) {
            socket.leave(result.game.roomCode);

            io.to(result.game.roomCode).emit('PLAYER_LEFT', { playerId: result.player.id });
            io.to(result.game.roomCode).emit('GAME_STATE_UPDATE', {
                gameState: result.game.getPublicState()
            });

            console.log(`${result.player.name} left room ${result.game.roomCode}`);
        }
    } catch (error) {
        console.error('LEAVE_ROOM error:', error);
    }
}

function handleDisconnect(socket: Socket, io: Server): void {
    try {
        const { game, player } = gameManager.disconnectPlayer(socket.id);

        if (game && player) {
            io.to(game.roomCode).emit('PLAYER_DISCONNECTED', { playerId: player.id });
            io.to(game.roomCode).emit('GAME_STATE_UPDATE', { gameState: game.getPublicState() });

            console.log(`${player.name} disconnected from room ${game.roomCode}`);

            // If in reaction phase and player hasn't reacted, they might auto-lose
            if (game.getPhase() === 'reacting') {
                // Check if all remaining connected players have reacted
                const allReacted = game.getAllPlayers()
                    .filter(p => p.connected && p.id !== game.getWinner())
                    .every(p => p.hasReacted);

                if (allReacted) {
                    // Force end the game - disconnected non-reacted player loses
                    io.to(game.roomCode).emit('GAME_ENDED', {
                        winner: game.getWinner(),
                        loser: player.id, // Disconnected player loses
                        gameState: game.getPublicState()
                    });
                }
            }
        }

        console.log(`Client disconnected: ${socket.id}`);
    } catch (error) {
        console.error('disconnect error:', error);
    }
}
