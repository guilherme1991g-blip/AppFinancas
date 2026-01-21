import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string;
}

interface Summary {
  total_income: number;
  total_expense: number;
  balance: number;
  transaction_count: number;
}

const categoryIcons: { [key: string]: string } = {
  'Salário': 'cash-outline',
  'Freelance': 'laptop-outline',
  'Investimentos': 'trending-up-outline',
  'Vendas': 'cart-outline',
  'Alimentação': 'restaurant-outline',
  'Transporte': 'car-outline',
  'Moradia': 'home-outline',
  'Saúde': 'medkit-outline',
  'Educação': 'school-outline',
  'Lazer': 'game-controller-outline',
  'Compras': 'bag-outline',
  'Contas': 'receipt-outline',
  'Outros': 'ellipsis-horizontal-outline',
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [transRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/transactions`),
        fetch(`${API_URL}/api/summary`),
      ]);

      if (transRes.ok) {
        const transData = await transRes.json();
        setTransactions(transData);
      }

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const deleteTransaction = async (id: string) => {
    Alert.alert(
      'Excluir Transação',
      'Tem certeza que deseja excluir esta transação?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/api/transactions/${id}`, {
                method: 'DELETE',
              });
              if (res.ok) {
                fetchData();
              }
            } catch (error) {
              console.error('Error deleting transaction:', error);
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd 'de' MMM", { locale: ptBR });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Minhas Finanças</Text>
        <Text style={styles.headerDate}>
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4CAF50"
          />
        }
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo Total</Text>
          <Text
            style={[
              styles.balanceAmount,
              { color: (summary?.balance ?? 0) >= 0 ? '#4CAF50' : '#F44336' },
            ]}
          >
            {formatCurrency(summary?.balance ?? 0)}
          </Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: 'rgba(76, 175, 80, 0.2)' }]}>
                <Ionicons name="arrow-up" size={20} color="#4CAF50" />
              </View>
              <View>
                <Text style={styles.summaryLabel}>Receitas</Text>
                <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                  {formatCurrency(summary?.total_income ?? 0)}
                </Text>
              </View>
            </View>

            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: 'rgba(244, 67, 54, 0.2)' }]}>
                <Ionicons name="arrow-down" size={20} color="#F44336" />
              </View>
              <View>
                <Text style={styles.summaryLabel}>Despesas</Text>
                <Text style={[styles.summaryValue, { color: '#F44336' }]}>
                  {formatCurrency(summary?.total_expense ?? 0)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Transactions List */}
        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>Últimas Transações</Text>

          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={64} color="#30363D" />
              <Text style={styles.emptyText}>Nenhuma transação ainda</Text>
              <Text style={styles.emptySubtext}>
                Toque no botão + para adicionar sua primeira transação
              </Text>
            </View>
          ) : (
            transactions.map((transaction) => (
              <TouchableOpacity
                key={transaction.id}
                style={styles.transactionCard}
                onLongPress={() => deleteTransaction(transaction.id)}
                delayLongPress={500}
              >
                <View
                  style={[
                    styles.transactionIcon,
                    {
                      backgroundColor:
                        transaction.type === 'income'
                          ? 'rgba(76, 175, 80, 0.15)'
                          : 'rgba(244, 67, 54, 0.15)',
                    },
                  ]}
                >
                  <Ionicons
                    name={categoryIcons[transaction.category] as any || 'ellipsis-horizontal-outline'}
                    size={24}
                    color={transaction.type === 'income' ? '#4CAF50' : '#F44336'}
                  />
                </View>

                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription}>
                    {transaction.description}
                  </Text>
                  <Text style={styles.transactionCategory}>
                    {transaction.category} • {formatDate(transaction.date)}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.transactionAmount,
                    { color: transaction.type === 'income' ? '#4CAF50' : '#F44336' },
                  ]}
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => router.push('/add-transaction')}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerDate: {
    fontSize: 14,
    color: '#8B949E',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  scrollView: {
    flex: 1,
  },
  balanceCard: {
    backgroundColor: '#161B22',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#8B949E',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8B949E',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionsSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    color: '#8B949E',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#484F58',
    marginTop: 8,
    textAlign: 'center',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B22',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  transactionDescription: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  transactionCategory: {
    fontSize: 13,
    color: '#8B949E',
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
