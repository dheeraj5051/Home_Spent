import React, { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { RootNavProp } from '../../navigation/types';
import {
  signInWithEmail, signInWithGoogle, sendPasswordReset,
  supabase, mapAuthUserToProfile, fetchProfile,
} from '../../lib/supabase';
import { UserProfile } from '../../types';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const navigation = useNavigation<RootNavProp>();
  const { theme, setIsAuthenticated, updateState } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const s = styles(theme);

  async function handleEmailLogin() {
    if (!email || !password) { Alert.alert('Missing fields', 'Enter email and password.'); return; }
    setLoading(true);
    try {
      if (supabase) {
        const { data, error } = await signInWithEmail(email, password);
        if (error) throw error;
        if (data.user) {
          const { data: profile } = await fetchProfile(data.user.id).catch(() => ({ data: null }));
          const merged = { ...(mapAuthUserToProfile(data.user) as UserProfile), ...profile } as UserProfile;
          updateState({ profile: merged }, 'Signed in');
          setIsAuthenticated(true);
        }
      } else {
        // offline demo login
        const profile: UserProfile = {
          id: 'demo-user', username: email.split('@')[0], fullName: email.split('@')[0],
          email, phone: null, bio: null, avatarUrl: null,
          joinedAt: new Date().toISOString(), totalPaid: 0, totalOwed: 0,
          totalReceivable: 0, groupsJoined: 0, groupsCreated: 0, recentActivity: [],
        };
        updateState({ profile }, 'Demo sign in');
        setIsAuthenticated(true);
      }
    } catch (e: unknown) {
      Alert.alert('Sign in failed', e instanceof Error ? e.message : 'Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    try {
      if (!supabase) { Alert.alert('Supabase not configured', 'Add your Supabase credentials to enable Google sign-in.'); return; }
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: 'splitnest://auth', skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, 'splitnest://auth');
        if (result.type === 'success' && result.url) {
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.replace('#', '?'));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken && refreshToken) {
            const { data: sessionData } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            if (sessionData.user) {
              const { data: profile } = await fetchProfile(sessionData.user.id).catch(() => ({ data: null }));
              const merged = { ...(mapAuthUserToProfile(sessionData.user) as UserProfile), ...profile } as UserProfile;
              updateState({ profile: merged }, 'Signed in with Google');
              setIsAuthenticated(true);
            }
          }
        }
      }
    } catch (e: unknown) {
      Alert.alert('Google sign-in failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) { Alert.alert('Enter email', 'Type your email first.'); return; }
    try {
      await sendPasswordReset(email);
      Alert.alert('Email sent', 'Check your inbox for the reset link.');
    } catch { Alert.alert('Error', 'Could not send reset email.'); }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={s.header}>
            <View style={s.logoCircle}><Text style={s.logoEmoji}>💸</Text></View>
            <Text style={[s.appName, { color: theme.text }]}>SplitNest</Text>
            <Text style={[s.tagline, { color: theme.subtext }]}>Split expenses, stay connected</Text>
          </View>

          {/* Card */}
          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[s.cardTitle, { color: theme.text }]}>Welcome back</Text>

            {/* Google Button */}
            <Pressable
              style={[s.googleBtn, { borderColor: theme.cardBorder }]}
              onPress={handleGoogleLogin}
              disabled={loading}
            >
              <Text style={s.googleIcon}>G</Text>
              <Text style={[s.googleBtnText, { color: theme.text }]}>Continue with Google</Text>
            </Pressable>

            <View style={s.dividerRow}>
              <View style={[s.dividerLine, { backgroundColor: theme.cardBorder }]} />
              <Text style={[s.dividerText, { color: theme.subtext }]}>or</Text>
              <View style={[s.dividerLine, { backgroundColor: theme.cardBorder }]} />
            </View>

            <TextInput
              style={[s.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.cardBorder }]}
              placeholder="Email address"
              placeholderTextColor={theme.subtext}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={[s.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.cardBorder }]}
              placeholder="Password"
              placeholderTextColor={theme.subtext}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Pressable onPress={handleForgotPassword}>
              <Text style={[s.forgotText, { color: theme.primary }]}>Forgot password?</Text>
            </Pressable>

            <Pressable
              style={[s.primaryBtn, { backgroundColor: theme.primary }, loading && s.disabledBtn]}
              onPress={handleEmailLogin}
              disabled={loading}
            >
              <Text style={s.primaryBtnText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
            </Pressable>
          </View>

          <View style={s.footer}>
            <Text style={[s.footerText, { color: theme.subtext }]}>Don't have an account? </Text>
            <Pressable onPress={() => navigation.navigate('Register')}>
              <Text style={[s.footerLink, { color: theme.primary }]}>Create one</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (theme: import('../../theme').Theme) =>
  StyleSheet.create({
    safe: { flex: 1 },
    container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 20 },
    header: { alignItems: 'center', gap: 8 },
    logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    logoEmoji: { fontSize: 36 },
    appName: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
    tagline: { fontSize: 15 },
    card: { borderRadius: 20, padding: 24, borderWidth: 1, gap: 14, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
    cardTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
    googleBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 12, padding: 14, justifyContent: 'center' },
    googleIcon: { fontSize: 18, fontWeight: '800', color: '#4285F4' },
    googleBtnText: { fontSize: 15, fontWeight: '600' },
    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dividerLine: { flex: 1, height: 1 },
    dividerText: { fontSize: 13 },
    input: { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 15 },
    forgotText: { fontSize: 13, fontWeight: '600', textAlign: 'right' },
    primaryBtn: { borderRadius: 14, padding: 16, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    disabledBtn: { opacity: 0.6 },
    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    footerText: { fontSize: 14 },
    footerLink: { fontSize: 14, fontWeight: '700' },
  });
