import React from 'react';
import {
  Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Icon } from './Icon';

interface Option {
  value: string;
  label: string;
}

// ─── Checkbox visual ──────────────────────────────────────────
function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={[cbStyles.box, checked && cbStyles.boxChecked]}>
      {checked && <Icon name="check" size={10} stroke="#fff" strokeWidth={2.5} />}
    </View>
  );
}
const cbStyles = StyleSheet.create({
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
});

// ─── Props ────────────────────────────────────────────────────

interface FilterPickerModalProps {
  visible: boolean;
  title: string;
  /** Opções SEM o item "Todos" — o modal o gera internamente */
  options: Option[];
  /** Seleção atual: [] = nenhum filtro (= Todos) */
  value: string[];
  onChange: (v: string[]) => void;
  onClose: () => void;
  searchPlaceholder?: string;
  allLabel?: string;
  applyLabel?: string;
}

// ─── Componente ───────────────────────────────────────────────

export function FilterPickerModal({
  visible,
  title,
  options,
  value,
  onChange,
  onClose,
  searchPlaceholder = 'Search…',
  allLabel = 'Todos',
  applyLabel = 'Aplicar',
}: FilterPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = React.useState('');
  // Estado interno — só é comitado ao pressionar Aplicar
  const [selected, setSelected] = React.useState<string[]>([]);

  // Sincroniza ao abrir
  React.useEffect(() => {
    if (visible) {
      setSelected(value);
      setQuery('');
    }
  }, [visible]);

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const toggle = (v: string) => {
    setSelected(prev =>
      prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]
    );
  };

  const clearAll = () => {
    onChange([]);
    onClose();
  };

  const apply = () => {
    onChange(selected);
    onClose();
  };

  const noneSelected = selected.length === 0;
  const countLabel = selected.length > 0 ? ` (${selected.length})` : '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop — toque fora cancela (sem comitar) */}
      <Pressable style={styles.overlay} onPress={onClose} />

      <View style={styles.sheet}>
        {/* Handle bar */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Icon name="x" size={16} stroke={colors.ink3} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Busca */}
        <View style={styles.searchWrap}>
          <Icon name="search" size={14} stroke={colors.ink3} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.ink4}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Icon name="x" size={12} stroke={colors.ink3} />
            </Pressable>
          )}
        </View>

        {/* Lista */}
        <ScrollView
          style={styles.list}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          {/* Linha "Todos" — sempre visível quando sem busca */}
          {!query.trim() && (
            <Pressable
              onPress={clearAll}
              style={[styles.row, styles.rowAll, noneSelected && styles.rowAllActive]}
            >
              <Text style={[styles.rowText, noneSelected && styles.rowTextAll]}>
                {allLabel}
              </Text>
              {noneSelected && (
                <Icon name="check" size={14} stroke={colors.accent} strokeWidth={2.5} />
              )}
            </Pressable>
          )}

          {/* Opções com checkbox */}
          {filtered.map(opt => {
            const isSelected = selected.includes(opt.value);
            return (
              <Pressable
                key={opt.value}
                onPress={() => toggle(opt.value)}
                style={[styles.row, isSelected && styles.rowSelected]}
              >
                <Checkbox checked={isSelected} />
                <Text
                  style={[styles.rowText, styles.rowTextCheckbox, isSelected && styles.rowTextActive]}
                  numberOfLines={1}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}

          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>—</Text>
            </View>
          )}
          <View style={{ height: 8 }} />
        </ScrollView>

        {/* Botão Aplicar — fixo no rodapé */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            onPress={apply}
            style={[styles.applyBtn, noneSelected && styles.applyBtnDisabled]}
          >
            <Text style={styles.applyText}>
              {applyLabel}{countLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '75%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginTop: 10,
    marginBottom: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line2,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  closeBtn: { padding: 4 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.line2,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter',
    color: colors.ink,
    padding: 0,
  },
  list: { flex: 1 },
  // ─── Linha "Todos" ──────────────────────────────────────────
  rowAll: {
    borderBottomWidth: 2,
    borderBottomColor: colors.line,
  },
  rowAllActive: {
    backgroundColor: colors.accentSoft,
  },
  rowTextAll: {
    fontWeight: '600',
    color: colors.accent,
  },
  // ─── Linhas de opção ────────────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line2,
  },
  rowSelected: {
    backgroundColor: '#fdf5f3',
  },
  rowText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter',
    color: colors.ink,
  },
  rowTextCheckbox: {
    // espaço já reservado pelo checkbox
  },
  rowTextActive: {
    fontWeight: '600',
    color: colors.accent,
  },
  empty: { padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 13, fontFamily: 'Inter', color: colors.ink4 },
  // ─── Rodapé Aplicar ─────────────────────────────────────────
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line2,
  },
  applyBtn: {
    backgroundColor: colors.ink,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyBtnDisabled: {
    backgroundColor: colors.ink5,
  },
  applyText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
    color: '#fff',
  },
});
