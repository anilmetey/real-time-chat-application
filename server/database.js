const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// SQLite connection
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false, // disable logging
});

// User Model
const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  avatarUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastSeen: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

// Conversation Model (For DMs or Group Rooms)
const Conversation = sequelize.define('Conversation', {
  name: {
    type: DataTypes.STRING,
    allowNull: true, // Null if it's a DM between 2 users
  },
  isGroup: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  participants: {
    type: DataTypes.STRING, // Store as JSON array of user IDs
    allowNull: false
  }
});

// Room Model (For Custom Global Rooms)
const Room = sequelize.define('Room', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  icon: {
    type: DataTypes.STRING,
    defaultValue: '💬'
  },
  creatorId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});

// Message Model
const Message = sequelize.define('Message', {
  room: {
    type: DataTypes.STRING, // Keeps compatibility with our current room system
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true, // Can be null if it's only a file/media
  },
  senderName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  time: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mediaUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  readStatus: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'sent'
  },
  replyToId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  reactions: {
    type: DataTypes.STRING, // Stored as JSON string e.g., {"👍": ["anilmete"]}
    allowNull: true,
    defaultValue: '{}'
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isEdited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

// Sync Database (Using alter: true to update existing tables without dropping)
sequelize.sync({ alter: true })
  .then(async () => {
    console.log('Database synced with new schema');
    // Ensure default rooms exist
    const defaultRooms = [
      { name: 'lobby', icon: '🌍', creatorId: 1 },
      { name: 'yazilim', icon: '💻', creatorId: 1 },
      { name: 'oyun', icon: '🎮', creatorId: 1 },
      { name: 'muzik', icon: '🎵', creatorId: 1 }
    ];
    for (const dr of defaultRooms) {
      await Room.findOrCreate({ where: { name: dr.name }, defaults: dr });
    }
  })
  .catch((err) => console.error('Error syncing database:', err));

module.exports = { sequelize, User, Conversation, Message, Room };
