import { useState, useEffect } from 'react';
import { Plus, Users, Clock, LogOut, Monitor } from 'lucide-react';
import { getRooms, createRoom } from '../lib/rooms';
import type { AuthUser } from '../lib/auth';
import type { RoomWithDetails } from '../lib/rooms';

interface RoomsListPageProps {
  user: AuthUser;
  onLogout: () => void;
  onJoinRoom: (roomId: string) => void;
}

export function RoomsListPage({ user, onLogout, onJoinRoom }: RoomsListPageProps) {
  const [rooms, setRooms] = useState<RoomWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadRooms = async () => {
    const result = await getRooms();
    if (result.success && result.rooms) {
      setRooms(result.rooms);
    }
    setLoading(false);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const result = await createRoom(roomName, user.id);
      if (result.success && result.room) {
        setShowCreateModal(false);
        setRoomName('');
        onJoinRoom(result.room.id);
      } else {
        setError(result.error || 'Oda oluşturulamadı');
      }
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Bugün';
    if (days === 1) return 'Dün';
    return `${days} gün önce`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Monitor className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Hoş geldin, {user.nickname}!</h1>
                <p className="text-sm text-slate-400">Film izleme odalarına katıl veya yeni oda oluştur</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Aktif Odalar</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
          >
            <Plus className="w-5 h-5" />
            Yeni Oda Oluştur
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-slate-400 mt-4">Odalar yükleniyor...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-12 bg-slate-800 rounded-xl border border-slate-700">
            <Monitor className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Henüz aktif oda yok</p>
            <p className="text-slate-500 text-sm mt-2">İlk odayı sen oluştur!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="bg-slate-800 rounded-xl border border-slate-700 p-6 hover:border-blue-500 transition-all duration-200 cursor-pointer"
                onClick={() => onJoinRoom(room.id)}
              >
                <h3 className="text-xl font-semibold text-white mb-4">{room.name}</h3>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Users className="w-4 h-4" />
                    <span>
                      {room.participant_count || 0}/{room.max_participants} kişi
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{formatDate(room.created_at)}</span>
                  </div>
                </div>

                <div className="flex gap-1">
                  {Array.from({ length: room.max_participants }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded-full ${
                        i < (room.participant_count || 0)
                          ? 'bg-green-500'
                          : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                <button className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                  Katılmak için tıkla
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Yeni Oda Oluştur</h3>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label htmlFor="roomName" className="block text-sm font-medium text-slate-300 mb-2">
                  Oda Adı
                </label>
                <input
                  type="text"
                  id="roomName"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Oda adını girin"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setRoomName('');
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Oluşturuluyor...' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
