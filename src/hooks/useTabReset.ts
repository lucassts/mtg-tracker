import React from 'react';
import { useNavigation } from '@react-navigation/native';

/**
 * Executa `reset` quando a aba é tocada na barra inferior.
 *
 * Serve para telas que guardam a subtela aberta em estado local, e não em
 * rota — Configurações e Partidas são assim. Sem isto, tocar na aba já aberta
 * não fazia nada e a pessoa ficava presa lá dentro, tendo que achar o "voltar".
 *
 * Dispara também ao entrar na aba vindo de outra, e isso é proposital: tocar
 * em "Config" deve levar para Configurações, não para a última subtela que
 * ficou aberta três minutos atrás.
 */
export function useTabReset(reset: () => void): void {
  const navigation = useNavigation();

  // O pai passa uma função nova a cada render; a ref evita reassinar o
  // listener toda vez.
  const ref = React.useRef(reset);
  ref.current = reset;

  React.useEffect(
    () => navigation.addListener('tabPress' as never, () => ref.current()),
    [navigation]
  );
}
