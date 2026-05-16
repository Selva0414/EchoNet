import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, ActivityIndicator, Platform, FlatList, Image } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function HomeScreen() {
  const { user, login, isLoading: authLoading } = useAuth();
  
  if (authLoading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#25D366" />
      </ThemedView>
    );
  }

  if (!user) {
    return <AuthScreen login={login} />;
  }

  return <ChatList />;
}

function AuthScreen({ login }: { login: Function }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const colorScheme = useColorScheme();

  const handleAuth = async () => {
    if (!email || !password) {
      setMessage('Please enter both email and password');
      setErrorDetails('');
      return;
    }

    setLoading(true);
    setMessage('');
    setErrorDetails('');

    try {
      const apiUrl = Platform.OS === 'web'
        ? window.location.origin
        : process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081';
      
      const endpoint = isLogin ? '/api/login' : '/api/signup';
      console.log(`Authenticating with ${apiUrl}${endpoint}`);
      
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        await login({ id: data.user.id, email: data.user.email });
      } else {
        setMessage(`Error: ${data.error || 'Authentication failed'}`);
        if (data.details) {
          setErrorDetails(data.details);
        }
      }
    } catch (error: any) {
      console.error(error);
      setMessage('Network error. Make sure the API is running.');
      setErrorDetails(error.message || '');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.formContainer}>
        <View style={styles.logoContainer}>
          <IconSymbol size={80} name="bubble.left.and.bubble.right.fill" color="#25D366" />
          <ThemedText type="title" style={styles.title}>EchoNet</ThemedText>
        </View>
        
        <ThemedText style={styles.subtitle}>
          {isLogin ? 'Sign in to your account' : 'Sign up for a new account'}
        </ThemedText>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, isLogin && styles.activeTab]} 
            onPress={() => { setIsLogin(true); setMessage(''); setErrorDetails(''); }}
          >
            <ThemedText style={[styles.tabText, isLogin && styles.activeTabText]}>Login</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, !isLogin && styles.activeTab]} 
            onPress={() => { setIsLogin(false); setMessage(''); setErrorDetails(''); }}
          >
            <ThemedText style={[styles.tabText, !isLogin && styles.activeTabText]}>Sign Up</ThemedText>
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.input, { color: Colors[colorScheme ?? 'light'].text }]}
          placeholder="Email address"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={[styles.input, { color: Colors[colorScheme ?? 'light'].text }]}
          placeholder="Password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {message ? (
          <ThemedText style={[styles.message, message.startsWith('Success') ? styles.success : styles.error]}>
            {message}
          </ThemedText>
        ) : null}

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.buttonText}>
              {isLogin ? 'LOG IN' : 'SIGN UP'}
            </ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

function ChatList() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSelectingContact, setIsSelectingContact] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const router = useRouter();
  const { user: currentUser, logout } = useAuth();
  const { toggleTheme } = useTheme();
  const { socket } = useSocket() || { socket: null };
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
 
  useEffect(() => {
    if (socket) {
      socket.on('receive_message', fetchUsers);
      return () => {
        socket.off('receive_message', fetchUsers);
      };
    }
  }, [socket]);

  useFocusEffect(
    useCallback(() => {
      if (currentUser) {
        fetchUsers();
      }
    }, [isSelectingContact, currentUser?.id])
  );

  const filteredUsers = users.filter((u: any) => 
    (u.name || u.email).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const apiUrl = Platform.OS === 'web'
        ? window.location.origin
        : process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081';
      
      const cleanId = String(currentUser?.id).replace(/['"]+/g, '').trim();
      const endpoint = isSelectingContact ? '/api/users' : `/api/chats?userId=${cleanId}`;
      const response = await fetch(`${apiUrl}${endpoint}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        const otherUsers = data.filter((u: any) => (u.id || u._id) !== (currentUser?.id || ''));
        setUsers(otherUsers);
      }
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };

  const onSelectContact = (userId: string) => {
    setIsSelectingContact(false);
    router.push(`/chat/${userId}`);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.chatItem}
      onPress={() => onSelectContact(item._id)}
    >
      <View style={styles.avatar}>
        {item.profileImage ? (
          <Image source={{ uri: item.profileImage }} style={styles.avatarImage} />
        ) : (
          <ThemedText style={styles.avatarText}>
            {(item.name || item.email)[0].toUpperCase()}
          </ThemedText>
        )}
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <ThemedText style={styles.chatName}>{item.name || item.email.split('@')[0]}</ThemedText>
        </View>
        <ThemedText style={styles.lastMessage} numberOfLines={1}>
          {isSelectingContact ? (item.email) : 'Tap to start chatting...'}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.headerBackground }]}>
        {isSearching ? (
          <View style={styles.searchHeader}>
            <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(''); }}>
              <IconSymbol name="chevron.left" size={24} color={theme.headerText} />
            </TouchableOpacity>
            <TextInput
              style={[styles.searchInput, { color: theme.headerText }]}
              placeholder="Search..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
        ) : (
          <View style={styles.headerTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {isSelectingContact && (
                <TouchableOpacity onPress={() => setIsSelectingContact(false)} style={{ marginRight: 15 }}>
                  <IconSymbol name="chevron.left" size={24} color={theme.headerText} />
                </TouchableOpacity>
              )}
              <View>
                <ThemedText style={[styles.headerTitle, { color: theme.headerText }]}>
                  {isSelectingContact ? 'Select contact' : 'EchoNet'}
                </ThemedText>
                {isSelectingContact && (
                  <ThemedText style={{ color: theme.headerText, fontSize: 12 }}>{users.length} contacts</ThemedText>
                )}
              </View>
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity onPress={() => setIsSearching(true)}>
                <IconSymbol name="magnifyingglass" size={22} color={theme.headerText} style={styles.icon} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#25D366" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item: any) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <ThemedText style={styles.emptyText}>
              {searchQuery ? 'No matching users found' : (isSelectingContact ? 'No contacts found' : 'No chats yet. Start a new conversation!')}
            </ThemedText>
          }
          onRefresh={fetchUsers}
          refreshing={loading}
        />
      )}

      {!isSelectingContact && (
        <TouchableOpacity style={styles.fab} onPress={() => setIsSelectingContact(true)}>
          <IconSymbol name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    paddingVertical: 5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  menuDropdown: {
    position: 'absolute',
    top: 60,
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
  headerIcons: {
    flexDirection: 'row',
  },
  icon: {
    marginLeft: 20,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    padding: 30,
    gap: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    marginTop: 10,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 16,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    borderRadius: 25,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#25D366',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  activeTabText: {
    color: '#fff',
  },
  input: {
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
  },
  button: {
    backgroundColor: '#25D366',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  message: {
    textAlign: 'center',
    marginTop: 8,
  },
  error: {
    color: '#ff4444',
  },
  success: {
    color: '#25D366',
  },
  listContainer: {
    paddingVertical: 5,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#85959f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    paddingBottom: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 17,
    fontWeight: '600',
  },
  chatTime: {
    fontSize: 12,
    color: '#888',
  },
  lastMessage: {
    fontSize: 14,
    color: '#888',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#888',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
