import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ControlPermission {
  room_id: string;
  controller_id: string;
  timestamp: string;
}

export async function requestControl(roomId: string, userId: string, hostId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const channel = supabase.channel(`control-request:${roomId}`);

    await channel.send({
      type: 'broadcast',
      event: 'control_request',
      payload: {
        requester_id: userId,
        room_id: roomId,
      },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Kontrol isteği gönderilemedi' };
  }
}

export async function grantControl(roomId: string, userId: string, hostId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('host_id')
      .eq('id', roomId)
      .single();

    if (roomError) {
      return { success: false, error: roomError.message };
    }

    if (room.host_id !== hostId) {
      return { success: false, error: 'Sadece oda sahibi kontrol yetkisi verebilir' };
    }

    const { error } = await supabase
      .from('rooms')
      .update({ current_controller_id: userId })
      .eq('id', roomId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Kontrol yetkisi verilemedi' };
  }
}

export async function revokeControl(roomId: string, hostId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('host_id')
      .eq('id', roomId)
      .single();

    if (roomError) {
      return { success: false, error: roomError.message };
    }

    if (room.host_id !== hostId) {
      return { success: false, error: 'Sadece oda sahibi kontrol yetkisini geri alabilir' };
    }

    const { error } = await supabase
      .from('rooms')
      .update({ current_controller_id: hostId })
      .eq('id', roomId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Kontrol yetkisi geri alınamadı' };
  }
}

export function subscribeToControlChanges(
  roomId: string,
  onControlChange: (controllerId: string) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`room-control:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`,
      },
      (payload) => {
        const newData = payload.new as any;
        if (newData.current_controller_id) {
          onControlChange(newData.current_controller_id);
        }
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToControlRequests(
  roomId: string,
  onRequest: (requesterId: string) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`control-request:${roomId}`)
    .on('broadcast', { event: 'control_request' }, (payload) => {
      if (payload.payload.requester_id) {
        onRequest(payload.payload.requester_id);
      }
    })
    .subscribe();

  return channel;
}
