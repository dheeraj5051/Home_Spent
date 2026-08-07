import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { HomeNavProp } from '../../navigation/types';
import { currencyLabel, dateLabel } from '../../lib/dates';
import { currentMonthFilter } from '../../lib/settlements';

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const { theme, state, isOnline } = useApp();
  const s = styles(theme);

  const activeGroup = state.groups.find(g => g.id === state.activeGroupId) ?? state.groups[0];
  const groupExpenses = useMemo(
    () => currentMonthFilter(state.expenses.filter(e => e.groupId === activeGroup?.id && e.status === 'active')),
    [state.expenses, activeGroup?.id],
  );
  const monthTotal = groupExpenses.reduce((sum, e) => sum + e.amount, 0);
  const recentExpenses = [...state.expenses]
    .filter(e => e.status === 'active')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={s.topBar}>
          <View>
            <Text style={[s.greeting, { color: theme.subtext }]}>{greeting()},</Text>
            <Text style={[s.userName, { color: theme.text }]}>{state.profile?.fullName ?? 'User'} 👋</Text>
          </View>
          <View style={[s.badge, { backgroundColor: isOnline ? '#D1FAE5' : '#FEF3C7' }]}>
            <Text style={[s.badgeText, { color: isOnline ? '#065F46' : '#92400E' }]}>
              {isOnline ? '🟢 Online' : '🟡 Offline'}
            </Text>
          </View>
        </View>

        {/* Summary card */}
        <View style={[s.summaryCard, { backgroundColor: theme.primary }]}>
          <Text style={s.summaryLabel}>This month's spending</Text>
          <Text style={s.summaryAmount}>{currencyLabel(monthTotal, activeGroup?.currency ?? 'INR')}</Text>
          {activeGroup && (
            <Text style={s.summaryGroup}>in {activeGroup.name}</Text>
          )}
          {activeGroup?.budgetLimit && (
            <View style={s.budgetRow}>
              <View style={s.budgetTrack}>
                <View style={[s.budgetFill, { width: `${Math.min(100, (monthTotal / activeGroup.budgetLimit) * 100)}%` as `${number}%` }]} />
              </View>
              <Text style={s.budgetText}>{Math.round((monthTotal / activeGroup.budgetLimit) * 100)}% of budget</Text>
            </View>
          )}
        </View>

        {/* Quick actions */}
        <View style={s.quickRow}>
          <Pressable
            style={[s.quickBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => navigation.navigate('CreateGroup')}
          >
            <Text style={s.quickIcon}>➕</Text>
            <Text style={[s.quickLabel, { color: theme.text }]}>New Group</Text>
          </Pressable>
          <Pressable
            style={[s.quickBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => activeGroup ? navigation.navigate('AddExpense', { groupId: activeGroup.id }) : null}
          >
            <Text style={s.quickIcon}>💳</Text>
            <Text style={[s.quickLabel, { color: theme.text }]}>Add Expense</Text>
          </Pressable>
          <Pressable
            style={[s.quickBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => activeGroup ? navigation.navigate('Settlements', { groupId: activeGroup.id }) : null}
          >
            <Text style={s.quickIcon}>🤝</Text>
            <Text style={[s.quickLabel, { color: theme.text }]}>Settle Up</Text>
          </Pressable>
        </View>

        {/* Groups summary */}
        {state.groups.length > 0 && (
          <View>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: theme.text }]}>Your Groups</Text>
              <Pressable onPress={() => navigation.navigate('Groups')}>
                <Text style={[s.seeAll, { color: theme.primary }]}>See all</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.groupsRow}>
              {state.groups.slice(0, 5).map(group => (
                <Pressable
                  key={group.id}
                  style={[s.groupChip, { backgroundColor: group.id === activeGroup?.id ? theme.primary : theme.card, borderColor: theme.cardBorder }]}
                  onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
                >
                  <Text style={[s.groupChipName, { color: group.id === activeGroup?.id ? '#fff' : theme.text }]}>{group.name}</Text>
                  <Text style={[s.groupChipSub, { color: group.id === activeGroup?.id ? 'rgba(255,255,255,0.8)' : theme.subtext }]}>
                    {group.memberCount} members
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent expenses */}
        <View>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Recent Expenses</Text>
          {recentExpenses.length === 0 ? (
            <View style={[s.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={s.emptyIcon}>🧾</Text>
              <Text style={[s.emptyText, { color: theme.subtext }]}>No expenses yet. Add your first one!</Text>
              <Pressable
                style={[s.emptyBtn, { backgroundColor: theme.primary }]}
                onPress={() => activeGroup ? navigation.navigate('AddExpense', { groupId: activeGroup.id }) : navigation.navigate('CreateGroup')}
              >
                <Text style={s.emptyBtnText}>
                  {activeGroup ? 'Add Expense' : 'Create a Group First'}
                </Text>
              </Pressable>
            </View>
          ) : (
            recentExpenses.map(exp => {
              const grp = state.groups.find(g => g.id === exp.groupId);
              return (
                <View key={exp.id} style={[s.expenseRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <View style={[s.expenseDot, { backgroundColor: theme.chip }]}>
                    <Text style={{ fontSize: 18 }}>{categoryEmoji(exp.category)}</Text>
                  </View>
                  <View style={s.expenseInfo}>
                    <Text style={[s.expenseTitle, { color: theme.text }]}>{exp.title}</Text>
                    <Text style={[s.expenseMeta, { color: theme.subtext }]}>{grp?.name ?? ''} · {dateLabel(exp.expenseDate)}</Text>
                  </View>
                  <Text style={[s.expenseAmount, { color: theme.error }]}>
                    -{currencyLabel(exp.amount, grp?.currency ?? 'INR')}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function categoryEmoji(category: string): string {
  const map: Record<string, string> = {
    Rent: '🏠', Electricity: '⚡', Water: '💧', Internet: '📡', Food: '🍔',
    Grocery: '🛒', Gas: '⛽', Shopping: '🛍️', Travel: '✈️', Medical: '💊',
    Entertainment: '🎬', Maintenance: '🔧', Subscription: '📱', Others: '📦',
  };
  return map[category] ?? '📦';
}

const styles = (theme: import('../../theme').Theme) => StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, gap: 20, paddingBottom: 32 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { fontSize: 14 },
  userName: { fontSize: 22, fontWeight: '800' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  summaryCard: { borderRadius: 20, padding: 24, gap: 6 },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  summaryAmount: { color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  summaryGroup: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  budgetRow: { marginTop: 8, gap: 6 },
  budgetTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden' },
  budgetFill: { height: 6, backgroundColor: '#fff', borderRadius: 3 },
  budgetText: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  quickRow: { flexDirection: 'row', gap: 12 },
  quickBtn: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', gap: 6, borderWidth: 1, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  quickIcon: { fontSize: 26 },
  quickLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '600' },
  groupsRow: { gap: 10, paddingBottom: 4 },
  groupChip: { borderRadius: 14, padding: 14, borderWidth: 1, minWidth: 120, gap: 4, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  groupChipName: { fontSize: 14, fontWeight: '700' },
  groupChipSub: { fontSize: 11 },
  emptyCard: { borderRadius: 16, padding: 32, alignItems: 'center', gap: 10, borderWidth: 1 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  emptyBtn: { marginTop: 4, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 8, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  expenseDot: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  expenseInfo: { flex: 1 },
  expenseTitle: { fontSize: 15, fontWeight: '600' },
  expenseMeta: { fontSize: 12, marginTop: 2 },
  expenseAmount: { fontSize: 15, fontWeight: '700' },
});
