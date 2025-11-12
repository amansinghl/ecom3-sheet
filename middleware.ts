import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isRootPage = req.nextUrl.pathname === '/';
  const token = req.nextUrl.searchParams.get('token');
  const loginViaErp = req.nextUrl.searchParams.get('login_via_erp');
  const role = req.nextUrl.searchParams.get('role');
  const name = req.nextUrl.searchParams.get('name');
  const email = req.nextUrl.searchParams.get('email');

  // Allow access to root/landing page without authentication
  if (isRootPage) {
    // If user has token params, let the page handle authentication
    if (token && loginViaErp === 'true') {
      return NextResponse.next();
    }
    // If already logged in, redirect to sheets
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/sheets/escalations', req.url));
    }
    // Allow access to landing page
    return NextResponse.next();
  }

  // If user has token params and is not logged in, redirect to root with params preserved
  if (!isLoggedIn && token && loginViaErp === 'true') {
    const rootUrl = new URL('/', req.url);
    rootUrl.searchParams.set('token', token);
    rootUrl.searchParams.set('login_via_erp', loginViaErp);
    if (role) rootUrl.searchParams.set('role', role);
    if (name) rootUrl.searchParams.set('name', name);
    if (email) rootUrl.searchParams.set('email', email);
    return NextResponse.redirect(rootUrl);
  }

  // Protect sheets routes
  if (!isLoggedIn && req.nextUrl.pathname.startsWith('/sheets')) {
    // If token params exist, redirect to root with params
    if (token && loginViaErp === 'true') {
      const rootUrl = new URL('/', req.url);
      rootUrl.searchParams.set('token', token);
      rootUrl.searchParams.set('login_via_erp', loginViaErp);
      if (role) rootUrl.searchParams.set('role', role);
      if (name) rootUrl.searchParams.set('name', name);
      if (email) rootUrl.searchParams.set('email', email);
      return NextResponse.redirect(rootUrl);
    }
    // Otherwise redirect to root (landing page)
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
