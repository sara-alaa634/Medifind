'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const role = data.user.role;

          // Redirect based on role
          if (role === 'ADMIN') {
            router.push('/analytics');
          } else if (role === 'PHARMACY') {
            router.push('/dashboard');
          } else if (role === 'PATIENT') {
            router.push('/');
          }
        }
      } catch (error) {
        // User not authenticated, stay on current page
        console.error('Auth check failed:', error);
      }
    }

    checkAuth();
  }, [router]);

  return null;
}
