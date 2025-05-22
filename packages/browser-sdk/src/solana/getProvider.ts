export async function getProvider() {
  return new Promise(resolve => {
    if ((window as any).phantom?.solana) {
      resolve((window as any).phantom.solana);
    } else {
      resolve(null);
    }
  });
}
