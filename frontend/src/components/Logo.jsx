import { motion } from 'framer-motion';

const Logo = () => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            {/* Left KIL */}
            <motion.div
                initial={{ x: -100, opacity: 0, rotate: -20 }}
                animate={{ x: 0, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.6, duration: 1 }}
                style={{ fontSize: 'clamp(2.5rem, 10vw, 4rem)', fontWeight: '900', color: '#ff0055', textShadow: '0 0 20px rgba(255, 0, 85, 0.5)' }}
            >
                KIL
            </motion.div>

            {/* VS Sword Icon / Spark */}
            <motion.div
                initial={{ scale: 0, rotate: 180 }}
                animate={{ scale: [0, 1.5, 1], rotate: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                style={{ fontSize: 'clamp(2rem, 8vw, 3rem)', zIndex: 10 }}
            >
                ⚔️
            </motion.div>

            {/* Right KIL */}
            <motion.div
                initial={{ x: 100, opacity: 0, rotate: 20 }}
                animate={{ x: 0, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.6, duration: 1 }}
                style={{ fontSize: 'clamp(2.5rem, 10vw, 4rem)', fontWeight: '900', color: '#00f0ff', textShadow: '0 0 20px rgba(0, 240, 255, 0.5)' }}
            >
                KIL
            </motion.div>
        </div>
    );
};

export default Logo;
