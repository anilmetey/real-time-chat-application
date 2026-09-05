require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const cookie = require('cookie');
const { Op } = require('sequelize');

const { User, Message, Conversation, Room } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Serve static files from 'uploads'
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true
  },
});

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-do-not-use-in-prod';

// Configure Multer for File Uploads (Security Upgraded)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim ve video dosyalarına izin verilir.'));
    }
  }
});


// --- REST API ---

const authMiddleware = (req, res, next) => {
  const token = req.cookies.nexus_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

app.post('/api/upload', authMiddleware, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Dosya yüklenemedi.' });
    const fileUrl = `${BACKEND_URL}/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) return res.status(400).json({ error: 'Kullanıcı adı zaten alınmış.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const defaultAvatar = `https://ui-avatars.com/api/?name=${username}&background=random`;
    
    await User.create({ username, password: hashedPassword, avatarUrl: defaultAvatar, lastSeen: new Date() });
    res.status(201).json({ message: 'Kayıt başarılı!' });
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası oluştu.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Geçersiz kullanıcı adı veya şifre.' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    
    // Set HttpOnly Cookie
    res.cookie('nexus_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24h
    });
    
    await user.update({ lastSeen: new Date() });
    res.json({ success: true, username: user.username, avatarUrl: user.avatarUrl });
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası oluştu.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('nexus_token');
  res.json({ success: true });
});

app.get('/api/users/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);
    res.json({ id: user.id, username: user.username, avatarUrl: user.avatarUrl });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.put('/api/users/me', authMiddleware, async (req, res) => {
  try {
    const { avatarUrl } = req.body;
    await User.update({ avatarUrl }, { where: { id: req.user.userId } });
    res.json({ success: true, avatarUrl });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/users/me/username', authMiddleware, async (req, res) => {
  try {
    const { username } = req.body;
    const existing = await User.findOne({ where: { username } });
    if (existing) return res.status(400).json({ error: 'Kullanıcı adı zaten kullanımda.' });

    const user = await User.findByPk(req.user.userId);
    const oldUsername = user.username;
    
    await user.update({ username });
    
    // Update old messages so the new name shows up (Simple normalization fix)
    await Message.update({ senderName: username }, { where: { senderName: oldUsername } });
    
    // Generate new token
    const token = jwt.sign({ userId: user.id, username }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('nexus_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24h
    });

    res.json({ success: true, username });
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// Rooms API
app.get('/api/rooms', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.findAll();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Odalar getirilemedi.' });
  }
});

app.post('/api/rooms', authMiddleware, async (req, res) => {
  try {
    const { name, icon } = req.body;
    const roomName = name.toLowerCase().replace(/\s+/g, '-');
    const existing = await Room.findOne({ where: { name: roomName } });
    if (existing) return res.status(400).json({ error: 'Bu oda adı zaten var.' });
    
    const newRoom = await Room.create({
      name: roomName,
      icon: icon || '💬',
      creatorId: req.user.userId
    });
    res.status(201).json(newRoom);
  } catch (error) {
    res.status(500).json({ error: 'Oda oluşturulamadı.' });
  }
});

app.delete('/api/rooms/:id', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ error: 'Oda bulunamadı.' });
    if (room.creatorId !== req.user.userId) return res.status(403).json({ error: 'Bu odayı sadece kurucusu silebilir.' });
    
    await room.destroy();
    res.json({ success: true, message: 'Oda silindi.' });
  } catch (error) {
    res.status(500).json({ error: 'Oda silinemedi.' });
  }
});

app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.findAll({ attributes: ['id', 'username', 'avatarUrl', 'lastSeen'] });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası oluştu.' });
  }
});

app.get('/api/messages/:room', authMiddleware, async (req, res) => {
  try {
    const { room } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const lastMessageId = parseInt(req.query.lastMessageId);

    const whereClause = { room };
    if (lastMessageId && !isNaN(lastMessageId)) {
      whereClause.id = { [Op.lt]: lastMessageId };
    }

    const messages = await Message.findAll({
      where: whereClause,
      order: [['id', 'DESC']],
      limit
    });
    
    // Reverse to chronological order
    messages.reverse();

    const formattedMessages = messages.map(m => ({
      id: m.id,
      room: m.room,
      username: m.senderName,
      message: m.isDeleted ? '🚫 Bu mesaj silindi' : m.content,
      mediaUrl: m.isDeleted ? null : m.mediaUrl,
      time: m.time,
      readStatus: m.readStatus,
      replyToId: m.replyToId,
      reactions: JSON.parse(m.reactions || '{}'),
      isSystem: false,
      isEdited: m.isEdited,
      isDeleted: m.isDeleted
    }));

    res.json({ messages: formattedMessages, hasMore: formattedMessages.length === limit });
  } catch (error) {
    res.status(500).json({ error: 'Mesaj geçmişi alınamadı.' });
  }
});

app.get('/api/messages/search/global', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    
    const messages = await Message.findAll({
      where: {
        content: { [Op.like]: `%${q}%` },
        isDeleted: false
      },
      order: [['createdAt', 'DESC']],
      limit: 20
    });
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Arama başarısız.' });
  }
});


