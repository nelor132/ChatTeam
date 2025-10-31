import { useState, useEffect, useRef } from 'react';
import { ref, push, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  TextField, Button, Box, List, ListItem, Paper, Typography, 
  IconButton, Badge, Chip, CircularProgress, Alert, Container,
  Avatar, ListItemAvatar, ListItemText, Modal, Fade, Backdrop
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageIcon from '@mui/icons-material/Image';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import VideoFileIcon from '@mui/icons-material/Videocam';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PeopleIcon from '@mui/icons-material/People';
import CloseIcon from '@mui/icons-material/Close';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import { db, storage } from './firebase';

const notificationSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');

const getFileType = (fileType) => {
  if (fileType.startsWith('image/')) return 'image';
  if (fileType.startsWith('audio/')) return 'audio';
  if (fileType.startsWith('video/')) return 'video';
  return 'file';
};

const getFileIcon = (fileType) => {
  switch (fileType) {
    case 'image': return <ImageIcon />;
    case 'audio': return <AudioFileIcon />;
    case 'video': return <VideoFileIcon />;
    default: return <InsertDriveFileIcon />;
  }
};

// Функция для генерации цвета аватара
const stringToColor = (string) => {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};

// Функция для аватара
const stringAvatar = (name) => {
  return {
    sx: {
      bgcolor: stringToColor(name),
      width: 32,
      height: 32,
      fontSize: '0.8rem'
    },
    children: `${name.split(' ')[0][0]}${name.split(' ')[1] ? name.split(' ')[1][0] : ''}`,
  };
};

export const Chat = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isNameSet) return;

    const messagesRef = ref(db, 'messages');
    const unsubscribeMessages = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messagesArray = Object.entries(data).map(([key, msg]) => ({
          ...msg,
          isMe: msg.sender === username,
          id: key
        }));
        setMessages(messagesArray);

        if (messagesArray.length > 0 && messagesArray[messagesArray.length - 1].sender !== username && notificationsEnabled) {
          notificationSound.play();
          if (Notification.permission === 'granted') {
            new Notification(`Новое сообщение от ${messagesArray[messagesArray.length - 1].sender}`, {
              body: messagesArray[messagesArray.length - 1].text || 'Файл'
            });
          }
        }
      }
    });

    const typingRef = ref(db, 'typing');
    const unsubscribeTyping = onValue(typingRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersTyping = Object.keys(data).filter(user => data[user] && user !== username);
        setTypingUsers(usersTyping);
      }
    });

    // Online users tracking
    const onlineUsersRef = ref(db, 'onlineUsers');
    const userRef = ref(db, `onlineUsers/${username}`);
    
    // Set user as online
    set(userRef, {
      username: username,
      lastSeen: serverTimestamp(),
      joinedAt: serverTimestamp()
    });

    // Remove user when they disconnect
    onDisconnect(userRef).remove();

    // Listen for online users
    const unsubscribeOnlineUsers = onValue(onlineUsersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const users = Object.values(data).map(user => user.username);
        setOnlineUsers(users);
      } else {
        setOnlineUsers([]);
      }
    });

    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
      unsubscribeOnlineUsers();
      // Remove user when component unmounts
      set(userRef, null);
    };
  }, [username, notificationsEnabled, isNameSet]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isNameSet) {
      localStorage.setItem('chatUsername', username);
    }
  }, [username, isNameSet]);

  const handleTyping = () => {
    set(ref(db, 'typing/' + username), true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => set(ref(db, 'typing/' + username), false), 3000);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Файл слишком большой. Максимум 10MB');
      return;
    }
    setSelectedFile(file);
    setError('');
    event.target.value = '';
  };

  // Функция для открытия изображения в модальном окне
  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  };

  // Функция для закрытия модального окна
  const closeImageModal = () => {
    setImageModalOpen(false);
    setSelectedImage('');
  };

  // Используем только base64 для избежания CORS ошибок
  const uploadFileAsBase64 = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          url: e.target.result,
          name: file.name,
          type: getFileType(file.type),
          size: file.size,
          isBase64: true
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSend = async () => {
    if (!message.trim() && !selectedFile) return;
    
    setUploading(true);
    let fileData = null;
    
    if (selectedFile) {
      fileData = await uploadFileAsBase64(selectedFile);
    }

    push(ref(db, 'messages'), {
      text: message,
      sender: username,
      time: new Date().toLocaleTimeString(),
      file: fileData,
      timestamp: Date.now()
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      set(ref(db, 'typing/' + username), false);
    }

    setMessage('');
    setSelectedFile(null);
    setUploading(false);
  };

  const handleSetName = () => { 
    if (username.trim()) setIsNameSet(true); 
  };

  const toggleNotifications = () => {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then(p => setNotificationsEnabled(p === 'granted'));
    } else {
      setNotificationsEnabled(!notificationsEnabled);
    }
  };

  const removeSelectedFile = () => setSelectedFile(null);

  const renderFilePreview = (file) => {
    const type = getFileType(file.type);
    if (type === 'image') return (
      <Box sx={{ mt: 1, textAlign: 'center' }}>
        <img 
          src={URL.createObjectURL(file)} 
          alt="" 
          style={{ 
            maxWidth: '100%', 
            maxHeight: 200, 
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            cursor: 'pointer'
          }}
          onClick={() => openImageModal(URL.createObjectURL(file))}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 1 }}>
          <Typography variant="caption">
            {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </Typography>
          <IconButton size="small" onClick={() => openImageModal(URL.createObjectURL(file))}>
            <ZoomInIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    );
    return (
      <Chip 
        icon={getFileIcon(type)} 
        label={`${file.name} (${(file.size / 1024).toFixed(1)} KB)`} 
        onDelete={removeSelectedFile} 
        variant="outlined" 
        sx={{ mt: 1 }}
      />
    );
  };

  const renderMessageContent = (msg) => {
    if (!msg.file) return <Typography sx={{ wordBreak: 'break-word' }}>{msg.text}</Typography>;
    
    switch (msg.file.type) {
      case 'image':
        return (
          <Box>
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
              <img 
                src={msg.file.url} 
                alt={msg.file.name} 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: 300, 
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  cursor: 'pointer'
                }} 
                onClick={() => openImageModal(msg.file.url)}
              />
              <IconButton 
                size="small"
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.7)',
                  }
                }}
                onClick={() => openImageModal(msg.file.url)}
              >
                <ZoomInIcon fontSize="small" />
              </IconButton>
            </Box>
            <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
              {msg.file.name}
            </Typography>
          </Box>
        );
      case 'audio': 
        return (
          <Box>
            <audio controls src={msg.file.url} style={{ width: '100%', maxWidth: 300 }} />
            <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
              {msg.file.name}
            </Typography>
          </Box>
        );
      case 'video': 
        return (
          <Box>
            <video 
              controls 
              src={msg.file.url} 
              style={{ 
                maxWidth: '100%', 
                maxHeight: 300,
                borderRadius: 8
              }}
            />
            <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
              {msg.file.name}
            </Typography>
          </Box>
        );
      default: 
        return (
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => window.open(msg.file.url, '_blank')}
            startIcon={getFileIcon('file')}
          >
            Скачать {msg.file.name}
          </Button>
        );
    }
  };

  // Модальное окно для просмотра изображения
  const ImageModal = () => (
    <Modal
      open={imageModalOpen}
      onClose={closeImageModal}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 500,
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <Fade in={imageModalOpen}>
        <Box sx={{
          position: 'relative',
          outline: 'none',
          maxWidth: '90vw',
          maxHeight: '90vh'
        }}>
          <IconButton
            onClick={closeImageModal}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(0,0,0,0.5)',
              color: 'white',
              zIndex: 1,
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.7)',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
          <img
            src={selectedImage}
            alt="Увеличенное изображение"
            style={{
              maxWidth: '100%',
              maxHeight: '90vh',
              borderRadius: 8,
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}
          />
        </Box>
      </Fade>
    </Modal>
  );

  if (!isNameSet) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2
        }}
      >
        <Paper 
          elevation={8} 
          sx={{ 
            padding: 4, 
            maxWidth: 400, 
            width: '100%',
            textAlign: 'center',
            borderRadius: 3
          }}
        >
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Добро пожаловать!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Введите ваш никнейм для начала общения
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <TextField 
              fullWidth 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              onKeyPress={e => e.key==='Enter' && handleSetName()} 
              placeholder="Ваш никнейм"
              variant="outlined"
            />
            <Button 
              variant="contained" 
              onClick={handleSetName}
              size="large"
              sx={{ minWidth: 120 }}
            >
              Войти
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        py: 0
      }}
    >
      <Container maxWidth="lg" sx={{ height: '100vh', py: 2 }}>
        <Paper 
          elevation={8} 
          sx={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 3,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)'
          }}
        >
          {/* Header */}
          <Box 
            sx={{ 
              p: 2, 
              bgcolor: 'primary.main', 
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              💬 Чат: {username}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton 
                onClick={() => setShowOnlineUsers(!showOnlineUsers)}
                sx={{ color: 'white' }}
                title="Онлайн пользователи"
              >
                <Badge badgeContent={onlineUsers.length} color="secondary">
                  <PeopleIcon />
                </Badge>
              </IconButton>
              <IconButton 
                onClick={toggleNotifications} 
                sx={{ color: 'white' }}
                size="small"
              >
                <Badge color="secondary" variant="dot" invisible={!notificationsEnabled}>
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Box>
          </Box>

          {/* Main Content */}
          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Online Users Sidebar */}
            {showOnlineUsers && (
              <Box 
                sx={{ 
                  width: 250, 
                  bgcolor: 'grey.50',
                  borderRight: '1px solid',
                  borderColor: 'grey.200',
                  p: 2
                }}
              >
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PeopleIcon /> Онлайн ({onlineUsers.length})
                </Typography>
                <List dense>
                  {onlineUsers.map((user, index) => (
                    <ListItem key={index}>
                      <ListItemAvatar>
                        <Avatar {...stringAvatar(user)} />
                      </ListItemAvatar>
                      <ListItemText 
                        primary={user} 
                        secondary="online"
                        secondaryTypographyProps={{
                          color: 'success.main',
                          fontSize: '0.7rem'
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Chat Area */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Typing Indicator */}
              {typingUsers.length > 0 && (
                <Box sx={{ px: 2, pt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {`${typingUsers.join(', ')} печатает...`}
                  </Typography>
                </Box>
              )}

              {/* Error Alert */}
              {error && (
                <Box sx={{ px: 2, pt: 1 }}>
                  <Alert severity="error" onClose={() => setError('')}>
                    {error}
                  </Alert>
                </Box>
              )}

              {/* Messages List */}
              <List 
                sx={{ 
                  flex: 1,
                  overflow: 'auto',
                  p: 1,
                  bgcolor: 'background.default'
                }}
              >
                {messages.map(msg => (
                  <ListItem 
                    key={msg.id} 
                    sx={{ 
                      justifyContent: msg.isMe ? 'flex-end' : 'flex-start',
                      px: 1,
                      py: 0.5
                    }}
                  >
                    <Box 
                      sx={{ 
                        bgcolor: msg.isMe ? 'primary.light' : 'white',
                        p: 2,
                        borderRadius: 2,
                        maxWidth: '70%',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        border: msg.isMe ? 'none' : '1px solid',
                        borderColor: 'grey.200'
                      }}
                    >
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          display: 'block',
                          color: msg.isMe ? 'primary.dark' : 'text.secondary',
                          fontWeight: 'bold',
                          mb: 0.5
                        }}
                      >
                        {msg.sender} • {msg.time}
                      </Typography>
                      {renderMessageContent(msg)}
                    </Box>
                  </ListItem>
                ))}
                <div ref={messagesEndRef} />
              </List>

              {/* File Preview */}
              {selectedFile && (
                <Box sx={{ px: 2, pt: 1 }}>
                  {renderFilePreview(selectedFile)}
                </Box>
              )}

              {/* Input Area */}
              <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'grey.200' }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    onChange={handleFileSelect} 
                    accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
                  />
                  <IconButton 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={uploading}
                  >
                    <AttachFileIcon />
                  </IconButton>
                  <TextField 
                    fullWidth 
                    multiline 
                    maxRows={3} 
                    value={message} 
                    onChange={e => { 
                      setMessage(e.target.value); 
                      handleTyping(); 
                    }} 
                    placeholder="Введите сообщение..." 
                    onKeyPress={e => e.key==='Enter'&&!e.shiftKey&&handleSend()} 
                    disabled={uploading}
                    variant="outlined"
                  />
                  <Button 
                    variant="contained" 
                    onClick={handleSend} 
                    disabled={(!message.trim() && !selectedFile) || uploading}
                    sx={{ minWidth: 56, height: 56 }}
                  >
                    {uploading ? <CircularProgress size={24} /> : <SendIcon />}
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Container>

      {/* Модальное окно для просмотра изображений */}
      <ImageModal />
    </Box>
  );
};
