import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';
import { useApp, ThemeMode } from '../../context/AppContext';
import { currencyLabel, dateLabel } from '../../lib/dates';
import { exportCsv, shareCsv } from '../../lib/csv';

export default function ProfileScreen() {
  const { theme, state, isOnline, themeMode, setThemeModeValue, pinHash, setPinHashValue, logout, deleteAccount, syncData } = useApp();
  const s = styles(theme);

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [showPinForm, setShowPinForm] = useState(false);
  const [showDanger, setShowDanger] = useState(false);

  const profile = state.profile;
  const totalExpenses = state.expenses.filter(e => e.status === 'active').length;
  const totalSpend = state.expenses.filter(e => e.status === 'active').reduce((sum, e) => sum + e.amount, 0);

  async function handleSetPin() {
    if (!/^\d{4,6}$/.test(newPin)) { Alert.alert('Invalid PIN', 'Use 4–6 digits.'); return; }
    if (pinHash) {
      const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, currentPin);
      if (hash !== pinHash) { Alert.alert('Wrong PIN', 'Current PIN is incorrect.'); return; }
    }
    const nextHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, newPin);
    await setPinHashValue(nextHash);
    setCurrentPin(''); setNewPin(''); setShowPinForm(false);
    Alert.alert('PIN set', 'App lock is now enabled.');
  }

  async function handleRemovePin() {
    if (!pinHash) return;
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, currentPin);
    if (hash !== pinHash) { Alert.alert('Wrong PIN'); return; }
    await setPinHashValue(null);
    setCurrentPin(''); setShowPinForm(false);
    Alert.alert('PIN removed', 'App lock disabled.');
  }

  async function handleExport() {
    try {
      const expenses = state.expenses.filter(e => e.status === 'active');
      const uri = await exportCsv(expenses);
      if (uri) await shareCsv(uri);
    } catch { Alert.alert('Export failed'); }
  }

  function handleLogout() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert('Delete account', 'This will permanently delete your account and all data. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteAccount() },
    ]);
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View style={[s.profileCard, { backgroundColor: theme.primary }]}>
          <View style={s.profileAvatar}>
            <Text style={s.profileAvatarText}>{(profile?.fullName ?? 'U')[0].toUpperCase()}</Text>
          </View>
          <Text style={s.profileName}>{profile?.fullName ?? 'User'}</Text>
          <Text style={s.profileEmail}>{profile?.email ?? ''}</Text>
          <View style={[s.onlineBadge, { backgroundColor: isOnline ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)' }]}>
            <Text style={[s.onlineText, { color: isOnline ? '#D1FAE5' : '#FDE68A' }]}>
              {isOnline ? '🟢 Online' : '🟡 Offline'}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { value: state.groups.length.toString(), label: 'Groups' },
            { value: totalExpenses.toString(), label: 'Expenses' },
            { value: currencyLabel(totalSpend, 'INR', true), label: 'Total Spent' },
          ].map(stat => (
            <View key={stat.label} style={[s.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[s.statValue, { color: theme.text }]}>{stat.value}</Text>
              <Text style={[s.statLabel, { color: theme.subtext }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Appearance */}
        <View style={[s.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Appearance</Text>
          <View style={s.themeRow}>
            {(['light', 'dark', 'system'] as ThemeMode[]).map(mode => (
              <Pressable
                key={mode}
                style={[s.themeBtn, { backgroundColor: themeMode === mode ? theme.primary : theme.chip }]}
                onPress={() => setThemeModeValue(mode)}
              >
                <Text style={s.themeBtnIcon}>{mode === 'light' ? '☀️' : mode === 'dark' ? '🌙' : '🔄'}</Text>
                <Text style={[s.themeBtnText, { color: themeMode === mode ? '#fff' : theme.chipText }]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Security */}
        <View style={[s.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Security</Text>
          <View style={s.row}>
            <Text style={[s.rowLabel, { color: theme.text }]}>App Lock (PIN)</Text>
            <Switch
              value={Boolean(pinHash)}
              onValueChange={() => setShowPinForm(!showPinForm)}
              trackColor={{ false: theme.divider, true: theme.primary }}
              thumbColor="#fff"
            />
          </View>
          {showPinForm && (
            <View style={s.pinForm}>
              {pinHash && (
                <TextInput
                  style={[s.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.cardBorder }]}
                  placeholder="Current PIN"
                  placeholderTextColor={theme.subtext}
                  secureTextEntry
                  keyboardType="number-pad"
                  value={currentPin}
                  onChangeText={setCurrentPin}
                />
              )}
              {!pinHash && (
                <TextInput
                  style={[s.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.cardBorder }]}
                  placeholder="New PIN (4–6 digits)"
                  placeholderTextColor={theme.subtext}
                  secureTextEntry
                  keyboardType="number-pad"
                  value={newPin}
                  onChangeText={setNewPin}
                />
              )}
              <View style={s.pinBtns}>
                {!pinHash && (
                  <Pressable style={[s.smallBtn, { backgroundColor: theme.primary }]} onPress={handleSetPin}>
                    <Text style={s.smallBtnText}>Set PIN</Text>
                  </Pressable>
                )}
                {pinHash && (
                  <Pressable style={[s.smallBtn, { backgroundColor: theme.error }]} onPress={handleRemovePin}>
                    <Text style={s.smallBtnText}>Remove PIN</Text>
                  </Pressable>
                )}
                <Pressable style={[s.smallBtn, { backgroundColor: theme.chip }]} onPress={() => { setShowPinForm(false); setCurrentPin(''); setNewPin(''); }}>
                  <Text style={[s.smallBtnText, { color: theme.chipText }]}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Data */}
        <View style={[s.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Data</Text>
          <Pressable style={[s.actionRow, { borderBottomColor: theme.divider }]} onPress={handleExport}>
            <Text style={[s.actionIcon]}>📤</Text>
            <Text style={[s.actionLabel, { color: theme.text }]}>Export CSV</Text>
            <Text style={[s.actionArrow, { color: theme.subtext }]}>›</Text>
          </Pressable>
          <Pressable style={[s.actionRow, { borderBottomColor: theme.divider }]} onPress={syncData}>
            <Text style={s.actionIcon}>🔄</Text>
            <Text style={[s.actionLabel, { color: theme.text }]}>Sync Now</Text>
            <Text style={[s.actionArrow, { color: theme.subtext }]}>›</Text>
          </Pressable>
        </View>

        {/* Account */}
        <View style={[s.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Account</Text>
          <Pressable style={[s.actionRow, { borderBottomColor: theme.divider }]} onPress={handleLogout}>
            <Text style={s.actionIcon}>🚪</Text>
            <Text style={[s.actionLabel, { color: theme.error }]}>Sign Out</Text>
            <Text style={[s.actionArrow, { color: theme.subtext }]}>›</Text>
          </Pressable>
          <Pressable style={s.actionRow} onPress={() => setShowDanger(!showDanger)}>
            <Text style={s.actionIcon}>⚠️</Text>
            <Text style={[s.actionLabel, { color: theme.error }]}>Danger Zone</Text>
            <Text style={[s.actionArrow, { color: theme.subtext }]}>{showDanger ? '∨' : '›'}</Text>
          </Pressable>
          {showDanger && (
            <Pressable style={[s.deleteBtn, { borderColor: theme.error }]} onPress={handleDeleteAccount}>
              <Text style={[s.deleteBtnText, { color: theme.error }]}>🗑️ Delete My Account</Text>
            </Pressable>
          )}
        </View>

        <Text style={[s.version, { color: theme.subtext }]}>SplitNest v1.0.0 · Built with Expo + Supabase</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: import('../../theme').Theme) => StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  profileCard: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 6 },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  profileAvatarText: { fontSize: 36, color: '#fff', fontWeight: '700' },
  profileName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  profileEmail: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  onlineBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  onlineText: { fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11 },
  section: { borderRadius: 18, padding: 16, borderWidth: 1, gap: 12, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  themeRow: { flexDirection: 'row', gap: 8 },
  themeBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, gap: 4 },
  themeBtnIcon: { fontSize: 20 },
  themeBtnText: { fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '500' },
  pinForm: { gap: 10 },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 15 },
  pinBtns: { flexDirection: 'row', gap: 8 },
  smallBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  smallBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 0 },
  actionIcon: { fontSize: 20, width: 28 },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  actionArrow: { fontSize: 18, fontWeight: '600' },
  deleteBtn: { borderWidth: 1.5, borderRadius: 12, padding: 14, alignItems: 'center' },
  deleteBtnText: { fontSize: 14, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 12, paddingTop: 4 },
});
