import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getBackendUrl,
  isValidBackendUrl,
  normalizeBackendUrl,
  setBackendUrl,
  testBackendConnection,
} from '@/lib/api';

type StatusType = 'success' | 'error';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [backendUrl, setBackendUrlState] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ type: StatusType; message: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    getBackendUrl()
      .then((url) => {
        if (isMounted) setBackendUrlState(url);
      })
      .catch(() => {
        if (isMounted) setBackendUrlState('');
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const validateUrlOrAlert = (url: string) => {
    if (!url) return true;
    if (!isValidBackendUrl(url)) {
      Alert.alert('URL inválida', 'Use http:// ou https://');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    const trimmed = normalizeBackendUrl(backendUrl);
    if (!validateUrlOrAlert(trimmed)) return;

    setSaving(true);
    setStatus(null);
    try {
      const saved = await setBackendUrl(trimmed);
      setBackendUrlState(saved);
      setStatus({ type: 'success', message: 'URL do backend salva.' });
    } catch {
      setStatus({ type: 'error', message: 'Falha ao salvar a URL.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    const trimmed = normalizeBackendUrl(backendUrl);
    if (!trimmed) {
      Alert.alert('URL vazia', 'Informe a URL do backend para testar.');
      return;
    }
    if (!validateUrlOrAlert(trimmed)) return;

    setTesting(true);
    setStatus(null);
    try {
      await testBackendConnection(trimmed);
      setStatus({ type: 'success', message: 'Conexao OK com o backend.' });
    } catch {
      setStatus({ type: 'error', message: 'Nao foi possivel conectar.' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Configuracoes</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>URL do Backend</Text>
          <TextInput
            style={styles.input}
            value={backendUrl}
            onChangeText={setBackendUrlState}
            placeholder="https://seu-backend.com"
            placeholderTextColor="#484F58"
            autoCapitalize="none"
            keyboardType="url"
            autoCorrect={false}
          />
          <Text style={styles.helperText}>
            Deixe vazio para usar EXPO_PUBLIC_BACKEND_URL (se estiver definido).
          </Text>

          {status && (
            <View
              style={[
                styles.statusBox,
                status.type === 'success' ? styles.statusSuccess : styles.statusError,
              ]}
            >
              <Ionicons
                name={status.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.statusText}>{status.message}</Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, saving && styles.actionButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Salvar</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.secondaryButton,
                testing && styles.actionButtonDisabled,
              ]}
              onPress={handleTest}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="pulse-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Testar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B949E',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  helperText: {
    fontSize: 12,
    color: '#8B949E',
    marginTop: 10,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  statusSuccess: {
    backgroundColor: '#2E7D32',
  },
  statusError: {
    backgroundColor: '#B71C1C',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: '#2563EB',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
});
