import React, { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { RootNavProp } from '../../navigation/types';
import { CATEGORIES } from '../../constants';
import { upsertGroup } from '../../lib/supabase';
import { GroupEntity } from '../../types';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD'];

export default function CreateGroupScreen() {
  const navigation = useNavigation<RootNavProp>();
  const { theme, state, updateState, generateId, generateGroupCode, buildMembers } = useApp();
  const s = styles(theme);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [category, setCategory] = useState('Others');
  const [budget, setBudget] = useState('');
  const [membersText, setMembersText] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) { Alert.alert('Required', 'Group name is required.'); return; }
    if (!state.profile) { Alert.alert('Not signed in', 'Please sign in first.'); return; }

    setSaving(true);
    const now = new Date();
    const id = generateId();
    const group: GroupEntity = {
      id,
      groupId: generateGroupCode(),
      name: name.trim(),
      description: description.trim(),
      imageUrl: null,
      currency,
      startDate: now.toISOString(),
      endDate: null,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      budgetLimit: budget ? Number(budget) : null,
      category,
      ownerId: state.profile.id,
      createdAt: now.toISOString(),
      memberCount: 1,
      role: 'admin',
      favorite: false,
    };

    const memberNames = [
      state.profile.fullName,
      ...membersText.split(',').map(m => m.trim()).filter(Boolean),
    ];
    const members = buildMembers(id, memberNames);
    group.memberCount = members.length;

    try {
      await upsertGroup(group).catch(() => null);
      updateState(
        {
          groups: [group, ...state.groups],
          membersByGroup: { ...state.membersByGroup, [id]: members },
          activeGroupId: id,
        },
        `Created group ${group.name}`,
      );
      navigation.replace('GroupDetail', { groupId: id });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={[s.backText, { color: theme.primary }]}>← Back</Text>
          </Pressable>
          <Text style={[s.title, { color: theme.text }]}>New Group</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[s.sectionLabel, { color: theme.subtext }]}>GROUP DETAILS</Text>

            <TextInput
              style={[s.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.cardBorder }]}
              placeholder="Group name *"
              placeholderTextColor={theme.subtext}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[s.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.cardBorder }]}
              placeholder="Description (optional)"
              placeholderTextColor={theme.subtext}
              value={description}
              onChangeText={setDescription}
            />
            <TextInput
              style={[s.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.cardBorder }]}
              placeholder="Budget limit (optional)"
              placeholderTextColor={theme.subtext}
              keyboardType="numeric"
              value={budget}
              onChangeText={setBudget}
            />
          </View>

          {/* Currency */}
          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[s.sectionLabel, { color: theme.subtext }]}>CURRENCY</Text>
            <View style={s.chipRow}>
              {CURRENCIES.map(c => (
                <Pressable
                  key={c}
                  style={[s.chip, { backgroundColor: currency === c ? theme.primary : theme.chip, borderColor: currency === c ? theme.primary : theme.cardBorder }]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={[s.chipText, { color: currency === c ? '#fff' : theme.chipText }]}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Category */}
          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[s.sectionLabel, { color: theme.subtext }]}>CATEGORY</Text>
            <View style={s.chipRow}>
              {CATEGORIES.map(cat => (
                <Pressable
                  key={cat}
                  style={[s.chip, { backgroundColor: category === cat ? theme.primary : theme.chip, borderColor: category === cat ? theme.primary : theme.cardBorder }]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[s.chipText, { color: category === cat ? '#fff' : theme.chipText }]}>{cat}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Members */}
          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[s.sectionLabel, { color: theme.subtext }]}>MEMBERS</Text>
            <Text style={[s.hint, { color: theme.subtext }]}>You are added automatically. Enter other member names separated by commas.</Text>
            <TextInput
              style={[s.input, s.multiline, { backgroundColor: theme.input, color: theme.text, borderColor: theme.cardBorder }]}
              placeholder="e.g. Rahul, Priya, Amit"
              placeholderTextColor={theme.subtext}
              value={membersText}
              onChangeText={setMembersText}
              multiline
            />
          </View>

          <Pressable
            style={[s.createBtn, { backgroundColor: theme.primary }, saving && s.disabledBtn]}
            onPress={handleCreate}
            disabled={saving}
          >
            <Text style={s.createBtnText}>{saving ? 'Creating…' : 'Create Group'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (theme: import('../../theme').Theme) => StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 60 },
  backText: { fontSize: 15, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800' },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { borderRadius: 18, padding: 16, borderWidth: 1, gap: 12, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 15 },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  hint: { fontSize: 12, lineHeight: 18 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontWeight: '600' },
  createBtn: { borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 4 },
  createBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  disabledBtn: { opacity: 0.6 },
});
