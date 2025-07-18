import React, { useEffect, useState } from 'react';
import './App.css';

// Color palette and theme values
const COLORS = {
  accent: '#10b981',
  primary: '#1f2937',
  secondary: '#f9fafb',
  win: '#3bb26b',
  draw: '#fbbf24'
};
const API_BASE = "/api";

// Reusable button component
function Button({ children, onClick, ...rest }) {
  return (
    <button
      style={{
        background: COLORS.accent,
        border: 'none',
        color: '#fff',
        borderRadius: 8,
        padding: '10px 20px',
        fontWeight: 500,
        cursor: 'pointer',
        fontSize: 15,
        margin: '0 4px'
      }}
      onClick={onClick}
      {...rest}
    >{children}</button>
  );
}

// Square for game grid
function Square({ value, onClick, isHighlight }) {
  return (
    <button
      className="ttt-square"
      onClick={onClick}
      style={{
        background: isHighlight ? COLORS.win : COLORS.secondary,
        color: COLORS.primary,
        border: isHighlight
          ? `2px solid ${COLORS.accent}`
          : `1.5px solid #e2e8f0`,
        fontWeight: 'bold',
        fontSize: 32,
        width: 62, height: 62,
        transition: 'background 0.2s,border 0.2s'
      }}
    >
      {value}
    </button>
  );
}

// Game board UI
function Board({ board, onMove, disabled, highlight }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 8,
      justifyContent: 'center',
      margin: '0 auto'
    }}>
      {board.map((val, idx) => (
        <Square
          key={idx}
          value={val}
          onClick={() => !disabled && !val && onMove(idx)}
          isHighlight={highlight && highlight.includes(idx)}
        />
      ))}
    </div>
  );
}

// Scoreboard component
function ScorePanel({ scores }) {
  return (
    <div className="score-panel" style={{
      background: COLORS.secondary,
      borderRadius: 12,
      padding: '20px 28px',
      margin: '8px 0 16px 0',
      color: COLORS.primary,
      boxShadow: '0 2px 16px rgba(31,41,55,.09)'
    }}>
      <div style={{fontWeight: 600, letterSpacing:1, marginBottom:8}}>Scoreboard</div>
      <div style={{display:'flex', justifyContent:'space-between'}}>
        <span style={{color:COLORS.primary}}>X</span>
        <span style={{fontWeight: 600}}>{scores.X ?? 0}</span>
        <span style={{color:COLORS.primary, marginLeft: 16}}>O</span>
        <span style={{fontWeight: 600}}>{scores.O ?? 0}</span>
      </div>
    </div>
  );
}

