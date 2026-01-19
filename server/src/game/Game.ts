import { Card, GamePhase, GameState, PublicPlayerState } from '../types';
import { Player } from './Player';
import { CardDeck } from './Card';
import { v4 as uuidv4 } from 'uuid';

export class Game {
    public readonly id: string;
    public readonly roomCode: string;
    private players: Map<string, Player> = new Map();
    private playerOrder: string[] = [];
    private currentPhase: GamePhase = 'waiting';
    private winner: string | null = null;
    private loser: string | null = null;
    private declaringPlayer: string | null = null;
    private reactionOrder: string[] = [];
    private roundNumber: number = 0;
    private matchNumber: number = 0;
    private gameWinner: string | null = null;

    private static readonly MIN_PLAYERS = 3;
    private static readonly CARDS_PER_PLAYER = 5;
    private static readonly TOTAL_MATCHES = 3;
    private static readonly WIN_POINTS = 2;
    private static readonly LOSE_POINTS = -1;

    constructor(roomCode: string) {
        this.id = uuidv4();
        this.roomCode = roomCode;
    }

    // Player Management
    addPlayer(player: Player): boolean {
        if (this.currentPhase !== 'waiting') return false;
        if (this.players.has(player.id)) return false;

        this.players.set(player.id, player);
        this.playerOrder.push(player.id);
        return true;
    }

    removePlayer(playerId: string): boolean {
        const player = this.players.get(playerId);
        if (!player) return false;

        if (this.currentPhase === 'waiting') {
            this.players.delete(playerId);
            this.playerOrder = this.playerOrder.filter(id => id !== playerId);

            // Reassign host if needed
            if (player.isHost && this.players.size > 0) {
                const newHostId = this.playerOrder[0];
                const newHost = this.players.get(newHostId);
                if (newHost) newHost.isHost = true;
            }
            return true;
        }

        // During game, mark as disconnected instead of removing
        player.disconnect();
        return true;
    }

    getPlayer(playerId: string): Player | undefined {
        return this.players.get(playerId);
    }

    getPlayerBySocketId(socketId: string): Player | undefined {
        for (const player of this.players.values()) {
            if (player.socketId === socketId) return player;
        }
        return undefined;
    }

    getPlayerCount(): number {
        return this.players.size;
    }

    getConnectedPlayerCount(): number {
        let count = 0;
        for (const player of this.players.values()) {
            if (player.connected) count++;
        }
        return count;
    }

    canStart(): boolean {
        return this.currentPhase === 'waiting' &&
            this.players.size >= Game.MIN_PLAYERS;
    }

    // Game Flow
    start(): boolean {
        if (!this.canStart()) return false;

        // Deal cards
        const deck = new CardDeck(this.players.size);
        for (const player of this.players.values()) {
            player.setCards(deck.deal(Game.CARDS_PER_PLAYER));
        }

        this.currentPhase = 'selecting';
        this.roundNumber = 1;
        this.matchNumber = 1;
        return true;
    }

    selectCard(playerId: string, cardId: string): { success: boolean; error?: string } {
        if (this.currentPhase !== 'selecting') {
            return { success: false, error: 'Not in selection phase' };
        }

        const player = this.players.get(playerId);
        if (!player) {
            return { success: false, error: 'Player not found' };
        }

        if (!player.connected) {
            return { success: false, error: 'Player disconnected' };
        }

        const card = player.selectCard(cardId);
        if (!card) {
            return { success: false, error: 'Invalid card' };
        }

        // Check if all connected players have selected
        if (this.allPlayersSelected()) {
            this.passCards();
        }

        return { success: true };
    }

    private allPlayersSelected(): boolean {
        for (const player of this.players.values()) {
            if (player.connected && !player.hasSelected()) {
                return false;
            }
        }
        return true;
    }

    private passCards(): void {
        this.currentPhase = 'passing';

        // Collect all selected cards and pass clockwise
        const passingCards: Map<string, Card> = new Map();

        for (const playerId of this.playerOrder) {
            const player = this.players.get(playerId);
            if (!player || !player.connected) continue;

            const card = player.removeSelectedCard();
            if (card) {
                passingCards.set(playerId, card);
            }
        }

        // Pass cards clockwise (each player receives from the player before them)
        const connectedOrder = this.playerOrder.filter(id => {
            const p = this.players.get(id);
            return p && p.connected;
        });

        for (let i = 0; i < connectedOrder.length; i++) {
            const receiverId = connectedOrder[i];
            const senderId = connectedOrder[(i - 1 + connectedOrder.length) % connectedOrder.length];

            const receiver = this.players.get(receiverId);
            const cardToPass = passingCards.get(senderId);

            if (receiver && cardToPass) {
                receiver.receiveCard(cardToPass);
            }
        }

        // Move to selecting phase for next round
        this.currentPhase = 'selecting';
        this.roundNumber++;
    }

    declareWin(playerId: string): { success: boolean; error?: string } {
        if (this.currentPhase !== 'selecting' && this.currentPhase !== 'passing') {
            return { success: false, error: 'Cannot declare win in current phase' };
        }

        const player = this.players.get(playerId);
        if (!player) {
            return { success: false, error: 'Player not found' };
        }

        if (!player.hasWinningHand()) {
            return { success: false, error: 'No winning hand' };
        }

        // First to declare wins (server-timestamped)
        this.winner = playerId;
        this.declaringPlayer = playerId;
        this.currentPhase = 'reacting';
        this.reactionOrder = [];

        // Winner automatically "reacts" (doesn't need to)
        player.react();

        return { success: true };
    }

