import React from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Icon } from '../components/Icon';
import { useStore } from '../store/useStore';
import { useDeckVersions } from '../store/selectors';
import { Archetype, Deck, Format } from '../types';
import { parseDecklist } from '../utils/decklist';
import { useT } from '../i18n/useT';

// ─── Lista de cartas ────────────────────────────────────────

/**
 * Campo de lista no formato do MTGO, com a contagem ao vivo.
 *
 * A contagem é o retorno imediato que diz se a colagem deu certo: quem cola um
 * Modern espera ver 60 e 15, e qualquer outro número denuncia linha perdida no
 * meio do caminho antes de a lista ser salva errada.
 */
function DecklistField({ value, onChange }: {
  value: string;
  onChange: (v: string) => void;
}) {
  const d = useT().decks;
  const parsed = React.useMemo(() => parseDecklist(value), [value]);

  return (
    <>
      <Text style={[styles.fieldLabel, { marginTop: 14 }]}>{d.list}</Text>
      <TextInput
        multiline
        value={value}
        onChangeText={onChange}
        placeholder={d.listPlaceholder}
        placeholderTextColor={colors.ink4}
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, styles.listArea]}
      />
      {value.trim().length > 0 ? (
        <View style={styles.listMetaRow}>
          <Text style={styles.listCount}>
            {d.listCount(parsed.mainCount, parsed.sideCount)}
          </Text>
          {parsed.ignored.length > 0 && (
            <Text style={styles.listWarn}>{d.listIgnored(parsed.ignored.length)}</Text>
          )}
        </View>
      ) : (
        <Text style={styles.fieldHint}>{d.listHint}</Text>
      )}
    </>
  );
}

const ALL_FORMATS: Format[] = [
  'Commander', 'Modern', 'Standard', 'Pioneer', 'Legacy', 'Pauper', 'Draft', 'Other',
];
const ALL_ARCHETYPES: Archetype[] = ['Aggro', 'Midrange', 'Control', 'Combo', 'Stax'];

// ─── Peças compartilhadas ───────────────────────────────────

