import React from 'react';
import {
  View, Text, Pressable, ScrollView, Alert, StyleSheet, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { colors } from '../theme/colors';
import { Icon } from '../components/Icon';
import { Toggle } from '../components/Toggle';
import { Badge } from '../components/Badge';
import { DeckSelector } from '../components/DeckSelector';
import { useStore } from '../store/useStore';
import { exportCSV, parseCSV } from '../utils/csv';
import { Language } from '../types';
import { useT } from '../i18n/useT';
import { isDatabaseDeck } from '../data/decks';
import { TELEMETRY_CONFIGURED } from '../config';

// ─── Helpers ────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Row({ children, onPress, style }: {
  children: React.ReactNode; onPress?: () => void; style?: object;
}) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress} style={[styles.row, style]}>
      {children}
    </Wrapper>
  );
}

// ─── ManageDecksScreen ──────────────────────────────────────

function ManageDecksScreen({ onBack }: { onBack: () => void }) {
  const t = useT();
  const md = t.manageDecks;
  const matches = useStore(s => s.matches);
  const renameDecks = useStore(s => s.renameDecks);
  const [query, setQuery] = React.useState('');
  const [editing, setEditing] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState('');

  const decks = React.useMemo(() => {
    const map: Record<string, { count: number; wins: number; format: string }> = {};
    matches.forEach(m => {
      if (m.myDeck) {
        if (!map[m.myDeck]) map[m.myDeck] = { count: 0, wins: 0, format: m.format };
        map[m.myDeck].count++;
        if (m.won) map[m.myDeck].wins++;
      }
    });
    return Object.entries(map)
      .filter(([name]) => !isDatabaseDeck(name))  // somente decks criados pelo usuário
      .map(([name, v]) => ({ name, ...v, wr: Math.round(v.wins / v.count * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [matches]);

  const filtered = query
    ? decks.filter(d => d.name.toLowerCase().includes(query.toLowerCase()))
    : decks;

  const startEdit = (name: string) => {
    setEditing(name);
    setEditValue(name);
  };

  const confirmEdit = () => {
    if (editing && editValue.trim() && editValue.trim() !== editing) {
      renameDecks(editing, editValue.trim());
    }
    setEditing(null);
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Icon name="back" size={16} stroke={colors.ink} />
          <Text style={styles.backText}>{md.back}</Text>
        </Pressable>
        <Text style={[styles.pageTitle, { fontSize: 18, marginBottom: 0 }]}>{md.title}</Text>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={md.search}
        placeholderTextColor={colors.ink4}
        style={styles.searchInput}
      />

      <Card>
        {filtered.length === 0 && (
          <View style={{ padding: 20, alignItems: 'center', gap: 4 }}>
            <Text style={styles.emptyText}>{md.empty}</Text>
            <Text style={[styles.rowSub, { textAlign: 'center' }]}>{md.emptySub}</Text>
          </View>
        )}
        {filtered.map((d, i) => (
          <View key={d.name} style={[styles.row, i < filtered.length - 1 && styles.rowBorder]}>
            {editing === d.name ? (
              <View style={styles.editRow}>
                <TextInput
                  autoFocus
                  value={editValue}
                  onChangeText={setEditValue}
                  onSubmitEditing={confirmEdit}
                  style={styles.editInput}
                />
                <Pressable style={styles.editSaveBtn} onPress={confirmEdit}>
                  <Text style={styles.editSaveText}>{md.save}</Text>
                </Pressable>
                <Pressable style={styles.editCancelBtn} onPress={() => setEditing(null)}>
                  <Text style={styles.editCancelText}>✕</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{d.name}</Text>
                  <Text style={styles.rowSub}>{d.format} · {md.matches(d.count)}</Text>
                </View>
                <Text style={[styles.wrText, { color: d.wr >= 50 ? colors.good : colors.bad }]}>
                  {d.wr}%
                </Text>
                <Pressable onPress={() => startEdit(d.name)} hitSlop={8}>
                  <Icon name="edit" size={15} stroke={colors.ink4} />
                </Pressable>
              </>
            )}
          </View>
        ))}
      </Card>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// ─── SettingsScreen ─────────────────────────────────────────

const LANGUAGES: { code: Language; label: string; sub: string }[] = [
  { code: 'en-US', label: 'English', sub: 'English (US)' },
  { code: 'pt-BR', label: 'Português', sub: 'Português (Brasil)' },
  { code: 'ja-JP', label: '日本語', sub: 'Japanese' },
];

const ALL_FORMATS = ['Commander', 'Modern', 'Standard', 'Pioneer', 'Legacy', 'Pauper', 'Draft', 'Other'];

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const s = t.settings;
  const settings = useStore(st => st.settings);
  const matches = useStore(st => st.matches);
  const recentDecks = useStore(st => st.getRecentDecks());
  const updateSettings = useStore(st => st.updateSettings);
  const deleteAllData = useStore(st => st.deleteAllData);
  const importMatches = useStore(st => st.importMatches);
  const loadDemoData = useStore(st => st.loadDemoData);
  const pendingCount = useStore(st => st.telemetryQueue.length);

  const [showDecks, setShowDecks] = React.useState(false);
  const [importStatus, setImportStatus] = React.useState<null | 'ok' | 'err'>(null);
  const [importCount, setImportCount] = React.useState(0);

  const set = (k: any, v: any) => updateSettings({ [k]: v });

  const handleExport = async () => {
    try {
      await exportCSV(matches);
    } catch {
      Alert.alert('Erro', 'Não foi possível exportar as partidas.');
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const picked = result.assets[0];
      const text = new File(picked.uri).textSync();
      const parsed = parseCSV(text);

      if (parsed.length === 0) {
        setImportStatus('err');
        setTimeout(() => setImportStatus(null), 3500);
        return;
      }

      importMatches(parsed);
      setImportCount(parsed.length);
      setImportStatus('ok');
      setTimeout(() => setImportStatus(null), 3500);
    } catch {
      setImportStatus('err');
      setTimeout(() => setImportStatus(null), 3500);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      s.deleteConfirmTitle,
      s.deleteConfirmBody,
      [
        { text: s.deleteConfirmCancel, style: 'cancel' },
        { text: s.deleteConfirmOk, style: 'destructive', onPress: deleteAllData },
      ]
    );
  };

  if (showDecks) return <ManageDecksScreen onBack={() => setShowDecks(false)} />;

  const currentLang = settings.language || 'pt-BR';

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>{s.title}</Text>

      {/* Defaults */}
      <View>
        <SectionLabel label={s.defaults} />
        <Card>
          <Row style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <View>
              <Text style={styles.rowTitle}>{s.defaultFormat}</Text>
              <Text style={styles.rowSub}>{s.defaultFormatSub}</Text>
            </View>
            <View style={styles.formatPicker}>
              {ALL_FORMATS.map(f => (
                <Pressable
                  key={f}
                  onPress={() => set('defaultFormat', f)}
                  style={[styles.formatChip, settings.defaultFormat === f && styles.formatChipActive]}
                >
                  <Text style={[styles.formatChipText, settings.defaultFormat === f && styles.formatChipTextActive]}>
                    {f}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Row>
          <View style={styles.rowDivider} />
          <Row style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <View>
              <Text style={styles.rowTitle}>{s.defaultDeck}</Text>
              <Text style={styles.rowSub}>{s.defaultDeckSub}</Text>
            </View>
            <DeckSelector
              value={settings.defaultDeck}
              onChange={v => set('defaultDeck', v)}
              format={settings.defaultFormat}
              recentDecks={recentDecks}
              placeholder={s.defaultDeckPlaceholder}
            />
          </Row>
        </Card>
      </View>

      {/* Language */}
      <View>
        <SectionLabel label={s.language} />
        <Card>
          {LANGUAGES.map((lang, i) => (
            <Row
              key={lang.code}
              onPress={() => set('language', lang.code)}
              style={[i < LANGUAGES.length - 1 && styles.rowBorder]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{lang.label}</Text>
                <Text style={styles.rowSub}>{lang.sub}</Text>
              </View>
              {currentLang === lang.code && (
                <Icon name="check" size={16} stroke={colors.ink} />
              )}
            </Row>
          ))}
        </Card>
      </View>

      {/* Privacy */}
      <View>
        <SectionLabel label={s.privacy} />
        <Card>
          <Row>
            <Icon name="shield" size={18} stroke={colors.ink3} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{s.onDevice}</Text>
              <Text style={styles.rowSub}>{s.onDeviceSub}</Text>
            </View>
            <Badge label={s.alwaysOn} />
          </Row>
          <View style={styles.rowDivider} />
          <Row>
            <Icon name="share" size={18} stroke={colors.ink3} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{s.shareAnon}</Text>
              <Text style={styles.rowSub}>{s.shareAnonSub}</Text>
            </View>
            <Toggle value={settings.shareAnon} onValueChange={v => set('shareAnon', v)} />
          </Row>

          {settings.shareAnon && (
            <>
              <View style={styles.rowDivider} />
              <View style={styles.shareDetail}>
                <Text style={styles.shareLabel}>{s.shareWhatLabel}</Text>
                <Text style={styles.shareMono}>{s.shareWhat}</Text>
                <Text style={styles.shareStatus}>
                  {!TELEMETRY_CONFIGURED
                    ? s.shareNotConfigured
                    : pendingCount > 0
                      ? s.sharePending(pendingCount)
                      : s.shareUpToDate}
                </Text>
              </View>
            </>
          )}
        </Card>
      </View>

      {/* Data */}
      <View>
        <SectionLabel label={s.data} />
        <Card>
          <Row onPress={handleExport}>
            <Icon name="share" size={18} stroke={colors.ink3} />
            <Text style={[styles.rowTitle, { flex: 1 }]}>{s.export}</Text>
            <Icon name="chev" size={14} stroke={colors.ink4} />
          </Row>
          <View style={styles.rowDivider} />
          <Row onPress={handleImport}>
            <Icon name="list" size={18} stroke={colors.ink3} />
            <Text style={[styles.rowTitle, { flex: 1 }]}>{s.import}</Text>
            {importStatus === 'ok' && (
              <Text style={styles.importOk}>{s.importOk(importCount)}</Text>
            )}
            {importStatus === 'err' && (
              <Text style={styles.importErr}>{s.importErr}</Text>
            )}
            {!importStatus && <Icon name="chev" size={14} stroke={colors.ink4} />}
          </Row>
          <View style={styles.rowDivider} />
          <Row onPress={() => setShowDecks(true)}>
            <Icon name="list" size={18} stroke={colors.ink3} />
            <Text style={[styles.rowTitle, { flex: 1 }]}>{s.manageDecks}</Text>
            <Icon name="chev" size={14} stroke={colors.ink4} />
          </Row>
          {matches.length === 0 && (
            <>
              <View style={styles.rowDivider} />
              <Row onPress={loadDemoData}>
                <Icon name="stats" size={18} stroke={colors.ink3} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{s.loadDemo}</Text>
                  <Text style={styles.rowSub}>{s.loadDemoSub}</Text>
                </View>
                <Icon name="chev" size={14} stroke={colors.ink4} />
              </Row>
            </>
          )}
          <View style={styles.rowDivider} />
          <Row onPress={handleDelete}>
            <Icon name="trash" size={18} stroke={colors.bad} />
            <Text style={[styles.rowTitle, { flex: 1, color: colors.bad }]}>{s.deleteAll}</Text>
            <Icon name="chev" size={14} stroke={colors.bad} />
          </Row>
        </Card>
      </View>

      <Text style={styles.version}>{s.version}</Text>
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 14 },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 9.5,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.ink3,
    paddingHorizontal: 8,
    paddingBottom: 6,
    paddingTop: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line2 },
  rowDivider: { height: 1, backgroundColor: colors.line2 },
  rowTitle: { fontSize: 13, fontWeight: '500', fontFamily: 'Inter', color: colors.ink },
  rowSub: {
    fontSize: 11,
    fontFamily: 'Inter',
    color: colors.ink3,
    marginTop: 2,
  },
  // Format picker chips
  formatPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    width: '100%',
  },
  formatChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg2,
  },
  formatChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  formatChipText: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: colors.ink3,
  },
  formatChipTextActive: { color: '#fff' },
  // Import/export
  importOk: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter',
    color: colors.good,
  },
  importErr: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter',
    color: colors.bad,
  },
  wrText: { fontFamily: 'Inter', fontSize: 14, fontWeight: '700', marginRight: 8 },
  // Detalhe do compartilhamento anônimo
  shareDetail: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
    backgroundColor: colors.surface2,
  },
  shareLabel: {
    fontSize: 9.5,
    fontFamily: 'JetBrainsMono',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.ink3,
  },
  shareMono: {
    fontFamily: 'JetBrainsMono',
    fontSize: 10,
    lineHeight: 17,
    color: colors.ink2,
  },
  shareStatus: {
    fontSize: 11,
    fontFamily: 'Inter',
    color: colors.ink3,
    marginTop: 2,
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.ink4,
    fontFamily: 'JetBrainsMono',
    paddingVertical: 12,
  },
  // ManageDecks
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
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
  searchInput: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: colors.ink,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  emptyText: { fontSize: 12, fontFamily: 'Inter', color: colors.ink4 },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter',
    color: colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 7,
    backgroundColor: colors.surface,
  },
  editSaveBtn: {
    backgroundColor: colors.ink,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editSaveText: { color: '#fff', fontSize: 12, fontWeight: '600', fontFamily: 'Inter' },
  editCancelBtn: {
    backgroundColor: colors.bg2,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editCancelText: { color: colors.ink3, fontSize: 12, fontFamily: 'Inter' },
});
