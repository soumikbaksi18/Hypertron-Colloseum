const privacyKey = (walletAddress: string) =>
  `hypertron:onboarding:privacy:v1:${walletAddress}`;

export function hasPrivacyOnboarding(walletAddress: string): boolean {
  try {
    return localStorage.getItem(privacyKey(walletAddress)) === '1';
  } catch {
    return false;
  }
}

export function completePrivacyOnboarding(walletAddress: string): void {
  localStorage.setItem(privacyKey(walletAddress), '1');
}
