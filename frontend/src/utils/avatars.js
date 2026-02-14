// Avatar collections using DiceBear API
// Optimized for specific character lookalikes

const r = (style, seed) => `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`;

export const AVATAR_CATEGORIES = {
    "Anime": [
        r("adventurer", "Zoro"), r("adventurer", "Luffy"), r("adventurer", "Naruto"), r("adventurer", "Sasuke"), r("adventurer", "Goku"),
        r("adventurer", "Vegeta"), r("adventurer", "Tanjiro"), r("adventurer", "Nezuko"), r("adventurer", "Eren"), r("adventurer", "Levi"),
        r("adventurer", "Saitama"), r("adventurer", "Deku"), r("adventurer", "Bakugo"), r("adventurer", "Itadori"), r("adventurer", "Gojo"),
    ],
    "Heroes": [
        r("micah", "Tony"), r("micah", "Steve"), r("micah", "Thor"), r("micah", "Bruce"), r("micah", "Natasha"),
        r("micah", "Peter"), r("micah", "Stephen"), r("micah", "Wanda"), r("micah", "TChalla"), r("micah", "Carol"),
        r("micah", "Clark"), r("micah", "BruceW"), r("micah", "Diana"), r("micah", "Barry"), r("micah", "Arthur"),
    ],
    "Villains": [
        r("notionists", "Joker"), r("notionists", "Thanos"), r("notionists", "Vader"), r("notionists", "Loki"), r("notionists", "Hela"),
    ],
    "Chill": [
        r("open-peeps", "12"), r("open-peeps", "25"), r("open-peeps", "33"), r("open-peeps", "41"), r("open-peeps", "50"),
        r("avataaars", "Chill1"), r("avataaars", "Chill2"), r("avataaars", "Chill3"), r("avataaars", "Chill4"), r("avataaars", "Chill5"),
    ]
};

export const getRandomAvatar = () => {
    const categories = Object.keys(AVATAR_CATEGORIES);
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const list = AVATAR_CATEGORIES[cat];
    return list[Math.floor(Math.random() * list.length)];
};
