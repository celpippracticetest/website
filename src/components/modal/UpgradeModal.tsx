"use client";

import React, { useEffect } from "react";
import {
  Backdrop,
  Box,
  Fade,
  IconButton,
  Modal,
  Typography,
} from "@mui/material";
import { usePlans } from "@/hooks/usePlans";
import Image from "next/image";
import PlanCard from "../pages/dashboard/PlanCard";
import SvgClose from "../icons/Close";
import { useModalTracking } from "@/hooks/useTracking";

interface UpgradeModalProps {
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
}

const UpgradeModal = ({ setShowModal }: UpgradeModalProps) => {
  const { plans } = usePlans();
  const { viewed, closed } = useModalTracking();

  useEffect(() => {
    viewed("Upgrade Modal", "promotional");
  }, [viewed]);

  const handleClose = () => {
    closed("Upgrade Modal", "dismissed");
    setShowModal(false);
  };

  return (
    <Modal
      open
      onClose={handleClose}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 250,
        sx: {
          backgroundColor: "rgba(23, 22, 22, 0.5)",
        },
      }}
      aria-labelledby="upgrade-modal-title"
      aria-describedby="upgrade-modal-description"
    >
      <Fade in timeout={250}>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: { xs: "flex-start", md: "center" },
            overflowY: "auto",
            px: { xs: "14px", sm: "16px", xl: "20px" },
            py: { xs: "40px", md: "24px" },
          }}
        >
          <Box
            sx={{
              position: "relative",
              width: "100%",
              maxWidth: "670px",
              minHeight: "474px",
              mt: { xs: "40px", md: "80px" },
              mb: { xs: "24px", md: "40px" },
              pt: "20px",
              pb: "24px",
              px: { xs: "16px", sm: "20px" },
              display: "flex",
              flexDirection: "column",
              borderRadius: "24px",
              bgcolor: "#F2F6FF",
              background:
                "linear-gradient(to right, rgba(244, 132, 95, 0.15), rgba(117, 156, 255, 0.15))",
              outline: "none",
            }}
          >
            <IconButton
              aria-label="Close upgrade modal"
              onClick={handleClose}
              sx={{
                position: "absolute",
                top: 12,
                right: 12,
              }}
            >
              <SvgClose />
            </IconButton>

            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Image
                alt="plan sale modal"
                width={80}
                height={70}
                src="/images/plan-sale-modal.png"
              />
            </Box>

            <Typography
              sx={{
                pt: "16px",
                textAlign: "center",
                fontSize: { xs: 16, sm: 20 },
                fontWeight: 600,
                color: "#171616",
              }}
            >
              Summer Flash Sale!
            </Typography>

            <Typography
              id="upgrade-modal-title"
              sx={{
                mt: "24px",
                minHeight: "48px",
                textAlign: "center",
                fontSize: { xs: 24, sm: 38 },
                lineHeight: 1.2,
                fontWeight: 700,
                color: "#171616",
              }}
            >
              Up to 80% Off All Plans!
            </Typography>

            <Typography
              id="upgrade-modal-description"
              sx={{
                position: "absolute",
                width: 1,
                height: 1,
                p: 0,
                m: -1,
                overflow: "hidden",
                clip: "rect(0 0 0 0)",
                whiteSpace: "nowrap",
                border: 0,
              }}
            >
              Promotional modal showing discounted subscription plans.
            </Typography>

            <Box
              sx={{
                mt: { xs: 2, sm: 3 },
                display: "flex",
                flexDirection: { xs: "column-reverse", sm: "row" },
                gap: "12px",
                justifyContent: "center",
                alignItems: { xs: "stretch", sm: "flex-start" },
              }}
            >
              {plans.map((item, index) => (
                <PlanCard
                  key={item._id || index}
                  id={index}
                  title={item.title}
                  type={item.type}
                  oldPrice={item.oldPrice}
                  price={item.price}
                  buttonTitle={item.buttonTitle}
                  stripePriceId={item.stripePriceId}
                  icon={item.icon}
                  iconWrapperColor={item.iconWrapperColor}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
};

export default UpgradeModal;
