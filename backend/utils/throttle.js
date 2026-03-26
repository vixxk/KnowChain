import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

let lastRequestTime = 0;
let isLocked = false;
const REQUEST_DELAY = parseInt(process.env.REQUEST_DELAY_MS) || 5000;

export async function throttleRequest() {
  // Wait if another request is currently throttling
  while (isLocked) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  isLocked = true;
  try {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < REQUEST_DELAY) {
      const waitTime = REQUEST_DELAY - timeSinceLastRequest;
      console.log(`⏳ [BETA-THROTTLE-V2] Waiting ${waitTime}ms for API limits...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    lastRequestTime = Date.now();
  } finally {
    isLocked = false;
  }
}

/**
 * Resets the throttle timer, useful after a 429 error to force a longer wait.
 * @param {number} additionalDelay - Extra time to wait in ms.
 */
export function forceBackoff(additionalDelay = 5000) {
    lastRequestTime = Date.now() + additionalDelay;
}
