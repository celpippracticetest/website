import { createTheme } from "@mui/material/styles";

/**
 * CMS-specific MUI theme
 *
 * This keeps things simple for now and can be evolved later.
 * It is intentionally neutral so it blends with the existing design.
 */
export const cmsTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2563EB", // tailwind blue-600
    },
    background: {
      default: "#F9FAFB",
      paper: "#FFFFFF",
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiPaper: {
      defaultProps: {
        elevation: 0,
        square: false,
      },
    },
  },
});

