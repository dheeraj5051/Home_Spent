import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { HomeNavProp } from '../../navigation/types';
import { currencyLabel } from '../../lib/dates';

export default function GroupsScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const { theme, state, updateState } = useApp();
  const s = styles(theme);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: theme.text }]}>Groups</Text>
        <Pressable style={[s.addBtn, { backgroundColor: theme.primary }]} onPress={() => navigation.navigate('CreateGroup')}>
          <Text style={s.addBtnText}>+ New</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {state.groups.length === 0 ? (
          <View style={[s.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={s.emptyIcon}>👥</Text>
            <Text style={[s.emptyTitle, { color: theme.text }]}>No groups yet</Text>
            <Text style={[s.emptyText, { color: theme.subtext }]}>Create a group to start splitting expenses with friends and family.</Text>
            <Pressable style={[s.emptyBtn, { backgroundColor: theme.primary }]} onPress={() => navigation.navigate('CreateGroup')}>
              <Text style={s.emptyBtnText}>Create First Group</Text>
            </Pressable>
          </View>
        ) : (
          state.groups.map(group => {
            const groupExpenses = state.expenses.filter(e => e.groupId === group.id && e.status === 'active');
            const totalSpend = groupExpenses.reduce((sum, e) => sum + e.amount, 0);
            const members = state.membersByGroup[group.id] ?? [];
            const isActive = group.id === state.activeGroupId;

            return (
              <Pressable
                key={group.id}
                style={[s.card, { backgroundColor: theme.card, borderColor: isActive ? theme.primary : theme.cardBorder }]}
                onPress={() => {
                  updateState({ activeGroupId: group.id });
                  navigation.navigate('GroupDetail', { groupId: group.id });
                }}
              >
                <View style={s.cardTop}>
                  <View style={[s.groupAvatar, { backgroundColor: theme.chip }]}>
                    <Text style={{ fontSize: 24 }}>{groupEmoji(group.category ?? '')}</Text>
                  </View>
                  <View style={s.cardInfo}>
                    <View style={s.cardNameRow}>
                      <Text style={[s.cardName, { color: theme.text }]}>{group.name}</Text>
                      {isActive && <View style={[s.activeDot, { backgroundColor: theme.primary }]} />}
                    </View>
                    {group.description ? (
                      <Text style={[s.cardDesc, { color: theme.subtext }]} numberOfLines={1}>{group.description}</Text>
                    ) : null}
                    <View style={s.tagRow}>
                      <View style={[s.tag, { backgroundColor: theme.chip }]}>
                        <Text style={[s.tagText, { color: theme.chipText }]}>{group.category ?? 'General'}</Text>
                      </View>
                      <View style={[s.tag, { backgroundColor: theme.chip }]}>
                        <Text style={[s.tagText, { color: theme.chipText }]}>{group.currency}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={[s.cardDivider, { backgroundColor: theme.divider }]} />

                <View style={s.cardStats}>
                  <View style={s.stat}>
                    <Text style={[s.statValue, { color: theme.text }]}>{currencyLabel(totalSpend, group.currency)}</Text>
                    <Text style={[s.statLabel, { color: theme.subtext }]}>Total spent</Text>
                  </View>
                  <View style={s.stat}>
                    <Text style={[s.statValue, { color: theme.text }]}>{members.length || group.memberCount}</Text>
                    <Text style={[s.statLabel, { color: theme.subtext }]}>Members</Text>
                  </View>
                  <View style={s.stat}>
                    <Text style={[s.statValue, { color: theme.text }]}>{groupExpenses.length}</Text>
                    <Text style={[s.statLabel, { color: theme.subtext }]}>Expenses</Text>
                  </View>
                  {group.budgetLimit && (
                    <View style={s.stat}>
                      <Text style={[s.statValue, { color: totalSpend > group.budgetLimit ? theme.error : theme.success }]}>
                        {Math.round((totalSpend / group.budgetLimit) * 100)}%
                      </Text>
                      <Text style={[s.statLabel, { color: theme.subtext }]}>Budget</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function groupEmoji(category: string): string {
  const map: Record<string, string> = {
    Rent: '🏠', Electricity: '⚡', Food: '🍔', Travel: '✈️',
    Grocery: '🛒', Entertainment: '🎬', Others: '📦',
  };
  return map[category] ?? '🏡';
}

const styles = (theme: import('../../theme').Theme) => StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: '800' },
  addBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  emptyCard: { borderRadius: 20, padding: 36, alignItems: 'center', gap: 10, borderWidth: 1 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: { borderRadius: 18, padding: 16, borderWidth: 1.5, gap: 12, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardTop: { flexDirection: 'row', gap: 12 },
  groupAvatar: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, gap: 4 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 17, fontWeight: '700' },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  cardDesc: { fontSize: 13 },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 11, fontWeight: '600' },
  cardDivider: { height: 1 },
  cardStats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 15, fontWeight: '700' },
  statLabel: { fontSize: 11 },
});
