"use client";

import { Box, CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import WorksheetGenerator from "../components/WorksheetGenerator";

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: "#66d9cc",
      contrastText: "#003733",
    },
    secondary: {
      main: "#4fd8eb",
    },
    background: {
      default: "#121416",
      paper: "#282a2c",
    },
    text: {
      primary: "#e1e3e4",
      secondary: "#c4c7c8",
    }
  },
  typography: {
    fontFamily: "Lexend, Inter, sans-serif",
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
