import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radii, spacing, shadows, useTheme, Theme } from '../../theme';
import {
  SUBSCRIPTION_PLANS,
  LAUNCH_OFFER_PLANS,
} from '../../constants/subscriptionPlans';
import { subscriptionService } from '../../services/subscriptionService';
import { whatsappService } from '../../services/whatsappService';
import { APP_CONFIG } from '../../constants/appConfig';
import { useShop } from '../../context/ShopContext';
import { useCart } from '../../context/CartContext';

interface SubscriptionPlansModalProps {
  visible: boolean;
  onClose: () => void;
  canDismiss?: boolean;
}

export const formatPlanInquiryMessage = (
  plan: any,
  price: number,
  shop: { name?: string; phone?: string; id?: string }
): string => {
  const planName = plan?.name || 'Counter365 Pro';
  const duration = plan?.durationLabel || `${plan?.durationMonths || 1} Month(s)`;
  const shopName = shop?.name || 'My Shop';
  const shopPhone = shop?.phone || '';

  return (
    `Hi Counter365 Support Team,\n\n` +
    `I need to buy this plan for my shop:\n\n` +
    `• Plan: ${planName} (${duration})\n` +
    `• Price: ₹${price.toLocaleString('en-IN')}\n` +
    `• Shop Name: ${shopName}\n` +
    (shopPhone ? `• Phone: ${shopPhone}\n` : '') +
    `\nPlease share the payment details and assist me in activating this plan. Thank you!`
  );
};

