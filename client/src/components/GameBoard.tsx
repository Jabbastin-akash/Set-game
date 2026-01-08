import React from 'react';
import { Card as CardType, GameState } from '../types';
import { Card } from './Card';
import { PlayerList } from './PlayerList';

interface Props {
    gameState: GameState;
    playerId: string;
    cards: CardType[];
    selectedCardId: string | null;
    onSelectCard: (cardId: string) => void;
    onDeclareWin: () => void;
    onReact: () => void;
    onLeaveRoom: () => void;
    onStartGame: () => void;
}

export const GameBoard: React.FC<Props> = ({
    gameState,
    playerId,
    cards,
    selectedCardId,
    onSelectCard,
    onDeclareWin,
    onReact,
    onLeaveRoom,
    onStartGame,
}) => {
    const currentPlayer = gameState.players.find(p => p.id === playerId);
    const isHost = currentPlayer?.isHost ?? false;
    const canStart = isHost && gameState.players.length >= gameState.minPlayers;

    const hasWinningHand = cards.length === 3 &&
        cards[0].type === cards[1].type &&
        cards[1].type === cards[2].type;

    const isWinner = gameState.winner === playerId;
    const isLoser = gameState.loser === playerId;
    const hasReacted = currentPlayer?.hasReacted ?? false;

    const renderPhaseContent = () => {
        switch (gameState.currentPhase) {
            case 'waiting':
                return (
                    <div className="phase-content">
                        <h2>Waiting for Players</h2>
                        <p className="room-code-display">
                            Room Code: <span className="code">{gameState.roomCode}</span>
                        </p>
                        <p className="player-count">
                            {gameState.players.length} / {gameState.minPlayers} players minimum
                        </p>
                        {isHost ? (
                            <button
                                className="btn btn-primary btn-large"
                                onClick={onStartGame}
                                disabled={!canStart}
                            >
                                {canStart ? 'Start Game' : `Need ${gameState.minPlayers - gameState.players.length} more players`}
                            </button>
                        ) : (
                            <p className="waiting-text">Waiting for host to start the game...</p>
                        )}
                    </div>
                );

            case 'selecting':
                return (
                    <div className="phase-content">
                        <h2>Round {gameState.roundNumber}</h2>
                        <p>Select a card to pass clockwise</p>
                        <div className="cards-container">
                            {cards.map((card) => (
                                <Card
                                    key={card.id}
                                    card={card}
                                    isSelected={selectedCardId === card.id}
                                    disabled={selectedCardId !== null}
                                    onClick={() => onSelectCard(card.id)}
                                />
                            ))}
                        </div>
                        {selectedCardId && (
                            <p className="selection-status">✓ Card selected! Waiting for others...</p>
                        )}
                        {hasWinningHand && !selectedCardId && (
                            <button
                                className="btn btn-success btn-large win-button"
                                onClick={onDeclareWin}
                            >
                                🎉 Declare Victory!
                            </button>
                        )}
                    </div>
                );

            case 'reacting':
                return (
                    <div className="phase-content reaction-phase">
                        <h2>🚨 Victory Declared!</h2>
                        <p className="declaration-text">
                            {gameState.players.find(p => p.id === gameState.declaringPlayer)?.name} has 3 identical cards!
                        </p>
                        <div className="cards-container">
                            {cards.map((card) => (
                                <Card
                                    key={card.id}
                                    card={card}
                                    isSelected={false}
                                    disabled={true}
                                    onClick={() => { }}
                                />
                            ))}
                        </div>
                        {!isWinner && !hasReacted && (
                            <button
                                className="btn btn-warning btn-large react-button pulse"
                                onClick={onReact}
                            >
                                ⚡ REACT NOW!
                            </button>
                        )}
                        {hasReacted && !isWinner && (
                            <p className="reacted-text">✓ You reacted! Waiting for others...</p>
                        )}
                        {isWinner && (
                            <p className="winner-text">🎉 You declared victory!</p>
                        )}
                    </div>
                );

            case 'finished':
                return (
                    <div className="phase-content game-over">
                        <h2>🏁 Game Over!</h2>
                        <div className="results">
                            <div className="result-item winner-result">
                                <span className="result-label">Winner:</span>
                                <span className="result-name">
                                    👑 {gameState.players.find(p => p.id === gameState.winner)?.name}
                                    {isWinner && ' (You!)'}
                                </span>
                            </div>
                            <div className="result-item loser-result">
                                <span className="result-label">Last to React:</span>
                                <span className="result-name">
                                    💀 {gameState.players.find(p => p.id === gameState.loser)?.name}
                                    {isLoser && ' (You)'}
                                </span>
                            </div>
                        </div>
                        <div className="cards-container final-cards">
                            {cards.map((card) => (
                                <Card
                                    key={card.id}
                                    card={card}
                                    isSelected={false}
                                    disabled={true}
                                    onClick={() => { }}
                                />
                            ))}
                        </div>
                        <button
                            className="btn btn-secondary btn-large"
                            onClick={onLeaveRoom}
                        >
                            Leave Room
                        </button>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="game-board">
            <header className="game-header">
                <div className="header-left">
                    <span className="room-code">Room: {gameState.roomCode}</span>
                </div>
                <div className="header-right">
                    <button className="btn btn-secondary btn-small" onClick={onLeaveRoom}>
                        Leave
                    </button>
                </div>
            </header>

            <main className="game-main">
                <aside className="game-sidebar">
                    <PlayerList
                        players={gameState.players}
                        currentPlayerId={playerId}
                        winnerId={gameState.winner}
                        loserId={gameState.loser}
                        declaringPlayerId={gameState.declaringPlayer}
                    />
                </aside>

                <section className="game-area">
                    {renderPhaseContent()}
                </section>
            </main>
        </div>
    );
};
