// Shared types - keep in sync with server

export type CardType = 'A' | 'B' | 'C' | 'D' | 'E';

export interface Card {
    id: string;
    type: CardType;
}

export type GamePhase = 'waiting' | 'selecting' | 'passing' | 'reacting' | 'finished';

export interface PublicPlayerState {
    id: string;
    name: string;
    cardCount: number;
    hasSelected: boolean;
    hasReacted: boolean;
    connected: boolean;
    isHost: boolean;
    score: number;
}

export interface GameState {
    gameId: string;
    roomCode: string;
    players: PublicPlayerState[];
    currentPhase: GamePhase;
    winner: string | null;
    loser: string | null;
    reactionOrder: string[];
    roundNumber: number;
    minPlayers: number;
    declaringPlayer: string | null;
    matchNumber: number;
    totalMatches: number;
    gameWinner: string | null;
}

// Connection state
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

// App state
export interface AppState {
    playerId: string | null;
    playerName: string;
    roomCode: string | null;
    gameState: GameState | null;
    cards: Card[];
    selectedCardId: string | null;
    connectionState: ConnectionState;
    error: string | null;
}

// Action types for state management
export type AppAction =
    | { type: 'SET_PLAYER_NAME'; payload: string }
    | { type: 'ROOM_CREATED'; payload: { roomCode: string; playerId: string } }
    | { type: 'ROOM_JOINED'; payload: { playerId: string; gameState: GameState } }
    | { type: 'UPDATE_GAME_STATE'; payload: GameState }
    | { type: 'SET_CARDS'; payload: Card[] }
    | { type: 'SELECT_CARD'; payload: string | null }
    | { type: 'SET_CONNECTION_STATE'; payload: ConnectionState }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'RESET' }
    | { type: 'RECONNECT_SUCCESS'; payload: { playerId: string; gameState: GameState; cards: Card[] } };
