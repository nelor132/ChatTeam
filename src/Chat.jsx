return (
  <Box sx={{ height: '100vh', width: '100vw', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
    <Container maxWidth="lg" sx={{ height: '100%', px: 0, py: 0, display: 'flex', flexDirection: 'column' }}>
      <Paper elevation={8} sx={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 0, overflow: 'hidden', background: 'rgba(255, 255, 255, 0.95)' }}>
        
        {/* Header */}
        <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          ...
        </Box>

        {/* Main */}
        <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
          
          {showOnlineUsers && (
            <Box sx={{ width: 250, bgcolor: 'grey.50', borderRight: '1px solid', borderColor: 'grey.200', p: 2, flexShrink: 0, overflow: 'hidden' }}>
              ...
            </Box>
          )}

          {/* Chat Area */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {typingUsers.length > 0 && <Box sx={{ px: 2, pt: 1, flexShrink: 0 }}>...</Box>}
            {error && <Box sx={{ px: 2, pt: 1, flexShrink: 0 }}>...</Box>}

            {/* Messages */}
            <Box sx={{ flex: 1, px: 2, py: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <List sx={{ m: 0, p: 0 }}>
                {messages.map(msg => (
                  <ListItem key={msg.id} sx={{ justifyContent: msg.isMe ? 'flex-end' : 'flex-start', py: 0.5 }}>
                    <Paper sx={{ p: 1.5, bgcolor: msg.isMe ? 'primary.light' : 'grey.100', maxWidth: '70%', wordBreak: 'break-word' }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: msg.isMe ? 'primary.dark' : 'text.primary' }}>{msg.sender}</Typography>
                      {renderMessageContent(msg)}
                      <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}>{msg.time}</Typography>
                    </Paper>
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* Input */}
            <Box sx={{ p: 2, flexShrink: 0 }}>
              {selectedFile && renderFilePreview(selectedFile)}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  placeholder="Введите сообщение"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyPress={e => e.key==='Enter' && handleSend()}
                  onKeyUp={handleTyping}
                  multiline
                  maxRows={4}
                  variant="outlined"
                />
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} />
                <IconButton onClick={() => fileInputRef.current.click()} size="large"><AttachFileIcon /></IconButton>
                <Button variant="contained" onClick={handleSend} disabled={uploading} endIcon={uploading ? <CircularProgress size={20}/> : <SendIcon />}>Отправить</Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
    <ImageModal />
  </Box>
);
