import { useSocket } from './hooks/useSocket';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { ConnectionStatus } from './components/ConnectionStatus';
import './styles/index.css';

function App() {
    const { state, actions } = useSocket();

    const isInGame = state.roomCode !== null && state.playerId !== null;

    return (
        <div className="app">
            <ConnectionStatus state={state.connectionState} />

            {!isInGame ? (
                <Lobby
                    onCreateRoom={actions.createRoom}
                    onJoinRoom={actions.joinRoom}
                    error={state.error}
                />
            ) : state.gameState ? (
                <GameBoard
                    gameState={state.gameState}
                    playerId={state.playerId!}
                    cards={state.cards}
                    selectedCardId={state.selectedCardId}
                    onSelectCard={actions.selectCard}
                    onDeclareWin={actions.declareWin}
                    onReact={actions.reactToWin}
                    onLeaveRoom={actions.leaveRoom}
                    onStartGame={actions.startGame}
                />
            ) : (
                <div className="loading">Loading game...</div>
            )}
        </div>
    );
}

export default App;
