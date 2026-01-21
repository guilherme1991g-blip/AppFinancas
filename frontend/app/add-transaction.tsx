import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

type TransactionType = 'income' | 'expense';

interface Categories {
  income: string[];
  expense: string[];
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

export default function AddTransactionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<Categories>({ income: [], expense: [] });
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    // Reset category when type changes
    setCategory('');
  }, [type]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Use default categories if fetch fails
      setCategories({
        income: ['Salário', 'Freelance', 'Investimentos', 'Vendas', 'Outros'],
        expense: ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 'Lazer', 'Compras', 'Contas', 'Outros'],
      });
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleAmountChange = (text: string) => {
    // Only allow numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1]?.length > 2) return;
    setAmount(cleaned);
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Erro', 'Digite um valor válido');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Erro', 'Digite uma descrição');
      return;
    }

    if (!category) {
      Alert.alert('Erro', 'Selecione uma categoria');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          amount: parseFloat(amount),
          description: description.trim(),
          category,
        }),
      });

      if (res.ok) {
        router.back();
      } else {
        Alert.alert('Erro', 'Não foi possível salvar a transação');
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      Alert.alert('Erro', 'Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const currentCategories = type === 'income' ? categories.income : categories.expense;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nova Transação</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Type Selector */}
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                type === 'expense' && styles.typeButtonActiveExpense,
              ]}
              onPress={() => setType('expense')}
            >
              <Ionicons
                name="arrow-down"
                size={20}
                color={type === 'expense' ? '#FFFFFF' : '#8B949E'}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  type === 'expense' && styles.typeButtonTextActive,
                ]}
              >
                Despesa
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                type === 'income' && styles.typeButtonActiveIncome,
              ]}
              onPress={() => setType('income')}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={type === 'income' ? '#FFFFFF' : '#8B949E'}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  type === 'income' && styles.typeButtonTextActive,
                ]}
              >
                Receita
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount Input */}
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>R$</Text>
            <TextInput
              style={[
                styles.amountInput,
                { color: type === 'income' ? '#4CAF50' : '#F44336' },
              ]}
              value={amount}
              onChangeText={handleAmountChange}
              placeholder="0,00"
              placeholderTextColor="#30363D"
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>

          {/* Description Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Descrição</Text>
            <TextInput
              style={styles.textInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Almoço no restaurante"
              placeholderTextColor="#484F58"
              maxLength={100}
            />
          </View>

          {/* Category Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Categoria</Text>
            {loadingCategories ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <View style={styles.categoriesGrid}>
                {currentCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      category === cat && (
                        type === 'income'
                          ? styles.categoryButtonActiveIncome
                          : styles.categoryButtonActiveExpense
                      ),
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Ionicons
                      name={categoryIcons[cat] as any || 'ellipsis-horizontal-outline'}
                      size={22}
                      color={
                        category === cat
                          ? '#FFFFFF'
                          : type === 'income'
                          ? '#4CAF50'
                          : '#F44336'
                      }
                    />
                    <Text
                      style={[
                        styles.categoryButtonText,
                        category === cat && styles.categoryButtonTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Submit Button */}
        <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: type === 'income' ? '#4CAF50' : '#F44336' },
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Salvar Transação</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#161B22',
    borderRadius: 16,
    padding: 6,
    marginBottom: 32,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  typeButtonActiveExpense: {
    backgroundColor: '#F44336',
  },
  typeButtonActiveIncome: {
    backgroundColor: '#4CAF50',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B949E',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '600',
    color: '#8B949E',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: 'bold',
    minWidth: 120,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B949E',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B22',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  categoryButtonActiveExpense: {
    backgroundColor: '#F44336',
  },
  categoryButtonActiveIncome: {
    backgroundColor: '#4CAF50',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#8B949E',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: '#0D1117',
    borderTopWidth: 1,
    borderTopColor: '#21262D',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