export const SubscriptionPlansModal: React.FC<SubscriptionPlansModalProps> = ({
  visible,
  onClose,
  canDismiss = true,
}) => {
  const { theme, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const { shop } = useShop();
  const { flash } = useCart();

  const [selectedPlanId, setSelectedPlanId] = useState<string>('3_months');
  const [showTemplateView, setShowTemplateView] = useState<boolean>(false);

  // Authoritative 30-day Launch Offer eligibility state
  const [isLaunchEligible, setIsLaunchEligible] = useState<boolean>(true);
  const [eligibilityData, setEligibilityData] = useState<{
    daysRemaining: number;
    hoursRemaining: number;
    secondsRemaining: number;
  }>({ daysRemaining: 30, hoursRemaining: 720, secondsRemaining: 2592000 });

  useEffect(() => {
    if (visible && shop?.id) {
      setShowTemplateView(false);
      subscriptionService
        .checkLaunchOfferEligibility(shop.id, shop.createdAt)
        .then(res => {
          setIsLaunchEligible(res.isEligible);
          setEligibilityData({
            daysRemaining: res.daysRemaining,
            hoursRemaining: res.hoursRemaining,
            secondsRemaining: res.secondsRemaining,
          });
        })
        .catch(() => {
          setIsLaunchEligible(true);
        });
    }
  }, [visible, shop?.id, shop?.createdAt]);

  const activePlans: any[] = isLaunchEligible ? LAUNCH_OFFER_PLANS : SUBSCRIPTION_PLANS;
  const selectedPlan: any = activePlans.find(p => p.id === selectedPlanId) || activePlans[0];
  const selectedPrice: number = isLaunchEligible
    ? selectedPlan.launchPrice || selectedPlan.price
    : selectedPlan.price;

  const currentTemplateMessage = formatPlanInquiryMessage(
    selectedPlan,
    selectedPrice,
    shop
  );

  const handleSelectPlan = (plan: any) => {
    setSelectedPlanId(plan.id);
  };

  const handleSelectAndSendWhatsApp = async (planToUse?: any) => {
    const targetPlan = planToUse || selectedPlan;
    if (planToUse) {
      setSelectedPlanId(planToUse.id);
    }
    const price = isLaunchEligible
      ? targetPlan.launchPrice || targetPlan.price
      : targetPlan.price;

    setShowTemplateView(true);

    const message = formatPlanInquiryMessage(targetPlan, price, shop);
    const targetPhone = APP_CONFIG.supportPhone;

    flash('Opening WhatsApp to send your plan inquiry...');

    try {
      const sent = await whatsappService.shareViaWhatsApp(message, targetPhone);
      if (!sent) {
        const cleanPhone = `91${targetPhone.replace(/[^0-9]/g, '')}`;
        const webUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        await Linking.openURL(webUrl);
      }
    } catch (err) {
      console.warn('Could not launch WhatsApp for plan query:', err);
      const cleanPhone = `91${targetPhone.replace(/[^0-9]/g, '')}`;
      const webUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      Linking.openURL(webUrl).catch(() => {});
    }
  };

  const handleCallSupport = () => {
    Linking.openURL(`tel:${APP_CONFIG.supportPhone}`).catch(() => {});
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        if (canDismiss) onClose();
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              {showTemplateView ? (
                <View style={styles.templateHeaderRow}>
                  <TouchableOpacity
                    onPress={() => setShowTemplateView(false)}
                    style={styles.backBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="arrow-back" size={20} color={colors.text} />
                    <Text style={styles.backBtnText}>Plans</Text>
                  </TouchableOpacity>
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.kicker}>WHATSAPP INQUIRY TEMPLATE</Text>
                    <Text style={styles.title}>Plan Purchase Query</Text>
                  </View>
                </View>
              ) : (
                <>
                  {isLaunchEligible ? (
                    <View style={styles.launchBadgeRow}>
                      <View style={styles.launchBadge}>
                        <Text style={styles.launchBadgeText}>LAUNCH OFFER</Text>
                      </View>
                      <Text style={styles.countdownIndicatorText}>
                        ⏳ {eligibilityData.daysRemaining}{' '}
                        {eligibilityData.daysRemaining === 1 ? 'day' : 'days'} left
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.kicker}>COUNTER365 PLANS</Text>
                  )}
                  <Text style={styles.title}>
                    {isLaunchEligible ? 'Choose Your Plan' : 'Choose Subscription'}
                  </Text>
                </>
              )}
            </View>
            {canDismiss && (
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {showTemplateView ? (
              /* ============================================================ */
              /* TEMPLATE VIEW                                                */
              /* ============================================================ */
              <View style={styles.templateContainer}>
                {/* Selected Plan Summary Card */}
                <View style={styles.planSummaryCard}>
                  <View style={styles.planSummaryHeader}>
                    <View>
                      <Text style={styles.planSummaryName}>{selectedPlan.name}</Text>
                      <Text style={styles.planSummaryDuration}>
                        {selectedPlan.durationLabel || `${selectedPlan.durationMonths} Months`}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.planSummaryPrice}>
                        ₹{selectedPrice.toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.planSummaryBadge}>Ready to Activate</Text>
                    </View>
                  </View>
                </View>

                {/* WhatsApp Message Template Card */}
                <View style={styles.templateCard}>
                  <View style={styles.templateCardHeader}>
                    <View style={styles.templateHeaderLeft}>
                      <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                      <Text style={styles.templateCardTitle}>Inquiry Template</Text>
                    </View>
                    <View style={styles.autoSentBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#059669" />
                      <Text style={styles.autoSentBadgeText}>Auto Query Ready</Text>
                    </View>
                  </View>

                  <View style={styles.templateMessageBubble}>
                    <Text style={styles.templateMessageText}>{currentTemplateMessage}</Text>
                  </View>

                  <View style={styles.recipientRow}>
                    <Ionicons name="send" size={12} color={colors.textSecondary} />
                    <Text style={styles.recipientText}>
                      Recipient: {APP_CONFIG.supportPhoneFormatted} (Counter365 Support)
                    </Text>
                  </View>
                </View>

                {/* Instructions / Notice */}
                <View style={styles.helpNote}>
                  <Ionicons name="information-circle-outline" size={16} color="#0284C7" />
                  <Text style={styles.helpNoteText}>
                    Our team will share the direct payment QR/UPI details on WhatsApp and activate your plan immediately upon confirmation.
                  </Text>
                </View>

                {/* Template Action Buttons */}
                <View style={styles.templateActionCol}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleSelectAndSendWhatsApp(selectedPlan)}
                    style={styles.whatsAppBtn}
                  >
                    <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.whatsAppBtnText}>
                      Send Query on WhatsApp
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowTemplateView(false)}
                    style={styles.changePlanBtn}
                  >
                    <Ionicons name="swap-horizontal" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={styles.changePlanBtnText}>Choose Another Plan</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleCallSupport}
                    style={styles.callSupportBtn}
                  >
                    <Ionicons name="call-outline" size={15} color={colors.accent} style={{ marginRight: 6 }} />
                    <Text style={styles.callSupportBtnText}>
                      Call Support: {APP_CONFIG.supportPhoneFormatted}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* ============================================================ */
              /* PLANS SELECTION VIEW                                         */
              /* ============================================================ */
              <>
                {/* Value Proposition Banner */}
                <View style={styles.introBanner}>
                  <Ionicons name="shield-checkmark" size={20} color={colors.accent} />
                  <Text style={styles.introText}>
                    {isLaunchEligible
                      ? 'Select any plan below to send an instant inquiry to our team via WhatsApp for immediate activation.'
                      : 'Choose your desired subscription plan and connect with our team on WhatsApp for instant activation.'}
                  </Text>
                </View>

                {/* Plans List */}
                <View style={styles.plansContainer}>
                  {activePlans.map((plan: any) => {
                    const isSelected = selectedPlanId === plan.id;
                    const price = isLaunchEligible ? plan.launchPrice : plan.price;
                    const strikethroughPrice =
                      isLaunchEligible && plan.savings > 0
                        ? plan.regularPrice
                        : plan.savings > 0
                        ? plan.normalPrice
                        : null;
                    const savingsLabel = isLaunchEligible
                      ? plan.savingsLabel
                      : plan.savings > 0
                      ? `Save ₹${plan.savings}`
                      : null;
                    const pricePerDay = isLaunchEligible
                      ? plan.pricePerDay
                      : Math.round(plan.price / (plan.durationMonths * 30));

                    return (
                      <TouchableOpacity
                        key={plan.id}
                        activeOpacity={0.85}
                        onPress={() => handleSelectPlan(plan)}
                        style={[
                          styles.planCard,
                          isSelected && styles.planCardSelected,
                          plan.popular && styles.planCardPopular,
                        ]}
                      >
                        {/* Top Badges */}
                        <View style={styles.cardHeader}>
                          <View style={styles.planTitleCol}>
                            <Text style={styles.planName}>{plan.name}</Text>
                            <Text style={styles.durationLabel}>{plan.durationLabel}</Text>
                          </View>

                          <View style={styles.badgeRow}>
                            {savingsLabel && (
                              <View style={styles.discountBadge}>
                                <Text
                                  style={styles.discountBadgeText}
                                  numberOfLines={1}
                                  adjustsFontSizeToFit
                                  minimumFontScale={0.8}
                                >
                                  {savingsLabel}
                                </Text>
                              </View>
                            )}
                            {!isLaunchEligible && plan.discountBadge && (
                              <View style={styles.discountBadge}>
                                <Text
                                  style={styles.discountBadgeText}
                                  numberOfLines={1}
                                  adjustsFontSizeToFit
                                  minimumFontScale={0.8}
                                >
                                  {plan.discountBadge}
                                </Text>
                              </View>
                            )}
                            {plan.popular && !savingsLabel && (
                              <View style={styles.popularBadge}>
                                <Text style={styles.popularBadgeText}>POPULAR</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Price Row */}
                        <View style={styles.priceRow}>
                          <View style={styles.priceCol}>
                            <Text style={styles.priceText}>
                              ₹{price.toLocaleString('en-IN')}
                            </Text>
                            <Text style={styles.pricePerDayText}>₹{pricePerDay}/day</Text>
                          </View>
                          <View style={styles.monthlyCol}>
                            {strikethroughPrice && (
                              <Text style={styles.strikethroughNormal}>
                                ₹{strikethroughPrice.toLocaleString('en-IN')}
                              </Text>
                            )}
                            {!isLaunchEligible && plan.monthlyEquivalent && (
                              <Text style={styles.monthlyText}>
                                ₹
                                {plan.monthlyEquivalent % 1 === 0
                                  ? plan.monthlyEquivalent
                                  : plan.monthlyEquivalent.toFixed(2)}
                                <Text style={styles.monthlySuffix}>/mo</Text>
                              </Text>
                            )}
                          </View>
                        </View>

                        {/* Radio Selection Row */}
                        <View style={styles.radioRow}>
                          <View
                            style={[
                              styles.radioCircle,
                              isSelected && styles.radioCircleSelected,
                            ]}
                          >
                            {isSelected && <View style={styles.radioInner} />}
                          </View>
                          <Text
                            style={[
                              styles.selectLabel,
                              isSelected && styles.selectLabelSelected,
                            ]}
                          >
                            {isSelected ? 'Selected Plan' : 'Tap to Select'}
                          </Text>

                          {isSelected && (
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => handleSelectAndSendWhatsApp(plan)}
                              style={styles.quickSendBadge}
                            >
                              <Ionicons name="logo-whatsapp" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                              <Text style={styles.quickSendBadgeText}>Inquire</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* WhatsApp Support Notice */}
                <View style={styles.securityNote}>
                  <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
                  <Text style={styles.securityText}>
                    Instant query sent to {APP_CONFIG.supportPhoneFormatted} on WhatsApp
                  </Text>
                </View>
              </>
            )}
          </ScrollView>

          {/* Bottom Action Footer (Only in Plans List view) */}
          {!showTemplateView && (
            <View style={styles.footer}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleSelectAndSendWhatsApp(selectedPlan)}
                style={styles.whatsAppBtn}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.whatsAppBtnText}>
                  Select Plan & Inquire on WhatsApp
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme, isDark: boolean) => {
  const colors = theme.colors;
  const whatsappGreen = '#25D366';
  const whatsappDark = '#1FAD55';

  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      justifyContent: 'flex-end',
    },
    sheetContainer: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      maxHeight: '92%',
      paddingBottom: Platform.OS === 'ios' ? 24 : 16,
      ...shadows.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    templateHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: radii.sm,
      backgroundColor: isDark ? colors.surfaceSecondary : '#F3F4F6',
    },
    backBtnText: {
      fontSize: 12,
      fontFamily: typography.fonts.heading,
      fontWeight: '600',
      color: colors.text,
      marginLeft: 2,
    },
    kicker: {
      fontSize: 11,
      fontFamily: typography.fonts.heading,
      letterSpacing: 1.1,
      color: colors.accent,
      textTransform: 'uppercase',
    },
    launchBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 2,
    },
    launchBadge: {
      backgroundColor: '#FF5F00',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radii.sm,
    },
    launchBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800',
      fontFamily: typography.fonts.heading,
      letterSpacing: 0.5,
    },
    countdownIndicatorText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.accent,
      fontFamily: typography.fonts.heading,
    },
    pricePerDayText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: typography.fonts.body,
      fontWeight: '600',
    },
    title: {
      fontSize: 20,
      fontFamily: typography.fonts.heading,
      color: colors.text,
      fontWeight: '700',
      marginTop: 2,
    },
    closeBtn: {
      padding: 6,
      borderRadius: radii.pill,
      backgroundColor: isDark ? colors.surfaceSecondary : '#F3F4F6',
    },
    scrollContent: {
      padding: 20,
      gap: 16,
    },
    introBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: isDark ? colors.surfaceSecondary : '#F0F9FF',
      borderRadius: radii.md,
      padding: 12,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#BAE6FD',
    },
    introText: {
      flex: 1,
      fontSize: 13,
      fontFamily: typography.fonts.body,
      color: isDark ? colors.text : '#0369A1',
      lineHeight: 18,
    },
    plansContainer: {
      gap: 12,
    },
    planCard: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: 16,
      gap: 10,
    },
    planCardSelected: {
      borderColor: colors.accent,
      backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC',
      borderWidth: 2,
    },
    planCardPopular: {
      borderColor: colors.accent,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8,
    },
    planTitleCol: {
      flexShrink: 1,
      gap: 2,
    },
    planName: {
      fontSize: 18,
      fontFamily: typography.fonts.heading,
      fontWeight: '700',
      color: colors.text,
    },
    durationLabel: {
      fontSize: 12,
      fontFamily: typography.fonts.body,
      color: colors.textSecondary,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      maxWidth: '62%',
      gap: 6,
    },
    discountBadge: {
      backgroundColor: '#059669',
      borderRadius: radii.sm,
      paddingHorizontal: 8,
      paddingVertical: 3,
      alignSelf: 'flex-start',
    },
    discountBadgeText: {
      color: '#FFFFFF',
      fontSize: 10.5,
      fontWeight: '700',
      fontFamily: typography.fonts.heading,
      textAlign: 'center',
    },
    popularBadge: {
      backgroundColor: colors.accent,
      borderRadius: radii.sm,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    popularBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800',
      fontFamily: typography.fonts.heading,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
    },
    priceCol: {
      gap: 2,
    },
    priceText: {
      fontSize: 22,
      fontFamily: typography.fonts.heading,
      fontWeight: '800',
      color: colors.accent,
    },
    monthlyCol: {
      alignItems: 'flex-end',
      gap: 2,
    },
    monthlyText: {
      fontSize: 15,
      fontFamily: typography.fonts.heading,
      fontWeight: '700',
      color: colors.text,
    },
    monthlySuffix: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: 'normal',
    },
    strikethroughNormal: {
      fontSize: 12,
      fontFamily: typography.fonts.body,
      color: colors.textMuted,
      textDecorationLine: 'line-through',
    },
    radioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    radioCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioCircleSelected: {
      borderColor: colors.accent,
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.accent,
    },
    selectLabel: {
      fontSize: 13,
      fontFamily: typography.fonts.body,
      color: colors.textSecondary,
      flex: 1,
    },
    selectLabelSelected: {
      color: colors.accent,
      fontWeight: '600',
    },
    quickSendBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: whatsappDark,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radii.pill,
    },
    quickSendBadgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
      fontFamily: typography.fonts.heading,
    },
    securityNote: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 6,
    },
    securityText: {
      fontSize: 12,
      fontFamily: typography.fonts.body,
      color: colors.textSecondary,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    whatsAppBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: whatsappDark,
      paddingVertical: 15,
      borderRadius: radii.lg,
      ...shadows.sm,
    },
    whatsAppBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontFamily: typography.fonts.heading,
      fontWeight: '700',
    },

    /* ============================================================ */
    /* TEMPLATE VIEW STYLES                                         */
    /* ============================================================ */
    templateContainer: {
      gap: 16,
    },
    planSummaryCard: {
      backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC',
      borderRadius: radii.lg,
      padding: 16,
      borderWidth: 1.5,
      borderColor: colors.accent,
    },
    planSummaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    planSummaryName: {
      fontSize: 17,
      fontFamily: typography.fonts.heading,
      fontWeight: '700',
      color: colors.text,
    },
    planSummaryDuration: {
      fontSize: 13,
      fontFamily: typography.fonts.body,
      color: colors.textSecondary,
      marginTop: 2,
    },
    planSummaryPrice: {
      fontSize: 22,
      fontFamily: typography.fonts.heading,
      fontWeight: '800',
      color: colors.accent,
    },
    planSummaryBadge: {
      fontSize: 10,
      fontWeight: '700',
      color: '#059669',
      fontFamily: typography.fonts.heading,
      marginTop: 2,
    },
    templateCard: {
      backgroundColor: isDark ? colors.surfaceSecondary : '#FFFFFF',
      borderRadius: radii.lg,
      borderWidth: 1.5,
      borderColor: '#86EFAC',
      padding: 16,
      gap: 12,
      ...shadows.sm,
    },
    templateCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? colors.border : '#E5E7EB',
      paddingBottom: 8,
    },
    templateHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    templateCardTitle: {
      fontSize: 14,
      fontFamily: typography.fonts.heading,
      fontWeight: '700',
      color: colors.text,
    },
    autoSentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#D1FAE5',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radii.pill,
    },
    autoSentBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#059669',
      fontFamily: typography.fonts.heading,
    },
    templateMessageBubble: {
      backgroundColor: isDark ? '#062817' : '#F0FDF4',
      borderRadius: radii.md,
      padding: 14,
      borderLeftWidth: 3,
      borderLeftColor: whatsappDark,
    },
    templateMessageText: {
      fontSize: 13,
      fontFamily: typography.fonts.body,
      color: isDark ? '#E2E8F0' : '#1E293B',
      lineHeight: 20,
    },
    recipientRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingTop: 4,
    },
    recipientText: {
      fontSize: 12,
      fontFamily: typography.fonts.body,
      color: colors.textSecondary,
    },
    helpNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: isDark ? colors.surfaceSecondary : '#F0F9FF',
      borderRadius: radii.md,
      padding: 12,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#BAE6FD',
    },
    helpNoteText: {
      flex: 1,
      fontSize: 12,
      fontFamily: typography.fonts.body,
      color: isDark ? colors.text : '#0369A1',
      lineHeight: 17,
    },
    templateActionCol: {
      gap: 10,
      marginTop: 4,
    },
    changePlanBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    changePlanBtnText: {
      fontSize: 13,
      fontFamily: typography.fonts.heading,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    callSupportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
    },
    callSupportBtnText: {
      fontSize: 13,
      fontFamily: typography.fonts.heading,
      fontWeight: '600',
      color: colors.accent,
    },
  });
};
