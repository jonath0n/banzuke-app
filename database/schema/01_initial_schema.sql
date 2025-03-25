-- Create enum types for common values
CREATE TYPE wrestler_side AS ENUM ('east', 'west');
CREATE TYPE tournament_location AS ENUM ('Tokyo', 'Osaka', 'Nagoya', 'Fukuoka');

-- Create wrestlers table
CREATE TABLE wrestlers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shikona VARCHAR(100) NOT NULL, -- Fighting name
    real_name VARCHAR(100),
    birth_date DATE,
    height_cm INT,
    weight_kg DECIMAL(5,2),
    stable VARCHAR(100), -- Heya
    debut_date DATE,
    hometown VARCHAR(100),
    country VARCHAR(50),
    profile_image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ranks table for the hierarchy of sumo ranks
CREATE TABLE ranks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL, -- e.g., "Yokozuna", "Ozeki"
    sort_order INT NOT NULL, -- For sorting (lower number = higher rank)
    division VARCHAR(30) NOT NULL, -- Makuuchi, Juryo, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tournaments (Basho) table
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL, -- e.g., "January Grand Sumo Tournament"
    venue VARCHAR(100) NOT NULL,
    location tournament_location NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wrestler ranks for each tournament
CREATE TABLE wrestler_tournament_ranks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wrestler_id UUID NOT NULL REFERENCES wrestlers(id) ON DELETE CASCADE,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    rank_id UUID NOT NULL REFERENCES ranks(id) ON DELETE CASCADE,
    side wrestler_side NOT NULL, -- East or West
    position_number INT, -- For numbered ranks like Maegashira #1, #2, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique wrestler per tournament
    UNIQUE(wrestler_id, tournament_id)
);

-- Create matches table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    day_number INT NOT NULL CHECK (day_number BETWEEN 1 AND 15), -- Which day of the tournament
    east_wrestler_id UUID NOT NULL REFERENCES wrestlers(id),
    west_wrestler_id UUID NOT NULL REFERENCES wrestlers(id),
    winner_id UUID REFERENCES wrestlers(id), -- NULL if match hasn't happened yet
    kimarite VARCHAR(50), -- Winning technique
    duration_seconds INT,
    match_date DATE NOT NULL,
    match_order INT NOT NULL, -- Order of the match on that day
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Check that winner is one of the wrestlers
    CONSTRAINT valid_winner CHECK (
        winner_id IS NULL OR 
        winner_id = east_wrestler_id OR 
        winner_id = west_wrestler_id
    ),
    
    -- Check that east and west wrestlers are different
    CONSTRAINT different_wrestlers CHECK (east_wrestler_id != west_wrestler_id)
);

-- Create tournament results table
CREATE TABLE tournament_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    wrestler_id UUID NOT NULL REFERENCES wrestlers(id) ON DELETE CASCADE,
    wins INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    absences INT NOT NULL DEFAULT 0,
    special_prizes TEXT[], -- Array of special prizes won
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tournament_id, wrestler_id)
);

-- Create techniques table
CREATE TABLE techniques (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    japanese_name VARCHAR(50),
    category VARCHAR(50), -- e.g., "push", "throw", "force out"
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_wrestlers ON matches(east_wrestler_id, west_wrestler_id);
CREATE INDEX idx_tournament_results_tournament ON tournament_results(tournament_id);
CREATE INDEX idx_wrestler_tournament_ranks_tournament ON wrestler_tournament_ranks(tournament_id);
CREATE INDEX idx_wrestlers_shikona ON wrestlers(shikona);

-- Create triggers to automatically update timestamps
CREATE TRIGGER update_wrestlers_updated_at
BEFORE UPDATE ON wrestlers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tournaments_updated_at
BEFORE UPDATE ON tournaments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_matches_updated_at
BEFORE UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tournament_results_updated_at
BEFORE UPDATE ON tournament_results
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();