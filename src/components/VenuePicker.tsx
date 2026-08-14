import React from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { Icon } from './Icon';
import { useStore } from '../store/useStore';
import { Venue, VenueKind } from '../types';
import { useT } from '../i18n/useT';
import { createVenue, searchVenues, RemoteVenue } from '../services/social';
import { SOCIAL_AVAILABLE } from '../services/supabase';

const KINDS: VenueKind[] = ['loja', 'evento', 'casa', 'online'];

/** Espera o usuário parar de digitar antes de consultar o servidor. */
const DEBOUNCE_MS = 350;

interface Props {
  value?: Venue;
  onChange: (venue: Venue | undefined) => void;
}

/**
 * Seletor de local com busca antes de criar.
 *
 * A ordem da tela é a regra: primeiro o que já existe, e o botão de criar só
 * aparece depois da busca voltar. Oferecer "criar" antes de mostrar o que há
 * é o caminho mais curto para a base ter dez vezes a mesma loja.
 */
export function VenuePicker({ value, onChange }: Props) {
  const t = useT();
  const v = t.venues;

  const localVenues = useStore(s => s.venues);
  const addVenue = useStore(s => s.addVenue);
  const homeCity = useStore(s => s.settings.social.homeCity);
  const socialOn = useStore(s => s.settings.social.enabled);

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [city, setCity] = React.useState(homeCity);
  const [kind, setKind] = React.useState<VenueKind>('loja');
  const [results, setResults] = React.useState<RemoteVenue[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [searched, setSearched] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const canSearchRemote = SOCIAL_AVAILABLE && socialOn;

  /** Locais deste aparelho que batem com o texto — inclui os do tipo casa. */
  const localMatches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return localVenues.slice(0, 6);
    return localVenues.filter(lv => lv.name.toLowerCase().includes(q)).slice(0, 6);
  }, [localVenues, query]);

  React.useEffect(() => {
    if (!open || !canSearchRemote || !query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        setResults(await searchVenues(query, city));
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSearching(false);
        setSearched(true);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [query, city, open, canSearchRemote]);

  const pick = (venue: Venue) => {
    addVenue(venue);
    onChange(venue);
    setOpen(false);
    setQuery('');
  };

  const pickRemote = (r: RemoteVenue) =>
    pick({ id: r.id, name: r.name, kind: r.kind, city: r.city, country: r.country });

  /** Casa fica só no aparelho; o resto vai para a base compartilhada. */
  const create = async () => {
    const name = query.trim();
    if (!name) return;

    if (kind === 'casa' || !canSearchRemote) {
      pick({
        id: `vl_${Date.now().toString(36)}`,
        name,
        kind,
        city: city.trim() || undefined,
        localOnly: true,
      });
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const created = await createVenue({ name, kind, city });
      pickRemote(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  if (!open) {
    return (
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Icon name="pin" size={16} stroke={value ? colors.ink : colors.ink4} />
        <Text style={[styles.triggerText, !value && styles.triggerEmpty]}>
          {value ? value.name : v.placeholder}
        </Text>
        {value ? (
          <Pressable onPress={() => onChange(undefined)} hitSlop={10}>
            <Icon name="x" size={15} stroke={colors.ink4} />
          </Pressable>
        ) : (
          <Icon name="chev" size={14} stroke={colors.ink4} />
        )}
      </Pressable>
    );
  }

  return (
    <View style={styles.panel}>
      <TextInput
        autoFocus
        value={query}
        onChangeText={setQuery}
        placeholder={v.searchPlaceholder}
        placeholderTextColor={colors.ink4}
        style={styles.input}
      />

      <View style={styles.cityRow}>
        <Text style={styles.miniLabel}>{v.city}</Text>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder={v.cityPlaceholder}
          placeholderTextColor={colors.ink4}
          style={[styles.input, styles.cityInput]}
        />
      </View>

      <ScrollView style={styles.results} keyboardShouldPersistTaps="always" nestedScrollEnabled>
        {localMatches.length > 0 && (
          <>
            <Text style={styles.groupLabel}>{v.onThisDevice}</Text>
            {localMatches.map(lv => (
              <Pressable key={lv.id} style={styles.item} onPress={() => pick(lv)}>
                <Text style={styles.itemName}>{lv.name}</Text>
                <Text style={styles.itemMeta}>
                  {v.kind[lv.kind]}{lv.city ? ` · ${lv.city}` : ''}
                  {lv.localOnly ? ` · ${v.localOnly}` : ''}
                </Text>
              </Pressable>
            ))}
          </>
        )}

        {canSearchRemote && !!query.trim() && (
          <>
            <Text style={styles.groupLabel}>{v.shared}</Text>
            {searching && <ActivityIndicator style={{ padding: 12 }} color={colors.ink4} />}
            {!searching && results.map(r => (
              <Pressable key={r.id} style={styles.item} onPress={() => pickRemote(r)}>
                <Text style={styles.itemName}>{r.name}</Text>
                <Text style={styles.itemMeta}>
                  {v.kind[r.kind]}{r.city ? ` · ${r.city}` : ''}
                </Text>
              </Pressable>
            ))}
            {!searching && searched && results.length === 0 && (
              <Text style={styles.noResults}>{v.noResults}</Text>
            )}
          </>
        )}

        {!canSearchRemote && (
          <Text style={styles.noResults}>{v.offlineHint}</Text>
        )}
      </ScrollView>

      {/* Criar só aparece depois da busca ter respondido */}
      {!!query.trim() && (!canSearchRemote || searched) && (
        <View style={styles.createBox}>
          <Text style={styles.miniLabel}>{v.createAs}</Text>
          <View style={styles.kindRow}>
            {KINDS.map(k => (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                style={[styles.kindChip, kind === k && styles.kindChipOn]}
              >
                <Text style={[styles.kindText, kind === k && styles.kindTextOn]}>
                  {v.kind[k]}
                </Text>
              </Pressable>
            ))}
          </View>
          {kind === 'casa' && <Text style={styles.homeHint}>{v.homeHint}</Text>}
          <Pressable style={styles.createBtn} onPress={create} disabled={creating}>
            {creating
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.createBtnText}>{v.create(query.trim())}</Text>}
          </Pressable>
        </View>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.cancel} onPress={() => { setOpen(false); setQuery(''); }}>
        <Text style={styles.cancelText}>{v.cancel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.line, borderRadius: 8,
    backgroundColor: colors.surface,
  },
  triggerText: { flex: 1, fontSize: 13, fontFamily: 'Inter', color: colors.ink },
  triggerEmpty: { color: colors.ink4 },

  panel: {
    borderWidth: 1, borderColor: colors.line, borderRadius: 10,
    backgroundColor: colors.surface, padding: 12, gap: 10,
  },
  input: {
    fontSize: 13, fontFamily: 'Inter', color: colors.ink,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: colors.line, borderRadius: 8,
    backgroundColor: colors.bg,
  },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cityInput: { flex: 1, paddingVertical: 7 },
  miniLabel: {
    fontSize: 9, fontFamily: 'JetBrainsMono', letterSpacing: 0.6,
    textTransform: 'uppercase', color: colors.ink3,
  },
  results: { maxHeight: 190 },
  groupLabel: {
    fontSize: 9, fontFamily: 'JetBrainsMono', letterSpacing: 0.6,
    textTransform: 'uppercase', color: colors.ink4,
    paddingTop: 8, paddingBottom: 4,
  },
  item: {
    paddingVertical: 8, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: colors.line2,
  },
  itemName: { fontSize: 13, fontFamily: 'Inter', fontWeight: '500', color: colors.ink },
  itemMeta: { fontSize: 11, fontFamily: 'Inter', color: colors.ink3, marginTop: 2 },
  noResults: {
    fontSize: 12, fontFamily: 'Inter', color: colors.ink4,
    paddingVertical: 10, lineHeight: 17,
  },

  createBox: {
    borderTopWidth: 1, borderTopColor: colors.line2,
    paddingTop: 10, gap: 8,
  },
  kindRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  kindChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg2,
  },
  kindChipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  kindText: { fontSize: 11, fontFamily: 'Inter', fontWeight: '500', color: colors.ink3 },
  kindTextOn: { color: '#fff' },
  homeHint: { fontSize: 11, fontFamily: 'Inter', color: colors.ink3, lineHeight: 16 },
  createBtn: {
    backgroundColor: colors.accent, borderRadius: 8,
    paddingVertical: 10, alignItems: 'center',
  },
  createBtnText: { fontSize: 13, fontFamily: 'Inter', fontWeight: '600', color: '#fff' },

  error: { fontSize: 11, fontFamily: 'Inter', color: colors.bad, lineHeight: 16 },
  cancel: { alignItems: 'center', paddingVertical: 6 },
  cancelText: { fontSize: 12, fontFamily: 'Inter', color: colors.ink3 },
});
