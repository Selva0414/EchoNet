import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Image, TextInput, ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ProfileScreen() {
  const { user, logout: authLogout, login } = useAuth();
  const router = useRouter();
  
  const logout = async () => {
    await authLogout();
    router.replace('/');
  };
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Please log in to view your profile.</ThemedText>
      </ThemedView>
    );
  }

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      // In a real app, we'd upload this to S3/Cloudinary
      // For this task, we'll store the base64 string
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setProfileImage(base64Image);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const apiUrl = Platform.OS === 'web'
        ? '' // Use relative path on web
        : process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081';

      const response = await fetch(`${apiUrl}/api/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: name,
          profileImage: profileImage,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        await login(data.user);
        setIsEditing(false);
      } else {
        alert(`Server Error: ${data.error || 'Failed to update profile'}\n${data.details || ''}`);
      }
    } catch (error: any) {
      console.error(error);
      alert(`Network Error: ${error.message}\n\nTip: If testing on a real device, check your IP in .env`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={isEditing ? pickImage : undefined} style={[styles.avatarContainer, { borderColor: theme.tint }]}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <ThemedText style={styles.avatarPlaceholderText}>
                {(user.name || user.email)[0].toUpperCase()}
              </ThemedText>
            </View>
          )}
          {isEditing && (
            <View style={styles.editOverlay}>
              <IconSymbol size={20} name="camera.fill" color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        {isEditing ? (
          <View style={styles.editForm}>
            <TextInput
              style={[styles.nameInput, { color: theme.text, borderBottomColor: theme.tint }]}
              value={name}
              onChangeText={setName}
              placeholder="Your Name"
              placeholderTextColor={theme.secondaryText}
              autoFocus
            />
            <ThemedText style={[styles.email, { color: theme.secondaryText }]}>{user.email}</ThemedText>
          </View>
        ) : (
          <View style={styles.infoContainer}>
            <ThemedText type="title" style={styles.name}>{user.name || 'Set Name'}</ThemedText>
            <ThemedText style={[styles.email, { color: theme.secondaryText }]}>{user.email}</ThemedText>
          </View>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: theme.headerBackground }]}>
        {isEditing ? (
          <TouchableOpacity style={[styles.menuItem, { borderTopWidth: 0 }]} onPress={handleSave} disabled={loading}>
            <IconSymbol size={22} name="checkmark.circle.fill" color={theme.tint} />
            <ThemedText style={[styles.menuText, { color: theme.tint, fontWeight: 'bold' }]}>
              {loading ? 'Saving...' : 'Save Profile Changes'}
            </ThemedText>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.menuItem, { borderTopWidth: 0 }]} onPress={() => setIsEditing(true)}>
            <IconSymbol size={22} name="paintbrush.fill" color={theme.tint} />
            <ThemedText style={styles.menuText}>Edit Profile</ThemedText>
            <IconSymbol size={18} name="chevron.right" color={theme.secondaryText} />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.menuItem}>
          <IconSymbol size={22} name="bell.fill" color="#53BDEB" />
          <ThemedText style={styles.menuText}>Notifications</ThemedText>
          <IconSymbol size={18} name="chevron.right" color={theme.secondaryText} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <IconSymbol size={22} name="lock.fill" color="#FFD700" />
          <ThemedText style={styles.menuText}>Privacy & Security</ThemedText>
          <IconSymbol size={18} name="chevron.right" color={theme.secondaryText} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={logout}>
          <IconSymbol size={22} name="rectangle.portrait.and.arrow.right" color="#FF4B4B" />
          <ThemedText style={[styles.menuText, { color: '#FF4B4B' }]}>Log Out</ThemedText>
        </TouchableOpacity>
      </View>

      <ThemedText style={[styles.footerText, { color: theme.secondaryText }]}>
        EchoNet v1.0.0
      </ThemedText>
    </ThemedView>
  );
}

// Profile styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  avatarContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: '#1C252E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  editOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00E676',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0B141A',
  },
  infoContainer: {
    alignItems: 'center',
  },
  editForm: {
    width: '100%',
    alignItems: 'center',
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  nameInput: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    borderBottomWidth: 2,
    width: '80%',
    paddingBottom: 5,
    marginBottom: 5,
  },
  email: {
    fontSize: 15,
    marginTop: 4,
  },
  section: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.05)',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 16,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 10,
    opacity: 0.5,
  },
});
