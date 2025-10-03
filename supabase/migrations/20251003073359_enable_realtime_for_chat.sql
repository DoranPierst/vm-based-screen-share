/*
  # Enable Realtime for Chat and Room Updates

  ## Changes
  - Add all tables to realtime publication
  - Enable realtime updates for chat messages
  - Enable realtime updates for room participants
  - Enable realtime updates for rooms table
  
  ## Security
  - Realtime respects existing RLS policies
*/

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE room_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
