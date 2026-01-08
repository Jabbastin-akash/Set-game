import React, { useState } from 'react';

interface Props {
    onCreateRoom: (playerName: string) => void;
    onJoinRoom: (roomCode: string, playerName: string) => void;
    error: string | null;
}

export const Lobby: React.FC<Props> = ({ onCreateRoom, onJoinRoom, error }) => {
    const [playerName, setPlayerName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (playerName.trim()) {
            onCreateRoom(playerName.trim());
        }
    };

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (playerName.trim() && roomCode.trim()) {
            onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim());
        }
    };

    return (
        <div className="lobby">
            <div className="lobby-container">
                <h1 className="game-title">🃏 Set Card Game</h1>

                {error && <div className="error-message">{error}</div>}

                {mode === 'menu' && (
                    <div className="menu-buttons">
                        <button
                            className="btn btn-primary btn-large"
                            onClick={() => setMode('create')}
                        >
                            Create Room
                        </button>
                        <button
                            className="btn btn-secondary btn-large"
                            onClick={() => setMode('join')}
                        >
                            Join Room
                        </button>
                    </div>
                )}

                {mode === 'create' && (
                    <form onSubmit={handleCreate} className="lobby-form">
                        <h2>Create a Room</h2>
                        <div className="form-group">
                            <label htmlFor="playerName">Your Name</label>
                            <input
                                id="playerName"
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="Enter your name"
                                maxLength={20}
                                autoFocus
                            />
                        </div>
                        <div className="form-buttons">
                            <button type="submit" className="btn btn-primary" disabled={!playerName.trim()}>
                                Create Room
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setMode('menu')}
                            >
                                Back
                            </button>
                        </div>
                    </form>
                )}

                {mode === 'join' && (
                    <form onSubmit={handleJoin} className="lobby-form">
                        <h2>Join a Room</h2>
                        <div className="form-group">
                            <label htmlFor="roomCodeInput">Room Code</label>
                            <input
                                id="roomCodeInput"
                                type="text"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                placeholder="Enter room code"
                                maxLength={6}
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="playerNameJoin">Your Name</label>
                            <input
                                id="playerNameJoin"
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="Enter your name"
                                maxLength={20}
                            />
                        </div>
                        <div className="form-buttons">
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={!playerName.trim() || !roomCode.trim()}
                            >
                                Join Room
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setMode('menu')}
                            >
                                Back
                            </button>
                        </div>
                    </form>
                )}

                <div className="game-rules">
                    <h3>How to Play</h3>
                    <ul>
                        <li>Each player starts with 3 cards</li>
                        <li>Select a card to pass clockwise each round</li>
                        <li>Get 3 identical cards and declare victory!</li>
                        <li>Others must react quickly - last to react loses!</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
