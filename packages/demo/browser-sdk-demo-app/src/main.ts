import { createPhantom } from "@phantom/browser-sdk";

document.addEventListener("DOMContentLoaded", () => {
  console.log("Document loaded, attempting to create Phantom instance...");
  try {
    const phantomInstance = createPhantom();
    console.log("Phantom instance created:", phantomInstance);
    // You can store and use phantomInstance for further interactions
  } catch (error) {
    console.error("Error creating Phantom instance:", error);
  }
});

// Button event listeners will be added here later
