'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = createClient();
  console.log('--- SERVER ACTION LOGIN ATTEMPT ---');
  console.log('Email:', email, 'Password length:', password?.length);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  console.log('Login result user:', !!data?.user, 'session:', !!data?.session, 'error:', error?.message);

  if (error || !data?.session) {
    if (!data?.session) {
      return { error: 'ユーザー認証が完了していません。SupabaseでAuto Confirm User?にチェックを入れて作成し直してください。' };
    }
    return { error: 'メールアドレスまたはパスワードが正しくありません' };
  }

  revalidatePath('/', 'layout');
  redirect('/posts');
}
