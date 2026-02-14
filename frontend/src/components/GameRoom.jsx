import { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import useWindowSize from 'react-use/lib/useWindowSize';
import html2canvas from 'html2canvas';

function GameRoom() {
    const { roomCode } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { width, height } = useWindowSize();
    const resultsRef = useRef(null);

    // State
    const [ws, setWs] = useState(null);
    const [gameState, setGameState] = useState(null);
    const [clientId] = useState(sessionStorage.getItem('clientId') || uuidv4());
    const [isConnected, setIsConnected] = useState(false);
    const [inputScore, setInputScore] = useState('');
    const [myTurnDone, setMyTurnDone] = useState(false);
    const [roundResult, setRoundResult] = useState(null);
    const [events, setEvents] = useState([]);
    const [showConfetti, setShowConfetti] = useState(false);
    const [votedToEnd, setVotedToEnd] = useState(false);
    const [connectionError, setConnectionError] = useState(false);
    const [gameOverTab, setGameOverTab] = useState('leaderboard'); // 'leaderboard' or 'rounds'
    const [autoNextRoundTimer, setAutoNextRoundTimer] = useState(5);

    // Canvas ref for sharing


    // Auto-advance logic
    useEffect(() => {
        let interval;
        if (roundResult) {
            setAutoNextRoundTimer(5);
            interval = setInterval(() => {
                setAutoNextRoundTimer(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        // Auto advance
                        setRoundResult(null);
                        setMyTurnDone(false);
                        setVotedToEnd(false);
                        setEvents([]);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [roundResult]);

    // Derive player info
    const playerName = location.state?.name || sessionStorage.getItem('lastPlayerName') || "Anonymous";
    const playerAvatar = location.state?.avatar || sessionStorage.getItem('lastPlayerAvatar') || "";

    // Persist
    useEffect(() => {
        sessionStorage.setItem('clientId', clientId);
        if (location.state?.name) sessionStorage.setItem('lastPlayerName', location.state.name);
        if (location.state?.avatar) sessionStorage.setItem('lastPlayerAvatar', location.state.avatar);
    }, [clientId, location.state]);

    // Use ref to track round result status inside WS callback without re-triggering effect
    const roundResultRef = useRef(null);

    // Sync ref
    useEffect(() => {
        roundResultRef.current = roundResult;
    }, [roundResult]);

    // Connect to WS
    useEffect(() => {
        const socket = new WebSocket(`${import.meta.env.VITE_WS_URL}/ws/${roomCode}/${clientId}`);

        socket.onopen = () => {
            setIsConnected(true);
            socket.send(JSON.stringify({ action: "join", name: playerName, avatar: playerAvatar }));
        };

        socket.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === "state_update") {
                setGameState(msg.data);

                // Only reset local state if we are NOT viewing results
                if (!roundResultRef.current && msg.data.players[clientId]?.current_round_score === null) {
                    setMyTurnDone(false);
                    setEvents([]);
                    setShowConfetti(false);
                    setVotedToEnd(false);
                }
            } else if (msg.type === "round_end") {
                setRoundResult(msg.data);
                roundResultRef.current = msg.data; // Sync ref immediately to prevent race condition with state_update
                if (msg.data.events) setEvents(msg.data.events);
                const myDetails = msg.data.details.find(d => d.name === playerName);
                if (myDetails && myDetails.is_winner) setShowConfetti(true);
            }
        };

        socket.onclose = () => setIsConnected(false);
        setWs(socket);
        return () => socket.close();
    }, [roomCode, clientId, playerName, playerAvatar]); // Removed roundResult dependency

    // Connection Timeout Logic
    useEffect(() => {
        let timer;
        if (!isConnected) {
            timer = setTimeout(() => {
                setConnectionError(true);
            }, 5000); // 5 seconds timeout
        } else {
            setConnectionError(false);
        }
        return () => clearTimeout(timer);
    }, [isConnected]);

    const handleStartGame = () => ws.send(JSON.stringify({ action: "start_game" }));

    const submitScore = () => {
        if (inputScore === '') return;
        ws.send(JSON.stringify({ action: "submit_score", score: inputScore }));
        setMyTurnDone(true);
        setInputScore('');
    };

    const voteToEnd = () => {
        ws.send(JSON.stringify({ action: "vote_end" }));
        setVotedToEnd(true);
    };

    const shareResults = () => {
        if (!gameState) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const players = Object.values(gameState.players).sort((a, b) => b.total_score - a.total_score);

        // Config
        const width = 600;
        const rowHeight = 60;
        const headerHeight = 150;
        const padding = 40;
        const totalHeight = headerHeight + (players.length * rowHeight) + padding;

        canvas.width = width;
        canvas.height = totalHeight;

        // Background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, totalHeight);

        // Header (Title)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("GAME RESULTS", width / 2, 60);

        // Header (Room Code)
        ctx.fillStyle = '#888888';
        ctx.font = '20px sans-serif';
        ctx.fillText(`Room: ${roomCode} • ${gameState.total_rounds} Rounds`, width / 2, 100);

        // Divider
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, 120);
        ctx.lineTo(width - padding, 120);
        ctx.stroke();

        // Players
        ctx.textAlign = 'left';
        ctx.font = 'bold 24px sans-serif';

        players.forEach((p, i) => {
            const y = headerHeight + (i * rowHeight);

            // Highlight Winner
            if (i === 0) {
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(padding - 10, y - 40, width - (padding * 2) + 20, rowHeight);
                ctx.strokeStyle = 'gold';
                ctx.lineWidth = 2;
                ctx.strokeRect(padding - 10, y - 40, width - (padding * 2) + 20, rowHeight);
                ctx.fillStyle = 'gold';
            } else {
                ctx.fillStyle = '#ffffff';
            }

            // Rank
            ctx.fillText(`#${i + 1}`, padding, y);

            // Name
            ctx.fillText(p.name, padding + 80, y);

            // Score
            const scoreText = p.total_score.toFixed(0);
            const scoreWidth = ctx.measureText(scoreText).width;
            ctx.fillText(scoreText, width - padding - scoreWidth, y);
        });

        // Download
        const link = document.createElement('a');
        link.download = `leaderboard-${roomCode}.png`;
        link.href = canvas.toDataURL();
        link.click();
    };

    if (connectionError) {
        return (
            <div className="card flex-center" style={{ height: '100%', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '4rem' }}>⚠️</div>
                <h2 style={{ color: '#ff0055' }}>Connection Lost</h2>
                <p style={{ color: '#888' }}>Unable to connect to the game server.</p>
                <button onClick={() => window.location.reload()} className="secondary" style={{ width: 'auto', padding: '0.8rem 2rem' }}>
                    Try Reconnecting
                </button>
                <button onClick={() => navigate('/')} style={{ background: '#333', color: '#fff', width: 'auto', padding: '0.8rem 2rem' }}>
                    Go to Home
                </button>
            </div>
        );
    }

    if (!isConnected) return <div className="card flex-center" style={{ height: '100%', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontSize: '3rem', animation: 'spin 1s infinite linear' }}>🥨</div>
        <div>Connecting to room...</div>
    </div>;

    if (!gameState) return <div className="card flex-center" style={{ height: '100%' }}>Loading Game Data...</div>;

    const amIHost = gameState.players[clientId]?.is_host;
    const isLobby = !gameState.game_started;
    const isGameOver = gameState.game_over;
    const myPlayer = gameState.players[clientId];

    // Lobby View
    if (isLobby) {
        return (
            <div style={{ padding: '1rem' }}>
                <h2 className="title" style={{ textAlign: 'center' }}>Lobby</h2>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <span className="subtitle">ROOM CODE</span>
                    <h1 onClick={() => navigator.clipboard.writeText(roomCode)} style={{ fontSize: '3rem', margin: '0.5rem 0', letterSpacing: '5px' }}>
                        {roomCode}
                    </h1>
                </div>

                <div className="avatar-grid" style={{ flexWrap: 'wrap', justifyContent: 'center', gap: '1.5rem' }}>
                    {Object.values(gameState.players).map(p => (
                        <motion.div
                            key={p.name}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            style={{ textAlign: 'center' }}
                        >
                            <div style={{ position: 'relative' }}>
                                <img src={p.avatar} alt={p.name} style={{ width: 80, height: 80, borderRadius: '25px', background: '#222' }} />
                                {p.is_host && <span className="streak-badge" style={{ background: 'gold', color: 'black', position: 'absolute', top: -10, right: -10, padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 'bold' }}>HOST</span>}
                            </div>
                            <div style={{ marginTop: '0.5rem', fontWeight: '600' }}>{p.name}</div>
                        </motion.div>
                    ))}
                </div>

                <div style={{ position: 'fixed', bottom: '2rem', left: '1rem', right: '1rem' }}>
                    {amIHost ? (
                        <button onClick={handleStartGame} style={{ padding: '1.5rem', fontSize: '1.2rem', boxShadow: '0 0 20px var(--primary)' }}>Start Game</button>
                    ) : (
                        <div className="flex-center animate-pulse" style={{ color: '#888' }}>Waiting for host...</div>
                    )}
                </div>
            </div>
        );
    }

    // Game Over View
    if (isGameOver) {
        const sortedPlayers = Object.values(gameState.players).sort((a, b) => b.total_score - a.total_score);
        const winner = sortedPlayers[0];
        const loser = sortedPlayers[sortedPlayers.length - 1];
        const isMe = winner.name === playerName;

        const hostId = Object.keys(gameState.players).find(id => gameState.players[id].is_host);
        const hostReplayClicked = gameState.restart_votes?.includes(hostId);

        return (
            <div ref={resultsRef} style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', overflow: 'hidden', padding: '1rem', background: '#000', boxSizing: 'border-box', borderRadius: '20px' }}>
                {isMe && <Confetti width={width} height={height} />}

                <div style={{ textAlign: 'center', padding: '1rem 0', flexShrink: 0 }}>
                    <h1 className="title">{isMe ? "VICTORY!" : "GAME OVER"}</h1>
                    <p className="subtitle">{gameState.total_rounds} Rounds Played</p>
                </div>

                <div style={{ display: 'flex', width: '100%', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button
                        className={`tab ${gameOverTab === 'leaderboard' ? 'active' : ''}`}
                        onClick={() => setGameOverTab('leaderboard')}
                        style={{ flex: 1, padding: '0.8rem', fontSize: '0.9rem', justifyContent: 'center', textAlign: 'center' }}
                    >
                        🏆 Leaderboard
                    </button>
                    <button
                        className={`tab ${gameOverTab === 'rounds' ? 'active' : ''}`}
                        onClick={() => setGameOverTab('rounds')}
                        style={{ flex: 1, padding: '0.8rem', fontSize: '0.9rem', justifyContent: 'center', textAlign: 'center' }}
                    >
                        📜 History
                    </button>
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', paddingRight: '5px' }}>

                    {/* LEADERBOARD TAB */}
                    {gameOverTab === 'leaderboard' && (
                        <>
                            <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(180deg, #1a1a1a 0%, #000 100%)', border: '1px solid gold', marginBottom: '1rem', padding: '0.5rem' }}>
                                <div style={{ fontSize: '0.7rem', color: 'gold', letterSpacing: '2px', marginBottom: '0.5rem' }}>MVP</div>
                                <img crossOrigin="anonymous" src={winner.avatar} style={{ width: 60, height: 60, borderRadius: '50%', border: '2px solid gold', boxShadow: '0 0 15px rgba(255, 215, 0, 0.4)' }} />
                                <h2 style={{ fontSize: '1.2rem', margin: '0.3rem 0' }}>{winner.name}</h2>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', textShadow: '0 0 10px gold' }}>{winner.total_score.toFixed(0)}</div>
                            </div>

                            <div className="results-list">
                                {sortedPlayers.slice(1).map((p, i) => (
                                    <div key={i} className="flex-between" style={{
                                        padding: '1rem', marginBottom: '0.5rem',
                                        background: '#111', borderRadius: '15px',
                                        border: p.name === loser.name ? '1px solid #ff0055' : '1px solid #333'
                                    }}>
                                        <div className="flex-center" style={{ gap: '1rem' }}>
                                            <span style={{ color: '#555', fontWeight: 'bold' }}>#{i + 2}</span>
                                            <img crossOrigin="anonymous" src={p.avatar} style={{ width: 40, height: 40, borderRadius: '12px' }} />
                                            <span>{p.name}</span>
                                        </div>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: p.name === loser.name ? '#ff0055' : '#fff' }}>{p.total_score.toFixed(0)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* ROUND HISTORY TAB */}
                    {gameOverTab === 'rounds' && (
                        <div style={{ padding: '0.5rem', background: '#111', borderRadius: '15px', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '0.5rem', textAlign: 'left', color: '#666', borderBottom: '1px solid #333' }}>#</th>
                                        {sortedPlayers.map(p => (
                                            <th key={p.name} style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid #333' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                    <img src={p.avatar} style={{ width: 24, height: 24, borderRadius: '8px' }} />
                                                    <span style={{ fontSize: '0.7rem', color: '#aaa' }}>{p.name.slice(0, 4)}</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {gameState.history.map((round, rIndex) => (
                                        <tr key={round.round_num} style={{ background: rIndex % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                                            <td style={{ padding: '0.8rem 0.5rem', color: '#666' }}>{round.round_num}</td>
                                            {sortedPlayers.map(p => {
                                                const detail = round.details.find(d => d.name === p.name);
                                                const change = detail ? detail.change : 0;
                                                return (
                                                    <td key={p.name} style={{ textAlign: 'center', padding: '0.5rem', fontWeight: 'bold', color: change > 0 ? '#00ff9d' : '#ff0055' }}>
                                                        {change > 0 ? "+" : ""}{change.toFixed(0)}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="no-share" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', flexShrink: 0 }}>
                    <button onClick={shareResults} className="secondary">📸 Share KIL KIL Stats</button>

                    {/* Play Again Logic */}
                    {!gameState.restart_votes?.includes(clientId) ? (
                        /* Not voted yet */
                        amIHost || hostReplayClicked ? (
                            <button
                                onClick={() => ws.send(JSON.stringify({ action: "vote_restart" }))}
                                className={!amIHost && hostReplayClicked ? "streak-fire" : ""} // Animate for others if host clicked
                                style={{ background: '#00ff9d', color: 'black', boxShadow: '0 0 20px rgba(0, 255, 157, 0.4)' }}
                            >
                                🔄 Play Again
                            </button>
                        ) : (
                            <button disabled style={{ background: '#222', color: '#555', border: '1px solid #333', cursor: 'not-allowed' }}>
                                ⏳ Waiting for Host to Restart
                            </button>
                        )
                    ) : (
                        /* Already voted */
                        <button disabled style={{ background: '#333', color: '#888', border: '1px solid #555' }}>
                            ✅ Waiting for others ({gameState.restart_votes.length}/{Object.keys(gameState.players).length})
                        </button>
                    )}

                    <button onClick={() => navigate('/')}>Exit</button>
                </div>

                {/* Match Highlights - Only show if Host clicked Play Again */}
                {hostReplayClicked && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#111', borderRadius: '15px', animation: 'pulse 0.5s' }}>
                        <div className="subtitle" style={{ textAlign: 'center', marginBottom: '1rem' }}>MATCH HIGHLIGHTS</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {gameState.history.slice(-3).reverse().map((round, i) => {
                                // Find winner (is_winner=true)
                                const winner = round.details.find(d => d.is_winner);
                                // Find loser (lowest change)
                                const loser = [...round.details].sort((a, b) => a.change - b.change)[0];

                                return (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem', background: '#222', borderRadius: '10px' }}>
                                        <div style={{ fontSize: '0.9rem', color: '#888', width: '60px' }}>Rn {round.round_num}</div>

                                        {/* Winner */}
                                        <div className="flex-center" style={{ gap: '0.5rem' }}>
                                            <span style={{ fontSize: '1.2rem' }}>👑</span>
                                            <img src={winner?.avatar} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid gold' }} />
                                        </div>

                                        <div style={{ color: '#444' }}>vs</div>

                                        {/* Loser */}
                                        <div className="flex-center" style={{ gap: '0.5rem' }}>
                                            <img src={loser?.avatar} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #ff0055', grayscale: 1 }} />
                                            <span style={{ fontSize: '1.2rem' }}>💀</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Round Results Overlay
    if (roundResult) {
        return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 100, padding: '1rem', overflowY: 'auto' }}>
                {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={300} />}

                <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Round {roundResult.round_num}</h2>

                    {/* Events */}
                    <AnimatePresence>
                        {events && events.length > 0 && events.map((e, i) => (
                            <motion.div
                                key={`event-${i}`} // Unique key
                                className="bubble-notification"
                                initial={{ y: 20, opacity: 0, scale: 0.8 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ delay: i * 0.2, type: "spring" }}
                                style={{
                                    background: e.type === 'loss_streak' ? 'rgba(255, 0, 85, 0.2)' : 'rgba(0, 240, 255, 0.2)',
                                    borderColor: e.type === 'loss_streak' ? '#ff0055' : '#00f0ff',
                                    color: '#fff',
                                    width: '90%',
                                    margin: '0.5rem auto'
                                }}
                            >
                                {e.type === 'comeback' && `🔥 ${e.player} ON COMEBACK!`}
                                {e.type === 'win_streak' && `🚀 ${e.player} ON FIRE! (${e.streak} WINS)`}
                                {e.type === 'loss_streak' && `🌧️ ${e.player} ON LOOSING STREAK (${e.streak} LOSS)`}
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    <div className="card" style={{ textAlign: 'center', borderColor: '#00ff9d' }}>
                        <div className="subtitle">POT COLLECTED</div>
                        <div style={{ fontSize: '3rem', fontWeight: '800', color: '#00ff9d', textShadow: '0 0 20px rgba(0, 255, 157, 0.4)' }}>
                            {roundResult.pot.toFixed(0)}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: '0.8rem' }}>
                        {roundResult.details.map((d, i) => (
                            <motion.div
                                key={i}
                                className="flex-between"
                                animate={d.change > 0 ? { scale: [1, 1.02, 1], boxShadow: "0 0 10px rgba(0,255,157,0.3)" } : {}}
                                transition={{ duration: 0.5 }}
                                style={{
                                    padding: '1rem', borderRadius: '12px',
                                    background: d.change > 0 ? 'rgba(0, 255, 157, 0.1)' : 'rgba(255, 0, 85, 0.1)',
                                    borderLeft: `4px solid ${d.change > 0 ? '#00ff9d' : '#ff0055'}`
                                }}
                            >
                                <div className="flex-center" style={{ gap: '1rem' }}>
                                    <img src={d.avatar} style={{ width: 40, height: 40, borderRadius: '10px' }} />
                                    <div>
                                        <div>{d.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#888' }}>Total: {d.total.toFixed(0)}</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: d.change > 0 ? '#00ff9d' : '#ff0055' }}>
                                    {d.change > 0 ? "+" : ""}{d.change.toFixed(0)}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}>
                            Next round in {autoNextRoundTimer}s...
                        </div>
                        <button onClick={() => {
                            setRoundResult(null);
                            setMyTurnDone(false);
                            setVotedToEnd(false);
                            setEvents([]); // Clear events on manual next
                        }} style={{ width: '100%' }}>Next Round Now →</button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Active Game View
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', overflow: 'hidden', padding: '0', boxSizing: 'border-box' }}>
            {/* Header */}
            <div className="flex-between" style={{ padding: '0 1rem', flexShrink: 0 }}>
                <div>
                    <span className="subtitle">ROUND</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{gameState.current_round} <span style={{ color: '#444' }}>/ {gameState.total_rounds}</span></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    {gameState.votes > 0 && (
                        <div style={{ color: 'orange', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                            Votes to End: {gameState.votes}/{Object.keys(gameState.players).length}
                        </div>
                    )}
                    {/* Always allow voting if game is active */}
                    {!votedToEnd && (
                        <button
                            onClick={voteToEnd}
                            style={{
                                background: 'rgba(255, 0, 85, 0.2)',
                                border: '1px solid #ff0055',
                                padding: '0.4rem 0.8rem',
                                fontSize: '0.8rem',
                                color: '#ff0055',
                                borderRadius: '12px',
                                fontWeight: 'bold'
                            }}
                        >
                            End Game
                        </button>
                    )}
                </div>
            </div>

            {/* Players Scroll (Flexible Middle) */}
            <div className="player-grid" style={{ flex: 1, alignContent: 'start' }}>
                {Object.values(gameState.players).map(p => (
                    <div key={p.name} className={`avatar-option ${p.current_round_score !== null ? 'selected' : ''}`} style={{ width: '100%', height: 'auto', background: 'transparent', boxShadow: 'none', opacity: p.current_round_score !== null ? 0.5 : 1 }}>
                        <div style={{ position: 'relative' }}>
                            <img
                                src={p.avatar}
                                className={p.win_streak >= 3 ? 'streak-fire' : p.loss_streak >= 3 ? 'streak-sad' : ''}
                                style={{
                                    width: '100%', aspectRatio: '1/1', borderRadius: '20px',
                                    background: '#222',
                                    border: p.current_round_score !== null ? '2px solid #00ff9d' : '2px solid #333',
                                    objectFit: 'cover',
                                    transition: 'all 0.3s'
                                }}
                            />
                            {/* Status Badges */}
                            {p.win_streak >= 3 && (
                                <div style={{ position: 'absolute', top: -15, right: -15, width: 40, height: 40, filter: 'drop-shadow(0 0 5px orange)', zIndex: 10 }}>
                                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M14.5 4.5C14.5 4.5 12.5 3 10.5 4.5C8.5 6 8.5 8 9.5 9.5C10.5 11 11.5 10 11.5 10C11.5 10 10 12.5 8 13C6 13.5 4 11 4 11C4 11 5 16 9.5 18.5C14 21 19 18 19 12.5C19 7 14.5 4.5 14.5 4.5Z" fill="#FF5500" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M14.5 12.5C14.5 12.5 15.5 14 14.5 16C13.5 18 10.5 17 10.5 17" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            )}
                            {p.loss_streak >= 3 && (
                                <div style={{ position: 'absolute', top: -15, right: -15, width: 40, height: 40, filter: 'drop-shadow(0 0 5px #00f0ff)', zIndex: 10 }}>
                                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M17.5 19C19.9853 19 22 16.9853 22 14.5C22 12.132 20.177 10.244 17.8 10.05C17.6 7.2 15.2 5 12.5 5C10.2 5 8.2 6.5 7.5 8.6C4.6 8.9 2.5 11.4 2.5 14.5C2.5 16.9853 4.51472 19 7 19H17.5Z" fill="#333" stroke="#00f0ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M8 22L7 19" stroke="#00f0ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M12 22L12 19" stroke="#00f0ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M16 22L17 19" stroke="#00f0ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <div style={{ textAlign: 'center', fontSize: '0.8rem', marginTop: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', color: '#aaa' }}>
                            {gameState.show_scores ? p.total_score.toFixed(0) : "???"}
                        </div>
                    </div>
                ))}
            </div>

            {/* Action Area (Fixed Bottom) */}
            <div style={{
                flexShrink: 0,
                padding: '1.5rem 1rem',
                background: '#111',
                borderTopLeftRadius: '30px',
                borderTopRightRadius: '30px',
                boxShadow: '0 -10px 30px rgba(0,0,0,0.5)',
                zIndex: 10
            }}>
                {myTurnDone ? (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <div style={{ fontSize: '3rem', animation: 'spin 2s infinite linear', marginBottom: '1rem' }}>⏳</div>
                        <h3 style={{ margin: 0 }}>Waiting for others...</h3>
                        {!votedToEnd && (
                            <button onClick={voteToEnd} className="secondary" style={{ marginTop: '1rem', fontSize: '0.9rem', width: 'auto', padding: '0.5rem 1.5rem' }}>
                                Vote to Finish Game
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ margin: 0 }}>Lost Amount?</h2>
                            <div className="subtitle">Enter 0 if you won</div>
                        </div>

                        <div className="flex-center" style={{ marginBottom: '1rem' }}>
                            <input
                                type="number"
                                value={inputScore}
                                onChange={(e) => setInputScore(e.target.value)}
                                placeholder="0"
                                style={{ fontSize: '4rem', textAlign: 'center', background: 'transparent', border: 'none', borderBottom: '2px solid #333', borderRadius: 0, width: '150px' }}
                                autoFocus
                            />
                        </div>

                        <div className="flex-center" style={{ gap: '0.5rem', marginBottom: '2rem' }}>
                            {[0, 20, 50, 100].map(val => (
                                <button key={val} onClick={() => setInputScore(val.toString())} className="secondary" style={{ width: 'auto', padding: '0.5rem 1.2rem', minWidth: '60px' }}>
                                    {val}
                                </button>
                            ))}
                        </div>

                        <button onClick={submitScore} style={{ padding: '1.2rem', fontSize: '1.2rem', boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)' }}>
                            SUBMIT SCORE
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default GameRoom;
