import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarSelection from './AvatarSelection';
import { getRandomAvatar } from '../utils/avatars';
import { motion } from 'framer-motion';

function JoinRoom() {
    const navigate = useNavigate();
    const [roomCode, setRoomCode] = useState('');
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState(getRandomAvatar());
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);

    const handleJoin = async () => {
        if (!roomCode || !name) return;
        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/check-room/${roomCode}`);
            if (response.ok) {
                navigate(`/room/${roomCode}`, { state: { name, avatar } });
            } else {
                alert("Room not found");
            }
        } catch (e) {
            alert("Server error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card"
        >
            <h2 className="title">Join Room</h2>

            {step === 1 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <input
                        type="text"
                        placeholder="Your Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                    />
                    <input
                        type="text"
                        placeholder="ROOM CODE"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        style={{ textAlign: 'center', letterSpacing: '4px', textTransform: 'uppercase', fontSize: '1.5rem', fontWeight: 'bold' }}
                        maxLength={6}
                    />

                    <button onClick={() => (name && roomCode) ? setStep(2) : alert("Fill all fields")} style={{ width: '100%', margin: '1rem 0' }}>Next: Choose Avatar →</button>
                    <button onClick={() => navigate('/')} className="secondary" style={{ width: '100%', margin: 0 }}>Cancel</button>
                </motion.div>
            ) : (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <p className="subtitle">Select your look</p>
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
                        <img src={avatar} alt="Selected" style={{ width: 100, height: 100, borderRadius: '50%', border: '4px solid var(--secondary)', background: '#1e293b' }} />
                    </div>

                    <AvatarSelection onSelect={setAvatar} selectedAvatar={avatar} />

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => setStep(1)} style={{ background: '#334155', flex: 1 }}>Back</button>
                        <button onClick={handleJoin} disabled={loading} style={{ flex: 2 }}>
                            {loading ? 'Joining...' : '🎮 Enter Game'}
                        </button>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

export default JoinRoom;
