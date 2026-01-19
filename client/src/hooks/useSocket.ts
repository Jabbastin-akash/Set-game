import { useEffect, useRef, useCallback, useReducer } from 'react';
import { io, Socket } from 'socket.io-client';
import {
    AppState,
    AppAction,
    GameState,
    Card
} from '../types';

const SERVER_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

const initialState: AppState = {
    playerId: null,
    playerName: '',
    roomCode: null,
    gameState: null,
    cards: [],
    selectedCardId: null,
    connectionState: 'disconnected',
    error: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
        case 'SET_PLAYER_NAME':
            return { ...state, playerName: action.payload };

        case 'ROOM_CREATED':
            return {
                ...state,
                roomCode: action.payload.roomCode,
                playerId: action.payload.playerId,
                error: null,
            };

        case 'ROOM_JOINED':
            return {
                ...state,
                playerId: action.payload.playerId,
                gameState: action.payload.gameState,
                roomCode: action.payload.gameState.roomCode,
                error: null,
            };

        case 'UPDATE_GAME_STATE':
            return { ...state, gameState: action.payload };

        case 'SET_CARDS':
            return { ...state, cards: action.payload, selectedCardId: null };

        case 'SELECT_CARD':
            return { ...state, selectedCardId: action.payload };

        case 'SET_CONNECTION_STATE':
            return { ...state, connectionState: action.payload };

        case 'SET_ERROR':
            return { ...state, error: action.payload };

        case 'RESET':
            return { ...initialState, playerName: state.playerName };

        case 'RECONNECT_SUCCESS':
            return {
                ...state,
                playerId: action.payload.playerId,
                gameState: action.payload.gameState,
                cards: action.payload.cards,
                roomCode: action.payload.gameState.roomCode,
                connectionState: 'connected',
                error: null,
            };

        default:
            return state;
    }
}

export function useSocket() {
    const [state, dispatch] = useReducer(appReducer, initialState);
    const socketRef = useRef<Socket | null>(null);
    const reconnectDataRef = useRef<{ roomCode: string; playerId: string } | null>(null);

    // Initialize socket connection
    useEffect(() => {
        const socket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        // Connection events
        socket.on('connect', () => {
            console.log('Connected to server');
            dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connected' });

            // Attempt reconnection if we have saved data
            if (reconnectDataRef.current) {
                socket.emit('RECONNECT', reconnectDataRef.current);
            }
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
            dispatch({ type: 'SET_CONNECTION_STATE', payload: 'disconnected' });
        });

        socket.on('connect_error', () => {
            dispatch({ type: 'SET_CONNECTION_STATE', payload: 'disconnected' });
        });

        // Game events
        socket.on('ROOM_CREATED', (data: { roomCode: string; playerId: string }) => {
            dispatch({ type: 'ROOM_CREATED', payload: data });
            reconnectDataRef.current = data;
            localStorage.setItem('gameSession', JSON.stringify(data));
        });

        socket.on('ROOM_JOINED', (data: { playerId: string; gameState: GameState }) => {
            dispatch({ type: 'ROOM_JOINED', payload: data });
            reconnectDataRef.current = { roomCode: data.gameState.roomCode, playerId: data.playerId };
            localStorage.setItem('gameSession', JSON.stringify(reconnectDataRef.current));
        });

        socket.on('GAME_STATE_UPDATE', (data: { gameState: GameState }) => {
            dispatch({ type: 'UPDATE_GAME_STATE', payload: data.gameState });
        });

        socket.on('GAME_STARTED', (data: { gameState: GameState }) => {
            dispatch({ type: 'UPDATE_GAME_STATE', payload: data.gameState });
        });

        socket.on('CARDS_DEALT', (data: { cards: Card[] }) => {
            dispatch({ type: 'SET_CARDS', payload: data.cards });
        });

        socket.on('CARDS_PASSED', (data: { cards: Card[]; gameState: GameState }) => {
            dispatch({ type: 'SET_CARDS', payload: data.cards });
            dispatch({ type: 'UPDATE_GAME_STATE', payload: data.gameState });
        });

        socket.on('WIN_DECLARED', (data: { playerId: string; playerName: string }) => {
            console.log(`${data.playerName} declared victory!`);
        });

        socket.on('GAME_ENDED', (data: { winner: string; loser: string; gameState: GameState }) => {
            dispatch({ type: 'UPDATE_GAME_STATE', payload: data.gameState });
        });

        socket.on('MATCH_ENDED', (data: { matchWinner: string; matchLoser: string; matchNumber: number; gameState: GameState }) => {
            dispatch({ type: 'UPDATE_GAME_STATE', payload: data.gameState });
        });

        socket.on('NEXT_MATCH_STARTED', (data: { gameState: GameState }) => {
            dispatch({ type: 'UPDATE_GAME_STATE', payload: data.gameState });
        });

        socket.on('ERROR', (data: { message: string; code: string }) => {
            dispatch({ type: 'SET_ERROR', payload: data.message });
            setTimeout(() => dispatch({ type: 'SET_ERROR', payload: null }), 5000);
        });

        socket.on('RECONNECT_SUCCESS', (data: { playerId: string; gameState: GameState; cards: Card[] }) => {
            dispatch({ type: 'RECONNECT_SUCCESS', payload: data });
        });

        socket.on('PLAYER_DISCONNECTED', (data: { playerId: string }) => {
            console.log(`Player ${data.playerId} disconnected`);
        });

        socket.on('PLAYER_RECONNECTED', (data: { playerId: string }) => {
            console.log(`Player ${data.playerId} reconnected`);
        });

        // Try to restore session on load
        const savedSession = localStorage.getItem('gameSession');
        if (savedSession) {
            try {
                reconnectDataRef.current = JSON.parse(savedSession);
            } catch {
                localStorage.removeItem('gameSession');
            }
        }

        return () => {
            socket.disconnect();
        };
    }, []);

    // Actions
    const createRoom = useCallback((playerName: string) => {
        dispatch({ type: 'SET_PLAYER_NAME', payload: playerName });
        socketRef.current?.emit('CREATE_ROOM', { playerName });
    }, []);

    const joinRoom = useCallback((roomCode: string, playerName: string) => {
        dispatch({ type: 'SET_PLAYER_NAME', payload: playerName });
        socketRef.current?.emit('JOIN_ROOM', { roomCode, playerName });
    }, []);

    const leaveRoom = useCallback(() => {
        socketRef.current?.emit('LEAVE_ROOM', {});
        localStorage.removeItem('gameSession');
        reconnectDataRef.current = null;
        dispatch({ type: 'RESET' });
    }, []);

    const startGame = useCallback(() => {
        socketRef.current?.emit('START_GAME');
    }, []);

    const selectCard = useCallback((cardId: string) => {
        dispatch({ type: 'SELECT_CARD', payload: cardId });
        socketRef.current?.emit('SELECT_CARD', { cardId });
    }, []);

    const declareWin = useCallback(() => {
        socketRef.current?.emit('DECLARE_WIN');
    }, []);

    const reactToWin = useCallback(() => {
        socketRef.current?.emit('REACT_TO_WIN');
    }, []);

    const startNextMatch = useCallback(() => {
        socketRef.current?.emit('START_NEXT_MATCH');
    }, []);

    return {
        state,
        actions: {
            createRoom,
            joinRoom,
            leaveRoom,
            startGame,
            selectCard,
            declareWin,
            reactToWin,
            startNextMatch,
        },
    };
}
