import React, { useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, Alert, TextInput, Modal, ActivityIndicator, Platform,
    Animated
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/services/api';

const ICONS = ['cart', 'car', 'restaurant', 'home', 'medkit', 'school', 'airplane', 'game-controller',
    'shirt', 'gift', 'trending-up', 'briefcase', 'phone-portrait', 'musical-notes', 'paw', 'fitness',
    'wallet', 'card', 'cash', 'pie-chart', 'analytics', 'save', 'receipt', 'list', 'pricetag'];

export default function CategoryManagementScreen() {
    const { mode, colors } = useTheme();
    const [categories, setCategories] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const [modalVisible, setModalVisible] = useState(false);
    const [editingCat, setEditingCat] = useState<any>(null);
    const [catName, setCatName] = useState('');
    const defaultColors = [colors.primary, colors.secondary, '#6366F1', '#F59E0B', '#3B82F6', '#EC4899', '#10B981', '#F97316', '#8B5CF6', '#F43F5E', '#14B8A6'];
    const [catColor, setCatColor] = useState(defaultColors[0]);
    const [catIcon, setCatIcon] = useState(ICONS[0]);
    const [catType, setCatType] = useState<'expense' | 'income'>('expense');
    const [actionLoading, setActionLoading] = useState(false);

    async function fetchData() {
        try {
            const cats = await api.getCategories() as any[];
            setCategories(cats);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useFocusEffect(useCallback(() => { fetchData(); }, []));

    function openModal(cat?: any) {
        if (cat) {
            setEditingCat(cat);
            setCatName(cat.name);
            setCatColor(cat.color || defaultColors[0]);
            setCatIcon(cat.icon || ICONS[0]);
            setCatType(cat.type);
        } else {
            setEditingCat(null);
            setCatName('');
            setCatColor(defaultColors[0]);
            setCatIcon(ICONS[0]);
            setCatType('expense');
        }
        setModalVisible(true);
    }

    async function handleSave() {
        if (!catName.trim()) {
            Alert.alert('Atenção', 'Digite um nome para a categoria');
            return;
        }
        setActionLoading(true);
        try {
            if (editingCat) {
                await api.updateCategory(editingCat.id, {
                    name: catName.trim(),
                    color: catColor,
                    icon: catIcon
                });
            } else {
                await api.createCategory({
                    name: catName.trim(),
                    color: catColor,
                    icon: catIcon,
                    type: catType
                });
            }
            setModalVisible(false);
            fetchData();
        } catch (e: any) {
            Alert.alert('Erro', e.message);
        } finally {
            setActionLoading(false);
        }
    }

    async function handleDelete(id: string, name: string, callback?: () => void) {
        Alert.alert('Excluir', `Deseja excluir "${name}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir', style: 'destructive', onPress: async () => {
                    try {
                        await api.deleteCategory(id);
                        if (callback) callback();
                        setModalVisible(false);
                        fetchData();
                    } catch (e: any) {
                        Alert.alert('Erro', e.message);
                    }
                }
            },
        ]);
    }

    const renderRightActions = (id: string, name: string, closeSwipe: () => void) => {
        return (
            <TouchableOpacity
                style={styles.swipeDeleteBtn}
                onPress={() => handleDelete(id, name, closeSwipe)}
            >
                <Ionicons name="trash-outline" size={24} color={colors.white} />
            </TouchableOpacity>
        );
    };

    const styles = s(colors, mode);
    const mStyles = m(colors, mode);

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator color={colors.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Categorias</Text>
                <TouchableOpacity onPress={() => openModal()} style={styles.addBtn}>
                    <Ionicons name="add" size={26} color={colors.white} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {(['expense', 'income'] as const).map(type => {
                    const filtered = categories.filter(c => c.type === type);
                    if (filtered.length === 0) return null;

                    return (
                        <View key={type} style={styles.section}>
                            <Text style={styles.sectionTitle}>{type === 'expense' ? 'DESPESAS' : 'RECEITAS'}</Text>
                            <View style={styles.list}>
                                {filtered.map((cat, idx) => {
                                    let swipeRef: Swipeable | null = null;
                                    return (
                                        <Swipeable
                                            key={cat.id}
                                            ref={ref => swipeRef = ref}
                                            renderRightActions={() => renderRightActions(cat.id, cat.name, () => swipeRef?.close())}
                                            containerStyle={{ borderBottomWidth: idx === filtered.length - 1 ? 0 : 1, borderBottomColor: colors.border }}
                                            friction={2}
                                            enableTrackpadTwoFingerGesture
                                            rightThreshold={40}
                                        >
                                            <TouchableOpacity
                                                style={styles.item}
                                                onPress={() => openModal(cat)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={[styles.iconWrap, { backgroundColor: cat.color + '15' }]}>
                                                    <Ionicons name={(cat.icon || 'pricetag') as any} size={20} color={cat.color} />
                                                </View>
                                                <Text style={styles.name}>{cat.name}</Text>
                                                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                                            </TouchableOpacity>
                                        </Swipeable>
                                    );
                                })}
                            </View>
                        </View>
                    );
                })}
            </ScrollView>

            <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
                <View style={mStyles.root}>
                    <View style={mStyles.handle} />
                    <View style={mStyles.header}>
                        <Text style={mStyles.title}>{editingCat ? 'Editar Categoria' : 'Nova Categoria'}</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Ionicons name="close" size={28} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {!editingCat && (
                            <View style={mStyles.typeContainer}>
                                {(['expense', 'income'] as const).map(t => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[mStyles.typeBtn, catType === t && { backgroundColor: colors.primary }]}
                                        onPress={() => setCatType(t)}
                                    >
                                        <Text style={[mStyles.typeTxt, catType === t && { color: colors.white }]}>
                                            {t === 'expense' ? 'Despesa' : 'Receita'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <Text style={mStyles.label}>NOME</Text>
                        <TextInput
                            style={mStyles.input}
                            value={catName}
                            onChangeText={setCatName}
                            placeholder="Ex: Mercado, Salário..."
                            placeholderTextColor={colors.textMuted}
                        />

                        <Text style={mStyles.label}>COR</Text>
                        <View style={mStyles.colors}>
                            {defaultColors.map((c, idx) => (
                                <TouchableOpacity
                                    key={`color-${idx}`}
                                    onPress={() => setCatColor(c)}
                                    style={[mStyles.colorBtn, { backgroundColor: c }, catColor === c && { borderWidth: 3, borderColor: colors.text }]}
                                />
                            ))}
                        </View>

                        <Text style={mStyles.label}>ÍCONE</Text>
                        <View style={mStyles.icons}>
                            {ICONS.map((i, idx) => (
                                <TouchableOpacity
                                    key={`icon-${idx}`}
                                    onPress={() => setCatIcon(i)}
                                    style={[mStyles.iconBtn, catIcon === i && { backgroundColor: catColor }]}
                                >
                                    <Ionicons name={i as any} size={22} color={catIcon === i ? colors.white : colors.textSecondary} />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={mStyles.preview}>
                            <View style={[mStyles.previewIcon, { backgroundColor: catColor + '15' }]}>
                                <Ionicons name={catIcon as any} size={32} color={catColor} />
                            </View>
                            <Text style={mStyles.previewTitle}>{catName || 'Visualização'}</Text>
                        </View>

                        <TouchableOpacity style={mStyles.saveBtn} onPress={handleSave} disabled={actionLoading}>
                            {actionLoading ? <ActivityIndicator color={colors.white} /> : <Text style={mStyles.saveBtnTxt}>Salvar</Text>}
                        </TouchableOpacity>

                        {editingCat && (
                            <TouchableOpacity
                                style={mStyles.deleteBtn}
                                onPress={() => handleDelete(editingCat.id, editingCat.name)}
                                disabled={actionLoading}
                            >
                                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                                <Text style={mStyles.deleteBtnTxt}>Excluir Categoria</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const s = (colors: any, mode: string) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20 },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    title: { fontSize: 22, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
    addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },

    section: { marginTop: 24, paddingHorizontal: 20 },
    sectionTitle: { fontSize: 12, fontWeight: '800', color: colors.textMuted, letterSpacing: 1, marginBottom: 12 },
    list: { backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    item: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.surface },
    iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    name: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text, marginLeft: 14 },

    swipeDeleteBtn: {
        backgroundColor: colors.danger,
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
    }
});

const m = (colors: any, mode: string) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24 },
    handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
    title: { fontSize: 24, fontWeight: '900', color: colors.text },

    typeContainer: { flexDirection: 'row', gap: 10, marginBottom: 30 },
    typeBtn: { flex: 1, height: 50, borderRadius: 15, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    typeTxt: { fontSize: 15, fontWeight: '800', color: colors.textSecondary },

    label: { fontSize: 12, fontWeight: '800', color: colors.textMuted, letterSpacing: 1, marginBottom: 12 },
    input: { height: 60, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 20, fontSize: 16, color: colors.text, fontWeight: '700', marginBottom: 30 },

    colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 30 },
    colorBtn: { width: 44, height: 44, borderRadius: 22 },

    icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 30 },
    iconBtn: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },

    preview: { alignItems: 'center', padding: 30, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 40 },
    previewIcon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    previewTitle: { fontSize: 20, fontWeight: '900', color: colors.text },

    saveBtn: { height: 64, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, marginBottom: 40 },
    saveBtnTxt: { color: colors.white, fontSize: 18, fontWeight: '900' },

    deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 18, backgroundColor: colors.danger + '10', marginBottom: 60, borderWidth: 1, borderColor: colors.danger + '20' },
    deleteBtnTxt: { color: colors.danger, fontSize: 15, fontWeight: '800' }
});
