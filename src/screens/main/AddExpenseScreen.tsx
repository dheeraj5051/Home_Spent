import React, { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { AddExpenseRouteProp, RootNavProp } from '../../navigation/types';
import { CATEGORIES } from '../../constants';
import { ExpenseEntity, SplitMethod } from '../../types';
import { monthKey } from '../../lib/dates';
import { upsertExpense } from '../../lib/supabase';

const SPLIT_METHODS: { key: SplitMethod; label: string }[] = [
  { key: 'equal', label: 'Equal' },
  { key: 'percentage', label: 'Percentage' },
  { key: 'custom', label: 'Custom' },
  { key: 'exact', label: 'Exact' },
];

export default function AddExpenseScreen() {
  const navigation = useNavigation<RootNavProp>();
  const route = useRoute<AddExpenseRouteProp>();
  const { theme, state, updateState, generateId, calculateSplits } = useApp();
  const s = styles(theme);

  const group = state.groups.find(g => g.id === route.params.groupId);
  const members = state.membersByGroup[route.params.groupId] ?? [];

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [payerIndex, setPayerIndex] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) { Alert.alert('Required', 'Expense title is required.'); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { Alert.alert('Invalid amount', 'Enter a valid amount.'); return; }
    if (!state.profile) { Alert.alert('Not signed in'); return; }

    setSaving(true);
    const payer = members[payerIndex] ?? members[0];
    const now = new Date();
    const expense: ExpenseEntity = {
      id: generateId(),
      groupId: route.params.groupId,
      title: title.trim(),
      description: notes.trim(),
      amount: amt,
      payerId: payer?.userId ?? state.profile.id,
      splitMethod,
      category,
      tags: [category.toLowerCase()],
      notes: notes.trim(),
      expenseDate: now.toISOString(),
      expenseTime: now.toISOString(),
      gpsLocation: null,
      receiptUrl: null,
      status: 'active',
      createdBy: state.profile.id,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      monthKey: monthKey(now.toISOString()),
      splits: calculateSplits(amt, splitMethod, members.map(m => ({ userId: m.userId }))),
      attachments: [],
    };

    try {
      await upsertExpense(expense).catch(() => null);
      updateState({ expenses: [expense, ...state.expenses] }, `Added expense: ${expense.title}`);
      navigation.goBack();
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
          <Text style={[s.title, { color: theme.text }]}>Add Expense</Text>
          <Text style={[s.groupName, { color: theme.subtext }]}>{group?.name ?? ''}</Text>
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Main inputs */}
          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <TextInput
              style={[s.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.cardBorder }]}
              placeholder="Expense title *"
              placeholderTextColor={theme.subtext}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[s.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.cardBorder }]}
              placeholder={`Amount (${group?.currency ?? 'INR'}) *`}
              placeholderTextColor={theme.subtext}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
            <TextInput
              style={[s.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.cardBorder }]}
              placeholder="Notes (optional)"
              placeholderTextColor={theme.subtext}
              value={notes}
              onChangeText={setNotes}
            />
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

          {/* Split method */}
          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[s.sectionLabel, { color: theme.subtext }]}>SPLIT METHOD</Text>
            <View style={s.splitRow}>
              {SPLIT_METHODS.map(({ key, label }) => (
                <Pressable
                  key={key}
                  style={[s.splitBtn, { backgroundColor: splitMethod === key ? theme.primary : theme.chip }]}
                  onPress={() => setSplitMethod(key)}
                >
                  <Text style={[s.splitBtnText, { color: splitMethod === key ? '#fff' : theme.chipText }]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Paid by */}
          {members.length > 0 && (
            <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[s.sectionLabel, { color: theme.subtext }]}>PAID BY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.payerRow}>
                {members.map((member, idx) => (
                  <Pressable
                    key={member.userId}
                    style={[s.payerBtn, { backgroundColor: payerIndex === idx ? theme.primary : theme.chip, borderColor: payerIndex === idx ? theme.primary : theme.cardBorder }]}
                    onPress={() => setPayerIndex(idx)}
                  >
                    <View style={[s.payerAvatar, { backgroundColor: payerIndex === idx ? 'rgba(255,255,255,0.2)' : theme.input }]}>
                      <Text style={[s.payerAvatarText, { color: payerIndex === idx ? '#fff' : theme.primary }]}>
                        {member.fullName[0].toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[s.payerName, { color: payerIndex === idx ? '#fff' : theme.text }]} numberOfLines={1}>
                      {member.fullName}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <Pressable
            style={[s.saveBtn, { backgroundColor: theme.primary }, saving && s.disabledBtn]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save Expense'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (theme: import('../../theme').Theme) => StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  backBtn: { marginBottom: 4 },
  backText: { fontSize: 15, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '800' },
  groupName: { fontSize: 13, marginTop: 2 },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { borderRadius: 18, padding: 16, borderWidth: 1, gap: 12, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 15 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontWeight: '600' },
  splitRow: { flexDirection: 'row', gap: 8 },
  splitBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  splitBtnText: { fontSize: 13, fontWeight: '600' },
  payerRow: { gap: 10 },
  payerBtn: { alignItems: 'center', padding: 10, borderRadius: 14, borderWidth: 1.5, gap: 6, minWidth: 70 },
  payerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  payerAvatarText: { fontSize: 18, fontWeight: '700' },
  payerName: { fontSize: 11, fontWeight: '600', maxWidth: 70 },
  saveBtn: { borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  disabledBtn: { opacity: 0.6 },
});
