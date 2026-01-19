import React from 'react';
import { PublicPlayerState } from '../types';

interface Props {
    players: PublicPlayerState[];
    currentPlayerId: string | null;
    winnerId: string | null;
    loserId: string | null;
    declaringPlayerId: string | null;
    showScores?: boolean;
}

export const PlayerList: React.FC<Props> = ({
    players,
    currentPlayerId,
    winnerId,
    loserId,
    declaringPlayerId,
    showScores = true
}) => {
    const getPlayerStatus = (player: PublicPlayerState) => {
        if (player.id === winnerId) return '👑 Winner!';
        if (player.id === loserId) return '💀 Lost';
        if (player.id === declaringPlayerId) return '🎯 Declared!';
        if (!player.connected) return '📴 Disconnected';
        if (player.hasReacted) return '✅ Reacted';
        if (player.hasSelected) return '✓ Ready';
        return '⏳ Thinking...';
    };

    // Sort players by score (highest first)
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

    return (
        <div className="player-list">
            <h3>Players</h3>
            <ul>
                {sortedPlayers.map((player, index) => (
                    <li
                        key={player.id}
                        className={`player-item ${player.id === currentPlayerId ? 'current-player' : ''
                            } ${!player.connected ? 'disconnected' : ''} ${player.id === winnerId ? 'winner' : ''
                            } ${player.id === loserId ? 'loser' : ''}`}
                    >
                        <div className="player-info">
                            <span className="player-rank">{index + 1}.</span>
                            <span className="player-name">
                                {player.name}
                                {player.isHost && <span className="host-badge">Host</span>}
                                {player.id === currentPlayerId && <span className="you-badge">You</span>}
                            </span>
                        </div>
                        <div className="player-right">
                            {showScores && (
                                <span className="player-score">{player.score} pts</span>
                            )}
                            <span className="player-status">{getPlayerStatus(player)}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};
