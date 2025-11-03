import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login');

  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/sheets/escalations', req.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn && req.nextUrl.pathname.startsWith('/sheets')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
