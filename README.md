# 🃏 Set Card Game

A real-time multiplayer card game built with React, TypeScript, Node.js, and Socket.IO.

## Game Rules

### Core Mechanics
- **Minimum 3 players** per game
- Each player holds exactly **3 cards** at all times
- Cards have types: **A**, **B**, **C** with multiple copies per type
- Each round: players secretly select one card to pass, then all cards pass **clockwise simultaneously**

### Win Condition
- A player wins by getting **3 identical cards** and declaring victory
- If multiple players achieve 3 identical cards simultaneously, **first to declare wins** (server-timestamped)

### Reaction Phase
- After a win declaration, other players must react as fast as possible
- The **last player to react loses** the game
- Disconnected players who don't react in time automatically lose

### Card Distribution
- **Deck size**: `playerCount × 9` cards
- **Types**: A, B, C
- **Copies per type**: `playerCount × 3`

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + Socket.IO
- **Real-time**: WebSocket communication
- **Architecture**: Client-server with server-side validation

## Project Structure

```
set game/
├── server/                 # Backend server
│   ├── src/
│   │   ├── index.ts       # Server entry point
│   │   ├── game/          # Game logic
│   │   │   ├── Game.ts    # Game state management
│   │   │   ├── Player.ts  # Player class
│   │   │   ├── Card.ts    # Card/Deck logic
│   │   │   └── GameManager.ts  # Room management
│   │   ├── socket/        # WebSocket handlers
│   │   │   └── SocketHandler.ts
│   │   ├── types/         # TypeScript types
│   │   │   └── index.ts
│   │   └── utils/         # Utilities
│   │       └── validation.ts
│   └── package.json
│
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── main.tsx       # App entry point
│   │   ├── App.tsx        # Main component
│   │   ├── components/    # React components
│   │   │   ├── Lobby.tsx
│   │   │   ├── GameBoard.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── PlayerList.tsx
│   │   │   └── ConnectionStatus.tsx
│   │   ├── hooks/         # Custom hooks
│   │   │   └── useSocket.ts
│   │   ├── types/         # TypeScript types
│   │   │   └── index.ts
│   │   └── styles/        # CSS styles
│   │       └── index.css
│   ├── index.html
│   └── package.json
│
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone and navigate to project**:
   ```bash
   cd "set game"
   ```

2. **Install server dependencies**:
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**:
   ```bash
   cd ../client
   npm install
   ```

### Running the Game

1. **Start the server** (in one terminal):
   ```bash
   cd server
   npm run dev
   ```
   Server runs on `http://localhost:3001`

2. **Start the client** (in another terminal):
   ```bash
   cd client
   npm run dev
   ```
   Client runs on `http://localhost:3000`

3. **Open multiple browser tabs** to `http://localhost:3000` to simulate multiple players

## How to Play

1. **Create a Room**: One player creates a room and receives a 6-character room code
2. **Join the Room**: Other players enter the room code to join
3. **Start Game**: Host starts the game when 3+ players have joined
4. **Select Cards**: Each round, select a card to pass to the player on your right
5. **Declare Victory**: When you have 3 identical cards, click "Declare Victory"
6. **React Fast**: If someone else declares, react as quickly as possible to avoid losing!

## WebSocket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `CREATE_ROOM` | `{ playerName }` | Create a new room |
| `JOIN_ROOM` | `{ roomCode, playerName }` | Join existing room |
| `LEAVE_ROOM` | `{}` | Leave current room |
| `START_GAME` | `{}` | Start the game (host only) |
| `SELECT_CARD` | `{ cardId }` | Select a card to pass |
| `DECLARE_WIN` | `{}` | Declare victory |
| `REACT_TO_WIN` | `{}` | React to win declaration |
| `RECONNECT` | `{ roomCode, playerId }` | Reconnect to game |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `ROOM_CREATED` | `{ roomCode, playerId }` | Room created successfully |
| `ROOM_JOINED` | `{ playerId, gameState }` | Joined room successfully |
| `GAME_STATE_UPDATE` | `{ gameState }` | Game state changed |
| `CARDS_DEALT` | `{ cards }` | Initial cards dealt |
| `CARDS_PASSED` | `{ cards, gameState }` | Cards passed, new hand |
| `WIN_DECLARED` | `{ playerId, playerName }` | Someone declared victory |
| `GAME_ENDED` | `{ winner, loser, gameState }` | Game finished |
| `ERROR` | `{ message, code }` | Error occurred |

## Security Features

- **Server-side game state authority**: All game logic validated on server
- **Input validation**: Player names, room codes, card IDs sanitized
- **Rate limiting**: 20 requests per second per socket
- **Hidden card state**: Players cannot see others' cards
- **Secure room codes**: Random 6-character alphanumeric codes

## Reconnection

- Players can reconnect within **45 seconds** of disconnection
- Session data stored in localStorage
- Automatic reconnection attempts on connection loss
- Game state restored upon successful reconnection

## Development

### Building for Production

**Server**:
```bash
cd server
npm run build
npm start
```

**Client**:
```bash
cd client
npm run build
npm run preview
```

### Type Checking

Types are shared between server and client in their respective `types/index.ts` files.

## Future Improvements

- [ ] Multiple games per room (play again)
- [ ] Spectator mode
- [ ] Game statistics and leaderboards
- [ ] Sound effects
- [ ] Animated card passing
- [ ] Mobile-optimized touch controls
- [ ] Private rooms with passwords

## License

MIT
