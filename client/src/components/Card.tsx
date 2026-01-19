import React from 'react';
import { Card as CardType } from '../types';

interface Props {
    card: CardType;
    isSelected: boolean;
    disabled: boolean;
    onClick: () => void;
}

const cardColors: Record<string, string> = {
    A: '#FF6B6B',  // Red
    B: '#4ECDC4',  // Teal
    C: '#FFE66D',  // Yellow
    D: '#A78BFA',  // Purple
    E: '#34D399',  // Green
};

export const Card: React.FC<Props> = ({ card, isSelected, disabled, onClick }) => {
    return (
        <button
            className={`card ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
            style={{
                backgroundColor: cardColors[card.type],
                borderColor: isSelected ? '#333' : 'transparent'
            }}
            onClick={onClick}
            disabled={disabled}
        >
            <span className="card-type">{card.type}</span>
        </button>
    );
};
