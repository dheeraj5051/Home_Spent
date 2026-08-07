import React, { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { RootNavProp } from '../../navigation/types';
import { signUpWithEmail, supabase, mapAuthUserToProfile, fetchProfile, upsertProfile } from '../../lib/supabase';
import { UserProfile } from '../../types';

export default function RegisterScreen() {
  const navigation = useNavigation<RootNavProp>();
  const { theme, setIsAuthenticated, updateState, generateId } = useApp();
  const [form, setForm] = useState({ username: '', fullName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const s = styles(theme);

  const set = (key: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [key]: v }));

  async function handleRegister() {
    if (!form.email || !form.password) { Alert.alert('Missing fields', 'Email and password are required.'); return; }
    if (form.password.length < 6) { Alert.alert('Weak password', 'Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      if (supabase) {
        const { data, error } = await signUpWithEmail({
          username: form.username || form.email.split('@')[0],
          fullName: form.fullName || form.username || form.email.split('@')[0],
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        if (data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            username: form.username || form.email.split('@')[0],
            fullName: form.fullName || form.username || form.email.split('@')[0],
            email: form.email,
            phone: null, bio: null, avatarUrl: null,
            joinedAt: new Date().toISOString(),
            totalPaid: 0, totalOwed: 0, totalReceivable: 0,
            groupsJoined: 0, groupsCreated: 0, recentActivity: [],
          };
          await upsertProfile(profile).catch(() => null);
          updateState({ profile }, 'Account created');
          setIsAuthenticated(true);
        } else {
          Alert.alert('Verify email', 'Check your inbox to verify your account, then sign in.');
          navigation.navigate('Login');
        }
      } else {
        const profile: UserProfile = {
          id: generateId(),
          username: form.username || form.email.split('@')[0],
          fullName: form.fullName || form.email.split('@')[0],
          email: form.email, phone: null, bio: null, avatarUrl: null,
          joinedAt: new Date().toISOString(),
          totalPaid: 0, totalOwed: 0, totalReceivable: 0,
          groupsJoined: 0, groupsCreated: 0, recentActivity: [],
        };
        updateState({ profile }, 'Registered offline');
        setIsAuthenticated(true);
      }
    } catch (e: unknown) {
      Alert.alert('Registration failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <View style={s.logoCircle}><Text style={s.logoEmoji}>💸</Text></View>
            <Text style={[s.appName, { color: theme.text }]}>SplitNest</Text>
            <Text style={[s.tagline, { color: theme.subtext }]}>Create your account</Text>
          </View>

          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[s.cardTitle, { color: theme.text }]}>Get started</Text>

            <TextInput style={[s.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.cardBorder }]} placeholder="Full name" placeholderTextColor={theme.subtext} value={form.fullName} onChangeText={set('fullName')} />
            <TextInput style={[s.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.cardBorder }]} placeholder="Username" placeholderTextColor={theme.subtext} autoCapitalize="none" value={form.username} onChangeText={set('username')} />
            <TextInput style={[s.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.cardBorder }]} placeholder="Email address" placeholderTextColor={theme.subtext} keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={set('email')} />
            <TextInput style={[s.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.cardBorder }]} placeholder="Password (min 6 characters)" placeholderTextColor={theme.subtext} secureTextEntry value={form.password} onChangeText={set('password')} />

            <Pressable
              style={[s.primaryBtn, { backgroundColor: theme.primary }, loading && s.disabledBtn]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={s.primaryBtnText}>{loading ? 'Creating account…' : 'Create Account'}</Text>
            </Pressable>
          </View>

          <View style={s.footer}>
            <Text style={[s.footerText, { color: theme.subtext }]}>Already have an account? </Text>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text style={[s.footerLink, { color: theme.primary }]}>Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (theme: import('../../theme').Theme) => StyleSheet.create({
  safe: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 20 },
  header: { alignItems: 'center', gap: 8 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  logoEmoji: { fontSize: 36 },
  appName: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { fontSize: 15 },
  card: { borderRadius: 20, padding: 24, borderWidth: 1, gap: 14, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  cardTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 15 },
  primaryBtn: { borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabledBtn: { opacity: 0.6 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: '700' },
});
