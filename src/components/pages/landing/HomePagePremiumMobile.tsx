"use client";

import React, { useState } from "react";
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  useMediaQuery,
  useTheme,
  Chip,
  LinearProgress,
  Avatar,
  Badge,
  Divider,
  Collapse,
  IconButton,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SparklesIcon from "@mui/icons-material/AutoAwesome";
import LockIcon from "@mui/icons-material/Lock";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MicIcon from "@mui/icons-material/Mic";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import AssignmentIcon from "@mui/icons-material/Assignment";
import SchoolIcon from "@mui/icons-material/School";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import TimerIcon from "@mui/icons-material/Timer";

const MobileHeroCard = styled(Box)(({ theme }) => ({
  background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
  color: "white",
  borderRadius: "24px",
  padding: "28px 20px",
  marginBottom: "20px",
  position: "relative",
  overflow: "hidden",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  [theme.breakpoints.up("md")]: {
    display: "none",
  },
}));

const PremiumCard = styled(Card)(({ theme }) => ({
  borderRadius: "16px",
  marginBottom: "12px",
  border: "1px solid rgba(59, 130, 246, 0.2)",
  background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
  transition: "all 0.3s ease",
  position: "relative",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "3px",
    background: "linear-gradient(90deg, #3B82F6 0%, #10B981 100%)",
    borderRadius: "16px 16px 0 0",
  },
  "&:active": {
    transform: "scale(0.98)",
  },
  [theme.breakpoints.up("md")]: {
    display: "none",
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
  fontWeight: 700,
  borderRadius: "12px",
  textTransform: "none",
  padding: "12px 24px",
  fontSize: "15px",
  transition: "all 0.3s ease",
  "&:active": {
    transform: "scale(0.95)",
  },
}));

const ExpandMore = styled(IconButton)(({ theme }) => ({
  marginLeft: "auto",
  transition: theme.transitions.create("transform", {
    duration: theme.transitions.duration.shortest,
  }),
  "&.expanded": {
    transform: "rotate(180deg)",
  },
}));

