import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    Animated, Dimensions, Image, Linking, Platform, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

const { width, height } = Dimensions.get('window');
const BANNER_IMG = require('@/assets/images/upgrade_banner.png');

// URLs das lojas (Substituir pelos IDs reais quando disponíveis)
const APP_STORE_LINK = 'itms-apps://itunes.apple.com/app/idYOUR_APP_ID';
const PLAY_STORE_LINK = 'market://details?id=YOUR_PACKAGE_NAME';

interface Props {
    visible: boolean;
    message: string;
    onClose: () => void;
}

export function UpgradeModal({ visible, message, onClose }: Props) {
    const { colors } = useTheme();
    const { user } = useAuth();
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Reset anim values when hidden to ensure next show is clean
            scaleAnim.setValue(0.9);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    // Importante: No early return para manter o Modal montado se necessário,
    // ou simplesmente deixar o Modal gerenciar pelo seu 'visible' prop.

    const plan = (user as any)?.plan || 'free';
    const trialUsed = (user as any)?.trial_used || false;
    const trialActive = (user as any)?.trial_active || false;

    // Só pode iniciar trial se nunca usou, não está em trial e não é premium
    const canStartTrial = !trialUsed && !trialActive && plan !== 'premium';

    const handleOpenStore = async () => {
        const url = Platform.OS === 'ios' ? APP_STORE_LINK : PLAY_STORE_LINK;
        const supported = await Linking.canOpenURL(url);

        if (supported) {
            await Linking.openURL(url);
        } else {
            const webUrl = Platform.OS === 'ios'
                ? 'https://apps.apple.com/app/idYOUR_APP_ID'
                : 'https://play.google.com/store/apps/details?id=YOUR_PACKAGE_NAME';
            await Linking.openURL(webUrl);
        }
    };

    // Recursos de cada plano
    const basicFeatures = [
        { icon: 'wallet-outline' as const, label: 'Contas ilimitadas' },
        { icon: 'card-outline' as const, label: 'Cartões de crédito' },
        { icon: 'swap-horizontal-outline' as const, label: 'Transações ilimitadas' },
        { icon: 'calendar-outline' as const, label: 'Agendamentos ilimitados' },
        { icon: 'build-outline' as const, label: 'Metas e recorrentes' },
    ];

    const premiumFeatures = [
        { icon: 'star-outline' as const, label: 'Tudo do Básico' },
        { icon: 'logo-whatsapp' as const, label: 'Agente IA WhatsApp' },
        { icon: 'chatbubbles-outline' as const, label: 'Assistente inteligente' },
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    onPress={onClose}
                    activeOpacity={1}
                />
                <Animated.View
                    style={[
                        styles.container,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            transform: [{ scale: scaleAnim }],
                            opacity: opacityAnim,
                            maxHeight: height * 0.9,
                        },
                    ]}
                >
                    {/* ─── BANNER IMAGE ─── */}
                    <View style={styles.bannerWrap}>
                        <Image source={BANNER_IMG} style={styles.bannerImage} resizeMode="cover" />
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Ionicons name="close" size={20} color="white" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        style={{ flexShrink: 1 }}
                    >
                        {/* ─── LIMIT WARNING ─── */}
                        <View style={styles.warningBox}>
                            <View style={styles.warningIconWrap}>
                                <Ionicons name="alert-circle" size={22} color="#D97706" />
                            </View>
                            <Text style={styles.warningText}>{message || 'Você atingiu o limite do seu plano atual.'}</Text>
                        </View>

                        {/* ─── TRIAL BANNER (via loja) ─── */}
                        {canStartTrial && (
                            <TouchableOpacity
                                style={styles.trialButton}
                                onPress={handleOpenStore}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="sparkles" size={18} color="#FFF" />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.trialText}>Comece com 7 dias grátis!</Text>
                                    <Text style={styles.trialSubText}>Experimente o Premium sem custo</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#FFF" />
                            </TouchableOpacity>
                        )}

                        {/* ─── PLAN CARDS ─── */}
                        <View style={styles.planSection}>
                            <Text style={[styles.planSectionTitle, { color: colors.text }]}>
                                Escolha seu plano:
                            </Text>

                            {/* ─── BÁSICO ─── */}
                            <TouchableOpacity
                                style={[styles.planCard, { borderColor: '#3B82F6', backgroundColor: colors.surface }]}
                                onPress={handleOpenStore}
                                activeOpacity={0.8}
                            >
                                <View style={styles.planHeader}>
                                    <View style={[styles.planBadge, { backgroundColor: '#3B82F6' }]}>
                                        <Text style={styles.planBadgeText}>Básico</Text>
                                    </View>
                                    <Text style={[styles.planPrice, { color: colors.text }]}>R$ 9,90<Text style={styles.planPeriod}>/mês</Text></Text>
                                </View>
                                <View style={styles.planFeatures}>
                                    {basicFeatures.map((f, i) => (
                                        <View key={i} style={styles.planFeatureRow}>
                                            <Ionicons name="checkmark" size={14} color="#3B82F6" />
                                            <Text style={[styles.planFeatureText, { color: colors.textSecondary }]}>{f.label}</Text>
                                        </View>
                                    ))}
                                </View>
                                <View style={[styles.planCTA, { backgroundColor: '#3B82F6' }]}>
                                    <Text style={styles.planCTAText}>Assinar Básico</Text>
                                </View>
                            </TouchableOpacity>

                            {/* ─── PREMIUM ─── */}
                            <TouchableOpacity
                                style={[styles.planCard, styles.planCardPremium, { backgroundColor: colors.surface }]}
                                onPress={handleOpenStore}
                                activeOpacity={0.8}
                            >
                                <View style={styles.popularTag}>
                                    <Text style={styles.popularTagText}>⭐ MAIS POPULAR</Text>
                                </View>
                                <View style={styles.planHeader}>
                                    <View style={[styles.planBadge, { backgroundColor: '#8B5CF6' }]}>
                                        <Text style={styles.planBadgeText}>Premium</Text>
                                    </View>
                                    <Text style={[styles.planPrice, { color: colors.text }]}>R$ 29,90<Text style={styles.planPeriod}>/mês</Text></Text>
                                </View>
                                <View style={styles.planFeatures}>
                                    {premiumFeatures.map((f, i) => (
                                        <View key={i} style={styles.planFeatureRow}>
                                            <Ionicons name="checkmark" size={14} color="#8B5CF6" />
                                            <Text style={[styles.planFeatureText, { color: colors.textSecondary }]}>{f.label}</Text>
                                        </View>
                                    ))}
                                </View>
                                <View style={[styles.planCTA, { backgroundColor: '#8B5CF6' }]}>
                                    <Text style={styles.planCTAText}>Assinar Premium</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.ctaButton} onPress={onClose} activeOpacity={0.8}>
                            <Text style={styles.ctaText}>Agora não</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    <Text style={[styles.footerText, { color: colors.textMuted }]}>
                        Pagamento seguro via {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} • Cancele quando quiser
                    </Text>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    container: {
        width: width - 24,
        maxWidth: 440,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        elevation: 20,
    },
    bannerWrap: {
        width: '100%',
        height: height * 0.15,
        maxHeight: 140,
        minHeight: 90,
        position: 'relative',
    },
    bannerImage: {
        width: '100%',
        height: '100%',
    },
    closeBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    scrollContent: {
        paddingBottom: 12,
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 14,
        marginTop: 14,
        padding: 10,
        borderRadius: 14,
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    warningIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: '#FDE68A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    warningText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '700',
        color: '#92400E',
        lineHeight: 16,
    },
    trialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 14,
        marginTop: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 16,
        backgroundColor: '#8B5CF6',
    },
    trialText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFF',
    },
    trialSubText: {
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.75)',
        marginTop: 1,
    },
    planSection: {
        paddingHorizontal: 14,
        marginTop: 14,
    },
    planSectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 10,
    },
    planCard: {
        borderWidth: 2,
        borderRadius: 18,
        padding: 14,
        marginBottom: 10,
    },
    planCardPremium: {
        borderColor: '#8B5CF6',
        position: 'relative',
    },
    popularTag: {
        position: 'absolute',
        top: -10,
        right: 14,
        backgroundColor: '#F59E0B',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        zIndex: 5,
    },
    popularTagText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#FFF',
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    planBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    planBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#FFF',
        textTransform: 'uppercase',
    },
    planPrice: {
        fontSize: 18,
        fontWeight: '900',
    },
    planPeriod: {
        fontSize: 12,
        fontWeight: '600',
    },
    planFeatures: {
        gap: 5,
        marginBottom: 12,
    },
    planFeatureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    planFeatureText: {
        fontSize: 12,
        fontWeight: '600',
    },
    planCTA: {
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
    },
    planCTAText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFF',
    },
    ctaButton: {
        marginTop: 4,
        paddingVertical: 10,
        alignItems: 'center',
    },
    ctaText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#94A3B8',
    },
    footerText: {
        fontSize: 9,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 2,
        marginBottom: 14,
        paddingHorizontal: 14,
    },
});
