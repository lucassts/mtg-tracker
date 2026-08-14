import React from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../theme/colors';
import { Icon } from '../components/Icon';
import { Toggle } from '../components/Toggle';
import { useStore } from '../store/useStore';
import { Opponent } from '../types';
import { useT } from '../i18n/useT';
import { SOCIAL_AVAILABLE } from '../services/supabase';
import {
  createInvite, enableSocial, disableSocial, redeemInvite, inviteStatus,
} from '../services/social';
import { inviteUrl } from '../services/linking';

export function OpponentsScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const o = t.opponents;

  const social = useStore(s => s.settings.social);
  const setSocial = useStore(s => s.setSocial);
  const opponents = useStore(s => s.opponents);
  const matches = useStore(s => s.matches);
  const addOpponent = useStore(s => s.addOpponent);
  const updateOpponent = useStore(s => s.updateOpponent);
  const deleteOpponent = useStore(s => s.deleteOpponent);

  const [nickname, setNickname] = React.useState('');
  const [displayName, setDisplayName] = React.useState(social.displayName);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showQr, setShowQr] = React.useState<string | null>(null);
  const [redeemCode, setRedeemCode] = React.useState('');

  /** Quantas partidas contra cada oponente, para ordenar por convivência. */
  const counts = React.useMemo(() => {
    const map = new Map<string, number>();
    matches.forEach(m => {
      if (m.opponentId) map.set(m.opponentId, (map.get(m.opponentId) ?? 0) + 1);
    });
    return map;
  }, [matches]);

  const sorted = React.useMemo(
    () => [...opponents].sort((a, b) =>
      (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0)
      || a.nickname.localeCompare(b.nickname)
    ),
    [opponents, counts]
  );

  /**
   * Convites em aberto: pergunta ao servidor se já foram aceitos.
   * Quem convidou não recebe aviso, porque o resgate acontece no aparelho do
   * outro — sem esta checagem o vínculo existiria no banco e o app nunca saberia.
   */
  React.useEffect(() => {
    if (!social.enabled) return;

    const pending = opponents.filter(x => x.linkState === 'invited' && x.inviteCode);
    if (pending.length === 0) return;

    let cancelled = false;
    void (async () => {
      for (const opponent of pending) {
        try {
          const status = await inviteStatus(opponent.inviteCode!);
          if (cancelled || !status.used || !status.playerId) continue;
          updateOpponent(opponent.id, {
            linkState: 'linked',
            playerId: status.playerId,
            remoteName: status.playerName,
            inviteCode: undefined,
          });
        } catch {
          // Convite expirado ou apagado: deixa como está e segue.
        }
      }
    })();

    return () => { cancelled = true; };
    // Só na montagem e ao ligar a conta: rodar a cada mudança de `opponents`
    // criaria um laço, já que o efeito escreve nessa mesma lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [social.enabled]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const toggleSocial = (on: boolean) => {
    if (!on) {
      void run('social', async () => {
        await disableSocial();
        setSocial({ enabled: false, playerId: undefined });
      });
      return;
    }
    void run('social', async () => {
      const name = displayName.trim() || o.defaultName;
      const player = await enableSocial(name);
      setSocial({ enabled: true, playerId: player.id, displayName: name });
      setDisplayName(name);
    });
  };

  const startInvite = (opponent: Opponent) =>
    run(opponent.id, async () => {
      const code = await createInvite();
      updateOpponent(opponent.id, { linkState: 'invited', inviteCode: code });
      setShowQr(code);
    });

  const doRedeem = () =>
    run('redeem', async () => {
      const player = await redeemInvite(redeemCode);
      const created = addOpponent(player.display_name || o.defaultOpponentName);
      if (created) {
        updateOpponent(created.id, {
          linkState: 'linked',
          playerId: player.id,
          remoteName: player.display_name,
        });
      }
      setRedeemCode('');
    });

  const confirmDelete = (opponent: Opponent) => {
    Alert.alert(o.deleteTitle, o.deleteBody(opponent.nickname), [
      { text: o.cancel, style: 'cancel' },
      { text: o.delete, style: 'destructive', onPress: () => deleteOpponent(opponent.id) },
    ]);
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable style={styles.backBtn} onPress={onBack}>
        <Icon name="back" size={16} stroke={colors.ink} />
        <Text style={styles.backText}>{o.back}</Text>
      </Pressable>

      <Text style={styles.pageTitle}>{o.title}</Text>
      <Text style={styles.intro}>{o.intro}</Text>

      {/* Adicionar oponente local — funciona sem conta */}
      <View style={styles.card}>
        <View style={styles.rowCol}>
          <Text style={styles.fieldLabel}>{o.newOpponent}</Text>
          <View style={styles.inlineRow}>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder={o.newOpponentPlaceholder}
              placeholderTextColor={colors.ink4}
              style={styles.input}
              maxLength={40}
              onSubmitEditing={() => { addOpponent(nickname); setNickname(''); }}
              returnKeyType="done"
            />
            <Pressable
              onPress={() => { addOpponent(nickname); setNickname(''); }}
              disabled={!nickname.trim()}
              style={[styles.primaryBtn, !nickname.trim() && styles.btnOff]}
            >
              <Icon name="plus" size={14} stroke="#fff" />
              <Text style={styles.primaryBtnText}>{o.add}</Text>
            </Pressable>
          </View>
          <Text style={styles.fieldHint}>{o.newOpponentHint}</Text>
        </View>
      </View>

      {/* Conta — só necessária para vincular e confirmar */}
      <View>
        <Text style={styles.sectionLabel}>{o.accountLabel}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Icon name="users" size={18} stroke={colors.ink3} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{o.accountTitle}</Text>
              <Text style={styles.rowSub}>{o.accountSub}</Text>
            </View>
            {busy === 'social' ? (
              <ActivityIndicator color={colors.ink3} />
            ) : (
              <Toggle
                value={social.enabled}
                onValueChange={toggleSocial}
                disabled={!SOCIAL_AVAILABLE}
              />
            )}
          </View>

          {!SOCIAL_AVAILABLE && (
            <>
              <View style={styles.divider} />
              <View style={styles.rowCol}>
                <Text style={styles.warnText}>{o.notConfigured}</Text>
              </View>
            </>
          )}

          {social.enabled && (
            <>
              <View style={styles.divider} />
              <View style={styles.rowCol}>
                <Text style={styles.fieldLabel}>{o.displayName}</Text>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  onBlur={() => {
                    const name = displayName.trim();
                    if (name && name !== social.displayName) {
                      void run('name', async () => {
                        await enableSocial(name);
                        setSocial({ displayName: name });
                      });
                    }
                  }}
                  placeholder={o.displayNamePlaceholder}
                  placeholderTextColor={colors.ink4}
                  style={styles.input}
                  maxLength={40}
                />
                <Text style={styles.fieldHint}>{o.displayNameHint}</Text>
              </View>

              <View style={styles.divider} />
              <View style={styles.rowCol}>
                <Text style={styles.fieldLabel}>{o.redeemLabel}</Text>
                <View style={styles.inlineRow}>
                  <TextInput
                    value={redeemCode}
                    onChangeText={setRedeemCode}
                    placeholder={o.redeemPlaceholder}
                    placeholderTextColor={colors.ink4}
                    autoCapitalize="characters"
                    style={[styles.input, styles.codeInput]}
                    maxLength={16}
                  />
                  <Pressable
                    onPress={doRedeem}
                    disabled={!redeemCode.trim() || busy === 'redeem'}
                    style={[styles.primaryBtn, !redeemCode.trim() && styles.btnOff]}
                  >
                    {busy === 'redeem'
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.primaryBtnText}>{o.redeem}</Text>}
                  </Pressable>
                </View>
                <Text style={styles.fieldHint}>{o.redeemHint}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Lista */}
      <View>
        <Text style={styles.sectionLabel}>{o.listLabel}</Text>

        {sorted.length === 0 && (
          <View style={styles.card}>
            <View style={[styles.rowCol, { alignItems: 'center', gap: 4 }]}>
              <Text style={styles.emptyTitle}>{o.empty}</Text>
              <Text style={styles.emptyBody}>{o.emptyBody}</Text>
            </View>
          </View>
        )}

        {sorted.map(opponent => (
          <View key={opponent.id} style={styles.opponentCard}>
            <View style={styles.opponentHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.opponentName}>{opponent.nickname}</Text>
                <Text style={styles.opponentMeta}>
                  {o.matchCount(counts.get(opponent.id) ?? 0)}
                  {opponent.linkState === 'linked' && opponent.remoteName
                    ? ` · ${o.linkedAs(opponent.remoteName)}`
                    : ''}
                </Text>
              </View>

              <View style={[
                styles.tag,
                opponent.linkState === 'linked' && styles.tagLinked,
                opponent.linkState === 'invited' && styles.tagInvited,
              ]}>
                <Text style={[
                  styles.tagText,
                  opponent.linkState === 'linked' && styles.tagTextLinked,
                  opponent.linkState === 'invited' && styles.tagTextInvited,
                ]}>
                  {o.state[opponent.linkState]}
                </Text>
              </View>
            </View>

            <View style={styles.opponentActions}>
              {social.enabled && opponent.linkState !== 'linked' && (
                <Pressable onPress={() => startInvite(opponent)} hitSlop={8}>
                  {busy === opponent.id
                    ? <ActivityIndicator size="small" color={colors.accent} />
                    : (
                      <Text style={styles.linkAction}>
                        {opponent.linkState === 'invited' ? o.showInvite : o.invite}
                      </Text>
                    )}
                </Pressable>
              )}
              {opponent.linkState === 'invited' && opponent.inviteCode && (
                <Pressable onPress={() => setShowQr(opponent.inviteCode!)} hitSlop={8}>
                  <Text style={styles.linkAction}>{o.showQr}</Text>
                </Pressable>
              )}
              <Pressable onPress={() => confirmDelete(opponent)} hitSlop={8}>
                <Text style={[styles.linkAction, { color: colors.bad }]}>{o.delete}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      {/* Convite aberto */}
      {showQr && (
        <View style={styles.qrCard}>
          <Text style={styles.qrTitle}>{o.qrTitle}</Text>
          <Text style={styles.qrBody}>{o.qrBody}</Text>
          <View style={styles.qrBox}>
            <QRCode value={inviteUrl(showQr)} size={168} backgroundColor="#fff" />
          </View>
          <Text style={styles.qrCode}>{showQr}</Text>
          <View style={styles.qrActions}>
            <Pressable
              onPress={() => { void Clipboard.setStringAsync(inviteUrl(showQr)); }}
              style={styles.ghostBtn}
            >
              <Text style={styles.ghostBtnText}>{o.copyLink}</Text>
            </Pressable>
            <Pressable onPress={() => setShowQr(null)} style={styles.ghostBtn}>
              <Text style={styles.ghostBtnText}>{o.close}</Text>
            </Pressable>
          </View>
          <Text style={styles.qrExpiry}>{o.qrExpiry}</Text>
        </View>
      )}

      <View style={{ height: 28 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 14 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  backText: { fontSize: 13, fontFamily: 'Inter', fontWeight: '500', color: colors.ink },
  pageTitle: {
    fontSize: 26, fontWeight: '700', fontFamily: 'Inter',
    color: colors.ink, letterSpacing: -0.5,
  },
  intro: {
    fontSize: 12, fontFamily: 'Inter', color: colors.ink3,
    lineHeight: 18, marginTop: -6,
  },
  sectionLabel: {
    fontSize: 9.5, fontFamily: 'JetBrainsMono', letterSpacing: 0.6,
    textTransform: 'uppercase', color: colors.ink3,
    paddingHorizontal: 8, paddingBottom: 6,
  },
  card: {
    borderRadius: 14, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surface, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  rowCol: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  inlineRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  divider: { height: 1, backgroundColor: colors.line2 },
  rowTitle: { fontSize: 13, fontWeight: '500', fontFamily: 'Inter', color: colors.ink },
  rowSub: { fontSize: 11, fontFamily: 'Inter', color: colors.ink3, marginTop: 2, lineHeight: 16 },
  fieldLabel: {
    fontSize: 9.5, fontFamily: 'JetBrainsMono', letterSpacing: 0.6,
    textTransform: 'uppercase', color: colors.ink3,
  },
  fieldHint: { fontSize: 11, fontFamily: 'Inter', color: colors.ink4, lineHeight: 16 },
  warnText: { fontSize: 12, fontFamily: 'Inter', color: colors.ink3, lineHeight: 17 },
  input: {
    flex: 1, fontSize: 14, fontFamily: 'Inter', color: colors.ink,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.line, borderRadius: 8,
    backgroundColor: colors.bg,
  },
  codeInput: { fontFamily: 'JetBrainsMono', letterSpacing: 1 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 8, backgroundColor: colors.accent,
  },
  primaryBtnText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter', color: '#fff' },
  btnOff: { opacity: 0.4 },

  errorBox: {
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(192,66,42,0.4)',
    backgroundColor: colors.badSoft, padding: 12,
  },
  errorText: { fontSize: 12, fontFamily: 'Inter', color: colors.bad, lineHeight: 17 },

  opponentCard: {
    borderRadius: 14, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surface, padding: 14, gap: 10, marginBottom: 8,
  },
  opponentHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  opponentName: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter', color: colors.ink },
  opponentMeta: { fontSize: 11, fontFamily: 'Inter', color: colors.ink3, marginTop: 3 },
  opponentActions: { flexDirection: 'row', gap: 16 },
  linkAction: { fontSize: 12, fontFamily: 'Inter', fontWeight: '600', color: colors.accent },

  tag: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    backgroundColor: colors.bg2,
  },
  tagInvited: { backgroundColor: colors.accentSoft },
  tagLinked: { backgroundColor: colors.goodSoft },
  tagText: {
    fontSize: 9, fontFamily: 'JetBrainsMono', letterSpacing: 0.5,
    textTransform: 'uppercase', color: colors.ink3,
  },
  tagTextInvited: { color: colors.accent },
  tagTextLinked: { color: colors.good },

  emptyTitle: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter', color: colors.ink2 },
  emptyBody: {
    fontSize: 12, fontFamily: 'Inter', color: colors.ink4,
    textAlign: 'center', lineHeight: 18,
  },

  qrCard: {
    borderRadius: 16, borderWidth: 1.5, borderColor: colors.accent,
    backgroundColor: colors.surface, padding: 18, alignItems: 'center', gap: 10,
  },
  qrTitle: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter', color: colors.ink },
  qrBody: {
    fontSize: 12, fontFamily: 'Inter', color: colors.ink3,
    textAlign: 'center', lineHeight: 17,
  },
  qrBox: { padding: 12, backgroundColor: '#fff', borderRadius: 12 },
  qrCode: {
    fontSize: 16, fontFamily: 'JetBrainsMono', letterSpacing: 2,
    color: colors.ink, marginTop: 2,
  },
  qrActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  ghostBtn: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg,
  },
  ghostBtnText: { fontSize: 12, fontFamily: 'Inter', fontWeight: '500', color: colors.ink2 },
  qrExpiry: { fontSize: 10, fontFamily: 'Inter', color: colors.ink4 },
});
