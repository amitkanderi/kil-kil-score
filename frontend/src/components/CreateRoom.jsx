import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarSelection from './AvatarSelection';
import { getRandomAvatar } from '../utils/avatars';
import { motion } from 'framer-motion';

function CreateRoom() {
    const navigate = useNavigate();
    const [rounds, setRounds] = useState(5);
    const [showScores, setShowScores] = useState(true);
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState(getRandomAvatar());
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Details, 2: Avatar

    const handleCreate = async () => {
        if (!name) return alert("Please enter your name");
        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/create-room`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rounds, show_scores: showScores }),
            });

            if (response.ok) {
                const data = await response.json();
                navigate(`/room/${data.room_code}`, { state: { name, avatar } });
            } else {
                alert('Failed to create room');
            }
        } catch (error) {
            console.error(error);
            alert('Error connecting to server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
        >
            <h2 className="title">Create Room</h2>

            {step === 1 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <input
                        type="text"
                        placeholder="Your Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                    />

                    <div style={{ textAlign: 'left', width: '100%', marginBottom: '1.5rem', marginTop: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>Rounds to Play</label>
                        <input
                            type="range"
                            value={rounds}
                            onChange={(e) => setRounds(parseInt(e.target.value))}
                            min="1" max="20"
                            style={{ margin: '0.5rem 0', padding: 0 }}
                        />
                        <div style={{ textAlign: 'right', fontWeight: 'bold' }}>{rounds} Rounds</div>

                        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <input
                                type="checkbox"
                                checked={showScores}
                                onChange={(e) => setShowScores(e.target.checked)}
                                style={{ width: '20px', height: '20px', margin: 0, accentColor: 'var(--primary)' }}
                            />
                            <label style={{ cursor: 'pointer' }} onClick={() => setShowScores(!showScores)}>Show live scores</label>
                        </div>
                    </div>

                    <button onClick={() => name ? setStep(2) : alert("Enter name")} style={{ width: '100%', margin: '1rem 0' }}>Next: Choose Avatar →</button>
                    <button onClick={() => navigate('/')} className="secondary" style={{ width: '100%', margin: 0 }}>Cancel</button>
                </motion.div>
            ) : (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <p className="subtitle">Select your look, {name}</p>
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
                        <img src={avatar} alt="Selected" style={{ width: 100, height: 100, borderRadius: '50%', border: '4px solid var(--primary)', background: '#1e293b' }} />
                    </div>

                    <AvatarSelection onSelect={setAvatar} selectedAvatar={avatar} />

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => setStep(1)} style={{ background: '#334155', flex: 1 }}>Back</button>
                        <button onClick={handleCreate} disabled={loading} style={{ flex: 2 }}>
                            {loading ? 'Creating...' : '🚀 Launch Room'}
                        </button>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

export default CreateRoom;
