import { useState, useEffect, useRef } from 'react';
import { ref, push, onValue, set } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  TextField, Button, Box, List, ListItem, Paper, Typography, 
  IconButton, Badge, Chip, CircularProgress, Alert
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageIcon from '@mui/icons-material/Image';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import VideoFileIcon from '@mui/icons-material/Videocam';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
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
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
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

    const savedUsername = localStorage.getItem('chatUsername');
    if (savedUsername) {
      setUsername(savedUsername);
      setIsNameSet(true);
    }

    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
    };
  }, [username, notificationsEnabled]);

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

  const uploadFile = async (file) => {
    setUploading(true);
    try {
      const fileRef = storageRef(storage, `chat_files/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snapshot.ref);
      return { url, name: file.name, type: getFileType(file.type), size: file.size, contentType: file.type };
    } catch (e) {
      console.error(e);
      setError('Ошибка загрузки файла');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim() && !selectedFile) return;
    let fileData = null;
    if (selectedFile) {
      fileData = await uploadFile(selectedFile);
      if (!fileData) return;
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
  };

  const handleSetName = () => { if (username.trim()) setIsNameSet(true); };
  const toggleNotifications = () => {
    if (Notification.permission !== 'granted') Notification.requestPermission().then(p => setNotificationsEnabled(p === 'granted'));
    else setNotificationsEnabled(!notificationsEnabled);
  };
  const removeSelectedFile = () => setSelectedFile(null);

  const renderFilePreview = (file) => {
    const type = getFileType(file.type);
    if (type === 'image') return (
      <Box sx={{ mt: 1, textAlign: 'center' }}>
        <img src={URL.createObjectURL(file)} alt="" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }}/>
        <Typography variant="caption">{file.name}</Typography>
      </Box>
    );
    return <Chip icon={getFileIcon(type)} label={file.name} onDelete={removeSelectedFile} variant="outlined" sx={{ mt: 1 }}/>;
  };

  const renderMessageContent = (msg) => {
    if (!msg.file) return <Typography sx={{ wordBreak: 'break-word' }}>{msg.text}</Typography>;
    switch (msg.file.type) {
      case 'image': return <img src={msg.file.url} alt={msg.file.name} style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }} onClick={() => window.open(msg.file.url,'_blank')}/>;
      case 'audio': return <audio controls src={msg.file.url} style={{ width: '100%' }}/>;
      case 'video': return <video controls src={msg.file.url} style={{ maxWidth: '100%', maxHeight: 300 }}/>;
      default: return <Button onClick={() => window.open(msg.file.url, '_blank')}>Скачать {msg.file.name}</Button>;
    }
  };

  if (!isNameSet) {
    return (
      <Paper sx={{ padding: 3, maxWidth: 400, margin: '20px auto', textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>Введите никнейм</Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <TextField fullWidth value={username} onChange={e => setUsername(e.target.value)} onKeyPress={e => e.key==='Enter' && handleSetName()} placeholder="Никнейм"/>
          <Button variant="contained" onClick={handleSetName}>Продолжить</Button>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper 
      sx={{ 
        padding: 3, 
        maxWidth: 600, 
        margin: '0 auto', 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        bgcolor: '#f0f4f8'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Чат: {username}</Typography>
        <IconButton onClick={toggleNotifications}>
          <Badge color="primary" variant="dot" invisible={!notificationsEnabled}>
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <List 
        sx={{ 
          flexGrow: 1, 
          overflowY: 'auto', 
          bgcolor: '#e8edf3', 
          borderRadius: 1, 
          p: 1, 
          mb: 2 
        }}
      >
        {messages.map(msg => (
          <ListItem key={msg.id} sx={{ justifyContent: msg.isMe ? 'flex-end' : 'flex-start', px: 1, py: 0.5 }}>
            <Box sx={{ bgcolor: msg.isMe ? 'primary.light' : 'background.paper', p: 1.5, borderRadius: 2, maxWidth: '80%', boxShadow: 1 }}>
              <Typography variant="caption">{msg.sender} • {msg.time}</Typography>
              {renderMessageContent(msg)}
            </Box>
          </ListItem>
        ))}
        <div ref={messagesEndRef} />
      </List>

      {selectedFile && renderFilePreview(selectedFile)}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"/>
        <IconButton onClick={() => fileInputRef.current?.click()} disabled={uploading}><AttachFileIcon /></IconButton>
        <TextField 
          fullWidth 
          multiline 
          maxRows={3} 
          value={message} 
          onChange={e => { setMessage(e.target.value); handleTyping(); }} 
          placeholder="Введите сообщение..." 
          onKeyPress={e => e.key==='Enter' && !e.shiftKey && handleSend()} 
          disabled={uploading}
        />
        <Button variant="contained" onClick={handleSend} disabled={(!message.trim() && !selectedFile) || uploading}>
          {uploading ? <CircularProgress size={24}/> : <SendIcon/>}
        </Button>
      </Box>
    </Paper>
  );
};
