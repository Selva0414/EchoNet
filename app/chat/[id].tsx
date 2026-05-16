import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { io } from 'socket.io-client';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001';

import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { useSocket } from '@/context/SocketContext';

import { useTheme } from '@/context/ThemeContext';

export default function ChatRoom() {
  const params = useLocalSearchParams();
  const rawId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  // Clean the ID (remove quotes and whitespace)
  const receiverId = rawId.replace(/['"]+/g, '').trim();
  const { user: currentUser } = useAuth();
  const { toggleTheme } = useTheme();
  const { socket: globalSocket } = useSocket() || { socket: null };
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [receiver, setReceiver] = useState<any>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  
  const commonEmojis = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];

  const addEmoji = (emoji: string) => {
    setInput(prev => prev + emoji);
  };


  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!currentUser || !receiverId) return;
    fetchMessages();
    fetchReceiverInfo();
  }, [receiverId, currentUser?.id]);

  useEffect(() => {
    if (!currentUser || !receiverId || !globalSocket) return;

    const handleMessage = (message: any) => {
      // If we are the sender, we already have the optimistic message in state
      if (message.senderId === currentUser.id) return;

      if (message.receiverId === currentUser.id && message.senderId === receiverId) {
        setMessages((prev) => {
          const exists = prev.find(m => m._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });
      }
    };

    globalSocket.on('receive_message', handleMessage);

    return () => {
      globalSocket.off('receive_message', handleMessage);
    };
  }, [receiverId, currentUser?.id, globalSocket]);

  const fetchMessages = async () => {
    if (!currentUser?.id || !receiverId) return;
    
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://echonet-yqep.onrender.com';
      const cleanSenderId = String(currentUser.id).replace(/['"]+/g, '').trim();
      const cleanReceiverId = String(receiverId).replace(/['"]+/g, '').trim();
      
      console.log(`Fetching messages: ${cleanSenderId} <-> ${cleanReceiverId}`);
      const response = await fetch(`${apiUrl}/api/messages?user1=${cleanSenderId}&user2=${cleanReceiverId}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReceiverInfo = async () => {
    if (!receiverId) return;
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://echonet-yqep.onrender.com';
      const cleanReceiverId = String(receiverId).replace(/['"]+/g, '').trim();
      
      const response = await fetch(`${apiUrl}/api/users/${cleanReceiverId}`);
      const info = await response.json();
      
      if (info && (info.name || info.email)) {
        setReceiver(info);
      } else {
        const listResponse = await fetch(`${apiUrl}/api/users`);
        const listData = await listResponse.json();
        if (Array.isArray(listData)) {
          const fallback = listData.find(u => {
            const uId = String(u.id || u._id).replace(/['"]+/g, '').trim();
            return uId === cleanReceiverId;
          });
          if (fallback) setReceiver(fallback);
        }
      }
    } catch (error) {
      console.error('Failed to fetch receiver info', error);
    }
  };

  const sendMessage = (type = 'text', mediaUrl = '') => {
    if (!globalSocket) {
      alert('Connecting to server... Please wait.');
      return;
    }
    if (type === 'text' && !input.trim()) return;

    const messageData = {
      _id: Date.now().toString(), // Temporary ID for optimistic UI
      senderId: String(currentUser?.id).replace(/['"]+/g, '').trim(),
      receiverId: String(receiverId).replace(/['"]+/g, '').trim(),
      content: type === 'text' ? input.trim() : '',
      type,
      mediaUrl,
      timestamp: new Date().toISOString(),
      senderName: currentUser?.name || currentUser?.email?.split('@')[0] || 'Me',
      isOptimistic: true,
    };

    // Optimistically add to list
    setMessages(prev => [...prev, messageData]);
    
    // Send to server
    globalSocket.emit('send_message', messageData);

    if (type === 'text') {
      setInput('');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      sendMessage('image', base64Image);
    }
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      // Convert the local blob/file to a base64 string
      const response = await fetch(uri!);
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        sendMessage('audio', base64Audio);
      };
    } catch (error) {
      console.error('Error stopping recording', error);
    } finally {
      setRecording(null);
    }
  };

  const playAudio = async (uri: string) => {
    try {
      // Ensure audio mode is set for playing
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );
      
      // Cleanup when finished
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Error playing audio', error);
      alert('Could not play this voice message. The audio format might not be supported by your browser.');
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isMine = String(item.senderId).replace(/['"]+/g, '').trim() === String(currentUser?.id).replace(/['"]+/g, '').trim();
    return (
      <View style={[styles.messageWrapper, isMine ? styles.myMessageWrapper : styles.theirMessageWrapper]}>
        <View style={[
          styles.messageBubble, 
          isMine ? { backgroundColor: theme.myBubble, borderBottomRightRadius: 2 } : { backgroundColor: theme.theirBubble, borderBottomLeftRadius: 2 }
        ]}>
          {item.type === 'image' && (
            <Image source={{ uri: item.mediaUrl }} style={styles.messageImage} />
          )}
          
          {item.type === 'audio' && (
            <TouchableOpacity onPress={() => playAudio(item.mediaUrl)} style={styles.audioPlayer}>
              <View style={[styles.audioIconContainer, { backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : 'rgba(0,230,118,0.1)' }]}>
                <IconSymbol name="mic.fill" size={18} color={isMine ? '#fff' : '#00E676'} />
              </View>
              <ThemedText style={[styles.audioText, { color: isMine ? '#fff' : theme.text }]}>Voice Message</ThemedText>
            </TouchableOpacity>
          )}

          {item.content ? (
            <ThemedText style={[styles.messageText, { color: isMine ? '#fff' : theme.text }]}>
              {item.content}
            </ThemedText>
          ) : null}
          
          <View style={styles.messageFooter}>
            <ThemedText style={[styles.timestamp, { color: isMine ? 'rgba(255,255,255,0.6)' : theme.secondaryText }]}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </ThemedText>
            {isMine && <IconSymbol name="checkmark" size={12} color="#53BDEB" style={{ marginLeft: 4 }} />}
          </View>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.chatBackground }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.headerBackground }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={theme.headerText} />
        </TouchableOpacity>
        <View style={styles.avatarMini}>
          {receiver?.profileImage ? (
            <Image source={{ uri: receiver.profileImage }} style={styles.avatarImageMini} />
          ) : (
            <ThemedText style={styles.avatarMiniText}>
              {receiver?.name ? receiver.name[0].toUpperCase() : (receiver?.email ? receiver.email[0].toUpperCase() : '?')}
            </ThemedText>
          )}
        </View>
        <View style={styles.headerInfo}>
          <ThemedText style={[styles.headerTitle, { color: theme.headerText }]} numberOfLines={1}>
            {receiver?.name || (receiver?.email ? receiver.email.split('@')[0] : 'Chat')}
          </ThemedText>
          <ThemedText style={[styles.headerStatus, { color: theme.headerText }]}>Online</ThemedText>
        </View>
        <View style={styles.headerIcons}>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 25}
        style={{ flex: 1 }}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#00E676" style={{ flex: 1 }} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item: any, index) => item._id || index.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            style={{ flex: 1 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        <View style={styles.inputArea}>
          <View style={[styles.inputContainer, { backgroundColor: colorScheme === 'dark' ? '#202C33' : '#FFF' }]}>
            <TouchableOpacity onPress={() => setShowEmojiPicker(!showEmojiPicker)}>
              <IconSymbol name="face.smiling" size={24} color={showEmojiPicker ? "#00E676" : "#8696A0"} style={{ marginRight: 10 }} />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { color: colorScheme === 'dark' ? '#FFF' : '#000' }]}
              placeholder={isRecording ? "Recording..." : "Message"}
              placeholderTextColor="#8696A0"
              value={input}
              onChangeText={setInput}
              onFocus={() => setShowEmojiPicker(false)}
              multiline
              onSubmitEditing={() => sendMessage()}
              returnKeyType="send"
              blurOnSubmit={false}
              editable={!isRecording}
            />
            <TouchableOpacity onPress={() => {}}>
              <IconSymbol name="paperclip" size={22} color="#8696A0" style={{ marginHorizontal: 10 }} />
            </TouchableOpacity>
            <TouchableOpacity onPress={pickImage}>
              <IconSymbol name="camera.fill" size={22} color="#8696A0" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={[styles.sendButton, isRecording && { backgroundColor: '#ff4444' }]} 
            onPress={input.trim() ? () => sendMessage() : (isRecording ? stopRecording : startRecording)}
          >
            <IconSymbol name={input.trim() ? "paperplane.fill" : "mic.fill"} size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {showEmojiPicker && (
          <View style={[styles.emojiPickerContainer, { backgroundColor: colorScheme === 'dark' ? '#0B141A' : '#F0F2F5' }]}>
            <FlatList
              data={commonEmojis}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => addEmoji(item)} style={styles.emojiButton}>
                  <ThemedText style={styles.emojiText}>{item}</ThemedText>
                </TouchableOpacity>
              )}
              numColumns={8}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 10,
    elevation: 4,
  },
  backButton: {
    marginRight: 5,
  },
  avatarMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#85959f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  avatarImageMini: {
    width: '100%',
    height: '100%',
  },
  avatarMiniText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerStatus: {
    fontSize: 12,
    opacity: 0.8,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginLeft: 15,
  },
  headerMenuDropdown: {
    position: 'absolute',
    top: 50,
    right: 10,
    borderRadius: 8,
    paddingVertical: 5,
    width: 150,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 1000,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 16,
  },
  listContent: {
    padding: 10,
    paddingBottom: 20,
  },
  messageWrapper: {
    marginBottom: 8,
    maxWidth: '85%',
  },
  myMessageWrapper: {
    alignSelf: 'flex-end',
  },
  theirMessageWrapper: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  messageImage: {
    width: 240,
    height: 240,
    borderRadius: 12,
    marginBottom: 6,
  },
  audioPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 12,
  },
  audioIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioText: {
    fontSize: 15,
    fontWeight: '500',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 10,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: Platform.OS === 'ios' ? 35 : 12,
    paddingTop: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    minHeight: 50,
  },
  input: {
    flex: 1,
    fontSize: 17,
    maxHeight: 120,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#00E676',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  emojiPickerContainer: {
    height: 250,
    paddingTop: 10,
  },
  emojiButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  emojiText: {
    fontSize: 28,
  },
});
