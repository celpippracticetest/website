"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const HomePagePremiumMobile = dynamic(
  () => import("./HomePagePremiumMobile"),
  { ssr: true }
);
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Stack,
  useMediaQuery,
  useTheme,
  Chip,
  Rating,
  Avatar,
  AvatarGroup,
  LinearProgress,
  Divider,
  Paper,
  Badge,
  Tooltip,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SchoolIcon from "@mui/icons-material/School";
import MicIcon from "@mui/icons-material/Mic";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import LockIcon from "@mui/icons-material/Lock";
import SparklesIcon from "@mui/icons-material/AutoAwesome";
import VerifiedIcon from "@mui/icons-material/VerifiedUser";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import GroupIcon from "@mui/icons-material/Group";
import TimerIcon from "@mui/icons-material/Timer";
import ZoomOutMapIcon from "@mui/icons-material/ZoomOutMap";

// Premium Styled Components
const PremiumHeroSection = styled(Box)(({ theme }) => ({
  background: "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)",
  color: "white",
  padding: theme.spacing(12, 4),
  borderRadius: "32px",
  marginBottom: theme.spacing(10),
  position: "relative",
  overflow: "hidden",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  backdropFilter: "blur(10px)",
  "&::before": {
    content: '""',
    position: "absolute",
    top: "-50%",
    right: "-10%",
    width: "600px",
    height: "600px",
    background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
    borderRadius: "50%",
  },
  "&::after": {
    content: '""',
    position: "absolute",
    bottom: "-30%",
    left: "-5%",
    width: "500px",
    height: "500px",
    background: "radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)",
    borderRadius: "50%",
  },
  [theme.breakpoints.down("md")]: {
    padding: theme.spacing(8, 3),
    marginBottom: theme.spacing(6),
  },
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(6, 2),
    marginBottom: theme.spacing(4),
  },
}));

const GlassCard = styled(Card)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "20px",
  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    background: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(59, 130, 246, 0.3)",
    transform: "translateY(-8px)",
    boxShadow: "0 20px 40px rgba(59, 130, 246, 0.2)",
  },
  [theme.breakpoints.down("sm")]: {
    marginBottom: theme.spacing(2),
  },
}));

const PremiumFeatureCard = styled(Card)(({ theme }) => ({
  height: "100%",
  borderRadius: "20px",
  border: "1px solid rgba(59, 130, 246, 0.2)",
  background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
  position: "relative",
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "4px",
    background: "linear-gradient(90deg, #3B82F6 0%, #10B981 100%)",
  },
  "&:hover": {
    transform: "translateY(-12px)",
    boxShadow: "0 25px 50px -12px rgba(59, 130, 246, 0.25)",
    borderColor: "rgba(59, 130, 246, 0.4)",
  },
  [theme.breakpoints.down("sm")]: {
    marginBottom: theme.spacing(2),
  },
}));

const PricingCard = styled(Paper)(({ theme }) => ({
  borderRadius: "24px",
  padding: theme.spacing(4),
  border: "2px solid rgba(59, 130, 246, 0.2)",
  transition: "all 0.4s ease",
  position: "relative",
  "&.premium": {
    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
    color: "white",
    borderColor: "#3B82F6",
    transform: "scale(1.05)",
    boxShadow: "0 25px 50px -12px rgba(59, 130, 246, 0.4)",
    "&::before": {
      content: '"MOST POPULAR"',
      position: "absolute",
      top: "-12px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
      color: "white",
      padding: "4px 16px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: 700,
      letterSpacing: "0.5px",
    },
  },
  "&:hover": {
    transform: "scale(1.05)",
    boxShadow: "0 30px 60px -12px rgba(59, 130, 246, 0.3)",
  },
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(3),
  },
}));

const StatBox = styled(Box)(({ theme }) => ({
  textAlign: "center",
  padding: theme.spacing(3),
  borderRadius: "16px",
  background: "linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)",
  border: "1px solid rgba(59, 130, 246, 0.1)",
  transition: "all 0.3s ease",
  "&:hover": {
    background: "linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%)",
  },
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2),
  },
}));

