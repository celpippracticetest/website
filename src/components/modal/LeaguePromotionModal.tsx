"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LeaguePromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'promoted' | 'demoted' | 'safe';
  leagueType: 'bronze' | 'silver' | 'gold';
}

const LeaguePromotionModal: React.FC<LeaguePromotionModalProps> = ({
  isOpen,
  onClose,
  status,
  leagueType
}) => {
  // Brand Colors from tailwind.config.js and site Hero
  const brandColors = {
    primary: '#316BFF',     // primary1
    secondary: '#3ebbf3',   // Hero Accent Cyan
    background: '#F4F7FF',  // Site Background
    text: '#212E42'         // text1
  };

  const getLeagueTheme = () => {
    switch (leagueType) {
      case 'bronze': return {
        gradient: 'from-[#CD7F32] to-[#A0522D]', // Richer Bronze
        iconBg: 'bg-[#FFF7ED]',
        button: 'bg-[#316BFF]' // Always use brand primary for main CTA
      };
      case 'silver': return {
        gradient: 'from-[#94A3B8] to-[#475569]', // Professional Silver
        iconBg: 'bg-[#F8FAFC]',
        button: 'bg-[#316BFF]'
      };
      case 'gold': return {
        gradient: 'from-[#F59E0B] to-[#B45309]', // Vibrant Gold
        iconBg: 'bg-[#FFFBEB]',
        button: 'bg-[#316BFF]'
      };
      default: return {
        gradient: 'from-[#316BFF] to-[#1E40AF]',
        iconBg: 'bg-[#F0F7FF]',
        button: 'bg-[#316BFF]'
      };
    }
  };

  const theme = getLeagueTheme();

  const getTitle = () => {
    if (status === 'promoted') {
      return `You've been promoted to ${leagueType.charAt(0).toUpperCase() + leagueType.slice(1)} League!`;
    }
    if (status === 'demoted') {
      return `You've been demoted to ${leagueType.charAt(0).toUpperCase() + leagueType.slice(1)} League`;
    }
    return `You stayed in ${leagueType.charAt(0).toUpperCase() + leagueType.slice(1)} League`;
  };

  const getMessage = () => {
    if (status === 'promoted') {
      return "Exceptional progress! Your dedication is paying off. Keep pushing to reach the top tier.";
    }
    if (status === 'demoted') {
      return "Keep your chin up! Every champion has setbacks. Consistent practice will get you back quickly.";
    }
    return "Great consistency! You're holding your ground against tough competition. Time for a new record?";
  };

  const getIcon = () => {
    switch (leagueType) {
      case 'bronze': return '🥉';
      case 'silver': return '🥈';
      case 'gold': return '🥇';
      default: return '🏆';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[1000] p-4">
          {/* Backdrop with brand-tinted blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#212E42]/40 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] max-w-[440px] w-full relative z-10 border border-[#E3EBFF]"
          >
            {/* Top Decorative Banner */}
            <div className={`h-[140px] bg-gradient-to-br ${theme.gradient} relative flex items-center justify-center`}>
              {/* Subtle Pattern Overlay */}
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none" />

              {/* Floating Trophy Icon */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{
                  delay: 0.2,
                  type: "spring",
                  stiffness: 260,
                  damping: 20
                }}
                className={`w-[100px] h-[100px] ${theme.iconBg} rounded-[28px] flex items-center justify-center shadow-xl transform translate-y-[30px] border-4 border-white`}
              >
                <span className="text-[54px] select-none">{getIcon()}</span>
              </motion.div>
            </div>

            <div className="px-[32px] pt-[70px] pb-[40px] text-center">
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-[28px] font-bold text-[#212E42] mb-[16px] leading-tight tracking-tight font-sans"
              >
                {getTitle()}
              </motion.h3>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-[17px] text-[#76808F] mb-[32px] leading-relaxed font-sans"
              >
                {getMessage()}
              </motion.p>

              <motion.button
                whileHover={{ scale: 1.02, backgroundColor: '#4A7DFF' }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className={`w-full ${theme.button} text-white py-[16px] px-[24px] rounded-[18px] font-bold text-[18px] shadow-lg shadow-blue-500/25 transition-all duration-200 flex items-center justify-center gap-2`}
              >
                <span>Continue to Dashboard</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LeaguePromotionModal;
