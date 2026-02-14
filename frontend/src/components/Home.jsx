import { useNavigate } from 'react-router-dom';

import Logo from './Logo';

function Home() {
    const navigate = useNavigate();

    return (
        <div className="card">
            <Logo />

            <p className="subtitle" style={{ marginTop: '-10px', marginBottom: '2rem', fontSize: '1.1rem', fontWeight: '300' }}>
                Fight with <span style={{ color: '#646cff', fontWeight: '600' }}>Friends</span> & Track the <span style={{ color: '#646cff', fontWeight: '600' }}>Score</span>
            </p>


            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button onClick={() => navigate('/create')}>Create New Room</button>
                <button onClick={() => navigate('/join')} className="secondary">
                    Join Existing Room
                </button>
            </div>
        </div>
    );
}

export default Home;
