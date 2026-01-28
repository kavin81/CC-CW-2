-- Add role column to users table
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' NOT NULL;

-- Update all existing users to admin role
UPDATE users SET role = 'admin';

-- Create paste_permissions table
CREATE TABLE paste_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paste_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  can_edit INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (paste_id) REFERENCES pastes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
