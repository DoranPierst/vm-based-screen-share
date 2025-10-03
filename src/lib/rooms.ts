import { supabase } from './supabase';
import type { Database } from './database.types';

type Room = Database['public']['Tables']['rooms']['Row'];
type RoomParticipant = Database['public']['Tables']['room_participants']['Row'];

export interface RoomWithDetails extends Room {
  participant_count?: number;
  participants?: Array<{
    user_id: string;
    nickname: string;
    is_connected: boolean;
  }>;
}

export async function createRoom(name: string, hostId: string): Promise<{ success: boolean; error?: string; room?: Room }> {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        name,
        host_id: hostId,
        current_controller_id: hostId,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    if (data) {
      await supabase.from('room_participants').insert({
        room_id: data.id,
        user_id: hostId,
      });

      return { success: true, room: data };
    }

    return { success: false, error: 'Oda oluşturulamadı' };
  } catch (error) {
    return { success: false, error: 'Bir hata oluştu' };
  }
}

export async function getRooms(): Promise<{ success: boolean; error?: string; rooms?: RoomWithDetails[] }> {
  try {
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select(`
        *,
        room_participants(count)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (roomsError) {
      return { success: false, error: roomsError.message };
    }

    const roomsWithCount = rooms?.map(room => ({
      ...room,
      participant_count: room.room_participants?.[0]?.count || 0,
    }));

    return { success: true, rooms: roomsWithCount };
  } catch (error) {
    return { success: false, error: 'Bir hata oluştu' };
  }
}

export async function getRoom(roomId: string): Promise<{ success: boolean; error?: string; room?: RoomWithDetails }> {
  try {
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError) {
      return { success: false, error: roomError.message };
    }

    const { data: participants, error: participantsError } = await supabase
      .from('room_participants')
      .select(`
        user_id,
        is_connected,
        users(nickname)
      `)
      .eq('room_id', roomId);

    if (participantsError) {
      return { success: false, error: participantsError.message };
    }

    const roomWithDetails: RoomWithDetails = {
      ...room,
      participant_count: participants?.length || 0,
      participants: participants?.map(p => ({
        user_id: p.user_id,
        nickname: (p.users as any)?.nickname || 'Unknown',
        is_connected: p.is_connected,
      })),
    };

    return { success: true, room: roomWithDetails };
  } catch (error) {
    return { success: false, error: 'Bir hata oluştu' };
  }
}

export async function joinRoom(roomId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: room } = await supabase
      .from('rooms')
      .select('*, room_participants(count)')
      .eq('id', roomId)
      .single();

    if (!room) {
      return { success: false, error: 'Oda bulunamadı' };
    }

    const participantCount = room.room_participants?.[0]?.count || 0;
    if (participantCount >= room.max_participants) {
      return { success: false, error: 'Oda dolu' };
    }

    const { error } = await supabase
      .from('room_participants')
      .insert({
        room_id: roomId,
        user_id: userId,
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Zaten odadasınız' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Bir hata oluştu' };
  }
}

export async function leaveRoom(roomId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('room_participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Bir hata oluştu' };
  }
}

export async function updateController(roomId: string, controllerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('rooms')
      .update({ current_controller_id: controllerId })
      .eq('id', roomId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Bir hata oluştu' };
  }
}

export async function closeRoom(roomId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('rooms')
      .update({ is_active: false })
      .eq('id', roomId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Bir hata oluştu' };
  }
}
