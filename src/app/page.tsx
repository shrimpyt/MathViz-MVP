"use client";

import { Box, CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import WorksheetGenerator from "../components/WorksheetGenerator";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976D2",
    },
    background: {
      default: "#f8f9fa",
    },
  },
  typography: {
    fontFamily: "Inter, sans-serif",
  },
});

export default function Home() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <WorksheetGenerator />
      </Box>
    </ThemeProvider>
  );
}
