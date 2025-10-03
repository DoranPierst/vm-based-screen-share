import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  nickname: string;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function register(nickname: string, password: string): Promise<{ success: boolean; error?: string; user?: AuthUser }> {
  try {
    const passwordHash = await hashPassword(password);

    const { data, error } = await supabase
      .from('users')
      .insert({ nickname, password_hash: passwordHash })
      .select('id, nickname')
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Bu kullanıcı adı zaten kullanılıyor' };
      }
      return { success: false, error: error.message };
    }

    if (data) {
      localStorage.setItem('user', JSON.stringify(data));
      return { success: true, user: data };
    }

    return { success: false, error: 'Kayıt başarısız' };
  } catch (error) {
    return { success: false, error: 'Bir hata oluştu' };
  }
}

export async function login(nickname: string, password: string): Promise<{ success: boolean; error?: string; user?: AuthUser }> {
  try {
    const passwordHash = await hashPassword(password);

    const { data, error } = await supabase
      .from('users')
      .select('id, nickname, password_hash')
      .eq('nickname', nickname)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Kullanıcı bulunamadı' };
    }

    if (data.password_hash !== passwordHash) {
      return { success: false, error: 'Şifre yanlış' };
    }

    const user = { id: data.id, nickname: data.nickname };
    localStorage.setItem('user', JSON.stringify(user));
    return { success: true, user };
  } catch (error) {
    return { success: false, error: 'Bir hata oluştu' };
  }
}

export function logout(): void {
  localStorage.removeItem('user');
}

export function getCurrentUser(): AuthUser | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}