const PremiumBadge = styled(Chip)(({ theme }) => ({
  background: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
  color: "white",
  fontWeight: 700,
  height: "28px",
  "& .MuiChip-icon": {
    color: "white !important",
  },
}));

const GradientButton = styled(Button)(({ theme }) => ({
  background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
  color: "white",
  padding: "14px 36px",
  borderRadius: "12px",
  fontWeight: 700,
  fontSize: "16px",
  textTransform: "none",
  transition: "all 0.3s ease",
  border: "none",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 15px 30px rgba(59, 130, 246, 0.4)",
    background: "linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)",
  },
  [theme.breakpoints.down("sm")]: {
    padding: "12px 28px",
    fontSize: "14px",
  },
}));

const SecondaryButton = styled(Button)(({ theme }) => ({
  color: "#3B82F6",
  borderColor: "#3B82F6",
  padding: "14px 36px",
  borderRadius: "12px",
  fontWeight: 700,
  fontSize: "16px",
  textTransform: "none",
  transition: "all 0.3s ease",
  border: "2px solid #3B82F6",
  "&:hover": {
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    borderColor: "#2563EB",
    transform: "translateY(-2px)",
  },
  [theme.breakpoints.down("sm")]: {
    padding: "12px 28px",
    fontSize: "14px",
  },
}));

const AnimatedCounter = ({ value, label }: { value: string; label: string }) => {
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    const timer = setTimeout(() => setDisplayValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <StatBox>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 800,
          background: "linear-gradient(135deg, #3B82F6 0%, #10B981 100%)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          mb: 1,
          fontSize: { xs: "28px", md: "36px" },
        }}
      >
        {displayValue}
      </Typography>
      <Typography variant="body2" sx={{ color: "#4B5563", fontWeight: 600 }}>
        {label}
      </Typography>
    </StatBox>
  );
};

