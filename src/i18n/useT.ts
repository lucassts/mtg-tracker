import { useStore } from '../store/useStore';
import { translations } from './translations';

export type T = typeof translations['pt-BR'];

export function useT(): T {
  const language = useStore(s => s.settings.language);
  const lang = language || 'pt-BR';
  return (translations[lang as keyof typeof translations] ?? translations['pt-BR']) as T;
}
