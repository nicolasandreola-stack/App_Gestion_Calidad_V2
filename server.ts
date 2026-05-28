import { createServer as createViteServer } from "vite";
import app from "./api/index.js";
import express from "express";

async function startViteAndListen() {
  const PORT = parseInt(process.env.PORT || "3000", 10);
  
  if (process.env.NODE_ENV !== "production") {
    // Start Vite development server
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Development server running on http://localhost:${PORT}`);
  });
}

startViteAndListen();
