import React from 'react';
import { Card as CardType } from '../types';

interface Props {
    card: CardType;
    isSelected: boolean;
    disabled: boolean;
    onClick: () => void;
}

const cardColors: Record<string, string> = {
    A: '#FF6B6B',
    B: '#4ECDC4',
    C: '#FFE66D',
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
