# 💬 NexusChat — Gerçek Zamanlı Sohbet Platformu

<div align="center">

![NexusChat Banner](https://img.shields.io/badge/NexusChat-v1.0-6366f1?style=for-the-badge&logo=chatbot&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Sequelize-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/Lisans-MIT-green?style=for-the-badge)

**Modern, güvenli ve gerçek zamanlı mesajlaşma uygulaması.**  
Oda bazlı grup sohbetleri, özel mesajlaşma (DM), medya paylaşımı ve daha fazlası.

</div>

---

## 📋 İçindekiler

- [Özellikler](#-özellikler)
- [Teknoloji Yığını](#-teknoloji-yığını)
- [Mimari Genel Bakış](#-mimari-genel-bakış)
- [Kurulum ve Çalıştırma](#-kurulum-ve-çalıştırma)
- [Ortam Değişkenleri](#-ortam-değişkenleri)
- [API Referansı](#-api-referansı)
- [Socket Olayları](#-socket-olayları)
- [Proje Yapısı](#-proje-yapısı)
- [Geliştirici](#-geliştirici)

---

## ✨ Özellikler

### 🔐 Kimlik Doğrulama & Güvenlik
- JWT tabanlı oturum yönetimi (HttpOnly Cookie)
- Bcrypt ile şifrelenmiş parola depolama
- Korumalı API uç noktaları (middleware auth)

### 💬 Mesajlaşma
- **Gerçek zamanlı** mesaj iletimi (Socket.IO WebSocket)
- **Oda bazlı** grup sohbetleri (Global, Oyun, Müzik vb.)
- **Özel Mesajlaşma (DM)** — kullanıcılar arası birebir sohbet
- Mesaj **düzenleme** ve **silme**
- Mesaja **emoji tepkisi** ekleme
- **Alıntı (Reply)** özelliği — belirli bir mesajı yanıtla
- **Okundu/Okunmadı** durumu takibi (`✓` / `✓✓`)

### 📁 Medya
- Görsel ve dosya yükleme (`multer` ile sunucu taraflı)
- Görseller için önizleme (inline), diğer dosyalar için indirme bağlantısı

### 👤 Profil
- Profil avatarı yükleme ve değiştirme
- Kullanıcı adı değiştirme (canlı güncelleme)

### 🔔 Bildirimler
- Okunmamış mesaj sayacı (oda bazlı)
- Sesli bildirim (yeni mesaj sesi)
- Anlık yazıyor göstergesi ("Kullanıcı yazıyor...")

### 🔍 Arama
- Tüm oda mesajlarında tam metin arama

### 🎨 Arayüz
- **Glassmorphism** tasarım dili — buzlu cam efektli, premium görünüm
- Yapay zeka ile üretilmiş fütüristik arka plan görseli
- Sol-sağ NexusChat yazı geçiş (shimmer) animasyonu
- Tamamen **duyarlı (responsive)** tasarım
- Karanlık mod (varsayılan)

---

## 🛠 Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| **Frontend Framework** | React 19 + Vite 8 |
| **Gerçek Zamanlı İletişim** | Socket.IO 4.x (Client & Server) |
| **Stil** | Vanilla CSS (Custom Properties, Glassmorphism) |
| **Backend Framework** | Express.js 5 |
| **Veritabanı ORM** | Sequelize 6 + SQLite3 |
| **Kimlik Doğrulama** | JSON Web Token (JWT) + Bcryptjs |
| **Dosya Yükleme** | Multer |
| **Emoji Seçici** | emoji-picker-react |
| **Kapsayıcılaştırma** | Docker + Docker Compose |

---

## 🏗 Mimari Genel Bakış

```
┌─────────────────────────────────────────────────────────┐
│                     TARAYICI (Client)                   │
│  React 19  ──►  Socket.IO Client  ──►  Vite Dev Server  │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP / WebSocket
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   SUNUCU (Server :3001)                 │
│                                                         │
│   Express REST API   ◄──────────►   Socket.IO Server   │
│         │                                  │           │
│         ▼                                  ▼           │
│   Sequelize ORM                    Oda Yönetimi        │
│         │                          (join/leave/msg)    │
│         ▼                                              │
│      SQLite DB  (database.sqlite)                      │
│      /uploads   (medya dosyaları)                      │
└─────────────────────────────────────────────────────────┘
```

### Veri Akışı — Mesaj Gönderme

```
Kullanıcı yazar → ChatArea.jsx → socket.emit('send_message')
  → Server: socket.on('send_message')
  → Message.create() [DB'ye kaydet]
  → io.in(room).emit('receive_message', { username, ... })
  → Tüm odadaki istemciler güncellenir
```

---

## 🚀 Kurulum ve Çalıştırma

### Ön Gereksinimler

- **Node.js** >= 18.x
- **npm** >= 9.x
- (Opsiyonel) **Docker** & **Docker Compose**

---

### 🐳 Docker ile Çalıştırma (Önerilen)

```bash
# Projeyi klonla
git clone https://github.com/kullanici/nexuschat.git
cd nexuschat

# Ayaklandır
docker-compose up --build
```

Uygulama `http://localhost:5173` adresinde çalışacaktır.

---

### 🖥 Manuel Kurulum

#### 1. Sunucuyu Başlat

```bash
cd server

# Bağımlılıkları yükle
npm install

# Ortam değişkenlerini oluştur
cp .env.example .env
# .env dosyasını düzenle (JWT_SECRET vb.)

# Geliştirme modunda başlat
node index.js
```

> Sunucu `http://localhost:3001` adresinde çalışacaktır.

#### 2. İstemciyi Başlat

```bash
cd client

# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev
```

> İstemci `http://localhost:5173` adresinde çalışacaktır.

---

## ⚙ Ortam Değişkenleri

`server/.env` dosyasını oluşturun:

```env
# server/.env
JWT_SECRET=cok_gizli_bir_anahtar_buraya
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

`server/.env.example` dosyası referans olarak projeye dahil edilmiştir.

---

## 📡 API Referansı

### Auth Uç Noktaları

| Yöntem | Uç Nokta | Açıklama |
|--------|----------|----------|
| `POST` | `/api/auth/register` | Yeni kullanıcı kaydı |
| `POST` | `/api/auth/login` | Oturum açma (JWT cookie set) |
| `POST` | `/api/auth/logout` | Oturumu kapat (cookie temizle) |
| `GET`  | `/api/users/me` | Mevcut kullanıcı bilgisi |

### Mesaj Uç Noktaları

| Yöntem | Uç Nokta | Açıklama |
|--------|----------|----------|
| `GET`  | `/api/messages/:room` | Oda mesaj geçmişi |
| `GET`  | `/api/messages/search?q=...` | Mesaj ara |

### Profil Uç Noktaları

| Yöntem | Uç Nokta | Açıklama |
|--------|----------|----------|
| `POST` | `/api/users/avatar` | Profil fotoğrafı yükle |
| `PATCH`| `/api/users/rename` | Kullanıcı adı değiştir |

### Medya

| Yöntem | Uç Nokta | Açıklama |
|--------|----------|----------|
| `POST` | `/api/upload` | Dosya yükle → URL döndür |

---

## 🔌 Socket Olayları

### İstemci → Sunucu

| Olay | Payload | Açıklama |
|------|---------|----------|
| `join_room` | `{ room, username }` | Odaya katıl |
| `send_message` | `{ room, message, time, replyToId? }` | Mesaj gönder |
| `typing` | `boolean` | Yazıyor göstergesi |
| `react_message` | `{ messageId, emoji, room }` | Emoji tepkisi |
| `edit_message` | `{ messageId, newContent, room }` | Mesaj düzenle |
| `delete_message` | `{ messageId, room }` | Mesaj sil |
| `mark_read` | `{ messageIds, room }` | Okundu işaretle |

### Sunucu → İstemci

| Olay | Payload | Açıklama |
|------|---------|----------|
| `receive_message` | `{ id, username, message, time, ... }` | Yeni mesaj |
| `user_joined` | `{ username }` | Kullanıcı odaya katıldı |
| `user_left` | `{ username }` | Kullanıcı odadan ayrıldı |
| `online_users` | `User[]` | Çevrimiçi kullanıcı listesi |
| `user_typing` | `{ username, isTyping }` | Yazıyor durumu |
| `update_message` | `{ id, message?, isDeleted? }` | Mesaj güncellendi |
| `messages_read` | `{ messageIds, reader }` | Okundu bilgisi |

---

## 📂 Proje Yapısı

```
nexuschat/
├── client/                      # React Ön Yüz (Vite)
│   ├── public/
│   │   ├── bg.png               # Dış arka plan görseli
│   │   ├── inner_bg.png         # İç cam panel arka planı
│   │   └── default-avatar.png   # Varsayılan kullanıcı avatarı
│   └── src/
│       ├── components/
│       │   ├── Login.jsx         # Giriş / Kayıt ekranı
│       │   ├── Dashboard.jsx     # Ana kontrol paneli (odalar, DM, kullanıcılar)
│       │   ├── ChatArea.jsx      # Sohbet odası ekranı
│       │   └── MessageBubble.jsx # Tekil mesaj bileşeni
│       ├── App.jsx               # Ana uygulama & Socket yönetimi
│       ├── index.css             # Global stiller & tasarım sistemi
│       └── main.jsx              # React giriş noktası
│
├── server/                       # Node.js / Express Arka Uç
│   ├── index.js                  # Ana sunucu, Express + Socket.IO
│   ├── database.js               # Sequelize modelleri (User, Message)
│   ├── uploads/                  # Yüklenen medya dosyaları
│   ├── .env.example              # Örnek ortam değişkenleri
│   ├── Dockerfile                # Sunucu Docker yapılandırması
│   └── package.json
│
├── docker-compose.yml            # Tam yığın Docker orkestrasyonu
└── README.md                     # Bu dosya
```

---

## 👨‍💻 Geliştirici

<div align="center">

**Anıl Mete**  
Full-Stack Developer

[![GitHub](https://img.shields.io/badge/GitHub-anilmete-181717?style=for-the-badge&logo=github)](https://github.com/anilmete)

</div>

---

<div align="center">

**NexusChat v1.0** — Tüm hakları saklıdır © 2025 Anıl Mete  
MIT Lisansı kapsamında dağıtılmaktadır.

</div>