// --- Socket.io ---

io.use((socket, next) => {
  if (!socket.request.headers.cookie) return next(new Error("Authentication error: No cookie"));
  const cookies = cookie.parse(socket.request.headers.cookie);
  const token = cookies.nexus_token;
  
  if (!token) return next(new Error("Authentication error: Token missing"));
  
  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) return next(new Error("Authentication error: Invalid token"));
    
    const user = await User.findByPk(decoded.userId);
    socket.user = { id: user.id, username: user.username, avatarUrl: user.avatarUrl };
    next();
  });
});

const onlineUsers = new Map(); // userId -> { user: {}, count: 1 }

io.on('connection', async (socket) => {
  const userId = socket.user.id;
  
  if (onlineUsers.has(userId)) {
    onlineUsers.get(userId).count += 1;
  } else {
    onlineUsers.set(userId, { user: socket.user, count: 1 });
    await User.update({ lastSeen: new Date() }, { where: { id: userId } });
  }
  
  io.emit('online_users_update', Array.from(onlineUsers.values()).map(x => x.user));

  socket.on('join_room', ({ room }) => {
    socket.rooms.forEach(r => {
      if (r !== socket.id) socket.leave(r);
    });

    socket.join(room);
    socket.currentRoom = room;

    socket.to(room).emit('receive_message', {
      id: Date.now() + Math.random(),
      username: 'System',
      message: `${socket.user.username} katıldı.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true,
    });
  });

  socket.on('send_message', async (data) => {
    const room = socket.currentRoom;
    if (room) {
      try {
        const newMessage = await Message.create({
          room: room,
          content: data.message,
          senderName: socket.user.username,
          time: data.time,
          mediaUrl: data.mediaUrl || null,
          replyToId: data.replyToId || null,
          readStatus: 'sent'
        });
        
        const finalData = { 
          ...data, 
          id: newMessage.id,
          username: socket.user.username,
          reactions: {},
          readStatus: 'sent',
          senderAvatar: socket.user.avatarUrl,
          isEdited: false,
          isDeleted: false
        };

        io.in(room).emit('receive_message', finalData);
      } catch (err) {
        console.error("Error saving message:", err);
      }
    }
  });

  socket.on('edit_message', async ({ messageId, newContent, room }) => {
    try {
      const msg = await Message.findByPk(messageId);
      if (msg && msg.senderName === socket.user.username) {
        await msg.update({ content: newContent, isEdited: true });
        io.in(room).emit('update_message', {
          id: msg.id,
          message: newContent,
          isEdited: true
        });
      }
    } catch(err) { console.error(err); }
  });

  socket.on('delete_message', async ({ messageId, room }) => {
    try {
      const msg = await Message.findByPk(messageId);
      if (msg && msg.senderName === socket.user.username) {
        if (msg.mediaUrl) {
          const filename = msg.mediaUrl.split('/').pop();
          const filepath = path.join(__dirname, 'uploads', filename);
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
        }
        await msg.update({ isDeleted: true, content: '', mediaUrl: null });
        io.in(room).emit('update_message', {
          id: msg.id,
          message: '🚫 Bu mesaj silindi',
          mediaUrl: null,
          isDeleted: true
        });
      }
    } catch(err) { console.error(err); }
  });

  socket.on('mark_read', async ({ messageIds, room }) => {
    try {
      await Message.update({ readStatus: 'read' }, {
        where: { id: messageIds }
      });
      socket.to(room).emit('messages_read', { messageIds, reader: socket.user.username });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('add_reaction', async ({ messageId, emoji, room }) => {
    try {
      const msg = await Message.findByPk(messageId);
      if (msg && !msg.isDeleted) {
        let reactions = JSON.parse(msg.reactions || '{}');
        if (!reactions[emoji]) reactions[emoji] = [];
        if (!reactions[emoji].includes(socket.user.username)) {
          reactions[emoji].push(socket.user.username);
        } else {
          reactions[emoji] = reactions[emoji].filter(u => u !== socket.user.username);
          if (reactions[emoji].length === 0) delete reactions[emoji];
        }

        await msg.update({ reactions: JSON.stringify(reactions) });
        io.in(room).emit('update_message', {
          id: msg.id,
          reactions
        });
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('typing', (isTyping) => {
    if (socket.currentRoom) {
      socket.to(socket.currentRoom).emit('user_typing', {
        username: socket.user.username,
        isTyping,
      });
    }
  });

  socket.on('disconnect', async () => {
    const userId = socket.user.id;
    if (onlineUsers.has(userId)) {
      const u = onlineUsers.get(userId);
      u.count -= 1;
      if (u.count === 0) {
        onlineUsers.delete(userId);
        await User.update({ lastSeen: new Date() }, { where: { id: userId } });
      }
    }
    
    io.emit('online_users_update', Array.from(onlineUsers.values()).map(x => x.user));

    if (socket.currentRoom) {
      socket.to(socket.currentRoom).emit('receive_message', {
        id: Date.now() + Math.random(),
        username: 'System',
        message: `${socket.user.username} ayrıldı.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: true,
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Masterpiece Server running on port ${PORT}`);
});
