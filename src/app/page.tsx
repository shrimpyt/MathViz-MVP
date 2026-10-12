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
          background: '#14161f',
        }}
      >
        <WorksheetGenerator />
      </Box>
    </ThemeProvider>
  );
}
