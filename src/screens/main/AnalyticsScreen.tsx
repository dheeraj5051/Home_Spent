import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { currencyLabel, monthLabel } from '../../lib/dates';
import { budgetUsage, categoryTotals, monthlyTrend, duplicateExpenseCandidates } from '../../lib/analytics';
import { currentMonthFilter } from '../../lib/settlements';

export default function AnalyticsScreen() {
  const { theme, state } = useApp();
  const s = styles(theme);

  const activeGroup = state.groups.find(g => g.id === state.activeGroupId) ?? state.groups[0];
  const [selectedGroupId, setSelectedGroupId] = useState(activeGroup?.id ?? '');

  const selectedGroup = state.groups.find(g => g.id === selectedGroupId) ?? state.groups[0];
  const expenses = useMemo(
    () => state.expenses.filter(e => e.groupId === selectedGroup?.id && e.status === 'active'),
    [state.expenses, selectedGroup?.id],
  );
  const currentExpenses = useMemo(() => currentMonthFilter(expenses), [expenses]);
  const catTotals = useMemo(() => Object.entries(categoryTotals(currentExpenses)).sort((a, b) => b[1] - a[1]), [currentExpenses]);
  const monthTrend = useMemo(() => Object.entries(monthlyTrend(expenses)).slice(-6), [expenses]);
  const budget = useMemo(() => budgetUsage(currentExpenses, selectedGroup?.budgetLimit ?? 0), [currentExpenses, selectedGroup?.budgetLimit]);
  const duplicates = useMemo(() => duplicateExpenseCandidates(currentExpenses), [currentExpenses]);
  const totalSpend = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
  const maxMonthly = Math.max(...monthTrend.map(([, v]) => v), 1);
  const maxCat = catTotals[0]?.[1] ?? 1;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: theme.text }]}>Analytics</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Group selector */}
        {state.groups.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.groupRow}>
            {state.groups.map(g => (
              <Pressable
                key={g.id}
                style={[s.groupChip, { backgroundColor: selectedGroupId === g.id ? theme.primary : theme.card, borderColor: selectedGroupId === g.id ? theme.primary : theme.cardBorder }]}
                onPress={() => setSelectedGroupId(g.id)}
              >
                <Text style={[s.groupChipText, { color: selectedGroupId === g.id ? '#fff' : theme.text }]}>{g.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {!selectedGroup ? (
          <View style={[s.emptyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={s.emptyIcon}>📊</Text>
            <Text style={[s.emptyText, { color: theme.subtext }]}>Create a group to see analytics.</Text>
          </View>
        ) : (
          <>
            {/* Summary */}
            <View style={[s.summaryCard, { backgroundColor: theme.primary }]}>
              <Text style={s.summaryLabel}>This month's total</Text>
              <Text style={s.summaryAmount}>{currencyLabel(totalSpend, selectedGroup?.currency ?? 'INR')}</Text>
              <Text style={s.summaryGroup}>{selectedGroup.name}</Text>
            </View>

            {/* Budget */}
            {selectedGroup.budgetLimit && selectedGroup.budgetLimit > 0 ? (
              <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={s.cardHeader}>
                  <Text style={[s.cardTitle, { color: theme.text }]}>Budget Usage</Text>
                  <Text style={[s.cardValue, { color: budgetPct > 100 ? theme.error : theme.success }]}>
                    {budgetPct.toFixed(0)}%
                  </Text>
                </View>
                <View style={[s.barTrack, { backgroundColor: theme.divider }]}>
                  <View style={[s.barFill, { width: `${Math.min(100, budgetPct)}%` as `${number}%`, backgroundColor: budgetPct > 100 ? theme.error : budgetPct > 80 ? theme.warning : theme.success }]} />
                </View>
                <View style={s.budgetRow}>
                  <Text style={[s.budgetSub, { color: theme.subtext }]}>Spent: {currencyLabel(budget.spent, selectedGroup.currency)}</Text>
                  <Text style={[s.budgetSub, { color: theme.subtext }]}>Limit: {currencyLabel(selectedGroup.budgetLimit ?? 0, selectedGroup.currency)}</Text>
                </View>
              </View>
            ) : null}

            {/* Monthly trend */}
            {monthTrend.length > 0 && (
              <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Text style={[s.cardTitle, { color: theme.text }]}>Monthly Trend</Text>
                <View style={s.chartArea}>
                  {monthTrend.map(([month, value]) => (
                    <View key={month} style={s.barCol}>
                      <Text style={[s.barValue, { color: theme.subtext }]}>{currencyLabel(value, selectedGroup?.currency ?? 'INR')}</Text>
                      <View style={s.barContainer}>
                        <View style={[s.monthBar, { height: Math.max(4, Math.floor((value / maxMonthly) * 100)), backgroundColor: theme.primary }]} />
                      </View>
                      <Text style={[s.barLabel, { color: theme.subtext }]}>{monthLabel(month).slice(0, 3)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Category breakdown */}
            {catTotals.length > 0 && (
              <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Text style={[s.cardTitle, { color: theme.text }]}>By Category</Text>
                <View style={s.catList}>
                  {catTotals.slice(0, 8).map(([cat, value]) => (
                    <View key={cat} style={s.catRow}>
                      <Text style={[s.catEmoji]}>{catEmoji(cat)}</Text>
                      <View style={s.catInfo}>
                        <View style={s.catLabelRow}>
                          <Text style={[s.catName, { color: theme.text }]}>{cat}</Text>
                          <Text style={[s.catValue, { color: theme.text }]}>{currencyLabel(value, selectedGroup.currency)}</Text>
                        </View>
                        <View style={[s.catTrack, { backgroundColor: theme.divider }]}>
                          <View style={[s.catFill, { width: `${(value / maxCat) * 100}%` as `${number}%`, backgroundColor: theme.primary }]} />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Duplicates */}
            {duplicates.length > 0 && (
              <View style={[s.card, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                <Text style={[s.cardTitle, { color: '#92400E' }]}>⚠️ Possible Duplicates</Text>
                {duplicates.slice(0, 3).map(dup => (
                  <View key={dup.id} style={s.dupRow}>
                    <Text style={[s.dupText, { color: '#92400E' }]}>{dup.title} — {currencyLabel(dup.amount, selectedGroup.currency)}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function catEmoji(cat: string) {
  const map: Record<string, string> = { Rent: '🏠', Electricity: '⚡', Food: '🍔', Grocery: '🛒', Internet: '📡', Gas: '⛽', Travel: '✈️', Medical: '💊', Entertainment: '🎬', Shopping: '🛍️', Maintenance: '🔧', Subscription: '📱', Others: '📦' };
  return map[cat] ?? '📦';
}

const styles = (theme: import('../../theme').Theme) => StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800' },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  groupRow: { gap: 8, paddingBottom: 4 },
  groupChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5 },
  groupChipText: { fontSize: 13, fontWeight: '600' },
  emptyCard: { borderRadius: 16, padding: 36, alignItems: 'center', gap: 10, borderWidth: 1 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  summaryCard: { borderRadius: 20, padding: 24, gap: 4 },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  summaryAmount: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  summaryGroup: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  card: { borderRadius: 18, padding: 16, borderWidth: 1, gap: 12, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardValue: { fontSize: 16, fontWeight: '700' },
  barTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetSub: { fontSize: 12 },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barValue: { fontSize: 9, textAlign: 'center' },
  barContainer: { height: 100, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  monthBar: { width: '70%', borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10 },
  catList: { gap: 10 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catEmoji: { fontSize: 20, width: 28 },
  catInfo: { flex: 1, gap: 4 },
  catLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  catName: { fontSize: 13, fontWeight: '600' },
  catValue: { fontSize: 13, fontWeight: '600' },
  catTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  catFill: { height: 6, borderRadius: 3 },
  dupRow: { paddingVertical: 2 },
  dupText: { fontSize: 13 },
});
