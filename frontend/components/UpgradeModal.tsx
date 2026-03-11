import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    Animated, Dimensions, Alert, ActivityIndicator, Image, Linking, Platform, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

const { width } = Dimensions.get('window');
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
    const { user, refreshUser } = useAuth();
    const router = useRouter();
    const scaleAnim = useRef(new Animated.Value(0.85)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const [trialLoading, setTrialLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            opacityAnim.setValue(0);
            scaleAnim.setValue(0.85);
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 7,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    if (!visible) return null;

    const plan = (user as any)?.plan || 'free';
    const trialUsed = (user as any)?.trial_used || false;
    const trialActive = (user as any)?.trial_active || false;

    // Só pode iniciar trial se nunca usou, não está em trial e não é premium
    const canStartTrial = !trialUsed && !trialActive && plan !== 'premium';

    const features = plan === 'free'
        ? [
            { icon: 'wallet-outline' as const, text: 'Contas ilimitadas' },
            { icon: 'card-outline' as const, text: 'Cartões de crédito' },
            { icon: 'swap-horizontal-outline' as const, text: 'Transações ilimitadas' },
            { icon: 'calendar-outline' as const, text: 'Agendamentos ilimitados' },
            { icon: 'logo-whatsapp' as const, text: 'Agente IA no WhatsApp' },
        ]
        : [
            { icon: 'logo-whatsapp' as const, text: 'Agente IA no WhatsApp' },
            { icon: 'infinite-outline' as const, text: 'Tudo do plano Básico' },
        ];

    async function handleStartTrial() {
        setTrialLoading(true);
        try {
            await api.startTrial();
            await refreshUser();
            onClose();
            router.replace('/(tabs)');
            Alert.alert(
                '🎉 Premium Ativado!',
                'Aproveite 7 dias com todos os recursos!'
            );
        } catch (err: any) {
            Alert.alert('Ops', err.message || 'Não foi possível ativar o trial.');
        } finally {
            setTrialLoading(false);
        }
    }

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

    return (
        <View
            style={[
                StyleSheet.absoluteFill,
                { zIndex: 9999, pointerEvents: visible ? 'auto' : 'none' }
            ]}
        >
            <View style={[styles.overlay, { opacity: visible ? 1 : 0 }]}>
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
                            maxHeight: '85%',
                        },
                    ]}
                >
                    {/* ─── BANNER IMAGE ─── */}
                    <View style={styles.bannerWrap}>
                        <Image source={BANNER_IMG} style={styles.bannerImage} resizeMode="cover" />
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Ionicons name="close" size={20} color="rgba(255,255,255,0.9)" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        style={{ flex: 1 }}
                    >
                        {/* ─── LIMIT WARNING ─── */}
                        <View style={styles.warningBox}>
                            <View style={styles.warningIconWrap}>
                                <Ionicons name="alert-circle" size={22} color="#D97706" />
                            </View>
                            <Text style={styles.warningText}>{message}</Text>
                        </View>

                        {/* ─── FEATURES ─── */}
                        <View style={styles.featuresSection}>
                            <Text style={[styles.featuresTitle, { color: colors.text }]}>
                                {plan === 'free' ? '✨ Desbloqueie com o upgrade:' : '✨ Desbloqueie com o Premium:'}
                            </Text>
                            <View style={styles.featuresList}>
                                {features.map((f, i) => (
                                    <View key={i} style={[styles.featureRow, { borderBottomColor: colors.border }]}>
                                        <View style={styles.featureIconWrap}>
                                            <Ionicons name={f.icon} size={18} color="#F59E0B" />
                                        </View>
                                        <Text style={[styles.featureText, { color: colors.text }]}>{f.text}</Text>
                                        <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* ─── ACTIONS ─── */}
                        <View style={styles.actionsSection}>
                            {canStartTrial && (
                                <TouchableOpacity
                                    style={[styles.trialButton, { marginBottom: 12 }]}
                                    onPress={handleStartTrial}
                                    activeOpacity={0.8}
                                    disabled={trialLoading}
                                >
                                    {trialLoading ? (
                                        <ActivityIndicator color="#FFF" size="small" />
                                    ) : (
                                        <>
                                            <Ionicons name="sparkles" size={18} color="#FFF" />
                                            <Text style={styles.trialText}>7 dias de Premium Grátis</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}

                            <View style={styles.planSelection}>
                                <TouchableOpacity
                                    style={[styles.planCard, { borderColor: colors.border }]}
                                    onPress={handleOpenStore}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.planBadge, { backgroundColor: '#3B82F6' }]}>
                                        <Text style={styles.planBadgeText}>Básico</Text>
                                    </View>
                                    <Text style={[styles.planDescription, { color: colors.textSecondary }]}>Todos os recursos essenciais ilimitados</Text>
                                    <Text style={[styles.planPrice, { color: colors.text }]}>R$ 9,90/mês</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.planCard, { borderColor: '#8B5CF6' }]}
                                    onPress={handleOpenStore}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.planBadge, { backgroundColor: '#8B5CF6' }]}>
                                        <Text style={styles.planBadgeText}>Premium</Text>
                                    </View>
                                    <Text style={[styles.planDescription, { color: colors.textSecondary }]}>Agente IA no WhatsApp + Básico</Text>
                                    <Text style={[styles.planPrice, { color: colors.text }]}>R$ 29,90/mês</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity style={styles.ctaButton} onPress={onClose} activeOpacity={0.8}>
                                <Text style={styles.ctaText}>Entendi</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>

                    <Text style={[styles.footerText, { color: colors.textMuted }]}>
                        Assinatura via {Platform.OS === 'ios' ? 'App Store' : 'Google Play Store'}
                    </Text>
                </Animated.View>
            </View>
        </View>
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
        width: width - 40,
        maxWidth: 420,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        elevation: 20,
    },

    // ── Banner Image ──
    bannerWrap: {
        width: '100%',
        height: 160,
        position: 'relative',
    },
    bannerImage: {
        width: '100%',
        height: '100%',
    },
    closeBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },

    // ── Warning ──
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 16,
        marginTop: 16,
        padding: 14,
        borderRadius: 16,
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#FDE68A',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    warningIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#FDE68A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    warningText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '700',
        color: '#92400E',
        lineHeight: 18,
    },

    // ── Features ──
    featuresSection: {
        paddingHorizontal: 20,
        marginTop: 16,
    },
    featuresTitle: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 10,
    },
    featuresList: {
        gap: 2,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 9,
        borderBottomWidth: 0.5,
    },
    featureIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#FEF3C7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },

    // ── Actions ──
    actionsSection: {
        paddingHorizontal: 20,
        marginTop: 16,
    },
    trialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: '#8B5CF6',
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 6,
    },
    trialText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFF',
    },

    // ── Plan Selection ──
    planSelection: {
        flexDirection: 'row',
        gap: 12,
    },
    planCard: {
        flex: 1,
        borderWidth: 2,
        borderRadius: 20,
        padding: 12,
        backgroundColor: 'transparent',
    },
    planBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 8,
    },
    planBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#FFF',
        textTransform: 'uppercase',
    },
    planDescription: {
        fontSize: 11,
        fontWeight: '600',
        lineHeight: 15,
        marginBottom: 8,
        height: 30,
    },
    planPrice: {
        fontSize: 14,
        fontWeight: '900',
    },

    // ── CTA ──
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 12,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: 'transparent',
    },
    ctaText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#94A3B8', // Slate 400
    },
    footerText: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 16,
        paddingHorizontal: 20,
    },
});
