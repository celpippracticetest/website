import { Box, Typography } from "@mui/material";
import React from "react";

const officialFontFamily =
  '"Fira Sans", "Trebuchet MS", "Helvetica Neue", Helvetica, Arial, sans-serif';

interface OfficialInstructionBlockProps {
  title: string;
  items: React.ReactNode[];
}

const OfficialInstructionBlock = ({
  title,
  items,
}: OfficialInstructionBlockProps) => {
  return (
    <Box
      sx={{
        px: { xs: 2.5, md: 3.5 },
        py: { xs: 2.5, md: 3.25 },
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: "860px",
        }}
      >
        <Typography
          component="h2"
          sx={{
            mb: "14px",
            fontSize: "16px",
            lineHeight: "20px",
            fontWeight: 700,
            fontFamily: officialFontFamily,
            color: "#4B6484",
          }}
        >
          {title}
        </Typography>

        <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none" }}>
          {items.map((item, index) => (
            <Box
              component="li"
              key={index}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 2,
                py: { xs: 1.1, md: 1.25 },
                borderBottom:
                  index < items.length - 1
                    ? "1px solid #E1E6EC"
                    : "none",
              }}
            >
              <Box
                component="span"
                sx={{
                  mt: "6px",
                  width: "4px",
                  minWidth: "4px",
                  height: "4px",
                  borderRadius: "999px",
                  backgroundColor: "#8895A5",
                }}
              />
              <Typography
                sx={{
                  ml: "25px",
                  fontSize: "17px",
                  lineHeight: "20px",
                  fontWeight: 700,
                  fontFamily: '"Trebuchet MS", "Fira Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
                  color: "#304256",
                }}
              >
                {item}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default OfficialInstructionBlock;
