import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, radii, shadows, useTheme, Theme } from '../../theme';
import { otaUpdateService } from '../../services/otaUpdateService';

interface OtaUpdateModalProps {
  visible: boolean;
  onUpdateComplete?: () => void;
}

export const OtaUpdateModal: React.FC<OtaUpdateModalProps> = ({
  visible,
  onUpdateComplete,
}) => {
  const { theme, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatusText, setUpdateStatusText] = useState('Downloading update...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setIsUpdating(false);
      setErrorMessage(null);
      setUpdateStatusText('Downloading update...');

      // Entrance bounce & fade
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous gentle pulse for update icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  // Rotate animation while downloading
  useEffect(() => {
    if (isUpdating) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [isUpdating]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleUpdatePress = async () => {
    if (isUpdating) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}

    setIsUpdating(true);
    setErrorMessage(null);
    setUpdateStatusText('Downloading update...');

    const result = await otaUpdateService.fetchAndApplyUpdate();

    if (result.success) {
      setUpdateStatusText('Reloading Counter365...');
      setTimeout(() => {
        onUpdateComplete?.();
      }, 500);
    } else {
      setIsUpdating(false);
      setErrorMessage(result.error || 'Failed to apply update. Please retry.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={() => {
        // Non-dismissible: user must update to continue smoothly
      }}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Animated Header Icon with Pulsing Halo */}
          <View style={styles.iconContainer}>
            <Animated.View
              style={[
                styles.pulseHalo,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <View style={styles.iconCircle}>
              {isUpdating ? (
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons name="sync" size={32} color="#FFFFFF" />
                </Animated.View>
              ) : (
                <Ionicons name="sparkles" size={30} color="#FFFFFF" />
              )}
            </View>
          </View>

          {/* Quick Update Badge */}
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Ionicons name="flash" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.badgeText}>QUICK UPDATE READY</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Please Update to Continue</Text>

          {/* Description */}
          <Text style={styles.message}>
            A new seamless update is available for Counter365 with improved performance and the latest features.
          </Text>

          {/* Error Banner if retry needed */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={15} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Progress / Updating Indicator */}
          {isUpdating ? (
            <View style={styles.updatingContainer}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.updatingText}>{updateStatusText}</Text>
            </View>
          ) : (
            /* Action Button */
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleUpdatePress}
              style={styles.updateButton}
            >
              <Ionicons name="arrow-down-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.updateButtonText}>Update Now</Text>
            </TouchableOpacity>
          )}

          {/* Footer Note */}
          <Text style={styles.footerNote}>
            Takes only a few seconds. Counter365 will refresh automatically.
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme, isDark: boolean) => {
  const colors = theme.colors;

  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 22,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: isDark ? colors.border : '#E2E8F0',
      ...shadows.lg,
    },
    iconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    pulseHalo: {
      position: 'absolute',
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: isDark ? 'rgba(255, 95, 0, 0.22)' : 'rgba(255, 95, 0, 0.16)',
    },
    iconCircle: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.md,
    },
    badgeRow: {
      marginBottom: 10,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#059669',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radii.pill,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 10.5,
      fontWeight: '800',
      fontFamily: typography.fonts.heading,
      letterSpacing: 0.6,
    },
    title: {
      fontSize: 19,
      fontFamily: typography.fonts.heading,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    message: {
      fontSize: 13.5,
      fontFamily: typography.fonts.body,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 18,
      paddingHorizontal: 8,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(220, 38, 38, 0.15)' : '#FEE2E2',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.sm,
      marginBottom: 14,
      width: '100%',
    },
    errorText: {
      fontSize: 12,
      color: '#DC2626',
      fontFamily: typography.fonts.body,
      flex: 1,
    },
    updatingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9',
      width: '100%',
      paddingVertical: 14,
      borderRadius: radii.lg,
      marginBottom: 10,
    },
    updatingText: {
      fontSize: 14,
      fontFamily: typography.fonts.heading,
      fontWeight: '600',
      color: colors.text,
    },
    updateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      width: '100%',
      paddingVertical: 14,
      borderRadius: radii.lg,
      marginBottom: 10,
      ...shadows.sm,
    },
    updateButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontFamily: typography.fonts.heading,
      fontWeight: '700',
    },
    footerNote: {
      fontSize: 11,
      fontFamily: typography.fonts.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 2,
    },
  });
};
