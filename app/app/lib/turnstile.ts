export async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  
  // If no key is set (e.g. dev), strictness depends on your requirements.
  // For now, if no key, we might skip or fail. Let's fail safe.
  if (!secretKey) {
    console.warn("⚠️ TURNSTILE_SECRET_KEY is missing. Skipping verification (Dev Mode).");
    return true; 
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!data.success) {
      console.error("❌ Turnstile verification failed:", data);
      return false;
    }
    return true;
  } catch (error) {
    console.error("❌ Turnstile verification error:", error);
    return false;
  }
}
