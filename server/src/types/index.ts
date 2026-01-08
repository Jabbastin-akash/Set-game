// Shared types between server and client

export type CardType = 'A' | 'B' | 'C';

export interface Card {
    id: string;
    type: CardType;
}

export type GamePhase = 'waiting' | 'selecting' | 'passing' | 'reacting' | 'finished';

export interface PlayerState {
    id: string;
    name: string;
    cards: Card[];
    hasSelected: boolean;
    hasReacted: boolean;
    connected: boolean;
    isHost: boolean;
}

// Public player state (what other players can see)
export interface PublicPlayerState {
    id: string;
    name: string;
    cardCount: number;
    hasSelected: boolean;
    hasReacted: boolean;
    connected: boolean;
    isHost: boolean;
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
}

// Events from client to server
export interface ClientEvents {
    CREATE_ROOM: { playerName: string };
    JOIN_ROOM: { roomCode: string; playerName: string };
    LEAVE_ROOM: {};
    START_GAME: {};
    SELECT_CARD: { cardId: string };
    DECLARE_WIN: {};
    REACT_TO_WIN: {};
    RECONNECT: { roomCode: string; playerId: string };
}

// Events from server to client
export interface ServerEvents {
    ROOM_CREATED: { roomCode: string; playerId: string };
    ROOM_JOINED: { playerId: string; gameState: GameState };
    PLAYER_JOINED: { player: PublicPlayerState };
    PLAYER_LEFT: { playerId: string };
    GAME_STARTED: { gameState: GameState };
    CARDS_DEALT: { cards: Card[] };
    PLAYER_SELECTED: { playerId: string };
    CARDS_PASSED: { cards: Card[]; gameState: GameState };
    WIN_DECLARED: { playerId: string; playerName: string };
    PLAYER_REACTED: { playerId: string; reactionOrder: string[] };
    GAME_ENDED: { winner: string; loser: string; gameState: GameState };
    GAME_STATE_UPDATE: { gameState: GameState };
    ERROR: { message: string; code: string };
    PLAYER_DISCONNECTED: { playerId: string };
    PLAYER_RECONNECTED: { playerId: string };
    RECONNECT_SUCCESS: { playerId: string; gameState: GameState; cards: Card[] };
}
