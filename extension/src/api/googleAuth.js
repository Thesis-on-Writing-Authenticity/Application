export async function loginGoogle() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken(
      {
        interactive: true,
      },

      (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        console.log("Google token:", token);
        resolve(token);
      },
    );
  });
}
