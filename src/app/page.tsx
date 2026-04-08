"use client";

import { Box, CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import WorksheetGenerator from "../components/WorksheetGenerator";
import theme from "../core/theme";

export default function Home() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box 
        sx={{ 
          display: "flex", 
          flexDirection: "column", 
          height: "100vh",
          background: 'radial-gradient(circle at 50% 50%, #1e2d45 0%, #0f172a 100%)',
        }}
      >
        <WorksheetGenerator />
      </Box>
    </ThemeProvider>
  );
}