// Game History component
function GameHistory({ games, onView, selected }) {
  // Games array [{id, winner, moves, player_x, player_o, finished_at}]
  return (
    <div className="history-wrapper" style={{
      background: '#f4f6f8',
      borderRadius: 10,
      marginTop: 32,
      padding: 18,
      color: COLORS.primary,
      textAlign: 'left',
      boxShadow: '0 1px 7px rgba(31,41,55,.04)'
    }}>
      <div style={{fontWeight:600, marginBottom:8, fontSize:18}}>Game History</div>
      {games.length === 0 && (
        <div style={{ color:'#7b8794', fontStyle:'italic' }}>No past games yet.</div>
      )}
      <ul style={{listStyleType:'none',margin:0,padding:0}}>
        {games.map((g, idx) => (
          <li key={g.id || idx}
            style={{
              padding: '6px 2px',
              borderBottom: '1px solid #e5e7eb',
              background: selected===g.id ? COLORS.secondary:'#f4f6f8',
              cursor:'pointer',
              fontWeight: selected===g.id ? 600:400
            }}
            onClick={() => onView && onView(g)}
          >
            <span style={{marginRight:6}}>
                #{g.id}
            </span>
            <span style={{
              color: g.winner==='Draw'?COLORS.draw:
                g.winner==='X'||g.winner==='O'?COLORS.win:'#1e293b',
              marginRight: 2,
              fontWeight: 600
            }}>
              { g.winner==='Draw'
                ? 'Draw'
                : g.winner
                  ? `${g.winner} won`
                  : 'In Progress'
              }
            </span>
            <span style={{fontSize:11, color:'#9ca3af', float:'right'}}>
             {g.player_x} vs {g.player_o}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Helper for initial board array
function blankBoard() {
  return Array(9).fill("");
}

// PUBLIC_INTERFACE
function App() {
  // UI tracking
  const [usernames, setUsernames] = useState({X: '', O: ''});
  const [userList, setUserList] = useState([]);
  const [currentUser, setCurrentUser] = useState({id: null, name: '', symbol: ''});
  const [opponent, setOpponent] = useState({id: null, name: '', symbol: ''});
  
  const [game, setGame] = useState(null); // object containing id, board, status
  const [board, setBoard] = useState(blankBoard());
  const [activeMark, setActiveMark] = useState('X');
  const [winnerInfo, setWinnerInfo] = useState({winner: null, combo: []});
  const [scores, setScores] = useState({X:0,O:0});
  const [moveDisabled, setMoveDisabled] = useState(false);

  // History/state
  const [gamesList, setGamesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedHistoryGame, setSelectedHistoryGame] = useState(null);

  // ============ API HELPERS ============
  const fetchUsers = async () => {
    const res = await fetch(`${API_BASE}/users/`);
    if (!res.ok) return [];
    return await res.json();
  };
  const createUser = async (name) => {
    const res = await fetch(`${API_BASE}/users/`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({'name': name})
    });
    if (!res.ok) throw new Error('User creation failed');
    return await res.json();
  };

  const startNewGame = async (player1, player2) => {
    setLoading(true);
    let res = await fetch(`${API_BASE}/games/`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        player_x: player1,
        player_o: player2
      })
    });
    if (!res.ok) {
      setLoading(false);
      setMessage('Could not start new game.');
      return null;
    }
    const g = await res.json();
    setGame(g);
    setBoard(g.board || blankBoard());
    setActiveMark('X');
    setWinnerInfo({winner: null, combo: []});
    setSelectedHistoryGame(null);
    setShowHistory(false);
    setLoading(false);
    return g;
  };
  const fetchGame = async (gameId) => {
    setLoading(true);
    let res = await fetch(`${API_BASE}/games/${gameId}/`);
    if (!res.ok) return;
    const g = await res.json();
    setGame(g);
    setBoard(g.board || blankBoard());
    setActiveMark(g.next_mark || 'X');
    setWinnerInfo({winner: g.winner, combo: g.win_combo});
    setLoading(false);
  };
  const postMove = async (idx) => {
    if (!game || typeof idx!=='number') return;
    setMoveDisabled(true);
    let res = await fetch(`${API_BASE}/games/${game.id}/move/`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({move: idx})
    });
    const data = await res.json();
    setGame(data);
    setBoard(data.board);
    setActiveMark(data.next_mark);
    if (data.winner) {
      setWinnerInfo({winner:data.winner, combo: data.win_combo||[]});
    }
    setMoveDisabled(false);
    fetchScoreboard();
  };
  const fetchScoreboard = async () => {
    let res = await fetch(`${API_BASE}/scoreboard/`);
    if (!res.ok) return;
    let d = await res.json();
    // Expects format [{user_id, symbol, score}]
    let ns = {X:0, O:0};
    d.forEach(sc => { if (sc.symbol) ns[sc.symbol]=sc.score; });
    setScores(ns);
  };
  const fetchHistory = async () => {
    // Load all games for display
    setLoading(true);
    let res = await fetch(`${API_BASE}/games/history/`);
    if (!res.ok) {
      setGamesList([]);
      setLoading(false);
      return;
    }
    let d = await res.json();
    setGamesList(Array.isArray(d)?d:[]);
    setLoading(false);
  };

  // ========== UI + GAME EVENT HANDLERS ===========
  useEffect(() => {
    // On mount, get userlist and scoreboard
    fetchUsers().then(list => setUserList(list));
    fetchScoreboard();
    fetchHistory();
  }, []);
  // ensure board is clickable only if not finished
  useEffect(() => {
    setMoveDisabled(Boolean(winnerInfo && winnerInfo.winner));
  }, [winnerInfo]);

  // Main move tap
  const handleMove = (idx) => {
    // only if square empty, not over, current user's turn
    if (moveDisabled || board[idx]) return;
    if (
      (activeMark==='X' && currentUser.symbol!=='X') ||
      (activeMark==='O' && currentUser.symbol!=='O')
    ) {
      setMessage("Wait for your turn!");
      return;
    }
    postMove(idx);
  };
  // Start new game - reset everything and let user choose
  const handleStartGame = async () => {
    // Quick login interface by asking for 2 usernames
    const p1 = prompt('Enter Player X username', 'Player X');
    if (!p1) return;
    const p2 = prompt('Enter Player O username', 'Player O');
    if (!p2) return;
    try {
      const user1 = await createUser(p1);
      const user2 = await createUser(p2);
      setUsernames({X: user1.name, O: user2.name});
      setCurrentUser({id: user1.id, name: user1.name, symbol: 'X'});
      setOpponent({id: user2.id, name: user2.name, symbol: 'O'});
      startNewGame(user1.id, user2.id);
      setMessage('');
      setShowHistory(false);
    } catch (e) {
      setMessage('Could not create users.');
    }
  };
  // View historic game board
  const handleViewHistoryGame = async (gameObj) => {
    setSelectedHistoryGame(gameObj.id);
    await fetchGame(gameObj.id);
    setMessage(`Viewing history game #${gameObj.id}`);
  };

  // ========== RENDER ===========
  return (
    <div className="App" style={{
      background: COLORS.secondary,
      minHeight: '100vh',
      fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
      color: COLORS.primary
    }}>
      <div style={{
        maxWidth: 460,
        margin: '0 auto 0 auto',
        marginTop: 32,
        borderRadius: 22,
        background: '#fff',
        boxShadow: '0 2px 24px rgba(31,41,55,0.09)',
        padding:23,
        display:'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: -1,
          color: COLORS.primary,
          marginBottom: 8
        }}>
          <span style={{color: COLORS.accent}}>Tic</span> Tac Toe
        </div>
        <div style={{
            fontSize:15, color:'#888', marginBottom:17
        }}>Classic game re-imagined</div>
        
        <div style={{display:'flex', flexDirection:'row', width:'100%', alignItems:'center',justifyContent:'center'}}>
          <div>
            <ScorePanel scores={scores}/>
            <div style={{fontSize:14, marginBottom:8, color:'#666'}}>
              <span style={{fontWeight:600, color:COLORS.primary}}>X</span>: {usernames.X || '--'}<br />
              <span style={{fontWeight:600, color:COLORS.primary}}>O</span>: {usernames.O || '--'}
            </div>
          </div>
          <div style={{flex:1}} />
          <div>
            <Button onClick={handleStartGame}>Start New Game</Button>
            <Button onClick={() => {fetchHistory(); setShowHistory(!showHistory);}}>History</Button>
          </div>
        </div>

        <div style={{margin:'28px 0 0 0'}} />
        {/* Main Game Board */}
        <Board
          board={board}
          onMove={handleMove}
          disabled={moveDisabled || !game || !currentUser.name}
          highlight={winnerInfo.combo}
        />
        {/* Status/next move */}
        <div style={{marginTop:24, minHeight:26, color:COLORS.primary, letterSpacing:0.2, fontSize:16}}>
          {loading ? (
            <span>Loading...</span>
          ) : winnerInfo.winner ? (
            <span style={{
              color: winnerInfo.winner === "Draw" ? COLORS.draw : COLORS.win,
              fontWeight:600
            }}>
              {winnerInfo.winner === "Draw"
                ? "It's a Draw"
                : `Winner: ${winnerInfo.winner}`}
            </span>
          ) : (
            game && (
              <>
                <span>Next move: </span>
                <span style={{fontWeight:700, color:COLORS.accent}}>
                  {activeMark}
                </span>
                <span>{activeMark === 'X' ? usernames.X : usernames.O}</span>
              </>
            )
          )}
        </div>
        {message && <div style={{marginTop:6, color:'#e11d48', fontSize:14 }}>{message}</div>}
      </div>
      {/* Game History Panel */}
      {showHistory && (
        <div style={{maxWidth:440, margin:'24px auto 0 auto',}}>
          <GameHistory
            games={gamesList}
            onView={handleViewHistoryGame}
            selected={selectedHistoryGame}
          />
        </div>
      )}
      <div style={{textAlign:'center',marginTop:48,color:'#9ca3af', fontSize:13}}>
        &copy; {new Date().getFullYear()} Tic Tac Toe. Built with <span style={{color:COLORS.accent}}>React</span> &mdash; Modern UI
      </div>
    </div>
  );
}

export default App;
