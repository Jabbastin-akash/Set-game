import { Card, PlayerState, PublicPlayerState } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class Player {
    public readonly id: string;
    public name: string;
    public cards: Card[] = [];
    public selectedCard: Card | null = null;
    public hasReacted: boolean = false;
    public connected: boolean = true;
    public isHost: boolean = false;
    public socketId: string;
    public disconnectedAt: number | null = null;
    public score: number = 0;

    private static readonly RECONNECT_TIMEOUT = 45000; // 45 seconds

    constructor(name: string, socketId: string, isHost: boolean = false) {
        this.id = uuidv4();
        this.name = name;
        this.socketId = socketId;
        this.isHost = isHost;
    }

    setCards(cards: Card[]): void {
        this.cards = cards;
    }

    selectCard(cardId: string): Card | null {
        const cardIndex = this.cards.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return null;

        this.selectedCard = this.cards[cardIndex];
        return this.selectedCard;
    }

    clearSelection(): void {
        this.selectedCard = null;
    }

    hasSelected(): boolean {
        return this.selectedCard !== null;
    }

    removeSelectedCard(): Card | null {
        if (!this.selectedCard) return null;

        const cardIndex = this.cards.findIndex(c => c.id === this.selectedCard!.id);
        if (cardIndex === -1) return null;

        const [removed] = this.cards.splice(cardIndex, 1);
        const card = this.selectedCard;
        this.selectedCard = null;
        return card;
    }

    receiveCard(card: Card): void {
        this.cards.push(card);
    }

    hasWinningHand(): boolean {
        if (this.cards.length < 3) return false;
        
        // Count cards of each type
        const typeCounts: Record<string, number> = {};
        for (const card of this.cards) {
            typeCounts[card.type] = (typeCounts[card.type] || 0) + 1;
        }
        
        // Check if any type has 3 or more cards
        return Object.values(typeCounts).some(count => count >= 3);
    }

    react(): void {
        this.hasReacted = true;
    }

    resetReaction(): void {
        this.hasReacted = false;
    }

    addScore(points: number): void {
        this.score += points;
    }

    resetForNewMatch(): void {
        this.cards = [];
        this.selectedCard = null;
        this.hasReacted = false;
    }

    disconnect(): void {
        this.connected = false;
        this.disconnectedAt = Date.now();
    }

    reconnect(socketId: string): void {
        this.connected = true;
        this.socketId = socketId;
        this.disconnectedAt = null;
    }

    canReconnect(): boolean {
        if (this.disconnectedAt === null) return true;
        return Date.now() - this.disconnectedAt < Player.RECONNECT_TIMEOUT;
    }

    getPublicState(): PublicPlayerState {
        return {
            id: this.id,
            name: this.name,
            cardCount: this.cards.length,
            hasSelected: this.hasSelected(),
            hasReacted: this.hasReacted,
            connected: this.connected,
            isHost: this.isHost,
            score: this.score,
        };
    }

    getFullState(): PlayerState {
        return {
            id: this.id,
            name: this.name,
            cards: [...this.cards],
            hasSelected: this.hasSelected(),
            hasReacted: this.hasReacted,
            connected: this.connected,
            isHost: this.isHost,
        };
    }
}
