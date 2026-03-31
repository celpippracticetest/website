'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogContent,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import RecordVoiceOverRoundedIcon from '@mui/icons-material/RecordVoiceOverRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckoutAttributionFields from '@/components/analytics/CheckoutAttributionFields';
import {
  formatBillingCycle,
  formatPlanCadPrice,
  getDurationGroupKey,
  getPlanButtonLabel,
  getStablePlanId,
  isMonthlyPlan,
  isThreeMonthPlan,
  isWeeklyPlan,
  isYearlyPlan,
  PRICING_COMPACT_CARD_CORE_FEATURES,
  parsePrice,
} from '@/lib/pricing';
import type { DurationGroupKey, SerializedPlan } from '@/types/pricing';
import { useUser } from '@clerk/nextjs';

type FunnelStep = 'input' | 'email' | 'result';

const EXPRESS_ENTRY_PLANS_TAGLINE =
  'Same Premium access on every plan — only the subscription length changes.';

const EXPRESS_ENTRY_DURATION_ORDER: Record<DurationGroupKey, number> = {
  weekly: 0,
  monthly: 1,
  threeMonth: 2,
  yearly: 3,
};

function expressEntryPlanDurationTitle(plan: SerializedPlan): string {
  if (isWeeklyPlan(plan)) return 'Sprint';
  if (isMonthlyPlan(plan)) return 'Monthly';
  if (isThreeMonthPlan(plan)) return '3 months';
  if (isYearlyPlan(plan)) return 'Yearly';
  return plan.planTitle || plan.title;
}

const boostByLevel = (clb: number) => {
  if (clb <= 7) return 52;
  if (clb === 8) return 34;
  return 12;
};

const siteTheme = {
  pageBg: '#F4F7FF',
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primarySoft: '#DBEAFE',
  primaryText: '#1D4ED8',
  alertBg: '#EFF6FF',
  alertBorder: '#BFDBFE',
  alertText: '#1E40AF',
};

