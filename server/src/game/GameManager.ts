import { Game } from './Game';
import { Player } from './Player';

export class GameManager {
    private games: Map<string, Game> = new Map();
    private roomCodes: Map<string, string> = new Map(); // roomCode -> gameId
    private playerRooms: Map<string, string> = new Map(); // playerId -> gameId
    private socketPlayers: Map<string, string> = new Map(); // socketId -> playerId

    private static readonly ROOM_CODE_LENGTH = 6;
    private static readonly ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    private generateRoomCode(): string {
        let code: string;
        do {
            code = '';
            for (let i = 0; i < GameManager.ROOM_CODE_LENGTH; i++) {
                code += GameManager.ROOM_CODE_CHARS.charAt(
                    Math.floor(Math.random() * GameManager.ROOM_CODE_CHARS.length)
                );
            }
        } while (this.roomCodes.has(code));
        return code;
    }

    createRoom(playerName: string, socketId: string): { game: Game; player: Player } {
        const roomCode = this.generateRoomCode();
        const game = new Game(roomCode);
        const player = new Player(playerName, socketId, true);

        game.addPlayer(player);

        this.games.set(game.id, game);
        this.roomCodes.set(roomCode, game.id);
        this.playerRooms.set(player.id, game.id);
        this.socketPlayers.set(socketId, player.id);

        return { game, player };
    }

    joinRoom(roomCode: string, playerName: string, socketId: string): {
        success: boolean;
        game?: Game;
        player?: Player;
        error?: string
    } {
        const gameId = this.roomCodes.get(roomCode.toUpperCase());
        if (!gameId) {
            return { success: false, error: 'Room not found' };
        }

        const game = this.games.get(gameId);
        if (!game) {
            return { success: false, error: 'Game not found' };
        }

        if (game.getPhase() !== 'waiting') {
            return { success: false, error: 'Game already started' };
        }

        const player = new Player(playerName, socketId, false);
        if (!game.addPlayer(player)) {
            return { success: false, error: 'Could not join game' };
        }

        this.playerRooms.set(player.id, game.id);
        this.socketPlayers.set(socketId, player.id);

        return { success: true, game, player };
    }

    leaveRoom(socketId: string): { game?: Game; player?: Player; wasHost: boolean } {
        const playerId = this.socketPlayers.get(socketId);
        if (!playerId) return { wasHost: false };

        const gameId = this.playerRooms.get(playerId);
        if (!gameId) return { wasHost: false };

        const game = this.games.get(gameId);
        if (!game) return { wasHost: false };

        const player = game.getPlayer(playerId);
        if (!player) return { wasHost: false };

        const wasHost = player.isHost;
        game.removePlayer(playerId);

        this.socketPlayers.delete(socketId);

        // Only remove from player rooms if game is in waiting phase
        if (game.getPhase() === 'waiting') {
            this.playerRooms.delete(playerId);
        }

        // Clean up empty games
        if (game.isEmpty()) {
            this.games.delete(gameId);
            this.roomCodes.delete(game.roomCode);
        }

        return { game, player, wasHost };
    }

    disconnectPlayer(socketId: string): { game?: Game; player?: Player } {
        const playerId = this.socketPlayers.get(socketId);
        if (!playerId) return {};

        const gameId = this.playerRooms.get(playerId);
        if (!gameId) return {};

        const game = this.games.get(gameId);
        if (!game) return {};

        const player = game.getPlayer(playerId);
        if (!player) return {};

        // In waiting phase, fully remove the player
        if (game.getPhase() === 'waiting') {
            return this.leaveRoom(socketId);
        }

        // During game, mark as disconnected
        player.disconnect();
        this.socketPlayers.delete(socketId);

        return { game, player };
    }

    reconnectPlayer(roomCode: string, playerId: string, socketId: string): {
        success: boolean;
        game?: Game;
        player?: Player;
        error?: string;
    } {
        const gameId = this.roomCodes.get(roomCode.toUpperCase());
        if (!gameId) {
            return { success: false, error: 'Room not found' };
        }

        const game = this.games.get(gameId);
        if (!game) {
            return { success: false, error: 'Game not found' };
        }

        const player = game.getPlayer(playerId);
        if (!player) {
            return { success: false, error: 'Player not found in game' };
        }

        if (!player.canReconnect()) {
            return { success: false, error: 'Reconnection timeout expired' };
        }

        if (!game.reconnectPlayer(playerId, socketId)) {
            return { success: false, error: 'Could not reconnect' };
        }

        this.socketPlayers.set(socketId, playerId);

        return { success: true, game, player };
    }

    getGameBySocketId(socketId: string): Game | undefined {
        const playerId = this.socketPlayers.get(socketId);
        if (!playerId) return undefined;

        const gameId = this.playerRooms.get(playerId);
        if (!gameId) return undefined;

        return this.games.get(gameId);
    }

    getPlayerBySocketId(socketId: string): { game?: Game; player?: Player } {
        const playerId = this.socketPlayers.get(socketId);
        if (!playerId) return {};

        const gameId = this.playerRooms.get(playerId);
        if (!gameId) return {};

        const game = this.games.get(gameId);
        if (!game) return {};

        const player = game.getPlayer(playerId);
        return { game, player };
    }

    getGameByRoomCode(roomCode: string): Game | undefined {
        const gameId = this.roomCodes.get(roomCode.toUpperCase());
        if (!gameId) return undefined;
        return this.games.get(gameId);
    }

    // Cleanup stale games
    cleanup(): void {
        const now = Date.now();
        const staleTimeout = 60 * 60 * 1000; // 1 hour

        for (const [gameId, game] of this.games) {
            // Remove finished games after timeout
            if (game.isFinished()) {
                // Check if all players disconnected
                let allDisconnected = true;
                for (const player of game.getAllPlayers()) {
                    if (player.connected) {
                        allDisconnected = false;
                        break;
                    }
                }

                if (allDisconnected) {
                    this.removeGame(gameId);
                }
            }
        }
    }

    private removeGame(gameId: string): void {
        const game = this.games.get(gameId);
        if (!game) return;

        for (const player of game.getAllPlayers()) {
            this.playerRooms.delete(player.id);
            for (const [socketId, pId] of this.socketPlayers) {
                if (pId === player.id) {
                    this.socketPlayers.delete(socketId);
                }
            }
        }

        this.roomCodes.delete(game.roomCode);
        this.games.delete(gameId);
    }
}

export const gameManager = new GameManager();
