import Script from "next/script";

export function ClarityAnalytics() {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || "z45hin4a0v";
  if (!/^[a-z0-9]+$/i.test(projectId)) return null;

  return (
    <Script id="clarity-analytics" strategy="afterInteractive">
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          c[a]("consentv2", { ad_Storage: "denied", analytics_Storage: "denied" });
          c[a]("set", "environment", ${JSON.stringify(process.env.NODE_ENV)});
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", ${JSON.stringify(projectId)});
      `}
    </Script>
  );
}