export default function HomePagePremium() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Show mobile-optimized premium version on mobile devices
  if (isMobile) {
    return <HomePagePremiumMobile />;
  }

  const examSections = [
    {
      icon: MicIcon,
      title: "Speaking",
      description: "AI-powered pronunciation feedback with real-time scoring",
      color: "#3B82F6",
      premium: true,
    },
    {
      icon: MenuBookIcon,
      title: "Reading",
      description: "Adaptive difficulty with comprehensive explanations",
      color: "#10B981",
      premium: true,
    },
    {
      icon: AssignmentIcon,
      title: "Writing",
      description: "Grammar analysis and vocabulary suggestions powered by AI",
      color: "#F59E0B",
      premium: true,
    },
    {
      icon: SchoolIcon,
      title: "Listening",
      description: "Authentic exam audio with transcript and word-by-word breakdown",
      color: "#EF4444",
      premium: true,
    },
  ];

  const premiumFeatures = [
    {
      icon: SparklesIcon,
      title: "AI-Powered Scoring",
      description: "Instant, accurate feedback using advanced machine learning algorithms",
      premium: true,
    },
    {
      icon: AnalyticsIcon,
      title: "Detailed Analytics",
      description: "Track your progress with comprehensive performance metrics and insights",
      premium: true,
    },
    {
      icon: LightbulbIcon,
      title: "Expert Tips",
      description: "Personalized strategies from CELPIP experts and top scorers",
      premium: true,
    },
    {
      icon: TimerIcon,
      title: "Timed Practice",
      description: "Realistic exam conditions with timer and score predictions",
      premium: true,
    },
    {
      icon: GroupIcon,
      title: "Community Support",
      description: "Connect with other test-takers and share experiences",
      premium: false,
    },
    {
      icon: ZoomOutMapIcon,
      title: "Full Practice Tests",
      description: "Complete mock exams with all four sections",
      premium: true,
    },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Canada Immigration",
      rating: 5,
      text: "Scored 12/12! The AI feedback was incredibly accurate and helped me improve dramatically.",
      avatar: "SJ",
      score: "12/12",
    },
    {
      name: "Ahmed Hassan",
      role: "Professional Migration",
      rating: 5,
      text: "Best investment for CELPIP prep. The analytics alone are worth the premium subscription.",
      avatar: "AH",
      score: "11/12",
    },
    {
      name: "Maria Garcia",
      role: "Study Abroad",
      rating: 5,
      text: "The personalized learning path saved me weeks of study time. Highly recommend!",
      avatar: "MG",
      score: "10/12",
    },
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$9.99",
      period: "/month",
      description: "Perfect for beginners",
      features: [
        "5 practice tests per month",
        "Basic AI feedback",
        "Progress tracking",
        "Email support",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Pro",
      price: "$29.99",
      period: "/month",
      description: "Most popular choice",
      features: [
        "Unlimited practice tests",
        "Advanced AI scoring",
        "Detailed analytics",
        "Expert tips & strategies",
        "Priority support",
        "Personalized learning path",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Elite",
      price: "$49.99",
      period: "/month",
      description: "For serious test-takers",
      features: [
        "Everything in Pro",
        "1-on-1 coaching sessions",
        "Custom study plans",
        "Mock exam simulations",
        "Lifetime access to materials",
        "24/7 priority support",
      ],
      cta: "Get Elite Access",
      popular: false,
    },
  ];

  return (
    <Box sx={{ width: "100%", overflow: "hidden", display: { xs: "none", md: "block" } }}>
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }} component="main">
        {/* Premium Hero Section */}
        <PremiumHeroSection component="section">
          <Grid container spacing={4} alignItems="center" sx={{ position: "relative", zIndex: 1 }}>
            <Grid item xs={12} md={6}>
              <Stack spacing={3}>
                <Box>
                  <Chip
                    icon={<SparklesIcon />}
                    label="AI-Powered CELPIP Preparation"
                    sx={{
                      background: "rgba(59, 130, 246, 0.2)",
                      color: "white",
                      fontWeight: 700,
                      mb: 2,
                      height: "36px",
                      fontSize: "14px",
                    }}
                  />
                </Box>
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: "36px", sm: "48px", md: "64px" },
                    fontWeight: 900,
                    lineHeight: 1.1,
                    background: "linear-gradient(135deg, #ffffff 0%, #e0f2fe 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Ace Your CELPIP Exam in 30 Days
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: { xs: "16px", md: "18px" },
                    opacity: 0.9,
                    fontWeight: 400,
                    lineHeight: 1.7,
                  }}
                >
                  Join 50,000+ successful test-takers. Get instant AI feedback, personalized learning paths, and proven strategies to reach your target score.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <GradientButton
                    endIcon={<ArrowForwardIcon />}
                    sx={{ width: { xs: "100%", sm: "auto" } }}
                  >
                    Start Free Trial (7 Days)
                  </GradientButton>
                  <SecondaryButton
                    sx={{ width: { xs: "100%", sm: "auto" } }}
                  >
                    View Pricing
                  </SecondaryButton>
                </Stack>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center", pt: 2 }}>
                  <VerifiedIcon sx={{ color: "#10B981", fontSize: 20 }} />
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    No credit card required. Cancel anytime.
                  </Typography>
                </Box>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: { xs: "none", md: "block" } }}>
              <Box
                sx={{
                  background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)",
                  borderRadius: "24px",
                  padding: 4,
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  height: "400px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    textAlign: "center",
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  <Typography variant="h3" sx={{ mb: 2, fontWeight: 800 }}>
                    📊
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    Real-Time Score Tracking
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Watch your scores improve with every practice test
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </PremiumHeroSection>

        {/* Stats Section */}
        <Box sx={{ mb: 10 }}>
          <Grid container spacing={3}>
            <Grid item xs={6} sm={3}>
              <AnimatedCounter value="50K+" label="Active Users" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <AnimatedCounter value="10K+" label="Practice Questions" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <AnimatedCounter value="95%" label="Success Rate" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <AnimatedCounter value="4.9★" label="User Rating" />
            </Grid>
          </Grid>
        </Box>

        {/* Exam Sections */}
        <Box sx={{ mb: 10 }} component="section">
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Chip
              icon={<SparklesIcon />}
              label="Premium Features"
              sx={{
                background: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
                color: "white",
                fontWeight: 700,
                mb: 2,
                height: "36px",
              }}
            />
            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontSize: { xs: "32px", md: "48px" },
                fontWeight: 900,
                mb: 2,
                background: "linear-gradient(135deg, #0F172A 0%, #3B82F6 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Master All CELPIP Sections
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "#4B5563",
                fontSize: { xs: "14px", md: "16px" },
                maxWidth: "600px",
                mx: "auto",
              }}
            >
              AI-powered practice for Speaking, Reading, Writing, and Listening with expert guidance
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {examSections.map((section, index) => {
              const IconComponent = section.icon;
              return (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <PremiumFeatureCard>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start", mb: 2 }}>
                        <Box
                          sx={{
                            width: 56,
                            height: 56,
                            borderRadius: "16px",
                            background: `linear-gradient(135deg, ${section.color}20 0%, ${section.color}10 100%)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <IconComponent sx={{ color: section.color, fontSize: 28 }} />
                        </Box>
                        {section.premium && (
                          <PremiumBadge
                            icon={<LockIcon />}
                            label="Premium"
                            size="small"
                          />
                        )}
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                        {section.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#4B5563", lineHeight: 1.6 }}>
                        {section.description}
                      </Typography>
                    </CardContent>
                  </PremiumFeatureCard>
                </Grid>
              );
            })}
          </Grid>
        </Box>

        {/* Premium Features Grid */}
        <Box sx={{ mb: 10 }} component="section">
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontSize: { xs: "32px", md: "48px" },
                fontWeight: 900,
                mb: 2,
              }}
            >
              Why Premium Members Excel
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "#4B5563",
                fontSize: { xs: "14px", md: "16px" },
                maxWidth: "600px",
                mx: "auto",
              }}
            >
              Unlock advanced features that accelerate your learning
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {premiumFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <PremiumFeatureCard>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start", mb: 2 }}>
                        <Box
                          sx={{
                            width: 56,
                            height: 56,
                            borderRadius: "16px",
                            background: feature.premium
                              ? "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)"
                              : "rgba(59, 130, 246, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: feature.premium ? "white" : "#3B82F6",
                          }}
                        >
                          <IconComponent sx={{ fontSize: 28 }} />
                        </Box>
                        {feature.premium && (
                          <PremiumBadge
                            icon={<LockIcon />}
                            label="Premium"
                            size="small"
                          />
                        )}
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#4B5563", lineHeight: 1.6 }}>
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </PremiumFeatureCard>
                </Grid>
              );
            })}
          </Grid>
        </Box>

        {/* Testimonials */}
        <Box sx={{ mb: 10 }} component="section">
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Chip
              icon={<EmojiEventsIcon />}
              label="Success Stories"
              sx={{
                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                color: "white",
                fontWeight: 700,
                mb: 2,
                height: "36px",
              }}
            />
            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontSize: { xs: "32px", md: "48px" },
                fontWeight: 900,
                mb: 2,
              }}
            >
              Join Thousands of Successful Test-Takers
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {testimonials.map((testimonial, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <GlassCard>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2, justifyContent: "space-between" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Avatar sx={{ background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)" }}>
                          {testimonial.avatar}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "white" }}>
                            {testimonial.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
                            {testimonial.role}
                          </Typography>
                        </Box>
                      </Box>
                      <PremiumBadge
                        label={testimonial.score}
                        icon={<EmojiEventsIcon />}
                        size="small"
                      />
                    </Box>
                    <Rating value={testimonial.rating} readOnly sx={{ mb: 2, "& .MuiRating-icon": { color: "#F59E0B" } }} />
                    <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.8)", fontStyle: "italic" }}>
                      "{testimonial.text}"
                    </Typography>
                  </CardContent>
                </GlassCard>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Pricing Section */}
        <Box sx={{ mb: 10 }} component="section">
          <Box sx={{ textAlign: "center", mb: 8 }}>
            <Chip
              label="Simple, Transparent Pricing"
              sx={{
                background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
                color: "white",
                fontWeight: 700,
                mb: 2,
                height: "36px",
              }}
            />
            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontSize: { xs: "32px", md: "48px" },
                fontWeight: 900,
                mb: 2,
              }}
            >
              Choose Your Plan
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "#4B5563",
                fontSize: { xs: "14px", md: "16px" },
                maxWidth: "600px",
                mx: "auto",
              }}
            >
              Start free for 7 days. No credit card required.
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {pricingPlans.map((plan, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <PricingCard className={plan.popular ? "premium" : ""}>
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>
                        {plan.name}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: plan.popular ? 0.9 : 0.7 }}>
                        {plan.description}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="h3"
                        sx={{
                          fontWeight: 900,
                          mb: 0.5,
                        }}
                      >
                        {plan.price}
                        <Typography component="span" variant="body2" sx={{ opacity: 0.7 }}>
                          {plan.period}
                        </Typography>
                      </Typography>
                    </Box>
                    <Button
                      fullWidth
                      variant={plan.popular ? "contained" : "outlined"}
                      sx={{
                        fontWeight: 700,
                        padding: "14px",
                        borderRadius: "12px",
                        textTransform: "none",
                        fontSize: "16px",
                        background: plan.popular ? "white" : undefined,
                        color: plan.popular ? "#3B82F6" : undefined,
                        border: plan.popular ? "none" : "2px solid currentColor",
                        "&:hover": {
                          background: plan.popular ? "#f0f9ff" : undefined,
                          transform: "translateY(-2px)",
                        },
                      }}
                    >
                      {plan.cta}
                    </Button>
                    <Divider sx={{ opacity: 0.2 }} />
                    <Stack spacing={1.5}>
                      {plan.features.map((feature, fIndex) => (
                        <Box key={fIndex} sx={{ display: "flex", gap: 1.5, alignItems: "start" }}>
                          <CheckCircleIcon
                            sx={{
                              fontSize: 20,
                              color: plan.popular ? "white" : "#10B981",
                              flexShrink: 0,
                              mt: 0.5,
                            }}
                          />
                          <Typography variant="body2" sx={{ opacity: plan.popular ? 0.95 : 0.8 }}>
                            {feature}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Stack>
                </PricingCard>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Final CTA */}
        <Box
          component="section"
          sx={{
            background: "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)",
            borderRadius: "32px",
            padding: { xs: 4, md: 8 },
            textAlign: "center",
            color: "white",
            mb: 4,
            border: "1px solid rgba(255, 255, 255, 0.1)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box sx={{ position: "relative", zIndex: 2 }}>
            <Typography
              variant="h3"
              component="h2"
              sx={{
                fontWeight: 900,
                mb: 2,
                fontSize: { xs: "28px", md: "44px" },
              }}
            >
              Ready to Transform Your CELPIP Score?
            </Typography>
            <Typography
              variant="body1"
              sx={{
                mb: 4,
                opacity: 0.9,
                fontSize: { xs: "14px", md: "16px" },
                maxWidth: "600px",
                mx: "auto",
              }}
            >
              Join thousands of successful test-takers today. Start your free 7-day trial with no credit card required.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "center" }}>
              <Button
                variant="contained"
                sx={{
                  background: "white",
                  color: "#3B82F6",
                  fontWeight: 700,
                  padding: "14px 40px",
                  borderRadius: "12px",
                  textTransform: "none",
                  fontSize: "16px",
                  "&:hover": {
                    background: "#f0f9ff",
                    transform: "translateY(-2px)",
                  },
                }}
              >
                Start Free Trial
              </Button>
              <Button
                variant="outlined"
                sx={{
                  borderColor: "white",
                  color: "white",
                  fontWeight: 700,
                  padding: "14px 40px",
                  borderRadius: "12px",
                  textTransform: "none",
                  fontSize: "16px",
                  border: "2px solid white",
                  "&:hover": {
                    borderColor: "white",
                    background: "rgba(255, 255, 255, 0.1)",
                    transform: "translateY(-2px)",
                  },
                }}
              >
                Schedule Demo
              </Button>
            </Stack>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
