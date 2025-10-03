import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Users, Monitor, Shield } from 'lucide-react';
import { getRoom, leaveRoom } from '../lib/rooms';
import { getMessages, sendMessage, subscribeToMessages } from '../lib/chat';
import { grantControl, revokeControl, subscribeToControlChanges } from '../lib/permissions';
import type { AuthUser } from '../lib/auth';
import type { RoomWithDetails } from '../lib/rooms';
import type { ChatMessageWithUser } from '../lib/chat';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface RoomPageProps {
  roomId: string;
  user: AuthUser;
  onLeave: () => void;
}

export function RoomPage({ roomId, user, onLeave }: RoomPageProps) {
  const [room, setRoom] = useState<RoomWithDetails | null>(null);
  const [messages, setMessages] = useState<ChatMessageWithUser[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatChannelRef = useRef<RealtimeChannel | null>(null);
  const controlChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    loadRoomData();

    return () => {
      if (chatChannelRef.current) {
        chatChannelRef.current.unsubscribe();
      }
      if (controlChannelRef.current) {
        controlChannelRef.current.unsubscribe();
      }
    };
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadRoomData = async () => {
    const roomResult = await getRoom(roomId);
    if (roomResult.success && roomResult.room) {
      setRoom(roomResult.room);
    }

    const messagesResult = await getMessages(roomId);
    if (messagesResult.success && messagesResult.messages) {
      setMessages(messagesResult.messages);
    }

    chatChannelRef.current = subscribeToMessages(roomId, (message) => {
      setMessages((prev) => [...prev, message]);
    });

    controlChannelRef.current = subscribeToControlChanges(roomId, (controllerId) => {
      setRoom((prev) => prev ? { ...prev, current_controller_id: controllerId } : null);
    });

    setLoading(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || sending) return;

    setSending(true);
    const result = await sendMessage(roomId, user.id, messageText);
    if (result.success) {
      setMessageText('');
    }
    setSending(false);
  };

  const handleLeave = async () => {
    await leaveRoom(roomId, user.id);
    onLeave();
  };

  const handleGrantControl = async (userId: string) => {
    if (!room) return;
    await grantControl(roomId, userId, user.id);
  };

  const handleRevokeControl = async () => {
    await revokeControl(roomId, user.id);
  };

  const isHost = room?.host_id === user.id;
  const isController = room?.current_controller_id === user.id;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-slate-400 mt-4">Oda yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400">Oda bulunamadı</p>
          <button
            onClick={onLeave}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLeave}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">{room.name}</h1>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-sm text-slate-400 flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {room.participant_count} katılımcı
                  </span>
                  {isController && (
                    <span className="text-sm text-green-400 flex items-center gap-1">
                      <Shield className="w-4 h-4" />
                      Kontrol: {isHost ? 'Ev sahibi' : 'Sende'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleLeave}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-6">
          <div className="bg-slate-800 rounded-xl border-2 border-dashed border-slate-700 flex-1 flex items-center justify-center">
            <div className="text-center">
              <Monitor className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">VM Ekranı</h3>
              <p className="text-slate-400 mb-1">VM ekranı burada görünecek</p>
              <p className="text-slate-500 text-sm">
                Şu anda kontrol: {isController ? 'Sende' : 'Başka birinde'}
              </p>
            </div>
          </div>
        </div>

        <div className="w-96 bg-slate-800 border-l border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-white">Katılımcılar</h3>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {room.participants?.map((participant) => (
                <div
                  key={participant.user_id}
                  className="flex items-center justify-between bg-slate-700 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        participant.is_connected ? 'bg-green-500' : 'bg-slate-500'
                      }`}
                    />
                    <span className="text-sm text-white">{participant.nickname}</span>
                    {room.host_id === participant.user_id && (
                      <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                        Ev sahibi
                      </span>
                    )}
                    {room.current_controller_id === participant.user_id && (
                      <Shield className="w-3 h-3 text-green-400" />
                    )}
                  </div>
                  {isHost && participant.user_id !== user.id && (
                    <button
                      onClick={() => handleGrantControl(participant.user_id)}
                      className="text-xs bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded transition-colors"
                    >
                      Kontrol ver
                    </button>
                  )}
                </div>
              ))}
            </div>
            {isHost && !isController && (
              <button
                onClick={handleRevokeControl}
                className="mt-3 w-full text-sm bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg transition-colors"
              >
                Kontrolü geri al
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h3 className="font-semibold text-white">Chat</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${
                    msg.user_id === user.id ? 'ml-8' : 'mr-8'
                  }`}
                >
                  <div
                    className={`rounded-lg p-3 ${
                      msg.user_id === user.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-white'
                    }`}
                  >
                    <div className="text-xs opacity-75 mb-1">{msg.user_nickname}</div>
                    <div className="text-sm">{msg.message}</div>
                    <div className="text-xs opacity-50 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Mesaj yaz..."
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  type="submit"
                  disabled={sending || !messageText.trim()}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
