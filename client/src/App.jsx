import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { io } from 'socket.io-client';
import './index.css';

const Login = lazy(() => import('./components/Login'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const ChatArea = lazy(() => import('./components/ChatArea'));

let socket;
const audioObj = new Audio('/notification.ogg');

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authState, setAuthState] = useState('dashboard'); // 'dashboard', 'chat'
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  const [room, setRoom] = useState('');
  const [roomName, setRoomName] = useState('');
  
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  
  const [unreadCounts, setUnreadCounts] = useState(() => {
    const saved = localStorage.getItem('nexus_unread');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('nexus_unread', JSON.stringify(unreadCounts));
  }, [unreadCounts]);

  useEffect(() => {
    // PERMANENT scroll lock — Safari/Chrome sometimes scrolls the fixed container when
    // an input gets focused. This listener resets it to 0 instantly, every time.
    const container = document.querySelector('.glass-container');
    if (!container) return;
    const lockScroll = () => { container.scrollTop = 0; };
    lockScroll();
    container.addEventListener('scroll', lockScroll, { passive: true });
    return () => container.removeEventListener('scroll', lockScroll);
  }, [isAuthenticated]);

  useEffect(() => {
    // Initial check for auth via /users/me
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/users/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
        setIsAuthenticated(true);
        connectSocket();
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      console.log('Not authenticated');
      setIsAuthenticated(false);
    } finally {
      setIsAuthChecking(false);
    }
  };

  const connectSocket = () => {
    socket = io('http://localhost:3001', { withCredentials: true });

    socket.on('connect_error', (err) => {
      console.error(err.message);
      handleLogout();
    });

    socket.on('online_users_update', (users) => {
      setOnlineUsers(users);
    });

    socket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);
      
      // If we are NOT in the room where the message was sent, increment unread count
      if (!data.isSystem && data.username !== currentUser?.username) {
        setRoom((currentActiveRoom) => {
          if (currentActiveRoom !== data.room) {
            setUnreadCounts(prev => ({ ...prev, [data.room]: (prev[data.room] || 0) + 1 }));
            // Play Sound
            audioObj.play().catch(e => console.log('Audio play failed:', e));
          } else {
            // We are in the room, mark as read
            socket.emit('mark_read', { messageIds: [data.id], room: data.room });
          }
          return currentActiveRoom; // Important: return state untouched
        });
      }
    });

    socket.on('messages_read', ({ messageIds, reader }) => {
      setMessages(prev => prev.map(m => 
        messageIds.includes(m.id) ? { ...m, readStatus: 'read' } : m
      ));
    });

    socket.on('update_message', (data) => {
      setMessages(prev => prev.map(m => m.id === data.id ? { ...m, ...data } : m));
    });

    socket.on('user_typing', ({ username, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          if (!prev.includes(username)) return [...prev, username];
          return prev;
        } else {
          return prev.filter((u) => u !== username);
        }
      });
    });
  };

  const handleLogout = async () => {
    await fetch('http://localhost:3001/api/auth/logout', { method: 'POST', credentials: 'include' });
    setIsAuthenticated(false);
    setCurrentUser(null);
    setAuthState('dashboard');
    if (socket) socket.disconnect();
  };

  const fetchHistory = async (targetRoom, isInitial = true) => {
    setIsFetchingHistory(true);
    let url = `http://localhost:3001/api/messages/${targetRoom}?limit=50`;
    
    if (!isInitial && messages.length > 0) {
      const firstRealMsg = messages.find(m => !m.isSystem && m.id);
      if (firstRealMsg) {
        url += `&lastMessageId=${firstRealMsg.id}`;
      }
    }

    const res = await fetch(url, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (isInitial) {
        setMessages(data.messages);
      } else {
        setMessages(prev => [...data.messages, ...prev]);
      }
      setHasMore(data.hasMore);
      
      if (isInitial) {
        // Clear unread counts for this room
        setUnreadCounts(prev => ({ ...prev, [targetRoom]: 0 }));
        
        // Mark unread as read
        const unreadIds = data.messages.filter(m => m.username !== currentUser?.username && m.readStatus !== 'read' && !m.isSystem).map(m => m.id);
        if (unreadIds.length > 0 && socket) {
          socket.emit('mark_read', { messageIds: unreadIds, room: targetRoom });
        }
      }
    }
    setIsFetchingHistory(false);
  };

  const joinGlobalRoom = (rName) => {
    const targetRoom = `room_${rName}`;
    setRoom(targetRoom);
    setRoomName(`#${rName}`);
    fetchHistory(targetRoom, 1);
    if (socket) socket.emit('join_room', { room: targetRoom });
    setAuthState('chat');
  };

  const startDM = (otherUser) => {
    if (otherUser.username === currentUser.username) return;
    const participants = [currentUser.id, otherUser.id].sort().join('_');
    const targetRoom = `dm_${participants}`;
    setRoom(targetRoom);
    setRoomName(`@${otherUser.username}`);
    fetchHistory(targetRoom, 1);
    if (socket) socket.emit('join_room', { room: targetRoom });
    setAuthState('chat');
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('http://localhost:3001/api/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      return data.url;
    }
    return null;
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = await uploadFile(file);
    if (url) {
      await fetch('http://localhost:3001/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: url }),
        credentials: 'include'
      });
      setCurrentUser({ ...currentUser, avatarUrl: url });
    }
  };

  const avatarInputRef = useRef(null);

  const handleRename = async () => {
    const newName = prompt('Yeni adınızı girin:', currentUser?.username);
    if (!newName || newName.trim() === '' || newName === currentUser?.username) return;
    try {
      const res = await fetch('http://localhost:3001/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newName.trim() }),
        credentials: 'include'
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch(err) { console.error(err); }
  };

  // Chat Actions
  const handleSendMessage = (text, replyToId) => {
    if (socket) {
      socket.emit('send_message', {
        room,
        message: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        replyToId
      });
    }
  };

  const handleSendFile = async (file, replyToId) => {
    const url = await uploadFile(file);
    if (url && socket) {
      socket.emit('send_message', {
        room,
        message: '',
        mediaUrl: url,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        replyToId
      });
    }
  };

  const handleTyping = (isTyping) => {
    if (socket) socket.emit('typing', isTyping);
  };

  const handleReact = (messageId, emoji) => {
    if (socket) socket.emit('add_reaction', { messageId, emoji, room });
  };

  const handleEdit = (messageId, newContent) => {
    if (socket) socket.emit('edit_message', { messageId, newContent, room });
  };

  const handleDelete = (messageId) => {
    if (socket) socket.emit('delete_message', { messageId, room });
  };

  if (isAuthChecking) {
    return (
      <div className="glass-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--accent-color)', fontSize: '1.2rem', fontWeight: '600' }}>
          Bağlantı Kuruluyor...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <div className="full-screen-login-wrapper">
          <Suspense fallback={<div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>Giriş Ekranı Yükleniyor...</div>}>
            <Login onLoginSuccess={checkAuth} />
          </Suspense>
        </div>
        
        <div className="marquee-container">
          <div className="marquee-text">
            <span className="pro-footer-text">DEVELOPED BY ANIL METE</span>
            <span className="pro-footer-separator">•</span>
            <span className="pro-footer-text">NEXUSCHAT V1.0</span>
            <span className="pro-footer-separator">•</span>
            <span className="pro-footer-text">SECURE REAL-TIME MESSAGING</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="glass-container">
        {isAuthenticated && (
          <header className="dashboard-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div 
                style={{ position: 'relative', cursor: 'pointer', width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--accent-color)' }} 
                onClick={() => avatarInputRef.current?.click()} 
                title="Fotoğrafı Değiştir"
                className="avatar-container-hover"
              >
                <img src={currentUser?.avatarUrl || '/default-avatar.png'} alt="Me" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <input type="file" ref={avatarInputRef} aria-label="Profil Fotoğrafı Seç" style={{ display: 'none' }} onChange={handleAvatarChange} accept="image/*"/>
                <div className="avatar-edit-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: 0, transition: '0.2s', color: 'white' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </div>
              </div>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  {currentUser?.username}
                  <button aria-label="Adı Değiştir" onClick={handleRename} style={{ background: 'transparent', padding: 0, boxShadow: 'none', cursor: 'pointer' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0 0 0' }}>
                  <span className="online-indicator" style={{ position: 'static' }}></span>
                  Bağlantı Güvenli
                </p>
              </div>
            </div>
            <button className="leave-btn" aria-label="Hesaptan Çıkış Yap" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              Çıkış Yap
            </button>
          </header>
        )}

        <div className="content-wrapper">
          {authState === 'dashboard' ? (
            <Suspense fallback={<div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>Kontrol Paneli Yükleniyor...</div>}>
              <Dashboard 
                currentUser={currentUser}
                onlineUsers={onlineUsers}
                unreadCounts={unreadCounts}
                onLogout={handleLogout}
                onJoinRoom={joinGlobalRoom}
                onStartDM={startDM}
                onUpdateAvatar={handleAvatarChange}
              />
            </Suspense>
          ) : (
            <Suspense fallback={<div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>Sohbet Odası Yükleniyor...</div>}>
              <ChatArea 
                roomName={roomName}
                messages={messages}
                currentUser={currentUser}
                typingUsers={typingUsers}
                onSendMessage={handleSendMessage}
                onSendFile={handleSendFile}
                onTyping={handleTyping}
                onReact={handleReact}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onGoBack={() => {
                  setAuthState('dashboard');
                  if (socket) socket.emit('join_room', { room: 'lobby' });
                }}
                fetchMoreHistory={() => fetchHistory(room, false)}
                hasMore={hasMore}
                isFetching={isFetchingHistory}
              />
            </Suspense>
          )}
        </div>
      </div>
      
      <div className="marquee-container">
        <div className="marquee-text">
          <span className="pro-footer-text">DEVELOPED BY ANIL METE</span>
          <span className="pro-footer-separator">•</span>
          <span className="pro-footer-text">NEXUSCHAT V1.0</span>
          <span className="pro-footer-separator">•</span>
          <span className="pro-footer-text">SECURE REAL-TIME MESSAGING</span>
        </div>
      </div>
    </>
  );
}

export default App;
