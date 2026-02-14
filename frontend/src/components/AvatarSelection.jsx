import { useState } from 'react';
import { AVATAR_CATEGORIES } from '../utils/avatars';
import { motion } from 'framer-motion';

function AvatarSelection({ onSelect, selectedAvatar }) {
    const [category, setCategory] = useState("Anime");

    return (
        <div className="avatar-selection">
            <div className="category-tabs">
                {Object.keys(AVATAR_CATEGORIES).map(cat => (
                    <button
                        key={cat}
                        className={`tab ${category === cat ? 'active' : ''}`}
                        onClick={() => setCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="avatar-grid">
                {AVATAR_CATEGORIES[category].map((avatar, i) => (
                    <motion.img
                        key={i}
                        src={avatar}
                        alt="avatar"
                        className={`avatar-option ${selectedAvatar === avatar ? 'selected' : ''}`}
                        onClick={() => onSelect(avatar)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    />
                ))}
            </div>
        </div>
    );
}

export default AvatarSelection;
