-- Migration number: 0001 	 2025-08-28T20:25:46.786Z
CREATE TABLE stories (
    story_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL
);

CREATE TABLE nodes (
    node_id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_node_id INTEGER,
    story_id INTEGER NOT NULL,
    -- non-relation data
    choice_label TEXT,
    story_content TEXT,
    -- end non-relation data
    FOREIGN KEY (parent_node_id) REFERENCES nodes (node_id) ON DELETE CASCADE,
    FOREIGN KEY (story_id) REFERENCES stories (story_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_node_parent_id ON nodes (parent_node_id);