export default function HomePagePremiumMobile() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [expandedPlan, setExpandedPlan] = useState(1);

  if (!isMobile) return null;

  const examSections = [
    {
      icon: MicIcon,
      title: "Speaking",
      description: "AI-powered feedback",
      color: "#3B82F6",
    },
    {
      icon: MenuBookIcon,
      title: "Reading",
      description: "Adaptive difficulty",
      color: "#10B981",
    },
    {
      icon: AssignmentIcon,
      title: "Writing",
      description: "AI analysis",
      color: "#F59E0B",
    },
    {
      icon: SchoolIcon,
      title: "Listening",
      description: "Real audio",
      color: "#EF4444",
    },
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$9.99",
      period: "/mo",
      features: ["5 tests/month", "Basic feedback", "Progress tracking"],
      cta: "Get Started",
    },
    {
      name: "Pro",
      price: "$29.99",
      period: "/mo",
      features: [
        "Unlimited tests",
        "Advanced AI scoring",
        "Detailed analytics",
        "Expert tips",
        "Priority support",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Elite",
      price: "$49.99",
      period: "/mo",
      features: [
        "Everything in Pro",
        "1-on-1 coaching",
        "Custom plans",
        "24/7 support",
      ],
      cta: "Get Elite",
    },
  ];

  const testimonials = [
    {
      name: "Sarah J.",
      score: "12/12",
      text: "The AI feedback was game-changing!",
      avatar: "SJ",
    },
    {
      name: "Ahmed H.",
      score: "11/12",
      text: "Best investment for CELPIP prep.",
      avatar: "AH",
    },
    {
      name: "Maria G.",
      score: "10/12",
      text: "Saved me weeks of study time.",
      avatar: "MG",
    },
  ];

  return (
    <Box sx={{ pb: 12, pt: 2 }} component="main">
      {/* Hero Card */}
      <MobileHeroCard component="section">
        <Chip
          icon={<SparklesIcon />}
          label="AI-Powered Prep"
          sx={{
            background: "rgba(255, 255, 255, 0.2)",
            color: "white",
            fontWeight: 700,
            mb: 2,
            height: "32px",
          }}
        />
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 900,
            mb: 2,
            fontSize: "28px",
            lineHeight: 1.2,
          }}
        >
          Ace CELPIP in 30 Days
        </Typography>
        <Typography
          variant="body2"
          sx={{
            opacity: 0.95,
            mb: 3,
            fontSize: "14px",
            lineHeight: 1.5,
          }}
        >
          Join 50K+ successful test-takers. Get instant AI feedback and reach your target score.
        </Typography>
        <GradientButton fullWidth endIcon={<ArrowForwardIcon />}>
          Start Free Trial (7 Days)
        </GradientButton>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            textAlign: "center",
            mt: 2,
            opacity: 0.8,
          }}
        >
          ✓ No credit card required
        </Typography>
      </MobileHeroCard>

      <Container maxWidth="sm" sx={{ px: 0 }}>
        {/* Quick Stats */}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", mb: "20px", px: "16px" }} component="section">
          <Box
            sx={{
              background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
              borderRadius: "12px",
              padding: "12px",
              color: "white",
              textAlign: "center",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "20px" }}>
              50K+
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Users
            </Typography>
          </Box>
          <Box
            sx={{
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              borderRadius: "12px",
              padding: "12px",
              color: "white",
              textAlign: "center",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "20px" }}>
              95%
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Success
            </Typography>
          </Box>
        </Box>

        {/* Exam Sections */}
        <Box sx={{ mb: "24px", px: "16px" }} component="section">
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 800,
              mb: "12px",
              color: "#1F2937",
              fontSize: "14px",
            }}
          >
            Practice All Sections
          </Typography>
          {examSections.map((section, index) => {
            const IconComponent = section.icon;
            return (
              <PremiumCard key={index}>
                <CardContent sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: "12px",
                      background: `${section.color}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconComponent sx={{ color: section.color, fontSize: 24 }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
                      {section.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#4B5563" }}>
                      {section.description}
                    </Typography>
                  </Box>
                  <PremiumBadge icon={<LockIcon />} label="Premium" size="small" />
                </CardContent>
              </PremiumCard>
            );
          })}
        </Box>

        {/* Premium Features */}
        <Box sx={{ mb: "24px", px: "16px" }} component="section">
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 800,
              mb: "12px",
              color: "#1F2937",
              fontSize: "14px",
            }}
          >
            Why Go Premium?
          </Typography>
          {[
            { icon: SparklesIcon, title: "AI-Powered Scoring", desc: "Instant feedback" },
            { icon: AnalyticsIcon, title: "Detailed Analytics", desc: "Track progress" },
            { icon: LightbulbIcon, title: "Expert Tips", desc: "Proven strategies" },
            { icon: TimerIcon, title: "Timed Practice", desc: "Real exam feel" },
          ].map((feature, index) => {
            const Icon = feature.icon;
            return (
              <PremiumCard key={index}>
                <CardContent sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      flexShrink: 0,
                    }}
                  >
                    <Icon sx={{ fontSize: 24 }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#4B5563" }}>
                      {feature.desc}
                    </Typography>
                  </Box>
                </CardContent>
              </PremiumCard>
            );
          })}
        </Box>

        {/* Testimonials */}
        <Box sx={{ mb: "24px", px: "16px" }} component="section">
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 800,
              mb: "12px",
              color: "#1F2937",
              fontSize: "14px",
            }}
          >
            Success Stories
          </Typography>
          {testimonials.map((testimonial, index) => (
            <PremiumCard key={index}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 1, gap: 1 }}>
                  <Avatar sx={{ width: 32, height: 32, background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)", fontSize: "12px" }}>
                    {testimonial.avatar}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0 }}>
                      {testimonial.name}
                    </Typography>
                  </Box>
                  <PremiumBadge
                    label={testimonial.score}
                    icon={<EmojiEventsIcon />}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" sx={{ color: "#4B5563", fontStyle: "italic", fontSize: "13px" }}>
                  "{testimonial.text}"
                </Typography>
              </CardContent>
            </PremiumCard>
          ))}
        </Box>

        {/* Pricing Plans */}
        <Box sx={{ mb: "24px", px: "16px" }} component="section">
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 800,
              mb: "12px",
              color: "#1F2937",
              fontSize: "14px",
            }}
          >
            Choose Your Plan
          </Typography>
          {pricingPlans.map((plan, index) => (
            <Card
              key={index}
              sx={{
                borderRadius: "16px",
                marginBottom: "12px",
                border: plan.popular ? "2px solid #3B82F6" : "1px solid rgba(59, 130, 246, 0.2)",
                background: plan.popular ? "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)" : "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {plan.popular && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    background: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
                    color: "white",
                    padding: "4px 12px",
                    fontSize: "11px",
                    fontWeight: 700,
                    textAlign: "center",
                  }}
                >
                  MOST POPULAR
                </Box>
              )}
              <CardContent sx={{ p: plan.popular ? "16px 16px 12px" : "16px", pt: plan.popular ? "28px" : "16px" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start", mb: 1 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {plan.name}
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 900,
                        mt: 0.5,
                        color: plan.popular ? "#3B82F6" : "#1F2937",
                      }}
                    >
                      {plan.price}
                      <Typography component="span" variant="caption" sx={{ opacity: 0.7 }}>
                        {plan.period}
                      </Typography>
                    </Typography>
                  </Box>
                  <ExpandMore
                    className={expandedPlan === index ? "expanded" : ""}
                    onClick={() => setExpandedPlan(expandedPlan === index ? -1 : index)}
                    sx={{ mt: 1 }}
                  >
                    <ExpandMoreIcon />
                  </ExpandMore>
                </Box>
                <Collapse in={expandedPlan === index} timeout="auto" unmountOnExit>
                  <Stack spacing={1} sx={{ mt: 2, mb: 2 }}>
                    {plan.features.map((feature, fIndex) => (
                      <Box key={fIndex} sx={{ display: "flex", gap: 1, alignItems: "start" }}>
                        <CheckCircleIcon sx={{ fontSize: 16, color: "#10B981", mt: 0.3, flexShrink: 0 }} />
                        <Typography variant="caption" sx={{ color: "#4B5563", fontSize: "12px" }}>
                          {feature}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Collapse>
                <Button
                  fullWidth
                  variant={plan.popular ? "contained" : "outlined"}
                  sx={{
                    fontWeight: 700,
                    borderRadius: "8px",
                    textTransform: "none",
                    fontSize: "14px",
                    background: plan.popular ? "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)" : undefined,
                    color: plan.popular ? "white" : "#3B82F6",
                    border: plan.popular ? "none" : "2px solid #3B82F6",
                    py: 1,
                  }}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Final CTA */}
        <Box sx={{ px: "16px", mb: "24px" }} component="section">
          <Box
            sx={{
              background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
              borderRadius: "16px",
              padding: "20px",
              color: "white",
              textAlign: "center",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              Ready to Succeed?
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
              Start your free 7-day trial today
            </Typography>
            <GradientButton fullWidth>
              Start Free Trial
            </GradientButton>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
