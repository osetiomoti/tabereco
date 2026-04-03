import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            console.log('--- SET TRIGGERED IN SERVER ---', name);
            cookieStore.set({ name, value, ...options });
          } catch (error) {}
        },
        remove(name: string, options: any) {
          try {
             cookieStore.set({ name, value: '', ...options });
          } catch (error) {}
        },
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: {name: string, value: string, options: any}[]) {
          try {
            console.log('--- SET_ALL TRIGGERED IN SERVER ---', cookiesToSet.map(c => c.name));
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (e: any) {}
        },
      },
    }
  );
}
