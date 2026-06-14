import { useState } from 'react';

function MessageBubble({ msg, isMe, onReply, onReact, onEdit, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.message);

  const msgClass = msg.isSystem ? 'system' : (isMe ? 'sent' : 'received');
  let readIcon = '✓'; 
  if (msg.readStatus === 'read') readIcon = '✓✓';

  if (msg.isSystem) {
    return (
      <div className={`message-wrapper system`}>
        <div className="message-bubble">{msg.message}</div>
      </div>
    );
  }

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (editContent.trim() !== '' && editContent !== msg.message) {
      onEdit(msg.id, editContent);
    }
    setIsEditing(false);
  };

  return (
    <div className={`message-wrapper ${msgClass}`}>
      <div className="message-info">
        {!isMe && <img src={msg.senderAvatar || 'https://ui-avatars.com/api/?name='+(msg.username || 'User')} className="small-avatar" alt="av"/>}
        <span>{isMe ? 'Sen' : msg.username}</span>
        <span>•</span>
        <span>{msg.time}</span>
      </div>
      
      <div className="message-bubble-wrapper">
        {msg.replyToMsg && (
          <div className="reply-context">
            <small>{msg.replyToMsg.username}: {msg.replyToMsg.message || 'Medya'}</small>
          </div>
        )}
        <div className="message-bubble" style={{ opacity: msg.isDeleted ? 0.6 : 1 }}>
          {msg.mediaUrl && (
            <div className="media-preview" onClick={() => window.open(msg.mediaUrl, '_blank')}>
              {typeof msg.mediaUrl === 'string' && msg.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null ? (
                <img src={msg.mediaUrl} alt="media" style={{ cursor: 'zoom-in' }} />
              ) : (
                <a href={msg.mediaUrl} target="_blank" rel="noreferrer">📎 Dosyayı İndir</a>
              )}
            </div>
          )}
          
          {isEditing ? (
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
              <input type="text" value={editContent} onChange={(e) => setEditContent(e.target.value)} autoFocus className="edit-input" />
              <button type="submit" className="icon-btn" style={{ padding: '0 5px', fontSize: '1rem' }}>✅</button>
              <button type="button" className="icon-btn" style={{ padding: '0 5px', fontSize: '1rem' }} onClick={() => setIsEditing(false)}>❌</button>
            </form>
          ) : (
            <>
              <span style={{ fontStyle: msg.isDeleted ? 'italic' : 'normal' }}>{msg.message}</span>
              {msg.isEdited && <small style={{ opacity: 0.5, marginLeft: '8px', fontSize: '0.7rem' }}>(düzenlendi)</small>}
            </>
          )}
        </div>

        {!msg.isDeleted && !isEditing && (
          <div className="message-actions">
            <span className="action-icon" onClick={() => onReply(msg)}>↩️</span>
            <span className="action-icon" onClick={() => onReact(msg.id, '❤️')}>❤️</span>
            <span className="action-icon" onClick={() => onReact(msg.id, '👍')}>👍</span>
            <span className="action-icon" onClick={() => onReact(msg.id, '😂')}>😂</span>
            {isMe && (
              <>
                <span className="action-icon" onClick={() => setIsEditing(true)}>✏️</span>
                <span className="action-icon" onClick={() => onDelete(msg.id)}>🗑️</span>
              </>
            )}
          </div>
        )}
      </div>
      
      {msg.reactions && Object.keys(msg.reactions).length > 0 && !msg.isDeleted && (
        <div className="reaction-bar">
          {Object.entries(msg.reactions).map(([emoji, users]) => (
            <span key={emoji} title={(users || []).join(', ')} onClick={() => onReact(msg.id, emoji)}>{emoji} {(users || []).length}</span>
          ))}
        </div>
      )}

      {isMe && (
        <div className="read-status" style={{ color: msg.readStatus === 'read' ? '#3b82f6' : '#94a3b8' }}>
          {readIcon}
        </div>
      )}
    </div>
  );
}

export default MessageBubble;