function Chips<T extends string>({
  options, value, onChange,
}: {
  options: readonly T[];
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map(o => (
        <Pressable
          key={o}
          onPress={() => onChange(o)}
          style={[styles.chip, value === o && styles.chipActive]}
        >
          <Text style={[styles.chipText, value === o && styles.chipTextActive]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Detalhe do deck: versões ───────────────────────────────

function DeckDetail({ deck, onBack }: { deck: Deck; onBack: () => void }) {
  const t = useT();
  const d = t.decks;

  const matches = useStore(s => s.matches);
  const sorted = useDeckVersions(deck.id);
  const addDeckVersion = useStore(s => s.addDeckVersion);
  const updateDeckVersion = useStore(s => s.updateDeckVersion);
  const deleteDeckVersion = useStore(s => s.deleteDeckVersion);
  const setCurrentVersion = useStore(s => s.setCurrentVersion);
  const updateDeck = useStore(s => s.updateDeck);
  const deleteDeck = useStore(s => s.deleteDeck);

  const [name, setName] = React.useState(deck.name);
  const [creating, setCreating] = React.useState(false);
  const [label, setLabel] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [list, setList] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editNotes, setEditNotes] = React.useState('');
  const [editList, setEditList] = React.useState('');
  /** Qual versão está com a lista aberta. Fechada por padrão: é texto longo. */
  const [openList, setOpenList] = React.useState<string | null>(null);

  /** Desempenho por versão — o motivo de versionar deck. */
  const perVersion = React.useMemo(() => {
    const mine = matches.filter(m => m.myDeck === deck.name);
    const bucket = (label?: string) => {
      const rows = mine.filter(m => (m.deckVersion || '') === (label || ''));
      const played = rows.filter(m => !m.drew).length;
      const wins = rows.filter(m => m.won && !m.drew).length;
      return {
        total: rows.length,
        wins,
        wr: played ? Math.round((wins / played) * 100) : null,
      };
    };
    return { bucket, unversioned: bucket(undefined) };
  }, [matches, deck.name]);

  const submitVersion = () => {
    if (!label.trim()) return;
    addDeckVersion(deck.id, label, notes, list);
    setLabel('');
    setNotes('');
    setList('');
    setCreating(false);
  };

  const confirmDelete = () => {
    Alert.alert(d.deleteDeckTitle, d.deleteDeckBody(deck.name), [
      { text: d.cancel, style: 'cancel' },
      {
        text: d.delete,
        style: 'destructive',
        onPress: () => { deleteDeck(deck.id); onBack(); },
      },
    ]);
  };

  return (
    <>
      <View style={styles.headerRow}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Icon name="back" size={16} stroke={colors.ink} />
          <Text style={styles.backText}>{d.back}</Text>
        </Pressable>
      </View>

      {/* Identificação */}
      <View style={styles.card}>
        <View style={styles.cardBody}>
          <Text style={styles.fieldLabel}>{d.deckName}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={() => {
              if (name.trim() && name.trim() !== deck.name) updateDeck(deck.id, { name });
              else setName(deck.name);
            }}
            style={styles.input}
          />
          <Text style={styles.fieldHint}>{d.renameHint}</Text>

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>{d.format}</Text>
          <Chips
            options={ALL_FORMATS}
            value={deck.format}
            onChange={v => updateDeck(deck.id, { format: v })}
          />

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>{d.archetype}</Text>
          <Chips
            options={ALL_ARCHETYPES}
            value={deck.archetype}
            onChange={v => updateDeck(deck.id, { archetype: v })}
          />
        </View>
      </View>

      {/* Versões */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{d.versions}</Text>
        {!creating && (
          <Pressable onPress={() => setCreating(true)} style={styles.addBtn}>
            <Icon name="plus" size={13} stroke={colors.accent} />
            <Text style={styles.addBtnText}>{d.newVersion}</Text>
          </Pressable>
        )}
      </View>

      {creating && (
        <View style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.fieldLabel}>{d.versionLabel}</Text>
            <TextInput
              autoFocus
              value={label}
              onChangeText={setLabel}
              placeholder={d.versionPlaceholder}
              placeholderTextColor={colors.ink4}
              style={styles.input}
              onSubmitEditing={submitVersion}
            />
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>{d.versionNotes}</Text>
            <TextInput
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder={d.versionNotesPlaceholder}
              placeholderTextColor={colors.ink4}
              style={[styles.input, styles.textarea]}
            />
            <DecklistField value={list} onChange={setList} />
            <View style={styles.formActions}>
              <Pressable
                style={styles.btnGhost}
                onPress={() => {
                  setCreating(false); setLabel(''); setNotes(''); setList('');
                }}
              >
                <Text style={styles.btnGhostText}>{d.cancel}</Text>
              </Pressable>
              <Pressable
                style={[styles.btnPrimary, !label.trim() && styles.btnDisabled]}
                onPress={submitVersion}
                disabled={!label.trim()}
              >
                <Text style={styles.btnPrimaryText}>{d.save}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {sorted.length === 0 && !creating && (
        <View style={styles.card}>
          <View style={[styles.cardBody, { alignItems: 'center', gap: 4 }]}>
            <Text style={styles.emptyTitle}>{d.noVersions}</Text>
            <Text style={styles.emptyBody}>{d.noVersionsBody}</Text>
          </View>
        </View>
      )}

      {sorted.map(v => {
        const stats = perVersion.bucket(v.label);
        const isCurrent = deck.currentVersionId === v.id;
        return (
          <View key={v.id} style={[styles.card, isCurrent && styles.cardCurrent]}>
            <View style={styles.cardBody}>
              <View style={styles.versionHead}>
                <View style={{ flex: 1 }}>
                  <View style={styles.versionTitleRow}>
                    <Text style={styles.versionLabel}>{v.label}</Text>
                    {isCurrent && (
                      <View style={styles.currentTag}>
                        <Text style={styles.currentTagText}>{d.current}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.versionMeta}>
                    {stats.total > 0
                      ? d.versionRecord(stats.total, stats.wr)
                      : d.versionNoMatches}
                  </Text>
                </View>
                {!isCurrent && (
                  <Pressable
                    onPress={() => setCurrentVersion(deck.id, v.id)}
                    style={styles.useBtn}
                  >
                    <Text style={styles.useBtnText}>{d.useThis}</Text>
                  </Pressable>
                )}
              </View>

              {editingId === v.id ? (
                <>
                  <TextInput
                    autoFocus
                    multiline
                    value={editNotes}
                    onChangeText={setEditNotes}
                    style={[styles.input, styles.textarea, { marginTop: 10 }]}
                  />
                  <DecklistField value={editList} onChange={setEditList} />
                  <View style={styles.formActions}>
                    <Pressable style={styles.btnGhost} onPress={() => setEditingId(null)}>
                      <Text style={styles.btnGhostText}>{d.cancel}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.btnPrimary}
                      onPress={() => {
                        updateDeckVersion(v.id, {
                          notes: editNotes,
                          list: editList.trim() || undefined,
                        });
                        setEditingId(null);
                      }}
                    >
                      <Text style={styles.btnPrimaryText}>{d.save}</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  {!!v.notes && <Text style={styles.versionNotes}>{v.notes}</Text>}

                  {/* Lista de cartas — só a contagem, até pedirem para ver */}
                  {!!v.list && (
                    <Pressable
                      onPress={() => setOpenList(openList === v.id ? null : v.id)}
                      style={styles.listSummary}
                    >
                      <Icon name="list" size={14} stroke={colors.ink3} />
                      <Text style={styles.listSummaryText}>
                        {(() => {
                          const p = parseDecklist(v.list!);
                          return d.listCount(p.mainCount, p.sideCount);
                        })()}
                      </Text>
                      <Icon
                        name="chev"
                        size={12}
                        stroke={colors.ink4}
                        strokeWidth={2}
                      />
                    </Pressable>
                  )}
                  {openList === v.id && !!v.list && (
                    <Text style={styles.listBody} selectable>{v.list}</Text>
                  )}

                  <View style={styles.versionActions}>
                    <Pressable
                      onPress={() => {
                        setEditingId(v.id);
                        setEditNotes(v.notes);
                        setEditList(v.list || '');
                      }}
                      hitSlop={8}
                    >
                      <Text style={styles.linkText}>
                        {v.notes ? d.editNotes : d.addNotes}
                      </Text>
                    </Pressable>
                    {!v.list && (
                      <Pressable
                        onPress={() => {
                          setEditingId(v.id);
                          setEditNotes(v.notes);
                          setEditList('');
                        }}
                        hitSlop={8}
                      >
                        <Text style={styles.linkText}>{d.addList}</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={() => deleteDeckVersion(v.id)} hitSlop={8}>
                      <Text style={[styles.linkText, { color: colors.bad }]}>{d.delete}</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>
        );
      })}

      {perVersion.unversioned.total > 0 && sorted.length > 0 && (
        <Text style={styles.unversionedNote}>
          {d.unversioned(perVersion.unversioned.total)}
        </Text>
      )}

      <Pressable onPress={confirmDelete} style={styles.deleteDeckBtn}>
        <Icon name="trash" size={15} stroke={colors.bad} />
        <Text style={styles.deleteDeckText}>{d.deleteDeck}</Text>
      </Pressable>
    </>
  );
}

// ─── Lista de decks ─────────────────────────────────────────

function DeckList({ onOpen }: { onOpen: (deck: Deck) => void }) {
  const t = useT();
  const d = t.decks;

  const decks = useStore(s => s.decks);
  const matches = useStore(s => s.matches);
  const versionCount = useStore(s => s.deckVersions);
  const addDeck = useStore(s => s.addDeck);
  const defaultFormat = useStore(s => s.settings.defaultFormat);

  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState('');
  const [format, setFormat] = React.useState<Format>(defaultFormat);
  const [archetype, setArchetype] = React.useState<Archetype | undefined>();
  const [query, setQuery] = React.useState('');

  const rows = React.useMemo(() => {
    const stats = new Map<string, { total: number; wins: number; played: number }>();
    matches.forEach(m => {
      if (!m.myDeck) return;
      const key = m.myDeck.toLowerCase();
      const cur = stats.get(key) ?? { total: 0, wins: 0, played: 0 };
      cur.total++;
      if (!m.drew) {
        cur.played++;
        if (m.won) cur.wins++;
      }
      stats.set(key, cur);
    });

    return decks
      .map(deck => {
        const s = stats.get(deck.name.toLowerCase());
        return {
          deck,
          total: s?.total ?? 0,
          wr: s?.played ? Math.round((s.wins / s.played) * 100) : null,
          versions: versionCount.filter(v => v.deckId === deck.id).length,
        };
      })
      .sort((a, b) => b.total - a.total || a.deck.name.localeCompare(b.deck.name));
  }, [decks, matches, versionCount]);

  const filtered = query.trim()
    ? rows.filter(r => r.deck.name.toLowerCase().includes(query.toLowerCase()))
    : rows;

  const submit = () => {
    if (!name.trim()) return;
    const created = addDeck({ name, format, archetype });
    setName('');
    setArchetype(undefined);
    setCreating(false);
    if (created) onOpen(created);
  };

  return (
    <>
      <Text style={styles.pageTitle}>{d.title}</Text>

      {!creating ? (
        <Pressable style={styles.createCta} onPress={() => setCreating(true)}>
          <Icon name="plus" size={16} stroke="#fff" />
          <Text style={styles.createCtaText}>{d.newDeck}</Text>
        </Pressable>
      ) : (
        <View style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.fieldLabel}>{d.deckName}</Text>
            <TextInput
              autoFocus
              value={name}
              onChangeText={setName}
              placeholder={d.deckNamePlaceholder}
              placeholderTextColor={colors.ink4}
              style={styles.input}
              onSubmitEditing={submit}
            />

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>{d.format}</Text>
            <Chips options={ALL_FORMATS} value={format} onChange={setFormat} />

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>{d.archetypeOptional}</Text>
            <Chips options={ALL_ARCHETYPES} value={archetype} onChange={setArchetype} />

            <View style={styles.formActions}>
              <Pressable
                style={styles.btnGhost}
                onPress={() => { setCreating(false); setName(''); }}
              >
                <Text style={styles.btnGhostText}>{d.cancel}</Text>
              </Pressable>
              <Pressable
                style={[styles.btnPrimary, !name.trim() && styles.btnDisabled]}
                onPress={submit}
                disabled={!name.trim()}
              >
                <Text style={styles.btnPrimaryText}>{d.create}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {rows.length > 4 && (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={d.search}
          placeholderTextColor={colors.ink4}
          style={styles.input}
        />
      )}

      {rows.length === 0 && !creating && (
        <View style={styles.card}>
          <View style={[styles.cardBody, { alignItems: 'center', gap: 4 }]}>
            <Text style={styles.emptyTitle}>{d.noDecks}</Text>
            <Text style={styles.emptyBody}>{d.noDecksBody}</Text>
          </View>
        </View>
      )}

      {filtered.map(({ deck, total, wr, versions }) => (
        <Pressable key={deck.id} style={styles.deckRow} onPress={() => onOpen(deck)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.deckName}>{deck.name}</Text>
            <Text style={styles.deckMeta}>
              {deck.format}
              {deck.archetype ? ` · ${deck.archetype}` : ''}
              {` · ${d.matchCount(total)}`}
              {versions > 0 ? ` · ${d.versionCount(versions)}` : ''}
            </Text>
          </View>
          {wr !== null && (
            <Text style={[styles.wr, { color: wr >= 50 ? colors.good : colors.bad }]}>
              {wr}%
            </Text>
          )}
          <Icon name="chev" size={14} stroke={colors.ink4} />
        </Pressable>
      ))}
    </>
  );
}

// ─── Tela ───────────────────────────────────────────────────

export function DecksScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const [openId, setOpenId] = React.useState<string | null>(null);
  // Lê da store para a tela refletir edições feitas no detalhe.
  const deck = useStore(s => s.decks.find(x => x.id === openId));

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {deck ? (
        <DeckDetail deck={deck} onBack={() => setOpenId(null)} />
      ) : (
        <>
          <Pressable style={styles.backBtnTop} onPress={onBack}>
            <Icon name="back" size={16} stroke={colors.ink} />
            <Text style={styles.backText}>{t.decks.backToSettings}</Text>
          </Pressable>
          <DeckList onOpen={d => setOpenId(d.id)} />
        </>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 12 },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: colors.ink,
    letterSpacing: -0.5,
  },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  backBtnTop: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  backText: { fontSize: 13, fontFamily: 'Inter', fontWeight: '500', color: colors.ink },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  cardCurrent: { borderColor: colors.accent, borderWidth: 1.5 },
  cardBody: { padding: 16 },

  fieldLabel: {
    fontSize: 9.5,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.ink3,
    marginBottom: 6,
  },
  fieldHint: { fontSize: 11, fontFamily: 'Inter', color: colors.ink4, marginTop: 6 },
  input: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: colors.ink,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.bg,
  },
  textarea: { height: 78, textAlignVertical: 'top' },
  listArea: {
    height: 160,
    textAlignVertical: 'top',
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    lineHeight: 18,
  },
  listMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  listCount: {
    fontSize: 11,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.4,
    color: colors.ink3,
  },
  listWarn: { fontSize: 11, fontFamily: 'Inter', color: colors.bad },
  listSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  listSummaryText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.4,
    color: colors.ink2,
  },
  listBody: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.bg2,
    fontFamily: 'JetBrainsMono',
    fontSize: 11.5,
    lineHeight: 18,
    color: colors.ink2,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg2,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 12, fontFamily: 'Inter', fontWeight: '500', color: colors.ink3 },
  chipTextActive: { color: '#fff' },

  createCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingVertical: 13,
  },
  createCtaText: { color: '#fff', fontSize: 14, fontWeight: '600', fontFamily: 'Inter' },

  formActions: { flexDirection: 'row', gap: 10, marginTop: 16, justifyContent: 'flex-end' },
  btnGhost: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  btnGhostText: { fontSize: 13, fontFamily: 'Inter', color: colors.ink3, fontWeight: '500' },
  btnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  btnPrimaryText: { fontSize: 13, fontFamily: 'Inter', color: '#fff', fontWeight: '600' },
  btnDisabled: { opacity: 0.4 },

  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  deckName: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter', color: colors.ink },
  deckMeta: { fontSize: 11, fontFamily: 'Inter', color: colors.ink3, marginTop: 3 },
  wr: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 6,
  },
  sectionLabel: {
    fontSize: 9.5,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.ink3,
  },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  addBtnText: { fontSize: 12, fontFamily: 'Inter', fontWeight: '600', color: colors.accent },

  versionHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  versionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  versionLabel: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter', color: colors.ink },
  currentTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  currentTagText: {
    fontSize: 9,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  versionMeta: { fontSize: 11, fontFamily: 'Inter', color: colors.ink3, marginTop: 3 },
  versionNotes: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: colors.ink2,
    lineHeight: 18,
    marginTop: 10,
  },
  versionActions: { flexDirection: 'row', gap: 16, marginTop: 12 },
  linkText: { fontSize: 12, fontFamily: 'Inter', fontWeight: '500', color: colors.ink3 },
  useBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  useBtnText: { fontSize: 11, fontFamily: 'Inter', fontWeight: '600', color: colors.ink2 },

  emptyTitle: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter', color: colors.ink2 },
  emptyBody: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: colors.ink4,
    textAlign: 'center',
    lineHeight: 18,
  },
  unversionedNote: {
    fontSize: 11,
    fontFamily: 'Inter',
    color: colors.ink4,
    paddingHorizontal: 4,
    lineHeight: 16,
  },

  deleteDeckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  deleteDeckText: { fontSize: 13, fontFamily: 'Inter', fontWeight: '500', color: colors.bad },
});
