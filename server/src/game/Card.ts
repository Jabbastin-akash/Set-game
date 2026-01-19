import { Card, CardType } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class CardDeck {
    private cards: Card[] = [];

    constructor(playerCount: number) {
        this.generateDeck(playerCount);
        this.shuffle();
    }

    private generateDeck(playerCount: number): void {
        const cardTypes: CardType[] = ['A', 'B', 'C', 'D', 'E'];
        const copiesPerType = playerCount * 5;

        for (const type of cardTypes) {
            for (let i = 0; i < copiesPerType; i++) {
                this.cards.push({
                    id: uuidv4(),
                    type,
                });
            }
        }
    }

    private shuffle(): void {
        // Fisher-Yates shuffle
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal(count: number): Card[] {
        return this.cards.splice(0, count);
    }

    getRemainingCount(): number {
        return this.cards.length;
    }
}