const Page = () => {
  const { isSignedIn, isLoaded } = useUser();
  /** Avoid SSR vs client mismatch on Clerk + checkout action URLs */
  const [hasMounted, setHasMounted] = useState(false);
  const [currentCLB, setCurrentCLB] = useState(7);
  const [funnelStep, setFunnelStep] = useState<FunnelStep>('input');
  const [email, setEmail] = useState('');
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitGuideEmail, setExitGuideEmail] = useState('');
  const [exitGuideSubmitting, setExitGuideSubmitting] = useState(false);
  const [exitGuideError, setExitGuideError] = useState<string | null>(null);
  const [catalogPlans, setCatalogPlans] = useState<SerializedPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);

  const progress = useMemo(() => {
    if (funnelStep === 'input') return 33;
    if (funnelStep === 'email') return 66;
    return 100;
  }, [funnelStep]);

  const sortedCatalogPlans = useMemo(() => {
    return [...catalogPlans].sort((a, b) => {
      const da = getDurationGroupKey(a);
      const db = getDurationGroupKey(b);
      const ra = da != null ? EXPRESS_ENTRY_DURATION_ORDER[da] : 99;
      const rb = db != null ? EXPRESS_ENTRY_DURATION_ORDER[db] : 99;
      if (ra !== rb) return ra - rb;
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }, [catalogPlans]);

  const checkoutSessionBase =
    !hasMounted || !isLoaded
      ? null
      : isSignedIn
        ? '/api/checkout_session'
        : '/api/checkout_session/guest';

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 0) setShowExitModal(true);
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/plans/express-entry');
        const data = (await res.json()) as { plans?: SerializedPlan[]; error?: string };
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load plans');
        }
        if (!cancelled) {
          setCatalogPlans(data.plans ?? []);
          setPlansError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setPlansError(e instanceof Error ? e.message : 'Failed to load plans');
          setCatalogPlans([]);
        }
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const goNext = () => {
    if (funnelStep === 'input') {
      setFunnelStep('email');
      return;
    }

    if (funnelStep === 'email' && email.includes('@')) {
      const trimmed = email.trim();
      void fetch('/api/subscribe/express-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      }).catch(() => {});
      setFunnelStep('result');
    }
  };

  const submitExitBlueprint = async () => {
    if (exitGuideSubmitting) return;
    const trimmed = exitGuideEmail.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!emailOk) {
      setExitGuideError('Please enter a valid email.');
      return;
    }
    setExitGuideError(null);
    setExitGuideSubmitting(true);
    try {
      const res = await fetch('/api/subscribe/express-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
        credentials: 'same-origin',
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || data.ok === false) {
        setExitGuideError(
          typeof data.message === 'string' ? data.message : 'Something went wrong. Try again.',
        );
        return;
      }
      setShowExitModal(false);
      setExitGuideEmail('');
    } catch {
      setExitGuideError('Something went wrong. Try again.');
    } finally {
      setExitGuideSubmitting(false);
    }
  };

  return (
    <Box sx={{ bgcolor: siteTheme.pageBg, minHeight: '100vh' }}>
      <Box sx={{ bgcolor: siteTheme.primary, color: 'white', py: 1.25 }}>
        <Container maxWidth="lg">
          <Typography variant="body2" sx={{ textAlign: 'center', fontWeight: 700 }}>
            Next Express Entry draw is approaching. Improve your CELPIP score before the cutoff moves.
          </Typography>
        </Container>
      </Box>

      <Box sx={{ py: { xs: 7, md: 10 } }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={5} alignItems="center">
            <Box sx={{ width: '100%', flex: { md: 1 }, minWidth: 0 }}>
              <Chip
                label="AI-Powered CELPIP Roadmap"
                sx={{ mb: 2.5, bgcolor: siteTheme.primarySoft, color: siteTheme.primaryText, fontWeight: 700 }}
              />
              <Typography
                variant="h2"
                sx={{
                  textAlign: 'center',
                  fontSize: { xs: '2rem', md: '3.25rem' },
                  fontWeight: 800,
                  lineHeight: 1.1,
                  color: '#0F172A',
                  mb: 2.5,
                }}
              >
                You could unlock up to{' '}
                <Box component="span" sx={{ color: siteTheme.primaryDark }}>
                  +{boostByLevel(currentCLB)} CRS points
                </Box>{' '}
                with focused CELPIP improvement.
              </Typography>
              <Typography variant="h6" sx={{ color: '#475569', fontWeight: 500, mb: 3.5 }}>
                Get a personalized score-gap check and a practical study path that matches your current CLB level.
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                <Chip label="Trusted by 4,500+ learners" sx={{ bgcolor: 'white' }} />
                <Chip label="Structured AI feedback" sx={{ bgcolor: 'white' }} />
                <Chip label="Real exam simulation" sx={{ bgcolor: 'white' }} />
              </Stack>
            </Box>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pb: { xs: 8, md: 10 } }}>
        <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 4, bgcolor: 'white', mb: 5 }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Typography
              variant="h4"
              sx={{ textAlign: 'center', fontSize: '24px', fontWeight: 800, color: '#0F172A', mb: 1.5 }}
            >
              Why this works
            </Typography>
            <Typography variant="body1" sx={{ textAlign: 'center', color: '#64748B', mb: 4 }}>
              Learn exactly where points are lost and what to practice next.
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems="stretch">
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Card variant="outlined" sx={{ borderRadius: 3, borderColor: '#E2E8F0', height: '100%' }}>
                  <CardContent>
                    <AutoAwesomeRoundedIcon sx={{ color: siteTheme.primaryDark, mb: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>
                      Vocabulary upgrade guidance
                    </Typography>
                    <Typography sx={{ color: '#64748B' }}>
                      The AI flags repetitive language and suggests stronger alternatives for CLB 9 responses.
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Card variant="outlined" sx={{ borderRadius: 3, borderColor: '#E2E8F0', height: '100%' }}>
                  <CardContent>
                    <RecordVoiceOverRoundedIcon sx={{ color: siteTheme.primaryDark, mb: 1 }} />
                    <Typography
                      variant="h6"
                      sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mb: 1 }}
                    >
                      Speaking fluency coaching
                    </Typography>
                    <Typography sx={{ color: '#64748B', fontSize: '14px' }}>
                      Detailed speaking feedback helps reduce hesitation and improve pacing under test conditions.
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Box id="pricing">
          <Typography
            variant="h4"
            sx={{ fontSize: '29px', textAlign: 'center', fontWeight: 800, color: '#0F172A', mb: 1.5 }}
          >
            Choose your study plan
          </Typography>
          <Typography variant="body1" sx={{ textAlign: 'center', color: '#64748B', mb: 4 }}>
            Pick the timeline that matches your next exam date.
          </Typography>
          {plansLoading && <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />}
          {plansError && (
            <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
              {plansError}
            </Alert>
          )}
          {!plansLoading && !plansError && catalogPlans.length === 0 && (
            <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
              Premium plans are temporarily unavailable. Please visit our main pricing page.
            </Alert>
          )}
          <Suspense fallback={null}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems="stretch">
              {sortedCatalogPlans.map((plan, index) => {
                const popular = isMonthlyPlan(plan);
                const billing = formatBillingCycle(plan.billingInterval, plan.billingIntervalCount);
                const showOldPrice =
                  Boolean(plan.oldPrice?.trim()) && parsePrice(plan.oldPrice) > parsePrice(plan.price);
                const checkoutAction =
                  plan.stripePriceId && checkoutSessionBase
                    ? `${checkoutSessionBase}?price=${encodeURIComponent(plan.stripePriceId)}`
                    : '';
                return (
                  <Box key={getStablePlanId(plan, index)} sx={{ flex: { md: 1 }, width: '100%', minWidth: 0 }}>
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: 3,
                        border: `2px solid ${popular ? siteTheme.primary : '#E2E8F0'}`,
                        position: 'relative',
                        height: '100%',
                      }}
                    >
                      {popular && (
                        <Chip
                          label="Most Popular"
                          color="primary"
                          sx={{ position: 'absolute', top: 14, right: 14, fontWeight: 700 }}
                        />
                      )}
                      <CardContent sx={{ p: 3, pt: popular ? 4 : 3 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', mb: 0.5 }}
                        >
                          Premium
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>
                          {expressEntryPlanDurationTitle(plan)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>
                          {EXPRESS_ENTRY_PLANS_TAGLINE}
                        </Typography>
                        <Stack direction="row" alignItems="baseline" spacing={0.5} sx={{ mb: 2.5, flexWrap: 'wrap' }}>
                          {showOldPrice && (
                            <Typography
                              component="span"
                              sx={{
                                fontSize: '1rem',
                                color: '#94A3B8',
                                textDecoration: 'line-through',
                                mr: 1,
                              }}
                            >
                              CA${formatPlanCadPrice(plan.oldPrice)}
                            </Typography>
                          )}
                          <Typography variant="h3" sx={{ fontWeight: 800, color: '#0F172A' }}>
                            CA${formatPlanCadPrice(plan.price)}
                          </Typography>
                          {billing ? (
                            <Typography sx={{ color: '#64748B' }}>{` / ${billing}`}</Typography>
                          ) : null}
                        </Stack>
                        <form action={checkoutAction} method="POST">
                          <Suspense fallback={null}>
                            <CheckoutAttributionFields />
                          </Suspense>
                          <Stack spacing={1.25} sx={{ mb: 3 }}>
                            {PRICING_COMPACT_CARD_CORE_FEATURES.map((feature) => (
                              <Stack key={feature} direction="row" spacing={1} alignItems="center">
                                <CheckCircleRoundedIcon sx={{ color: '#16A34A', fontSize: 20 }} />
                                <Typography variant="body2" sx={{ color: '#334155' }}>
                                  {feature}
                                </Typography>
                              </Stack>
                            ))}
                          </Stack>
                          <Button
                            type="submit"
                            fullWidth
                            disabled={!checkoutAction}
                            variant={popular ? 'contained' : 'outlined'}
                            sx={
                              popular
                                ? {
                                    borderRadius: 2.5,
                                    py: 1.2,
                                    bgcolor: siteTheme.primary,
                                    '&:hover': { bgcolor: siteTheme.primaryDark },
                                  }
                                : { borderRadius: 2.5, py: 1.2, borderColor: '#CBD5E1', color: '#1E293B' }
                            }
                          >
                            {getPlanButtonLabel(plan)}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  </Box>
                );
              })}
            </Stack>
          </Suspense>
        </Box>

        <Box sx={{ mt: 6 }}>
          <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid #E2E8F0' }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 8, borderTopLeftRadius: 16, borderTopRightRadius: 16, bgcolor: '#E2E8F0' }}
            />
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              {funnelStep === 'input' && (
                <Stack spacing={3}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <InsightsRoundedIcon sx={{ color: siteTheme.primaryDark }} />
                    <Typography variant="h5" sx={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                      Score Gap Diagnosis
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ color: '#64748B' }}>
                    Select your current CELPIP level:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                    {[6, 7, 8, 9].map((level) => (
                      <Box
                        key={level}
                        sx={{
                          flex: {
                            xs: '0 0 calc(50% - 6px)',
                            md: '0 0 calc(25% - 9px)',
                          },
                          boxSizing: 'border-box',
                        }}
                      >
                        <Button
                          fullWidth
                          variant={currentCLB === level ? 'contained' : 'outlined'}
                          onClick={() => setCurrentCLB(level)}
                          sx={{
                            py: 1.2,
                            borderRadius: 2.5,
                            fontWeight: 800,
                            ...(currentCLB === level
                              ? { bgcolor: siteTheme.primary, '&:hover': { bgcolor: siteTheme.primaryDark } }
                              : { borderColor: '#CBD5E1', color: '#334155' }),
                          }}
                        >
                          CLB {level}
                        </Button>
                      </Box>
                    ))}
                  </Box>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={goNext}
                    endIcon={<ChevronRightRoundedIcon />}
                    sx={{
                      borderRadius: 2.5,
                      py: 1.4,
                      fontSize: '10px',
                      fontWeight: 600,
                      bgcolor: '#0F172A',
                      '&:hover': { bgcolor: '#020617' },
                    }}
                  >
                    Check My CRS Potential
                  </Button>
                </Stack>
              )}

              {funnelStep === 'email' && (
                <Stack spacing={2.5}>
                  <Stack spacing={1} alignItems="center" textAlign="center">
                    <LockRoundedIcon sx={{ color: siteTheme.primaryDark, fontSize: 34 }} />
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
                      View Full Analysis
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748B', maxWidth: 430 }}>
                      Enter your email to unlock the complete breakdown and your recommended CLB 9 roadmap.
                    </Typography>
                  </Stack>
                  <TextField
                    fullWidth
                    type="email"
                    label="Email address"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button
                    variant="contained"
                    size="large"
                    disabled={!email.includes('@')}
                    onClick={goNext}
                    sx={{
                      borderRadius: 2.5,
                      py: 1.4,
                      bgcolor: siteTheme.primary,
                      '&:hover': { bgcolor: siteTheme.primaryDark },
                    }}
                  >
                    Reveal My Results
                  </Button>
                </Stack>
              )}

              {funnelStep === 'result' && (
                <Stack spacing={2.5}>
                  <Alert
                    severity="info"
                    sx={{
                      borderRadius: 3,
                      bgcolor: siteTheme.alertBg,
                      border: `1px solid ${siteTheme.alertBorder}`,
                      color: siteTheme.alertText,
                    }}
                  >
                    Estimated score gap: <strong>{boostByLevel(currentCLB)} CRS points</strong>
                  </Alert>
                  <Card variant="outlined" sx={{ borderRadius: 3, borderColor: '#E2E8F0' }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack spacing={1.5}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography sx={{ fontWeight: 700, color: '#1E293B' }}>Writing coherence</Typography>
                          <Chip size="small" icon={<LockRoundedIcon />} label="Locked" />
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography sx={{ fontWeight: 700, color: '#1E293B' }}>Fluency and hesitation</Typography>
                          <Chip size="small" icon={<LockRoundedIcon />} label="Locked" />
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                  <Button
                    href="#pricing"
                    variant="contained"
                    size="large"
                    startIcon={<ArrowForwardRoundedIcon />}
                    sx={{
                      borderRadius: 2.5,
                      py: 1.4,
                      bgcolor: siteTheme.primary,
                      '&:hover': { bgcolor: siteTheme.primaryDark },
                    }}
                  >
                    See Plans That Fit My Goal
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Box>
      </Container>

      <Dialog
        open={showExitModal}
        onClose={() => {
          setShowExitModal(false);
          setExitGuideError(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogContent sx={{ p: 3 }}>
          <Box
            component="form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void submitExitBlueprint();
            }}
          >
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '16px' }}>
                  Get a free CELPIP blueprint
                </Typography>
                <IconButton
                  type="button"
                  onClick={() => {
                    setShowExitModal(false);
                    setExitGuideError(null);
                  }}
                  size="small"
                >
                  <CloseRoundedIcon />
                </IconButton>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <MailRoundedIcon sx={{ color: siteTheme.primaryDark }} />
                <Typography variant="body2" sx={{ color: '#64748B' }}>
                  Get exam-ready tips and a weekly study checklist.
                </Typography>
              </Stack>
              <TextField
                fullWidth
                type="email"
                name="email"
                autoComplete="email"
                label="Email address"
                placeholder="name@example.com"
                value={exitGuideEmail}
                onChange={(e) => {
                  setExitGuideEmail(e.target.value);
                  if (exitGuideError) setExitGuideError(null);
                }}
                error={Boolean(exitGuideError)}
                helperText={exitGuideError ?? undefined}
                disabled={exitGuideSubmitting}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={exitGuideSubmitting}
                sx={{
                  borderRadius: 2,
                  py: 1.2,
                  bgcolor: siteTheme.primary,
                  '&:hover': { bgcolor: siteTheme.primaryDark },
                }}
              >
                {exitGuideSubmitting ? 'Sending…' : 'Send me the guide'}
              </Button>
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Page;