import { withAuth } from "next-auth/middleware";

// Redirect unauthenticated users to the sign-in page for protected routes
export default withAuth({
  callbacks: {
    authorized: ({ token }) => Boolean(token),
  },
});

// Protect "My Datasets" and upload flows; public explore remains accessible
export const config = {
  matcher: ["/datasets/:path*", "/upload/:path*", "/profile/:path*"],
};