    react(playerId: string): { success: boolean; error?: string; isLast?: boolean } {
        if (this.currentPhase !== 'reacting') {
            return { success: false, error: 'Not in reaction phase' };
        }

        if (playerId === this.winner) {
            return { success: false, error: 'Winner cannot react' };
        }

        const player = this.players.get(playerId);
        if (!player) {
            return { success: false, error: 'Player not found' };
        }

        if (!player.connected) {
            return { success: false, error: 'Player disconnected' };
        }

        if (player.hasReacted) {
            return { success: false, error: 'Already reacted' };
        }

        player.react();
        this.reactionOrder.push(playerId);

        // Check if all connected players (except winner) have reacted
        const allReacted = this.allPlayersReacted();

        if (allReacted) {
            this.endGame();
            return { success: true, isLast: this.loser === playerId };
        }

        return { success: true, isLast: false };
    }

    private allPlayersReacted(): boolean {
        for (const player of this.players.values()) {
            if (player.connected && !player.hasReacted) {
                return false;
            }
        }
        return true;
    }

    private endGame(): void {
        // Last person to react loses
        if (this.reactionOrder.length > 0) {
            this.loser = this.reactionOrder[this.reactionOrder.length - 1];
        }

        // Handle disconnected players - they auto-lose if they didn't react
        for (const player of this.players.values()) {
            if (!player.connected && !player.hasReacted && player.id !== this.winner) {
                this.loser = player.id;
                break;
            }
        }

        // Award points
        if (this.winner) {
            const winnerPlayer = this.players.get(this.winner);
            if (winnerPlayer) {
                winnerPlayer.addScore(Game.WIN_POINTS);
            }
        }
        if (this.loser) {
            const loserPlayer = this.players.get(this.loser);
            if (loserPlayer) {
                loserPlayer.addScore(Game.LOSE_POINTS);
            }
        }

        // Check if this was the last match
        if (this.matchNumber >= Game.TOTAL_MATCHES) {
            // Determine overall game winner (highest score)
            let highestScore = -Infinity;
            for (const player of this.players.values()) {
                if (player.score > highestScore) {
                    highestScore = player.score;
                    this.gameWinner = player.id;
                }
            }
        }

        this.currentPhase = 'finished';
    }

    // Start next match
    startNextMatch(): boolean {
        if (this.currentPhase !== 'finished') return false;
        if (this.matchNumber >= Game.TOTAL_MATCHES) return false;

        // Reset for new match
        this.matchNumber++;
        this.roundNumber = 1;
        this.winner = null;
        this.loser = null;
        this.declaringPlayer = null;
        this.reactionOrder = [];

        // Reset all players and deal new cards
        const deck = new CardDeck(this.players.size);
        for (const player of this.players.values()) {
            player.resetForNewMatch();
            player.setCards(deck.deal(Game.CARDS_PER_PLAYER));
        }

        this.currentPhase = 'selecting';
        return true;
    }

    canStartNextMatch(): boolean {
        return this.currentPhase === 'finished' && 
               this.matchNumber < Game.TOTAL_MATCHES;
    }

    isGameComplete(): boolean {
        return this.currentPhase === 'finished' && 
               this.matchNumber >= Game.TOTAL_MATCHES;
    }

    getMatchNumber(): number {
        return this.matchNumber;
    }

    getTotalMatches(): number {
        return Game.TOTAL_MATCHES;
    }

    getGameWinner(): string | null {
        return this.gameWinner;
    }

    // Reconnection
    reconnectPlayer(playerId: string, socketId: string): boolean {
        const player = this.players.get(playerId);
        if (!player) return false;
        if (!player.canReconnect()) return false;

        player.reconnect(socketId);
        return true;
    }

    // State Access
    getPhase(): GamePhase {
        return this.currentPhase;
    }

    getWinner(): string | null {
        return this.winner;
    }

    getLoser(): string | null {
        return this.loser;
    }

    getReactionOrder(): string[] {
        return [...this.reactionOrder];
    }

    getPublicState(): GameState {
        const players: PublicPlayerState[] = [];
        for (const playerId of this.playerOrder) {
            const player = this.players.get(playerId);
            if (player) {
                players.push(player.getPublicState());
            }
        }

        return {
            gameId: this.id,
            roomCode: this.roomCode,
            players,
            currentPhase: this.currentPhase,
            winner: this.winner,
            loser: this.loser,
            reactionOrder: this.reactionOrder,
            roundNumber: this.roundNumber,
            minPlayers: Game.MIN_PLAYERS,
            declaringPlayer: this.declaringPlayer,
            matchNumber: this.matchNumber,
            totalMatches: Game.TOTAL_MATCHES,
            gameWinner: this.gameWinner,
        };
    }

    getPlayerCards(playerId: string): Card[] {
        const player = this.players.get(playerId);
        return player ? [...player.cards] : [];
    }

    getAllPlayers(): Player[] {
        return Array.from(this.players.values());
    }

    isEmpty(): boolean {
        return this.players.size === 0;
    }

    isFinished(): boolean {
        return this.currentPhase === 'finished';
    }
}
