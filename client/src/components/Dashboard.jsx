import { useRef, useState, useEffect } from 'react';

function Dashboard({ currentUser, onlineUsers, unreadCounts, onLogout, onJoinRoom, onStartDM, onUpdateAvatar }) {
  const avatarInputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    onUpdateAvatar(file);
  };

  const handleSearch = async (e) => {
    setSearchQuery(e.target.value);
    if (e.target.value.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`http://localhost:3001/api/messages/search/global?q=${e.target.value}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch(err) {}
    setIsSearching(false);
  };

  const [globalRooms, setGlobalRooms] = useState([]);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomIcon, setNewRoomIcon] = useState('💬');

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/rooms', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setGlobalRooms(data);
      }
    } catch(err) { console.error(err); }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if(!newRoomName.trim()) return;
    try {
      const res = await fetch('http://localhost:3001/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoomName.trim(), icon: newRoomIcon }),
        credentials: 'include'
      });
      if (res.ok) {
        setNewRoomName('');
        setShowRoomModal(false);
        fetchRooms();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch(err) { console.error(err); }
  };

  const handleDeleteRoom = async (e, roomId) => {
    e.stopPropagation();
    if(!window.confirm('Bu odayı silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`http://localhost:3001/api/rooms/${roomId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        fetchRooms();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch(err) { console.error(err); }
  };

  const handleRename = async () => {
    const newName = window.prompt("Yeni kullanıcı adınızı girin:", currentUser?.username);
    if (!newName || newName === currentUser?.username) return;
    
    try {
      const res = await fetch('http://localhost:3001/api/users/me/username', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newName.trim() }),
        credentials: 'include'
      });
      if (res.ok) {
        alert("Kullanıcı adınız başarıyla güncellendi! Lütfen değişikliklerin tamamen yansıması için yeniden giriş yapın.");
        onLogout();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch(err) { console.error(err); }
  };

  return (
    <div className="dashboard-layout">
        
        <div className="search-container">
          <input 
            type="text" 
            placeholder="Kullanıcı, oda veya geçmiş mesajlarda ara..." 
            value={searchQuery}
            aria-label="Arama Çubuğu"
            onChange={handleSearch}
            className="search-input"
          />
          {searchResults.length > 0 && (
            <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-glass)', padding: '15px', borderRadius: '16px', marginTop: '10px', maxHeight: '250px', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              {searchResults.map(msg => (
                <div key={msg.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '10px 0', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <small style={{ color: 'var(--accent-color)', fontWeight: '600' }}>{msg.senderName}</small>
                    <small style={{ color: 'var(--text-secondary)' }}>#{msg.room}</small>
                  </div>
                  <p style={{ margin: '0', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-grid">
          
          <section className="dashboard-section" role="region" aria-label="Açık Sohbet Odaları">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                Global Keşif
              </h3>
              <button onClick={() => setShowRoomModal(true)} style={{ background: 'var(--accent-color)', padding: '6px 12px', fontSize: '0.9rem', borderRadius: '8px' }}>+ Yeni Oda</button>
            </div>
            
            {showRoomModal && (
              <div className="settings-modal" style={{ zIndex: 10000 }}>
                <form className="settings-content" onSubmit={handleCreateRoom} style={{ minWidth: '300px' }}>
                  <h3 style={{ margin: 0 }}>Oda Oluştur</h3>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" value={newRoomIcon} onChange={e => setNewRoomIcon(e.target.value)} maxLength={2} style={{ width: '60px', textAlign: 'center' }} title="Oda İkonu (Emoji)" />
                    <input type="text" placeholder="Oda Adı" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} style={{ flex: 1 }} autoFocus />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button type="button" onClick={() => setShowRoomModal(false)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-glass)' }}>İptal</button>
                    <button type="submit" style={{ flex: 1 }}>Oluştur</button>
                  </div>
                </form>
              </div>
            )}

            <div className="scrollable-list">
              {globalRooms.map(room => (
                <div key={room.id} className="glass-card" onClick={() => onJoinRoom(room.name)} role="button" tabIndex={0} aria-label={`${room.name} odasına katıl`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-gradient)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.5rem' }}>
                      {room.icon || '💬'}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{room.name.charAt(0).toUpperCase() + room.name.slice(1)} Odası</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Herkese açık sohbet</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {unreadCounts[room.name] > 0 && (
                      <div className="unread-badge" style={{ padding: '4px 10px', fontSize: '0.85rem' }} aria-label={`${unreadCounts[room.name]} okunmamış mesaj`}>{unreadCounts[room.name]}</div>
                    )}
                    {room.creatorId === currentUser?.id ? (
                      <button aria-label="Odayı Sil" onClick={(e) => handleDeleteRoom(e, room.id)} style={{ background: 'transparent', padding: '5px', boxShadow: 'none' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-section" role="region" aria-label="Çevrimiçi Kullanıcılar">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)' }}></span>
              Ağdaki Kişiler
            </h3>
            <div className="scrollable-list">
              {onlineUsers.filter(u => u).map(user => {
                const isMe = user.id === currentUser.id;
                const dmRoom = [currentUser.id, user.id].sort().join('-');
                return (
                  <div key={user.id} className="glass-card" onClick={() => !isMe && onStartDM(user)} role={isMe ? "presentation" : "button"} tabIndex={isMe ? -1 : 0} aria-label={isMe ? "Sizin Profiliniz" : `${user.username} ile özel mesaj başlat`} style={{ cursor: isMe ? 'default' : 'pointer', opacity: isMe ? 0.8 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
                        <img
                          src={user.avatarUrl || '/default-avatar.png'}
                          alt={user.username}
                          style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(59,130,246,0.5)', display: 'block' }}
                        />
                        <span style={{ position: 'absolute', bottom: '1px', right: '1px', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--success)', border: '2px solid var(--bg-dark)', boxShadow: '0 0 6px var(--success)' }}></span>
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1rem', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {user.username}
                          {isMe && <span style={{ fontSize: '0.7rem', background: 'var(--accent-color)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Sen</span>}
                        </h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }}></span>
                          {isMe ? 'Çevrimiçi' : 'Çevrimiçi · DM Gönder'}
                        </p>
                      </div>
                    </div>
                    {!isMe && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {unreadCounts[dmRoom] > 0 && (
                          <div className="unread-badge" style={{ padding: '4px 10px', fontSize: '0.85rem' }} aria-label={`${unreadCounts[dmRoom]} okunmamış mesaj`}>{unreadCounts[dmRoom]}</div>
                        )}
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                      </div>
                    )}
                  </div>
                );
              })}
              {onlineUsers.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.5, marginBottom: '15px' }}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <line x1="23" y1="11" x2="17" y2="11"></line>
                  </svg>
                  <p>Şu an ağda kimse yok...</p>
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
  );
}

export default Dashboard;
