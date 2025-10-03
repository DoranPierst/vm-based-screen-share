import { useState, useEffect } from 'react';
import { getCurrentUser, logout as authLogout } from './lib/auth';
import { LoginPage } from './components/LoginPage';
import { RoomsListPage } from './components/RoomsListPage';
import { RoomPage } from './components/RoomPage';
import type { AuthUser } from './lib/auth';

type AppState = 'login' | 'rooms' | 'room';

function App() {
  const [state, setState] = useState<AppState>('login');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setState('rooms');
    }
  }, []);

  const handleLogin = (loggedInUser: AuthUser) => {
    setUser(loggedInUser);
    setState('rooms');
  };

  const handleLogout = () => {
    authLogout();
    setUser(null);
    setState('login');
  };

  const handleJoinRoom = (roomId: string) => {
    setCurrentRoomId(roomId);
    setState('room');
  };

  const handleLeaveRoom = () => {
    setCurrentRoomId(null);
    setState('rooms');
  };

  if (state === 'login' || !user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (state === 'room' && currentRoomId) {
    return (
      <RoomPage
        roomId={currentRoomId}
        user={user}
        onLeave={handleLeaveRoom}
      />
    );
  }

  return (
    <RoomsListPage
      user={user}
      onLogout={handleLogout}
      onJoinRoom={handleJoinRoom}
    />
  );
}

export default App;
