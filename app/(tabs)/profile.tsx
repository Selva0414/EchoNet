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
        <TouchableOpacity onPress={isEditing ? pickImage : undefined} style={styles.avatarContainer}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatar} />
          ) : (
            <IconSymbol size={100} name="person.circle.fill" color="#888" />
          )}
          {isEditing && (
            <View style={styles.editOverlay}>
              <IconSymbol size={24} name="camera.fill" color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        {isEditing ? (
          <View style={styles.editForm}>
            <TextInput
              style={[styles.nameInput, { color: theme.text, borderBottomColor: '#25D366' }]}
              value={name}
              onChangeText={setName}
              placeholder="Your Name"
              placeholderTextColor="#888"
              autoFocus
            />
            <ThemedText style={styles.email}>{user.email}</ThemedText>
          </View>
        ) : (
          <View style={styles.infoContainer}>
            <ThemedText type="title" style={styles.name}>{user.name || 'Set Name'}</ThemedText>
            <ThemedText style={styles.email}>{user.email}</ThemedText>
          </View>
        )}
      </View>

      <View style={styles.section}>
        {isEditing ? (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.saveText}>Save Profile</ThemedText>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
            <IconSymbol size={20} name="paintbrush.fill" color="#fff" />
            <ThemedText style={styles.editButtonText}>Edit Profile</ThemedText>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.menuItem}>
          <IconSymbol size={24} name="bell.fill" color="#25D366" />
          <ThemedText style={styles.menuText}>Notifications</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <IconSymbol size={24} name="lock.fill" color="#25D366" />
          <ThemedText style={styles.menuText}>Privacy & Security</ThemedText>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <ThemedText style={styles.logoutText}>Log Out</ThemedText>
      </TouchableOpacity>
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
    marginTop: 60,
    marginBottom: 30,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: '35%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    alignItems: 'center',
  },
  editForm: {
    width: '100%',
    alignItems: 'center',
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  nameInput: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    borderBottomWidth: 2,
    width: '80%',
    paddingBottom: 5,
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#888',
    marginTop: 4,
  },
  section: {
    backgroundColor: 'rgba(150, 150, 150, 0.05)',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 30,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  menuText: {
    fontSize: 16,
    marginLeft: 16,
  },
  editButton: {
    flexDirection: 'row',
    backgroundColor: '#25D366',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  saveButton: {
    backgroundColor: '#00A884',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
