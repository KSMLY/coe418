USE gamehub;

CREATE TABLE IF NOT EXISTS USER (
    user_id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    join_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS GAME (
    game_id VARCHAR(36) PRIMARY KEY,
    external_api_id VARCHAR(100) UNIQUE,
    title VARCHAR(255) NOT NULL,
    developer VARCHAR(100),
    release_date DATE,
    cover_image_url TEXT
);

CREATE TABLE IF NOT EXISTS GAME_GENRE (
    game_id VARCHAR(36),
    genre VARCHAR(50),
    PRIMARY KEY (game_id, genre),
    FOREIGN KEY (game_id) REFERENCES GAME(game_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS GAME_PLATFORM (
    game_id VARCHAR(36),
    platform VARCHAR(50),
    PRIMARY KEY (game_id, platform),
    FOREIGN KEY (game_id) REFERENCES GAME(game_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ACHIEVEMENT (
    achievement_id VARCHAR(36) PRIMARY KEY,
    game_id VARCHAR(36) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    description TEXT,
    rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary'),
    points_value INT DEFAULT 0,
    FOREIGN KEY (game_id) REFERENCES GAME(game_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS USER_GAMES (
    user_id VARCHAR(36),
    game_id VARCHAR(36),
    play_status ENUM('not_started', 'in_progress', 'completed', 'dropped') DEFAULT 'not_started',
    personal_notes TEXT,
    rating INT,
    PRIMARY KEY (user_id, game_id),
    FOREIGN KEY (user_id) REFERENCES USER(user_id) ON DELETE CASCADE,
    FOREIGN KEY (game_id) REFERENCES GAME(game_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS USER_ACHIEVEMENTS (
    user_id VARCHAR(36),
    achievement_id VARCHAR(36),
    date_earned DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES USER(user_id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES ACHIEVEMENT(achievement_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS REVIEW (
    review_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    game_id VARCHAR(36) NOT NULL,
    review_text TEXT,
    rating INT NOT NULL,
    review_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, game_id),
    FOREIGN KEY (user_id) REFERENCES USER(user_id) ON DELETE CASCADE,
    FOREIGN KEY (game_id) REFERENCES GAME(game_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS PLAY_SESSION (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    game_id VARCHAR(36) NOT NULL,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    session_notes TEXT,
    FOREIGN KEY (user_id) REFERENCES USER(user_id) ON DELETE CASCADE,
    FOREIGN KEY (game_id) REFERENCES GAME(game_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS FRIENDS (
    friendship_id VARCHAR(36) PRIMARY KEY,
    user_id_initiator VARCHAR(36) NOT NULL,
    user_id_recipient VARCHAR(36) NOT NULL,
    friendship_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    friendship_status ENUM('pending', 'accepted', 'blocked') DEFAULT 'pending',
    UNIQUE (user_id_initiator, user_id_recipient),
    FOREIGN KEY (user_id_initiator) REFERENCES USER(user_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id_recipient) REFERENCES USER(user_id) ON DELETE CASCADE
);