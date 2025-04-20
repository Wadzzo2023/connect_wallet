import { useEffect, useState } from "react";

const testUserAgent =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17 1 1 like Mac OS X). AppleWebKit/605.1.15 (KHTML, like Gecko). Mobile/21B91 [FBAN/FBIOS;FBAV/441.1.0";

function useFacebookiOSUserAgent(): boolean | null {
  const [isFacebookiOS, setIsFacebookiOS] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userAgent: string = window.navigator.userAgent;

      // Check if the user agent matches the Facebook app on iOS
      const matchesFacebookiOS: boolean = isFacebookAppiOS(userAgent);

      setIsFacebookiOS(matchesFacebookiOS);
    }
  }, []);

  return isFacebookiOS;
}

export default useFacebookiOSUserAgent;

function isFacebookAppiOS(userAgent: string): boolean {
  return (
    userAgent.includes("FBIOS") &&
    userAgent.includes("FBAV") &&
    userAgent.includes("iPhone") &&
    userAgent.includes("like Mac OS X")
  );
}
