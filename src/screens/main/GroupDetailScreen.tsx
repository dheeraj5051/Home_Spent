import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { GroupDetailRouteProp, RootNavProp } from '../../navigation/types';
import { currencyLabel, dateLabel, monthKey } from '../../lib/dates';
import { buildBalanceSheet, currentMonthFilter } from '../../lib/settlements';
import { ReminderEntity } from '../../types';

export default function GroupDetailScreen() {
  const navigation = useNavigation<RootNavProp>();
  const route = useRoute<GroupDetailRouteProp>();
  const { theme, state, updateState } = useApp();
  const s = styles(theme);

  const group = state.groups.find(g => g.id === route.params.groupId);
  const members = state.membersByGroup[route.params.groupId] ?? [];
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'members' | 'reminders'>('expenses');
  const [filterMonth, setFilterMonth] = useState(monthKey());
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDesc, setReminderDesc] = useState('');
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  const groupReminders = useMemo(
    () => state.reminders.filter(r => r.groupId === route.params.groupId).sort((a, b) => new Date(a.reminderAt).getTime() - new Date(b.reminderAt).getTime()),
    [state.reminders, route.params.groupId],
  );

  function handleAddReminder() {
    if (!reminderTitle.trim()) { Alert.alert('Required', 'Reminder title is required.'); return; }
    if (!state.profile) return;
    const reminder: ReminderEntity = {
      id: Math.random().toString(36).slice(2),
      groupId: route.params.groupId,
      title: reminderTitle.trim(),
      description: reminderDesc.trim(),
      reminderAt: new Date(Date.now() + 86400000).toISOString(),
      recurringRule: null, attachmentUrl: null, enabled: true,
      createdBy: state.profile.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateState({ reminders: [reminder, ...state.reminders] }, `Added reminder: ${reminder.title}`);
    setReminderTitle(''); setReminderDesc(''); setShowReminderModal(false);
  }

  function handleAddMember() {
    const name = newMemberName.trim();
    if (!name) { Alert.alert('Required', 'Enter a member name.'); return; }
    const existing = members.find(m => m.fullName.toLowerCase() === name.toLowerCase());
    if (existing) { Alert.alert('Already added', `${name} is already in this group.`); return; }
    const newMember = {
      userId: `${route.params.groupId}-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      username: name.toLowerCase().replace(/\s+/g, ''),
      fullName: name,
      role: 'member' as const,
      avatarUrl: null,
      paid: 0, owed: 0, receivable: 0,
      joinedAt: new Date().toISOString(),
    };
    const updatedMembers = [...members, newMember];
    updateState(
      {
        membersByGroup: { ...state.membersByGroup, [route.params.groupId]: updatedMembers },
        groups: state.groups.map(g => g.id === route.params.groupId ? { ...g, memberCount: updatedMembers.length } : g),
      },
      `Added member: ${name}`,
    );
    setNewMemberName('');
    setShowMemberModal(false);
  }
    () => state.expenses
      .filter(e => e.groupId === route.params.groupId && e.status === 'active' && e.monthKey === filterMonth)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [state.expenses, route.params.groupId, filterMonth],
  );

  const currentMonthExpenses = useMemo(
    () => currentMonthFilter(state.expenses.filter(e => e.groupId === route.params.groupId && e.status === 'active')),
    [state.expenses, route.params.groupId],
  );

  const balanceSheet = useMemo(() => buildBalanceSheet(currentMonthExpenses, members), [currentMonthExpenses, members]);
  const totalSpend = groupExpenses.reduce((sum, e) => sum + e.amount, 0);

  function handleDeleteExpense(expenseId: string) {
    Alert.alert('Delete expense', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          updateState({ expenses: state.expenses.map(e => e.id === expenseId ? { ...e, status: 'deleted' as const } : e) }, 'Deleted expense');
        },
      },
    ]);
  }

  if (!group) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
        <Pressable onPress={() => navigation.goBack()} style={s.backRow}>
          <Text style={[s.backText, { color: theme.primary }]}>← Back</Text>
        </Pressable>
        <View style={s.center}><Text style={[s.empty, { color: theme.subtext }]}>Group not found.</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.card, borderBottomColor: theme.cardBorder }]}>
        <Pressable onPress={() => navigation.goBack()} style={s.backRow}>
          <Text style={[s.backText, { color: theme.primary }]}>←</Text>
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: theme.text }]} numberOfLines={1}>{group.name}</Text>
          <Text style={[s.headerSub, { color: theme.subtext }]}>{members.length} members · {group.currency}</Text>
        </View>
        <Pressable
          style={[s.addBtn, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('AddExpense', { groupId: group.id })}
        >
          <Text style={s.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      {/* Stats row */}
      <View style={[s.statsRow, { backgroundColor: theme.card, borderBottomColor: theme.cardBorder }]}>
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: theme.text }]}>{currencyLabel(totalSpend, group.currency)}</Text>
          <Text style={[s.statLbl, { color: theme.subtext }]}>This month</Text>
        </View>
        {group.budgetLimit && (
          <View style={s.statItem}>
            <Text style={[s.statVal, { color: totalSpend > group.budgetLimit ? theme.error : theme.success }]}>
              {currencyLabel(group.budgetLimit, group.currency)}
            </Text>
            <Text style={[s.statLbl, { color: theme.subtext }]}>Budget</Text>
          </View>
        )}
        <View style={s.statItem}>
          <Text style={[s.statVal, { color: theme.text }]}>{groupExpenses.length}</Text>
          <Text style={[s.statLbl, { color: theme.subtext }]}>Expenses</Text>
        </View>
        <Pressable
          style={[s.settleBtn, { backgroundColor: theme.chip }]}
          onPress={() => navigation.navigate('Settlements', { groupId: group.id })}
        >
          <Text style={[s.settleBtnText, { color: theme.primary }]}>Settle Up</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={[s.tabs, { backgroundColor: theme.card, borderBottomColor: theme.cardBorder }]}>
        {(['expenses', 'balances', 'members', 'reminders'] as const).map(tab => (
          <Pressable key={tab} style={[s.tab, activeTab === tab && { borderBottomColor: theme.primary, borderBottomWidth: 2.5 }]} onPress={() => setActiveTab(tab)}>
            <Text style={[s.tabText, { color: activeTab === tab ? theme.primary : theme.subtext }]}>
              {tab === 'expenses' ? 'Expenses' : tab === 'balances' ? 'Balances' : tab === 'members' ? 'Members' : '🔔'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {activeTab === 'expenses' && (
          <>
            {groupExpenses.length === 0 ? (
              <View style={[s.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Text style={s.emptyIcon}>🧾</Text>
                <Text style={[s.emptyText, { color: theme.subtext }]}>No expenses this month.</Text>
                <Pressable style={[s.emptyBtn, { backgroundColor: theme.primary }]} onPress={() => navigation.navigate('AddExpense', { groupId: group.id })}>
                  <Text style={s.emptyBtnText}>Add First Expense</Text>
                </Pressable>
              </View>
            ) : (
              groupExpenses.map(exp => (
                <View key={exp.id} style={[s.expRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <View style={[s.expIcon, { backgroundColor: theme.chip }]}>
                    <Text style={{ fontSize: 20 }}>{catEmoji(exp.category)}</Text>
                  </View>
                  <View style={s.expInfo}>
                    <Text style={[s.expTitle, { color: theme.text }]}>{exp.title}</Text>
                    <Text style={[s.expMeta, { color: theme.subtext }]}>
                      Paid by {members.find(m => m.userId === exp.payerId)?.fullName ?? 'Unknown'} · {dateLabel(exp.expenseDate)}
                    </Text>
                    <Text style={[s.expMeta, { color: theme.subtext }]}>{exp.splitMethod} split · {exp.category}</Text>
                  </View>
                  <View style={s.expRight}>
                    <Text style={[s.expAmount, { color: theme.error }]}>-{currencyLabel(exp.amount, group.currency)}</Text>
                    <Pressable onPress={() => handleDeleteExpense(exp.id)}>
                      <Text style={[s.deleteText, { color: theme.error }]}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {activeTab === 'balances' && (
          <>
            {balanceSheet.length === 0 ? (
              <View style={[s.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Text style={s.emptyIcon}>⚖️</Text>
                <Text style={[s.emptyText, { color: theme.subtext }]}>No balances to show yet.</Text>
              </View>
            ) : (
              balanceSheet.map(member => (
                <View key={member.userId} style={[s.balanceRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <View style={[s.avatar, { backgroundColor: theme.chip }]}>
                    <Text style={[s.avatarText, { color: theme.primary }]}>{member.fullName[0].toUpperCase()}</Text>
                  </View>
                  <View style={s.balanceInfo}>
                    <Text style={[s.balanceName, { color: theme.text }]}>{member.fullName}</Text>
                    <Text style={[s.balanceMeta, { color: theme.subtext }]}>Paid: {currencyLabel(member.paid, group.currency)}</Text>
                  </View>
                  <View style={s.balanceRight}>
                    {member.receivable > 0.5 ? (
                      <Text style={[s.balanceAmt, { color: theme.success }]}>+{currencyLabel(member.receivable, group.currency)}</Text>
                    ) : member.owed > 0.5 ? (
                      <Text style={[s.balanceAmt, { color: theme.error }]}>-{currencyLabel(member.owed, group.currency)}</Text>
                    ) : (
                      <Text style={[s.balanceAmt, { color: theme.subtext }]}>Settled</Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {activeTab === 'members' && (
          <>
            <Pressable style={[s.addReminderBtn, { backgroundColor: theme.primary }]} onPress={() => setShowMemberModal(true)}>
              <Text style={s.addReminderText}>+ Add Member</Text>
            </Pressable>
            {members.length === 0 ? (
              <View style={[s.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Text style={s.emptyIcon}>👤</Text>
                <Text style={[s.emptyText, { color: theme.subtext }]}>No members yet.</Text>
              </View>
            ) : (
              members.map(member => (
                <View key={member.userId} style={[s.balanceRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <View style={[s.avatar, { backgroundColor: theme.chip }]}>
                    <Text style={[s.avatarText, { color: theme.primary }]}>{member.fullName[0].toUpperCase()}</Text>
                  </View>
                  <View style={s.balanceInfo}>
                    <Text style={[s.balanceName, { color: theme.text }]}>{member.fullName}</Text>
                    <Text style={[s.balanceMeta, { color: theme.subtext }]}>@{member.username} · {member.role}</Text>
                  </View>
                  <View style={s.memberActions}>
                    <View style={[s.roleTag, { backgroundColor: member.role === 'admin' ? theme.chip : theme.input }]}>
                      <Text style={[s.roleTagText, { color: member.role === 'admin' ? theme.primary : theme.subtext }]}>{member.role}</Text>
                    </View>
                    {member.role !== 'admin' && (
                      <Pressable onPress={() => Alert.alert(
                        'Remove member',
                        `Remove ${member.fullName} from this group?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => {
                            const updated = members.filter(m => m.userId !== member.userId);
                            updateState(
                              {
                                membersByGroup: { ...state.membersByGroup, [route.params.groupId]: updated },
                                groups: state.groups.map(g => g.id === route.params.groupId ? { ...g, memberCount: updated.length } : g),
                              },
                              `Removed member: ${member.fullName}`,
                            );
                          }},
                        ],
                      )}>
                        <Text style={[s.removeText, { color: theme.error }]}>Remove</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {activeTab === 'reminders' && (
          <>
            <Pressable style={[s.addReminderBtn, { backgroundColor: theme.primary }]} onPress={() => setShowReminderModal(true)}>
              <Text style={s.addReminderText}>+ Add Reminder</Text>
            </Pressable>
            {groupReminders.length === 0 ? (
              <View style={[s.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Text style={s.emptyIcon}>🔔</Text>
                <Text style={[s.emptyText, { color: theme.subtext }]}>No reminders yet.</Text>
              </View>
            ) : (
              groupReminders.map(reminder => (
                <View key={reminder.id} style={[s.balanceRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <View style={[s.avatar, { backgroundColor: reminder.enabled ? '#D1FAE5' : theme.chip }]}>
                    <Text style={{ fontSize: 20 }}>🔔</Text>
                  </View>
                  <View style={s.balanceInfo}>
                    <Text style={[s.balanceName, { color: theme.text }]}>{reminder.title}</Text>
                    {reminder.description ? <Text style={[s.balanceMeta, { color: theme.subtext }]}>{reminder.description}</Text> : null}
                  </View>
                  <Pressable onPress={() => updateState({ reminders: state.reminders.filter(r => r.id !== reminder.id) })}>
                    <Text style={[s.deleteText, { color: theme.error }]}>Delete</Text>
                  </Pressable>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Add Member Modal */}
      <Modal visible={showMemberModal} animationType="slide" transparent onRequestClose={() => setShowMemberModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[s.modalTitle, { color: theme.text }]}>Add Member</Text>
            <TextInput
              style={[s.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.cardBorder }]}
              placeholder="Full name *"
              placeholderTextColor={theme.subtext}
              value={newMemberName}
              onChangeText={setNewMemberName}
              autoFocus
            />
            <Text style={[s.modalHint, { color: theme.subtext }]}>They will be added to the balance sheet automatically.</Text>
            <View style={s.modalBtns}>
              <Pressable style={[s.modalBtn, { backgroundColor: theme.primary }]} onPress={handleAddMember}>
                <Text style={s.modalBtnText}>Add</Text>
              </Pressable>
              <Pressable style={[s.modalBtn, { backgroundColor: theme.chip }]} onPress={() => { setShowMemberModal(false); setNewMemberName(''); }}>
                <Text style={[s.modalBtnText, { color: theme.chipText }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Reminder Modal */}
      <Modal visible={showReminderModal} animationType="slide" transparent onRequestClose={() => setShowReminderModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[s.modalTitle, { color: theme.text }]}>New Reminder</Text>
            <TextInput
              style={[s.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.cardBorder }]}
              placeholder="Reminder title *"
              placeholderTextColor={theme.subtext}
              value={reminderTitle}
              onChangeText={setReminderTitle}
            />
            <TextInput
              style={[s.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.cardBorder }]}
              placeholder="Description (optional)"
              placeholderTextColor={theme.subtext}
              value={reminderDesc}
              onChangeText={setReminderDesc}
            />
            <View style={s.modalBtns}>
              <Pressable style={[s.modalBtn, { backgroundColor: theme.primary }]} onPress={handleAddReminder}>
                <Text style={s.modalBtnText}>Save</Text>
              </Pressable>
              <Pressable style={[s.modalBtn, { backgroundColor: theme.chip }]} onPress={() => setShowReminderModal(false)}>
                <Text style={[s.modalBtnText, { color: theme.chipText }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function catEmoji(cat: string) {
  const map: Record<string, string> = { Rent: '🏠', Electricity: '⚡', Food: '🍔', Grocery: '🛒', Internet: '📡', Gas: '⛽', Travel: '✈️', Medical: '💊', Entertainment: '🎬', Shopping: '🛍️', Maintenance: '🔧', Subscription: '📱', Others: '📦' };
  return map[cat] ?? '📦';
}

const styles = (theme: import('../../theme').Theme) => StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  backRow: { paddingRight: 8 },
  backText: { fontSize: 22, fontWeight: '700' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 16 },
  statItem: { alignItems: 'center', flex: 1 },
  statVal: { fontSize: 14, fontWeight: '700' },
  statLbl: { fontSize: 10, marginTop: 2 },
  settleBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  settleBtnText: { fontSize: 12, fontWeight: '700' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '600' },
  scroll: { padding: 14, gap: 10, paddingBottom: 32 },
  emptyCard: { borderRadius: 16, padding: 32, alignItems: 'center', gap: 10, borderWidth: 1, marginTop: 20 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  expRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  expIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  expInfo: { flex: 1, gap: 2 },
  expTitle: { fontSize: 15, fontWeight: '600' },
  expMeta: { fontSize: 11 },
  expRight: { alignItems: 'flex-end', gap: 4 },
  expAmount: { fontSize: 15, fontWeight: '700' },
  deleteText: { fontSize: 11, fontWeight: '600' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  balanceInfo: { flex: 1 },
  balanceName: { fontSize: 15, fontWeight: '600' },
  balanceMeta: { fontSize: 12, marginTop: 2 },
  balanceRight: { alignItems: 'flex-end' },
  balanceAmt: { fontSize: 15, fontWeight: '700' },
  roleTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleTagText: { fontSize: 11, fontWeight: '700' },
  memberActions: { alignItems: 'flex-end', gap: 4 },
  removeText: { fontSize: 11, fontWeight: '600' },
  addReminderBtn: { borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 4 },
  addReminderText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalHint: { fontSize: 12, marginTop: -6 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
