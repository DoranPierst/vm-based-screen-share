import { supabase } from './supabase';
import type { Database } from './database.types';
import type { RealtimeChannel } from '@supabase/supabase-js';

type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];

export interface ChatMessageWithUser extends ChatMessage {
  user_nickname: string;
}

export async function sendMessage(roomId: string, userId: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        user_id: userId,
        message,
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Mesaj gönderilemedi' };
  }
}

export async function getMessages(roomId: string): Promise<{ success: boolean; error?: string; messages?: ChatMessageWithUser[] }> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        users(nickname)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      return { success: false, error: error.message };
    }

    const messages = data?.map(msg => ({
      ...msg,
      user_nickname: (msg.users as any)?.nickname || 'Unknown',
    }));

    return { success: true, messages };
  } catch (error) {
    return { success: false, error: 'Mesajlar yüklenemedi' };
  }
}

export function subscribeToMessages(
  roomId: string,
  onMessage: (message: ChatMessageWithUser) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      },
      async (payload) => {
        const newMessage = payload.new as ChatMessage;

        const { data: user } = await supabase
          .from('users')
          .select('nickname')
          .eq('id', newMessage.user_id)
          .single();

        onMessage({
          ...newMessage,
          user_nickname: user?.nickname || 'Unknown',
        });
      }
    )
    .subscribe();

  return channel;
}

export function unsubscribeFromMessages(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}
