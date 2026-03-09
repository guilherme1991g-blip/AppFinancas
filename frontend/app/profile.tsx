import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
    Modal, FlatList
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from 'react-native';

const EDUCATION_LEVELS = [
    'Ensino Fundamental',
    'Ensino Médio',
    'Ensino Superior',
    'Pós-graduação / MBA',
    'Mestrado / Doutorado'
];

const SALARY_RANGES = [
    'Até R$ 2.000',
    'R$ 2.001 - R$ 5.000',
    'R$ 5.001 - R$ 10.000',
    'R$ 10.001 - R$ 20.000',
    'Acima de R$ 20.000'
];

const HOUSING_TYPES = [
    'Própria',
    'Alugada',
    'Outro'
];

const VEHICLE_TYPES = [
    'Carro',
    'Moto',
    'Outro'
];

const DDI_LIST = [
    { code: '+55', country: 'Brasil', flag: '🇧🇷' },
    { code: '+1', country: 'EUA/Canada', flag: '🇺🇸' },
    { code: '+351', country: 'Portugal', flag: '🇵🇹' },
    { code: '+34', country: 'Espanha', flag: '🇪🇸' },
    { code: '+44', country: 'Reino Unido', flag: '🇬🇧' },
    { code: '+54', country: 'Argentina', flag: '🇦🇷' },
    { code: '+598', country: 'Uruguai', flag: '🇺🇾' },
    { code: '+81', country: 'Japão', flag: '🇯🇵' },
];

