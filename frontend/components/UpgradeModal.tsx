import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    Animated, Dimensions, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

const { width } = Dimensions.get('window');

interface Props {
    visible: boolean;
    message: string;
    onClose: () => void;
}

export function UpgradeModal({ visible, message, onClose }: Props) {
    const { colors } = useTheme();
    const { user } = useAuth();
    const scaleAnim = useRef(new Animated.Value(0.85)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const [trialLoading, setTrialLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 6,
                    tension: 80,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.15,
                        duration: 1200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1200,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            scaleAnim.setValue(0.85);
            opacityAnim.setValue(0);
            pulseAnim.setValue(1);
        }
    }, [visible]);

    const plan = (user as any)?.plan || 'free';
    const trialUsed = (user as any)?.trial_used || false;
    const trialActive = (user as any)?.trial_active || false;
    const planLabel = plan === 'free' ? 'Grátis' : plan === 'basic' ? 'Básico' : 'Premium';

    const canStartTrial = !trialUsed && !trialActive && plan !== 'premium';

    const features = plan === 'free'
        ? [
            { icon: 'wallet-outline' as const, text: 'Contas ilimitadas' },
            { icon: 'card-outline' as const, text: 'Cartões de crédito' },
            { icon: 'swap-horizontal-outline' as const, text: 'Transações ilimitadas' },
            { icon: 'calendar-outline' as const, text: 'Agendamentos ilimitados' },
            { icon: 'build-outline' as const, text: 'Todas as ferramentas' },
            { icon: 'logo-whatsapp' as const, text: 'Agente IA no WhatsApp' },
        ]
        : [
            { icon: 'logo-whatsapp' as const, text: 'Agente IA no WhatsApp' },
            { icon: 'infinite-outline' as const, text: 'Tudo do plano Básico' },
        ];

    async function handleStartTrial() {
        setTrialLoading(true);
        try {
            const result: any = await api.startTrial();
            Alert.alert(
                '🎉 Trial Ativado!',
                result.message || 'Aproveite 7 dias de Premium! Reinicie o app para ver todas as mudanças.',
                [{ text: 'Incrível!', onPress: onClose }]
            );
        } catch (err: any) {
            Alert.alert('Ops', err.message || 'Não foi possível ativar o trial.');
        } finally {
            setTrialLoading(false);
        }
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.container,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            transform: [{ scale: scaleAnim }],
                            opacity: opacityAnim,
                        },
                    ]}
                >
                    {/* Header */}
                    <View style={styles.headerWrapper}>
                        <View style={styles.gradientBase} />
                        <View style={styles.gradientOverlay1} />
                        <View style={styles.gradientOverlay2} />

                        <View style={[styles.decoCircle, { top: -30, right: -20 }]} />
                        <View style={[styles.decoCircle, { bottom: -15, left: -25, width: 90, height: 90 }]} />
                        <View style={[styles.decoCircle, { top: 10, left: 60, width: 40, height: 40, opacity: 0.08 }]} />

                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
                        </TouchableOpacity>

                        <Animated.View style={[styles.starRing, { transform: [{ scale: pulseAnim }] }]}>
                            <View style={styles.starInner}>
                                <Ionicons name="diamond" size={32} color="#FFF" />
                            </View>
                        </Animated.View>

                        <Text style={styles.headerTitle}>Faça Upgrade!</Text>
                        <View style={styles.planPill}>
                            <Text style={styles.planPillText}>Plano atual: {planLabel}</Text>
                        </View>
                    </View>

                    {/* Warning */}
                    <View style={styles.warningBox}>
                        <View style={styles.warningIconWrap}>
                            <Ionicons name="alert-circle" size={22} color="#D97706" />
                        </View>
                        <Text style={styles.warningText}>{message}</Text>
                    </View>

                    {/* Features */}
                    <View style={styles.featuresSection}>
                        <Text style={[styles.featuresTitle, { color: colors.text }]}>
                            {plan === 'free' ? '✨ Desbloqueie com o upgrade:' : '✨ Desbloqueie com o Premium:'}
                        </Text>
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

                    {/* Trial Button — only if never used */}
                    {canStartTrial && (
                        <TouchableOpacity
                            style={styles.trialButton}
                            onPress={handleStartTrial}
                            activeOpacity={0.8}
                            disabled={trialLoading}
                        >
                            {trialLoading ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="sparkles" size={18} color="#FFF" />
                                    <Text style={styles.trialText}>Testar Premium por 7 dias grátis</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    {trialUsed && !trialActive && (
                        <View style={[styles.trialUsedBox, { backgroundColor: colors.border + '40' }]}>
                            <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                            <Text style={[styles.trialUsedText, { color: colors.textMuted }]}>
                                Você já utilizou seu período de degustação
                            </Text>
                        </View>
                    )}

                    {/* Close CTA */}
                    <TouchableOpacity style={styles.ctaButton} onPress={onClose} activeOpacity={0.8}>
                        <Text style={styles.ctaText}>Entendi</Text>
                    </TouchableOpacity>

                    <Text style={[styles.footerText, { color: colors.textMuted }]}>
                        Fale com o administrador para alterar seu plano
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
        width: width - 48,
        maxWidth: 400,
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        elevation: 20,
    },
    headerWrapper: {
        paddingTop: 36,
        paddingBottom: 28,
        paddingHorizontal: 24,
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    gradientBase: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#F59E0B',
    },
    gradientOverlay1: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: '60%',
        backgroundColor: '#F97316',
        borderTopLeftRadius: 200,
        opacity: 0.7,
    },
    gradientOverlay2: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: '40%',
        height: '60%',
        backgroundColor: '#EF4444',
        borderTopLeftRadius: 200,
        opacity: 0.4,
    },
    decoCircle: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    closeBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    starRing: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    starInner: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: -0.5,
    },
    planPill: {
        marginTop: 10,
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    planPillText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFF',
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 16,
        marginTop: -14,
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
    featuresSection: {
        paddingHorizontal: 20,
        marginTop: 20,
    },
    featuresTitle: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 12,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
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
    trialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginHorizontal: 20,
        marginTop: 18,
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
    trialUsedBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 20,
        marginTop: 14,
        padding: 10,
        borderRadius: 12,
    },
    trialUsedText: {
        fontSize: 12,
        fontWeight: '600',
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginHorizontal: 20,
        marginTop: 14,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: '#F59E0B',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    ctaText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFF',
    },
    footerText: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 12,
        marginBottom: 18,
        paddingHorizontal: 20,
    },
});
