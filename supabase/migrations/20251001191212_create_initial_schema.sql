/*
  # VM-based Movie Watching Platform - Initial Schema

  ## Overview
  This migration creates the core database structure for a collaborative movie watching platform
  where users can share their VM browser screen with friends and chat in real-time.

  ## New Tables

  ### 1. users
  Stores user account information with simple nickname/password authentication
  - `id` (uuid, primary key): Unique user identifier
  - `nickname` (text, unique): User's chosen nickname
  - `password_hash` (text): Hashed password for authentication
  - `created_at` (timestamptz): Account creation timestamp

  ### 2. rooms
  Manages watch party rooms with host control and participant limits
  - `id` (uuid, primary key): Unique room identifier
  - `name` (text): Room display name
  - `host_id` (uuid, foreign key): Creator/owner of the room
  - `current_controller_id` (uuid, foreign key): User currently controlling the VM screen
  - `max_participants` (integer): Maximum room capacity (default 10)
  - `is_active` (boolean): Whether room is currently active
  - `created_at` (timestamptz): Room creation timestamp
  - `updated_at` (timestamptz): Last update timestamp

  ### 3. room_participants
  Tracks which users are in which rooms
  - `id` (uuid, primary key): Unique participant record identifier
  - `room_id` (uuid, foreign key): Associated room
  - `user_id` (uuid, foreign key): Participating user
  - `joined_at` (timestamptz): When user joined the room
  - `is_connected` (boolean): Current connection status
  - Unique constraint on (room_id, user_id)

  ### 4. chat_messages
  Stores all chat messages within rooms
  - `id` (uuid, primary key): Unique message identifier
  - `room_id` (uuid, foreign key): Room where message was sent
  - `user_id` (uuid, foreign key): User who sent the message
  - `message` (text): Message content
  - `created_at` (timestamptz): Message timestamp

  ## Security

  ### Row Level Security (RLS)
  All tables have RLS enabled with policies that:
  - Allow users to read their own data
  - Allow users to manage rooms they created
  - Allow room participants to read room data and send messages
  - Prevent unauthorized access to other users' data

  ## Indexes
  - Indexes on foreign keys for optimal join performance
  - Index on room participants for quick participant lookups
  - Index on chat messages for efficient message retrieval
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  host_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  current_controller_id uuid REFERENCES users(id) ON DELETE SET NULL,
  max_participants integer DEFAULT 10,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create room_participants table
CREATE TABLE IF NOT EXISTS room_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  is_connected boolean DEFAULT true,
  UNIQUE(room_id, user_id)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_rooms_is_active ON rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read their own data"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Rooms policies
CREATE POLICY "Anyone can view active rooms"
  ON rooms FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can create rooms"
  ON rooms FOR INSERT
  TO authenticated
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Room hosts can update their rooms"
  ON rooms FOR UPDATE
  TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Room hosts can delete their rooms"
  ON rooms FOR DELETE
  TO authenticated
  USING (host_id = auth.uid());

-- Room participants policies
CREATE POLICY "Participants can view room members"
  ON room_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_participants rp
      WHERE rp.room_id = room_participants.room_id
      AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join rooms"
  ON room_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their participation status"
  ON room_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave rooms"
  ON room_participants FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Chat messages policies
CREATE POLICY "Room participants can view messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_participants rp
      WHERE rp.room_id = chat_messages.room_id
      AND rp.user_id = auth.uid()
      AND rp.is_connected = true
    )
  );

CREATE POLICY "Room participants can send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM room_participants rp
      WHERE rp.room_id = chat_messages.room_id
      AND rp.user_id = auth.uid()
      AND rp.is_connected = true
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update rooms.updated_at
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();