export default function ProfileScreen() {
    const { colors } = useTheme();
    const { t } = useLocale();
    const { user, refreshUser, logout } = useAuth();
    const insets = useSafeAreaInsets();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [ddi, setDdi] = useState('+55');
    const [cpf, setCpf] = useState('');
    const [isBrazilian, setIsBrazilian] = useState(true);
    const [cep, setCep] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [address, setAddress] = useState('');
    const [birthDate, setBirthDate] = useState('');
    // Professional
    const [education, setEducation] = useState('');
    const [occupation, setOccupation] = useState('');
    const [salaryRange, setSalaryRange] = useState('');
    // Financial
    const [housingType, setHousingType] = useState('');
    const [householdSize, setHouseholdSize] = useState('1');
    const [hasVehicle, setHasVehicle] = useState(false);
    const [vehicleType, setVehicleType] = useState('');
    const [equity, setEquity] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showDdiModal, setShowDdiModal] = useState(false);
    const [activeSection, setActiveSection] = useState<'personal' | 'professional' | 'financial'>('personal');
    const [showPicker, setShowPicker] = useState<{ field: string, data: string[], title: string } | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const me: any = await api.getMe();
                setName(me.name || '');
                setEmail(me.email || '');
                setPhone(me.phone || '');
                setDdi(me.ddi || '+55');
                setCpf(me.cpf || '');
                setIsBrazilian(me.is_brazilian !== undefined ? me.is_brazilian : true);
                setCep(me.cep || '');
                setCity(me.city || '');
                setState(me.state || '');
                setAddress(me.address || '');
                setBirthDate(me.birth_date || '');
                // Professional
                setEducation(me.education || '');
                setOccupation(me.occupation || '');
                setSalaryRange(me.salary_range || '');
                // Financial
                setHousingType(me.housing_type || '');
                setHouseholdSize(String(me.household_size || 1));
                setHasVehicle(!!me.has_vehicle);
                setVehicleType(me.vehicle_type || '');
                setEquity(String(me.equity || ''));
            } catch { }
            finally { setLoading(false); }
        })();
    }, []);

    function formatCPF(value: string) {
        const digits = value.replace(/\D/g, '').slice(0, 11);
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
        if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
        return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    }

    function formatPhone(value: string) {
        const digits = value.replace(/\D/g, '').slice(0, 11);
        if (ddi === '+55') {
            if (digits.length <= 2) return `(${digits}`;
            if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
            return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
        }
        return digits;
    }

    async function handleCepChange(value: string) {
        const v = value.replace(/\D/g, '').slice(0, 8);
        setCep(v);
        if (v.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${v}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    setCity(data.localidade);
                    setState(data.uf);
                    if (data.logradouro) setAddress(data.logradouro);
                }
            } catch { }
        }
    }

    function isPersonalComplete() {
        if (!name.trim() || !email.trim()) return false;
        if (isBrazilian) {
            if (!cpf || !cep || !city || !state) return false;
        }
        return true;
    }

    function isProfessionalComplete() {
        return !!education && !!occupation.trim() && !!salaryRange;
    }

    function isFinancialComplete() {
        return !!housingType && !!householdSize.trim() && (hasVehicle ? !!vehicleType : true) && !!equity.trim();
    }

    function formatBirthDate(value: string) {
        const v = value.replace(/\D/g, '').slice(0, 8);
        if (v.length <= 2) return v;
        if (v.length <= 4) return `${v.slice(0, 2)}/${v.slice(2)}`;
        return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
    }

    async function handleSave() {
        if (!name.trim()) {
            Alert.alert(t('profile.error'), t('profile.name_required'));
            return;
        }
        if (!email.trim()) {
            Alert.alert(t('profile.error'), t('profile.email_required'));
            return;
        }

        setSaving(true);
        try {
            if (isBrazilian) {
                if (!cep || !city || !state) {
                    Alert.alert(t('profile.error'), 'CEP, Cidade e UF são obrigatórios para brasileiros');
                    setSaving(false);
                    return;
                }
            }

            await api.updateProfile({
                name: name.trim(),
                email: email.trim(),
                phone,
                ddi,
                cpf: isBrazilian ? cpf : undefined,
                is_brazilian: isBrazilian,
                cep: isBrazilian ? cep : undefined,
                city: isBrazilian ? city : undefined,
                state: isBrazilian ? state : undefined,
                birth_date: birthDate,
                education,
                occupation,
                salary_range: salaryRange,
                housing_type: housingType,
                household_size: parseInt(householdSize) || 1,
                has_vehicle: hasVehicle,
                vehicle_type: hasVehicle ? vehicleType : undefined,
                equity: parseFloat(equity.replace(',', '.')) || 0
            });
            await refreshUser();
            Alert.alert('✅', t('profile.saved'));
        } catch (e: any) {
            Alert.alert(t('profile.error'), e.message || t('profile.save_error'));
        } finally { setSaving(false); }
    }

    const styles = s(colors);

    if (loading) return (
        <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
            <ActivityIndicator color={colors.primary} size="large" />
        </View>
    );

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                {router.canGoBack() && user?.profile_complete !== false ? (
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={22} color={colors.text} />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 40 }} />
                )}
                <Text style={styles.headerTitle}>{t('profile.title')}</Text>
                <TouchableOpacity style={styles.closeScreenBtn} onPress={() => router.replace('/(tabs)')}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

                    {/* Avatar */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarTxt}>{name?.[0]?.toUpperCase() || '?'}</Text>
                        </View>
                        <Text style={styles.avatarName}>{name || t('profile.title')}</Text>
                        <Text style={styles.avatarEmail}>{email}</Text>
                    </View>

                    {/* Section Selector */}
                    <View style={styles.tabs}>
                        <TouchableOpacity
                            style={[styles.tab, activeSection === 'personal' && styles.activeTab]}
                            onPress={() => setActiveSection('personal')}
                        >
                            <Ionicons name="person" size={18} color={activeSection === 'personal' ? colors.primary : colors.textMuted} />
                            <Text style={[styles.tabTxt, activeSection === 'personal' && styles.activeTabTxt]}>Dados</Text>
                        </TouchableOpacity>

                        {isPersonalComplete() && (
                            <TouchableOpacity
                                style={[styles.tab, activeSection === 'professional' && styles.activeTab]}
                                onPress={() => setActiveSection('professional')}
                            >
                                <Ionicons name="briefcase" size={18} color={activeSection === 'professional' ? colors.primary : colors.textMuted} />
                                <Text style={[styles.tabTxt, activeSection === 'professional' && styles.activeTabTxt]}>Profissional</Text>
                            </TouchableOpacity>
                        )}

                        {isPersonalComplete() && isProfessionalComplete() && (
                            <TouchableOpacity
                                style={[styles.tab, activeSection === 'financial' && styles.activeTab]}
                                onPress={() => setActiveSection('financial')}
                            >
                                <Ionicons name="wallet" size={18} color={activeSection === 'financial' ? colors.primary : colors.textMuted} />
                                <Text style={[styles.tabTxt, activeSection === 'financial' && styles.activeTabTxt]}>Financeiro</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Personal Data Section */}
                    {activeSection === 'personal' && (
                        <View style={styles.formCard}>
                            <Text style={styles.formLabel}>{t('profile.full_name')}</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="person-outline" size={18} color={colors.textMuted} />
                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder={t('profile.full_name')}
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>

                            <Text style={styles.formLabel}>{t('profile.email')}</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
                                <TextInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="email@exemplo.com"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <Text style={styles.formLabel}>Data de Nascimento</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                                <TextInput
                                    style={styles.input}
                                    value={birthDate}
                                    onChangeText={(v) => setBirthDate(formatBirthDate(v))}
                                    placeholder="DD/MM/AAAA"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="number-pad"
                                />
                            </View>

                            <Text style={styles.formLabel}>{t('profile.phone')}</Text>
                            <View style={styles.inputRow}>
                                <TouchableOpacity
                                    style={styles.ddiSelector}
                                    onPress={() => setShowDdiModal(true)}
                                >
                                    <Text style={styles.ddiTxt}>{DDI_LIST.find(d => d.code === ddi)?.flag} {ddi}</Text>
                                    <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
                                </TouchableOpacity>
                                <View style={styles.ddiDivider} />
                                <TextInput
                                    style={styles.input}
                                    value={phone}
                                    onChangeText={(v) => setPhone(formatPhone(v))}
                                    placeholder={ddi === '+55' ? '(11) 99999-9999' : 'Número'}
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="phone-pad"
                                />
                            </View>

                            <View style={styles.nationalityRow}>
                                <Text style={styles.formLabel}>Brasileiro(a)?</Text>
                                <Switch
                                    value={isBrazilian}
                                    onValueChange={setIsBrazilian}
                                    trackColor={{ false: colors.border, true: colors.primary + '80' }}
                                    thumbColor={isBrazilian ? colors.primary : colors.textSecondary}
                                />
                            </View>

                            {isBrazilian && (
                                <>
                                    <Text style={styles.formLabel}>{t('profile.cpf')}</Text>
                                    <View style={styles.inputRow}>
                                        <Ionicons name="document-text-outline" size={18} color={colors.textMuted} />
                                        <TextInput
                                            style={styles.input}
                                            value={cpf}
                                            onChangeText={(v) => setCpf(formatCPF(v))}
                                            placeholder="000.000.000-00"
                                            placeholderTextColor={colors.textMuted}
                                            keyboardType="number-pad"
                                        />
                                    </View>
                                </>
                            )}

                            {isBrazilian && (
                                <>
                                    <Text style={styles.formLabel}>CEP *</Text>
                                    <View style={styles.inputRow}>
                                        <Ionicons name="location-outline" size={18} color={colors.textMuted} />
                                        <TextInput
                                            style={styles.input}
                                            value={cep}
                                            onChangeText={handleCepChange}
                                            placeholder="00000-000"
                                            placeholderTextColor={colors.textMuted}
                                            keyboardType="number-pad"
                                        />
                                    </View>

                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                        <View style={{ flex: 3 }}>
                                            <Text style={styles.formLabel}>Cidade *</Text>
                                            <View style={styles.inputRow}>
                                                <TextInput
                                                    style={styles.input}
                                                    value={city}
                                                    onChangeText={setCity}
                                                    placeholder="Cidade"
                                                    placeholderTextColor={colors.textMuted}
                                                />
                                            </View>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.formLabel}>UF *</Text>
                                            <View style={styles.inputRow}>
                                                <TextInput
                                                    style={styles.input}
                                                    value={state}
                                                    onChangeText={setState}
                                                    placeholder="UF"
                                                    placeholderTextColor={colors.textMuted}
                                                    autoCapitalize="characters"
                                                    maxLength={2}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                </>
                            )}

                            <TouchableOpacity
                                style={[styles.nextBtn, !isPersonalComplete() && { opacity: 0.5 }]}
                                onPress={() => isPersonalComplete() && setActiveSection('professional')}
                                disabled={!isPersonalComplete()}
                            >
                                <Text style={styles.nextBtnTxt}>Próximo: Profissional</Text>
                                <Ionicons name="arrow-forward" size={18} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Professional Section */}
                    {activeSection === 'professional' && (
                        <View style={styles.formCard}>
                            <Text style={styles.formLabel}>Escolaridade</Text>
                            <TouchableOpacity
                                style={styles.inputRow}
                                onPress={() => setShowPicker({ field: 'education', data: EDUCATION_LEVELS, title: 'Escolaridade' })}
                            >
                                <Ionicons name="school-outline" size={18} color={colors.textMuted} />
                                <Text style={[styles.input, !education && { color: colors.textMuted }]}>
                                    {education || 'Selecione'}
                                </Text>
                                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                            </TouchableOpacity>

                            <Text style={styles.formLabel}>Profissão</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="briefcase-outline" size={18} color={colors.textMuted} />
                                <TextInput
                                    style={styles.input}
                                    value={occupation}
                                    onChangeText={setOccupation}
                                    placeholder="Sua profissão"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>

                            <Text style={styles.formLabel}>Faixa Salarial</Text>
                            <TouchableOpacity
                                style={styles.inputRow}
                                onPress={() => setShowPicker({ field: 'salaryRange', data: SALARY_RANGES, title: 'Faixa Salarial' })}
                            >
                                <Ionicons name="cash-outline" size={18} color={colors.textMuted} />
                                <Text style={[styles.input, !salaryRange && { color: colors.textMuted }]}>
                                    {salaryRange || 'Selecione'}
                                </Text>
                                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.nextBtn, !isProfessionalComplete() && { opacity: 0.5 }]}
                                onPress={() => isProfessionalComplete() && setActiveSection('financial')}
                                disabled={!isProfessionalComplete()}
                            >
                                <Text style={styles.nextBtnTxt}>Próximo: Financeiro</Text>
                                <Ionicons name="arrow-forward" size={18} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Financial Section */}
                    {activeSection === 'financial' && (
                        <View style={styles.formCard}>
                            <Text style={styles.formLabel}>Tipo de Moradia</Text>
                            <TouchableOpacity
                                style={styles.inputRow}
                                onPress={() => setShowPicker({ field: 'housingType', data: HOUSING_TYPES, title: 'Tipo de Moradia' })}
                            >
                                <Ionicons name="home-outline" size={18} color={colors.textMuted} />
                                <Text style={[styles.input, !housingType && { color: colors.textMuted }]}>
                                    {housingType || 'Selecione'}
                                </Text>
                                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                            </TouchableOpacity>

                            <Text style={styles.formLabel}>Pessoas que moram com você</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="people-outline" size={18} color={colors.textMuted} />
                                <TextInput
                                    style={styles.input}
                                    value={householdSize}
                                    onChangeText={setHouseholdSize}
                                    placeholder="Ex: 2"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="number-pad"
                                />
                            </View>

                            <View style={styles.nationalityRow}>
                                <Text style={styles.formLabel}>Possui Veículo?</Text>
                                <Switch
                                    value={hasVehicle}
                                    onValueChange={setHasVehicle}
                                    trackColor={{ false: colors.border, true: colors.primary + '80' }}
                                    thumbColor={hasVehicle ? colors.primary : colors.textSecondary}
                                />
                            </View>

                            {hasVehicle && (
                                <>
                                    <Text style={styles.formLabel}>Tipo de Veículo</Text>
                                    <TouchableOpacity
                                        style={styles.inputRow}
                                        onPress={() => setShowPicker({ field: 'vehicleType', data: VEHICLE_TYPES, title: 'Tipo de Veículo' })}
                                    >
                                        <Ionicons name="car-outline" size={18} color={colors.textMuted} />
                                        <Text style={[styles.input, !vehicleType && { color: colors.textMuted }]}>
                                            {vehicleType || 'Selecione'}
                                        </Text>
                                        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                                    </TouchableOpacity>
                                </>
                            )}

                            <Text style={styles.formLabel}>Patrimônio Estimado (R$)</Text>
                            <View style={styles.inputRow}>
                                <Ionicons name="diamond-outline" size={18} color={colors.textMuted} />
                                <TextInput
                                    style={styles.input}
                                    value={equity}
                                    onChangeText={setEquity}
                                    placeholder="Ex: 50.000,00"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="decimal-pad"
                                />
                            </View>
                        </View>
                    )}

                    {/* Save Button - ONLY in final section */}
                    {activeSection === 'financial' && (
                        <TouchableOpacity
                            style={[styles.saveBtn, (saving || !isFinancialComplete()) && { opacity: 0.7 }]}
                            onPress={handleSave}
                            disabled={saving || !isFinancialComplete()}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                                    <Text style={styles.saveBtnTxt}>{t('profile.save')}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    {/* Info */}
                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
                        <Text style={styles.infoTxt}>{t('profile.info')}</Text>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* DDI Modal */}
            <Modal visible={showDdiModal} animationType="slide" transparent>
                <View style={styles.modalBg}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Selecione o DDI</Text>
                            <TouchableOpacity onPress={() => setShowDdiModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={DDI_LIST}
                            keyExtractor={(item) => item.code}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.ddiOption}
                                    onPress={() => {
                                        setDdi(item.code);
                                        setShowDdiModal(false);
                                    }}
                                >
                                    <Text style={styles.ddiOptionFlag}>{item.flag}</Text>
                                    <Text style={styles.ddiOptionCountry}>{item.country}</Text>
                                    <Text style={styles.ddiOptionCode}>{item.code}</Text>
                                    {ddi === item.code && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* Generic Picker Modal */}
            <Modal visible={!!showPicker} animationType="fade" transparent>
                <TouchableOpacity
                    style={styles.modalBg}
                    activeOpacity={1}
                    onPress={() => setShowPicker(null)}
                >
                    <View style={[styles.modalCard, { maxHeight: '50%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{showPicker?.title}</Text>
                            <TouchableOpacity onPress={() => setShowPicker(null)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={showPicker?.data || []}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.ddiOption}
                                    onPress={() => {
                                        if (showPicker?.field === 'education') setEducation(item);
                                        if (showPicker?.field === 'salaryRange') setSalaryRange(item);
                                        if (showPicker?.field === 'housingType') setHousingType(item);
                                        if (showPicker?.field === 'vehicleType') setVehicleType(item);
                                        setShowPicker(null);
                                    }}
                                >
                                    <Text style={styles.ddiOptionCountry}>{item}</Text>
                                    {(education === item || salaryRange === item || housingType === item || vehicleType === item) && (
                                        <Ionicons name="checkmark" size={18} color={colors.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View >
    );
}

const s = (colors: any) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    closeScreenBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    content: { padding: 20, paddingBottom: 60 },

    avatarSection: { alignItems: 'center', marginBottom: 32 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    avatarTxt: { color: '#FFF', fontSize: 28, fontWeight: '900' },
    avatarName: { fontSize: 20, fontWeight: '800', color: colors.text },
    avatarEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 4, fontWeight: '500' },

    formCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border, marginBottom: 20 },
    formLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: colors.background, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
        borderWidth: 1, borderColor: colors.border,
    },
    input: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '600' },

    saveBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16,
        shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    },
    saveBtnTxt: { fontSize: 16, fontWeight: '800', color: '#FFF' },

    infoBox: {
        flexDirection: 'row', gap: 12, marginTop: 24, padding: 20,
        backgroundColor: colors.surface, borderRadius: 20,
        borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
    },
    infoTxt: { flex: 1, fontSize: 13, color: colors.textMuted, lineHeight: 18, fontWeight: '500' },

    ddiSelector: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 4 },
    ddiTxt: { fontSize: 15, fontWeight: '700', color: colors.text },
    ddiDivider: { width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 4 },

    nationalityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 },

    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '70%' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    ddiOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    ddiOptionFlag: { fontSize: 24, marginRight: 12 },
    ddiOptionCountry: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '600' },
    ddiOptionCode: { fontSize: 14, color: colors.textSecondary, fontWeight: '700', marginRight: 12 },

    tabs: { flexDirection: 'row', marginBottom: 20, backgroundColor: colors.surface, borderRadius: 16, padding: 6, borderWidth: 1, borderColor: colors.border },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
    activeTab: { backgroundColor: colors.primary + '10' },
    tabTxt: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
    activeTabTxt: { color: colors.primary },

    nextBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 14,
        marginTop: 10,
    },
    nextBtnTxt: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
