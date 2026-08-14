import React from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Icon } from '../components/Icon';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';
import { listPendingClaims, resolveClaim, PendingClaim } from '../services/social';

export function ClaimsScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const c = t.claims;

  const socialOn = useStore(s => s.settings.social.enabled);

  const [claims, setClaims] = React.useState<PendingClaim[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!socialOn) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setClaims(await listPendingClaims());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [socialOn]);

  React.useEffect(() => { void load(); }, [load]);

  const resolve = async (claim: PendingClaim, accept: boolean) => {
    setBusy(claim.id);
    setError(null);
    try {
      await resolveClaim(claim.id, accept);
      setClaims(prev => prev.filter(x => x.id !== claim.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable style={styles.backBtn} onPress={onBack}>
        <Icon name="back" size={16} stroke={colors.ink} />
        <Text style={styles.backText}>{c.back}</Text>
      </Pressable>

      <Text style={styles.pageTitle}>{c.title}</Text>
      <Text style={styles.intro}>{c.intro}</Text>

      {loading && <ActivityIndicator style={{ marginTop: 20 }} color={colors.ink3} />}

      {!loading && !socialOn && (
        <View style={styles.card}>
          <Text style={styles.emptyBody}>{c.socialOff}</Text>
        </View>
      )}

      {!loading && socialOn && claims.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.emptyTitle}>{c.empty}</Text>
          <Text style={styles.emptyBody}>{c.emptyBody}</Text>
        </View>
      )}

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {claims.map(claim => {
        const p = claim.payload;
        // O resultado vem do ponto de vista de quem registrou: se ele venceu,
        // quem está lendo perdeu. Mostrar cru inverteria o sentido.
        const iLost = p.won && !p.drew;
        return (
          <View key={claim.id} style={styles.claimCard}>
            <Text style={styles.claimWho}>
              {c.reportedBy(claim.reporterName || c.someone)}
            </Text>

            <View style={styles.resultRow}>
              <View style={[
                styles.resultTag,
                p.drew ? styles.resultDraw : iLost ? styles.resultLoss : styles.resultWin,
              ]}>
                <Text style={[
                  styles.resultText,
                  p.drew ? styles.resultTextDraw : iLost ? styles.resultTextLoss : styles.resultTextWin,
                ]}>
                  {p.drew ? c.youDrew : iLost ? c.youLost : c.youWon}
                </Text>
              </View>
              <Text style={styles.claimFormat}>{p.format}</Text>
            </View>

            <Text style={styles.claimDetail}>
              {c.decks(p.my_deck || '—', p.opp_deck || '—')}
            </Text>
            <Text style={styles.claimMeta}>
              {p.on_play ? c.theyPlayed : c.theyDrew} · {p.played_week}
            </Text>

            <View style={styles.claimActions}>
              <Pressable
                style={[styles.disputeBtn, busy === claim.id && styles.btnOff]}
                onPress={() => resolve(claim, false)}
                disabled={busy === claim.id}
              >
                <Text style={styles.disputeText}>{c.dispute}</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, busy === claim.id && styles.btnOff]}
                onPress={() => resolve(claim, true)}
                disabled={busy === claim.id}
              >
                {busy === claim.id
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.confirmText}>{c.confirm}</Text>}
              </Pressable>
            </View>
          </View>
        );
      })}

      {socialOn && !loading && (
        <Pressable style={styles.reload} onPress={load}>
          <Text style={styles.reloadText}>{c.reload}</Text>
        </Pressable>
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
  card: {
    borderRadius: 14, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surface, padding: 18, gap: 4, alignItems: 'center',
  },
  emptyTitle: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter', color: colors.ink2 },
  emptyBody: {
    fontSize: 12, fontFamily: 'Inter', color: colors.ink4,
    textAlign: 'center', lineHeight: 18,
  },

  claimCard: {
    borderRadius: 14, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surface, padding: 16, gap: 8,
  },
  claimWho: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter', color: colors.ink },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultTag: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  resultWin: { backgroundColor: colors.goodSoft },
  resultLoss: { backgroundColor: colors.badSoft },
  resultDraw: { backgroundColor: colors.bg2 },
  resultText: {
    fontSize: 10, fontFamily: 'JetBrainsMono', letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  resultTextWin: { color: colors.good },
  resultTextLoss: { color: colors.bad },
  resultTextDraw: { color: colors.ink3 },
  claimFormat: { fontSize: 12, fontFamily: 'Inter', color: colors.ink3 },
  claimDetail: { fontSize: 13, fontFamily: 'Inter', color: colors.ink2, lineHeight: 18 },
  claimMeta: { fontSize: 11, fontFamily: 'Inter', color: colors.ink4 },

  claimActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  disputeBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg,
  },
  disputeText: { fontSize: 13, fontFamily: 'Inter', fontWeight: '500', color: colors.ink2 },
  confirmBtn: {
    flex: 2, paddingVertical: 11, borderRadius: 8, alignItems: 'center',
    backgroundColor: colors.good,
  },
  confirmText: { fontSize: 13, fontFamily: 'Inter', fontWeight: '600', color: '#fff' },
  btnOff: { opacity: 0.5 },

  errorBox: {
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(192,66,42,0.4)',
    backgroundColor: colors.badSoft, padding: 12,
  },
  errorText: { fontSize: 12, fontFamily: 'Inter', color: colors.bad, lineHeight: 17 },

  reload: { alignItems: 'center', paddingVertical: 10 },
  reloadText: { fontSize: 12, fontFamily: 'Inter', color: colors.ink3 },
});
