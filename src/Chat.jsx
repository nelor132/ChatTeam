import { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, set } from 'firebase/database';
import { 
  TextField, Button, Box, List, ListItem, Paper, Typography, 
  IconButton, Badge
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SendIcon from '@mui/icons-material/Send';

const firebaseConfig = {
  apiKey: "AIzaSyBBGra56i6Bf99ueh0QqMKxu0K4WV8u1M4",
  authDomain: "websocketchat-eeede.firebaseapp.com",
  databaseURL: "https://websocketchat-eeede-default-rtdb.firebaseio.com", 
  projectId: "websocketchat-eeede",
  storageBucket: "websocketchat-eeede.appspot.com", 
  messagingSenderId: "1003362902789",
  appId: "1:1003362902789:web:3b556326b5e3a5b3f18d6c",
  measurementId: "G-YCBTZKXRPJ"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const notificationSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');

export const Chat = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

useEffect(() => {
  const messagesRef = ref(db, 'messages');
  const unsubscribeMessages = onValue(messagesRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const messagesArray = Object.values(data).map((msg, index) => ({
        ...msg,
        isMe: msg.sender === username,
        id: index
      }));
      
      setMessages(messagesArray);
      
      if (messagesArray.length > 0 && 
          messagesArray[messagesArray.length - 1].sender !== username &&
          notificationsEnabled) {
        notificationSound.play();
        if (Notification.permission === 'granted') {
          new Notification(`Новое сообщение от ${messagesArray[messagesArray.length - 1].sender}`, {
            body: messagesArray[messagesArray.length - 1].text
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
    
    typingTimeoutRef.current = setTimeout(() => {
      set(ref(db, 'typing/' + username), false);
    }, 3000);
  };

  const handleSend = () => {
    if (message.trim()) {
      push(ref(db, 'messages'), {
        text: message,
        sender: username,
        time: new Date().toLocaleTimeString(),
      });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        set(ref(db, 'typing/' + username), false);
      }
      
      setMessage('');
    }
  };

  const handleSetName = () => {
    if (username.trim()) setIsNameSet(true);
  };

  const toggleNotifications = () => {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then(permission => {
        setNotificationsEnabled(permission === 'granted');
      });
    } else {
      setNotificationsEnabled(!notificationsEnabled);
    }
  };

  if (!isNameSet) {
    return (
      <Paper elevation={3} sx={{ padding: 3, maxWidth: 400, margin: '20px auto', textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>Введите ваш никнейм</Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <TextField
            fullWidth
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Ваш никнейм"
            onKeyPress={(e) => e.key === 'Enter' && handleSetName()}
          />
          <Button 
            variant="contained" 
            onClick={handleSetName}
            sx={{ minWidth: 120 }}
          >
            Продолжить
          </Button>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ padding: 3, maxWidth: 500, margin: '20px auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Чат: {username}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="success.main" sx={{ fontWeight: 'bold' }}>
            Онлайн
          </Typography>
          <IconButton onClick={toggleNotifications}>
            <Badge color="primary" variant="dot" invisible={!notificationsEnabled}>
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Box>
      </Box>

      {typingUsers.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1, display: 'block' }}>
          {`${typingUsers.join(', ')} печатает...`}
        </Typography>
      )}

      <List sx={{ 
        height: 400, 
        overflow: 'auto',
        bgcolor: 'background.paper',
        borderRadius: 1,
        p: 1,
        mb: 2
      }}>
        {messages.map((msg) => (
          <ListItem 
            key={msg.id} 
            sx={{ 
              justifyContent: msg.isMe ? 'flex-end' : 'flex-start',
              px: 1,
              py: 0.5
            }}
          >
            <Box sx={{
              bgcolor: msg.isMe ? 'primary.light' : 'background.default',
              p: 1.5,
              borderRadius: 2,
              maxWidth: '80%',
              boxShadow: 1
            }}>
              <Typography variant="caption" color="text.secondary" display="block">
                {msg.sender} • {msg.time}
              </Typography>
              <Typography sx={{ wordBreak: 'break-word' }}>{msg.text}</Typography>
            </Box>
          </ListItem>
        ))}
        <div ref={messagesEndRef} />
      </List>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          multiline
          maxRows={3}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          placeholder="Введите сообщение..."
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
        />
        <Button 
          variant="contained" 
          onClick={handleSend}
          disabled={!message.trim()}
          sx={{ minWidth: 56, height: 56 }}
        >
          <SendIcon />
        </Button>
      </Box>

      <Button 
        fullWidth 
        variant="outlined" 
        onClick={() => setMessages([])} 
        sx={{ mt: 2 }}
      >
        Очистить историю (локально)
      </Button>
    </Paper>
  );
};


