import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ADMIN AUTH HANDLED BY ROLE CHECK IN JWT
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;


  // Protect Admin Routes
  if (path.startsWith('/admin')) {
    
    // Use NextAuth getToken to verify the session (supports JWT strategy)
    const token = await getToken({ 
        req, 
        secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      console.log("Middleware: No session found for admin access.");
      // Not logged in -> Redirect to login
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/';
      redirectUrl.searchParams.set('auth', 'signin');
      redirectUrl.searchParams.set('redirect', path); // Preserve the original path (/admin)

      // If checking API, return 401 JSON
      if (req.nextUrl.pathname.startsWith('/api/')) {
           return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      return NextResponse.redirect(redirectUrl);
    }

    // Access Control: Check if user has 'admin' role
    const role = token?.role as string | undefined;
    const email = token?.email;

    console.log(`Middleware: Checking access for ${email}, Role: ${role}`);

    // Allow if role is explicitly 'admin'
    if (role !== 'admin') {
      console.warn(`Middleware: Access denied for ${email} (Role: ${role})`);

      // If checking API, return 403 JSON
      if (req.nextUrl.pathname.startsWith('/api/')) {
           return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Otherwise redirect to wallet with error
      const url = new URL('/wallet', req.url);
      url.searchParams.set('error', 'AccessDenied');
      return NextResponse.redirect(url);
    }

    console.log("Middleware: Admin access granted.");
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*', 
    '/api/admin/:path*'
  ],
};
