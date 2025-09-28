export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: process.env.NEXT_CONVEX_OIDC_AUD,
    },
  ],
};
