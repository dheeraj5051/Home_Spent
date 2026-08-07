import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { RootNavProp, SettlementsRouteProp } from '../../navigation/types';
import { currencyLabel } from '../../lib/dates';
import { buildBalanceSheet, currentMonthFilter } from '../../lib/settlements';

// Compute minimal settlement suggestions (greedy creditor-debtor matching)
function getSettlementSuggestions(sheet: import('../../types').MemberSummary[]) {
  const creditors = sheet.filter(m => m.receivable > 0.5).map(m => ({ userId: m.userId, amount: m.receivable }));
  const debtors = sheet.filter(m => m.owed > 0.5).map(m => ({ userId: m.userId, amount: m.owed }));
  const suggestions: { fromUserId: string; toUserId: string; amount: number }[] = [];
  let ci = 0; let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const settle = Math.min(creditors[ci].amount, debtors[di].amount);
    suggestions.push({ fromUserId: debtors[di].userId, toUserId: creditors[ci].userId, amount: Number(settle.toFixed(2)) });
    creditors[ci].amount -= settle; debtors[di].amount -= settle;
    if (creditors[ci].amount < 0.5) ci++;
    if (debtors[di].amount < 0.5) di++;
  }
  return suggestions;
}
import { SettlementEntity } from '../../types';

export default function SettlementsScreen() {
  const navigation = useNavigation<RootNavProp>();
  const route = useRoute<SettlementsRouteProp>();
  const { theme, state, updateState, generateId } = useApp();
  const s = styles(theme);

  const group = state.groups.find(g => g.id === route.params.groupId);
  const members = state.membersByGroup[route.params.groupId] ?? [];
  const groupExpenses = useMemo(
    () => currentMonthFilter(state.expenses.filter(e => e.groupId === route.params.groupId && e.status === 'active')),
    [state.expenses, route.params.groupId],
  );
  const balanceSheet = useMemo(() => buildBalanceSheet(groupExpenses, members), [groupExpenses, members]);
  const suggestions = useMemo(() => getSettlementSuggestions(balanceSheet), [balanceSheet]);
  const groupSettlements = state.settlements.filter(s => s.groupId === route.params.groupId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  function recordSettlement(fromUserId: string, toUserId: string, amount: number, status: SettlementEntity['status']) {
    if (!state.profile || !group) return;
    const settlement: SettlementEntity = {
      id: generateId(),
      groupId: group.id,
      fromUserId,
      toUserId,
      amount,
      status,
      note: null,
      proofUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateState({ settlements: [settlement, ...state.settlements] }, `Settlement recorded`);
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
      <View style={[s.header, { backgroundColor: theme.card, borderBottomColor: theme.cardBorder }]}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={[s.backText, { color: theme.primary }]}>← Back</Text>
        </Pressable>
        <Text style={[s.title, { color: theme.text }]}>Settle Up</Text>
        <Text style={[s.subtitle, { color: theme.subtext }]}>{group?.name ?? ''}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Balances */}
        <Text style={[s.sectionTitle, { color: theme.text }]}>Current Balances</Text>
        {balanceSheet.length === 0 ? (
          <View style={[s.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={s.emptyIcon}>✅</Text>
            <Text style={[s.emptyText, { color: theme.subtext }]}>Everyone is settled up!</Text>
          </View>
        ) : (
          balanceSheet.map(member => (
            <View key={member.userId} style={[s.balanceRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={[s.avatar, { backgroundColor: theme.chip }]}>
                <Text style={[s.avatarText, { color: theme.primary }]}>{member.fullName[0].toUpperCase()}</Text>
              </View>
              <View style={s.balanceInfo}>
                <Text style={[s.memberName, { color: theme.text }]}>{member.fullName}</Text>
                <Text style={[s.memberSub, { color: theme.subtext }]}>Paid {currencyLabel(member.paid, group?.currency)}</Text>
              </View>
              {member.receivable > 0.5 ? (
                <Text style={[s.balanceAmt, { color: theme.success }]}>+{currencyLabel(member.receivable, group?.currency)}</Text>
              ) : member.owed > 0.5 ? (
                <Text style={[s.balanceAmt, { color: theme.error }]}>-{currencyLabel(member.owed, group?.currency)}</Text>
              ) : (
                <Text style={[s.balanceAmt, { color: theme.subtext }]}>✓ Even</Text>
              )}
            </View>
          ))
        )}

        {/* Suggested settlements */}
        {suggestions.length > 0 && (
          <>
            <Text style={[s.sectionTitle, { color: theme.text }]}>Suggested Settlements</Text>
            {suggestions.map((sugg, i) => {
              const from = members.find(m => m.userId === sugg.fromUserId);
              const to = members.find(m => m.userId === sugg.toUserId);
              return (
                <View key={i} style={[s.suggCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <View style={s.suggRow}>
                    <View style={[s.avatar, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={[s.avatarText, { color: theme.error }]}>{from?.fullName[0] ?? '?'}</Text>
                    </View>
                    <View style={s.suggArrow}>
                      <Text style={[s.arrowText, { color: theme.subtext }]}>owes</Text>
                      <Text style={[s.suggAmount, { color: theme.text }]}>{currencyLabel(sugg.amount, group?.currency)}</Text>
                      <Text style={[s.arrowText, { color: theme.subtext }]}>→</Text>
                    </View>
                    <View style={[s.avatar, { backgroundColor: '#D1FAE5' }]}>
                      <Text style={[s.avatarText, { color: theme.success }]}>{to?.fullName[0] ?? '?'}</Text>
                    </View>
                  </View>
                  <Text style={[s.suggNames, { color: theme.subtext }]}>
                    {from?.fullName ?? '?'} → {to?.fullName ?? '?'}
                  </Text>
                  <View style={s.suggBtns}>
                    <Pressable
                      style={[s.suggBtn, { backgroundColor: theme.success }]}
                      onPress={() => sugg.fromUserId && sugg.toUserId && recordSettlement(sugg.fromUserId, sugg.toUserId, sugg.amount, 'paid')}
                    >
                      <Text style={s.suggBtnText}>Mark Paid</Text>
                    </Pressable>
                    <Pressable
                      style={[s.suggBtn, { backgroundColor: theme.chip }]}
                      onPress={() => sugg.fromUserId && sugg.toUserId && recordSettlement(sugg.fromUserId, sugg.toUserId, sugg.amount, 'pending')}
                    >
                      <Text style={[s.suggBtnText, { color: theme.chipText }]}>Pending</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* History */}
        {groupSettlements.length > 0 && (
          <>
            <Text style={[s.sectionTitle, { color: theme.text }]}>Settlement History</Text>
            {groupSettlements.map(s2 => {
              const from = members.find(m => m.userId === s2.fromUserId);
              const to = members.find(m => m.userId === s2.toUserId);
              return (
                <View key={s2.id} style={[s.historyRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <View style={[s.historyStatus, { backgroundColor: s2.status === 'paid' ? '#D1FAE5' : '#FEF3C7' }]}>
                    <Text style={{ fontSize: 16 }}>{s2.status === 'paid' ? '✅' : '⏳'}</Text>
                  </View>
                  <View style={s.historyInfo}>
                    <Text style={[s.historyText, { color: theme.text }]}>
                      {from?.fullName ?? 'Unknown'} → {to?.fullName ?? 'Unknown'}
                    </Text>
                    <Text style={[s.historySub, { color: theme.subtext }]}>{s2.status}</Text>
                  </View>
                  <Text style={[s.historyAmt, { color: theme.text }]}>{currencyLabel(s2.amount, group?.currency)}</Text>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: import('../../theme').Theme) => StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  backText: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginTop: 4 },
  emptyCard: { borderRadius: 16, padding: 28, alignItems: 'center', gap: 8, borderWidth: 1 },
  emptyIcon: { fontSize: 36 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  balanceInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600' },
  memberSub: { fontSize: 11, marginTop: 2 },
  balanceAmt: { fontSize: 15, fontWeight: '700' },
  suggCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 10, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  suggRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  suggArrow: { flex: 1, alignItems: 'center', gap: 2 },
  arrowText: { fontSize: 11 },
  suggAmount: { fontSize: 18, fontWeight: '800' },
  suggNames: { textAlign: 'center', fontSize: 13 },
  suggBtns: { flexDirection: 'row', gap: 10 },
  suggBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  suggBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1 },
  historyStatus: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  historyInfo: { flex: 1 },
  historyText: { fontSize: 14, fontWeight: '600' },
  historySub: { fontSize: 11, marginTop: 2, textTransform: 'capitalize' },
  historyAmt: { fontSize: 15, fontWeight: '700' },
});
