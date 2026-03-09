import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    Animated, Dimensions, Alert, ActivityIndicator, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

const { width } = Dimensions.get('window');
const BANNER_IMG = require('@/assets/images/upgrade_banner.png');

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
        } else {
            scaleAnim.setValue(0.85);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    const plan = (user as any)?.plan || 'free';
    const trialUsed = (user as any)?.trial_used || false;
    const trialActive = (user as any)?.trial_active || false;

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
            const result: any = await api.startTrial();
            Alert.alert(
                '🎉 Trial Ativado!',
                result.message || 'Aproveite 7 dias de Premium!',
                [{ text: 'Incrível!', onPress: onClose }]
            );
        } catch (err: any) {
            Alert.alert('Ops', err.message || 'Não foi possível ativar o trial.');
        } finally {
            setTrialLoading(false);
        }
    }

    if (!visible) return null;

    return (
        <View style={StyleSheet.absoluteFill}>
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

                    {/* ─── TRIAL BUTTON ─── */}
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

                    {/* ─── CLOSE CTA ─── */}
                    <TouchableOpacity style={styles.ctaButton} onPress={onClose} activeOpacity={0.8}>
                        <Text style={styles.ctaText}>Entendi</Text>
                    </TouchableOpacity>

                    <Text style={[styles.footerText, { color: colors.textMuted }]}>
                        Fale com o administrador para alterar seu plano
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

    // ── Trial ──
    trialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginHorizontal: 20,
        marginTop: 16,
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
        marginTop: 12,
        padding: 10,
        borderRadius: 12,
    },
    trialUsedText: {
        fontSize: 12,
        fontWeight: '600',
    },

    // ── CTA ──
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginHorizontal: 20,
        marginTop: 12,
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
        marginBottom: 16,
        paddingHorizontal: 20,
    },
});
