import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import MessageBubble from './MessageBubble';

function ChatArea({ 
  roomName, messages, currentUser, typingUsers, 
  onSendMessage, onSendFile, onTyping, onReact, onEdit, onDelete,
  onGoBack, fetchMoreHistory, hasMore, isFetching 
}) {
  const [currentMessage, setCurrentMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const [previousScrollHeight, setPreviousScrollHeight] = useState(null);

  useEffect(() => {
    // Only auto-scroll if we are near the bottom
    const container = messagesContainerRef.current;
    if (container && previousScrollHeight === null) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNearBottom) {
        scrollToBottom();
      }
    } else if (previousScrollHeight === null) {
      scrollToBottom();
    }
  }, [messages, typingUsers, previousScrollHeight]);

  useLayoutEffect(() => {
    if (previousScrollHeight !== null && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight - previousScrollHeight;
      setPreviousScrollHeight(null);
    }
  }, [messages, previousScrollHeight]);

  const handleScroll = (e) => {
    if (e.target.scrollTop === 0 && hasMore && !isFetching) {
      setPreviousScrollHeight(messagesContainerRef.current.scrollHeight);
      fetchMoreHistory();
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (currentMessage.trim() !== '') {
      onSendMessage(currentMessage, replyingTo ? replyingTo.id : null);
      setCurrentMessage('');
      setReplyingTo(null);
      setShowEmojiPicker(false);
      onTyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleTyping = (e) => {
    setCurrentMessage(e.target.value);
    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  const onEmojiClick = (emojiObj) => {
    setCurrentMessage(prev => prev + emojiObj.emoji);
  };

  const handleFileSend = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    onSendFile(file, replyingTo ? replyingTo.id : null);
    setReplyingTo(null);
    setTimeout(scrollToBottom, 500);
  };

  return (
    <div className="chat-layout">
      <div className="chat-area">
        <div className="chat-header">
          <div className="chat-header-info" style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%' }}>
            <button className="back-btn" aria-label="Geri Dön" onClick={onGoBack}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
              <span>Panoya Dön</span>
            </button>
            <div style={{ flex: 1 }}>
              <h2 aria-live="polite">{roomName}</h2>
              <p>Bağlantı Güvenli & Uçtan Uca Kalıcı</p>
            </div>
          </div>
        </div>

        <div className="messages-container" onScroll={handleScroll} ref={messagesContainerRef} role="log" aria-live="polite">
          {isFetching && <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Yükleniyor...</div>}
          
          {(messages || []).map((msg) => {
            if (!msg) return null;
            // Map replyMsg
            const replyToMsg = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : null;
            const fullMsg = { ...msg, replyToMsg };

            return (
              <MessageBubble 
                key={msg.id || Math.random()} 
                msg={fullMsg} 
                isMe={msg.username === currentUser?.username}
                onReply={setReplyingTo}
                onReact={onReact}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="typing-indicator">
          {typingUsers.length > 0 && <span className="typing-dots">{typingUsers.join(', ')} yazıyor</span>}
        </div>

        {replyingTo && (
          <div className="replying-to-banner" role="alert">
            <span>Yanıtlınıyor: {replyingTo.username}</span>
            <button aria-label="Yanıtlamayı İptal Et" onClick={() => setReplyingTo(null)}>X</button>
          </div>
        )}

        <div className="input-area-wrapper">
          {showEmojiPicker && (
            <div className="emoji-picker-container" role="dialog" aria-label="Emoji Seçici">
              <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" />
            </div>
          )}
          
          <form className="input-area" onSubmit={sendMessage} aria-label="Mesaj Gönderme Formu">
            <button type="button" className="icon-btn" aria-label="Emoji Menüsünü Aç" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😀</button>
            
            <input type="file" ref={fileInputRef} aria-label="Dosya Yükle" style={{ display: 'none' }} onChange={handleFileSend} accept="image/*,video/*" />
            <button type="button" className="icon-btn" aria-label="Dosya Ekle" onClick={() => fileInputRef.current.click()}>📎</button>

            <input
              type="text"
              placeholder="Bir mesaj yazın..."
              aria-label="Mesajınızı Yazın"
              value={currentMessage}
              onChange={handleTyping}
            />
            <button type="submit" className="send-btn" aria-label="Mesajı Gönder">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ChatArea;
