import React from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, TextInput, Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useAudioRecorder, RecordingPresets,
  requestRecordingPermissionsAsync, setAudioModeAsync,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { Waveform } from '../components/Waveform';
import { Badge } from '../components/Badge';
import { Icon } from '../components/Icon';
import { MatchForm } from '../components/MatchForm';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';
import { extractMatch, getLlamaContext, getModelSize, MODEL_LABEL } from '../services/llamaExtractor';
import { ModelDownloadScreen } from './ModelDownloadScreen';

type State = 'idle' | 'recording' | 'processing';
/** absent = ainda não baixado · loading = inicializando o contexto · ready = pronto */
type ModelState = 'checking' | 'absent' | 'loading' | 'ready';

function PulseRing({ delay }: { delay: number }) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.3, duration: 1600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 1600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.55, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    opacity.setValue(0.55);
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={[
      styles.pulseRing,
      { transform: [{ scale }], opacity },
    ]} />
  );
}

function ProcessingSpinner() {
  const rotation = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 900, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />
  );
}

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const h = t.home;
  const navigation = useNavigation<any>();
  const settings = useStore(s => s.settings);
  const recentDecks = useStore(s => s.getRecentDecks());
  const addMatch = useStore(s => s.addMatch);
  const setPendingReview = useStore(s => s.setPendingReview);

  const [state, setState] = React.useState<State>('idle');
  const [overlay, setOverlay] = React.useState<null | 'type' | 'form'>(null);
  const [typeText, setTypeText] = React.useState('');
  const [elapsed, setElapsed] = React.useState(0);
  const [modelState, setModelState] = React.useState<ModelState>('checking');
  const [showDownload, setShowDownload] = React.useState(false);
  const modelReady = modelState === 'ready';

  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = React.useRef(0);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  /** Se o mic falhar, o fluxo segue sem áudio em vez de travar a tela. */
  const capturingRef = React.useRef(false);
  const bgAnim = React.useRef(new Animated.Value(0)).current;

  /**
   * Carrega o modelo em background. Se ele ainda não foi baixado, o app segue
   * utilizável: só as entradas por voz e por texto ficam atrás do download.
   */
  const prepareModel = React.useCallback(async () => {
    const size = await getModelSize();
    if (size < 100_000_000) {
      setModelState('absent');
      return;
    }
    setModelState('loading');
    try {
      await getLlamaContext();
      setModelState('ready');
    } catch (e) {
      console.warn('[HomeScreen] modelo não carregado:', e);
      setModelState('absent');
    }
  }, []);

  React.useEffect(() => { void prepareModel(); }, [prepareModel]);

  /** Retorna true quando o fluxo pode seguir; senão abre a tela de download. */
  const requireModel = () => {
    if (modelState === 'absent') {
      setShowDownload(true);
      return false;
    }
    return true;
  };

  const fmt = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    if (state !== 'idle' || overlay) return;
    if (!requireModel()) return;
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (granted) {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
        capturingRef.current = true;
      }
    } catch (e) {
      // Sem microfone ou permissão negada: segue sem áudio.
      capturingRef.current = false;
      console.warn('[HomeScreen] gravação indisponível:', e);
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState('recording');
    Animated.timing(bgAnim, { toValue: 1, duration: 350, useNativeDriver: false }).start();
    startRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000);
    }, 100);
  };

  const stopRecording = async () => {
    if (state !== 'recording') return;
    if (timerRef.current) clearInterval(timerRef.current);

    const stopCapture = async (): Promise<string | undefined> => {
      if (!capturingRef.current) return undefined;
      capturingRef.current = false;
      try {
        await recorder.stop();
        return recorder.uri ?? undefined;
      } catch (e) {
        console.warn('[HomeScreen] falha ao encerrar gravação:', e);
        return undefined;
      }
    };

    // Toque acidental: descarta sem processar.
    if (elapsed < 1.2) {
      await stopCapture();
      Animated.timing(bgAnim, { toValue: 0, duration: 350, useNativeDriver: false }).start();
      setState('idle');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState('processing');

    const audioUri = await stopCapture();

    // TODO: quando whisper.rn estiver integrado, transcrever audioUri aqui.
    // Por ora usamos um placeholder para manter o fluxo funcionando.
    const transcript = audioUri
      ? `[Áudio de ${fmt(elapsed)} — transcrição pendente (whisper.rn)]`
      : `Gravação de ${fmt(elapsed)} analisada.`;

    try {
      const extracted = await extractMatch(transcript);
      Animated.timing(bgAnim, { toValue: 0, duration: 350, useNativeDriver: false }).start();
      setState('idle');
      setPendingReview({
        transcript,
        duration: elapsed,
        confidence: {
          format:    extracted.format    ? 'high' : 'missing',
          myDeck:    extracted.myDeck    ? 'high' : 'missing',
          oppDeck:   extracted.oppDeck   ? 'high' : 'missing',
          archetype: extracted.archetype ? 'high' : 'missing',
          onPlay:    extracted.onPlay != null ? 'high' : 'missing',
        },
        extracted: {
          format:    settings.defaultFormat,
          myDeck:    settings.defaultDeck || '',
          onPlay:    false,
          won:       false,
          notes:     '',
          ...extracted,
        },
      });
      navigation.navigate('Review');
    } catch (err) {
      console.error('[HomeScreen] extractMatch error:', err);
      Animated.timing(bgAnim, { toValue: 0, duration: 350, useNativeDriver: false }).start();
      setState('idle');
    }
  };

  const handleTypeSubmit = async () => {
    if (!typeText.trim()) return;
    const text = typeText.trim();
    setOverlay(null);
    setTypeText('');
    setState('processing');
    Animated.timing(bgAnim, { toValue: 1, duration: 350, useNativeDriver: false }).start();

    try {
      const extracted = await extractMatch(text);
      setPendingReview({
        transcript: text,
        duration: 0,
        confidence: {
          format:    extracted.format    ? 'high' : 'missing',
          myDeck:    extracted.myDeck    ? 'high' : 'missing',
          oppDeck:   extracted.oppDeck   ? 'high' : 'missing',
          archetype: extracted.archetype ? 'high' : 'missing',
          onPlay:    extracted.onPlay != null ? 'high' : 'missing',
        },
        extracted: {
          format:    settings.defaultFormat,
          myDeck:    settings.defaultDeck || '',
          onPlay:    false,
          won:       false,
          notes:     '',
          ...extracted,
        },
      });
      navigation.navigate('Review');
    } catch (err) {
      console.error('[HomeScreen] extractMatch error:', err);
    } finally {
      Animated.timing(bgAnim, { toValue: 0, duration: 350, useNativeDriver: false }).start();
      setState('idle');
    }
  };

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';
  const isDark = isRecording || isProcessing;

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.bg, colors.dark],
  });

  const timerColor = isDark ? (isProcessing ? '#b5b29f' : '#fff') : colors.ink5;

  return (
    <Animated.View style={[styles.page, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={[styles.headerLabel, { color: isDark ? '#8a887a' : colors.ink3 }]}>
            {isRecording ? h.recording : isProcessing ? h.processing : h.idle}
          </Text>
          {!isDark && (
            <Text style={styles.headerSub}>
              {h.default}: <Text style={styles.headerBold}>{settings.defaultFormat}</Text>
              {settings.defaultDeck
                ? <> · <Text style={styles.headerBold}>{settings.defaultDeck}</Text></>
                : null}
            </Text>
          )}
        </View>
        <Badge
          label={
            modelReady ? h.badgeReady
            : modelState === 'absent' ? h.badgeAbsent
            : h.badgeLoading
          }
          dotColor={isRecording ? colors.accent : modelReady ? colors.good : colors.ink4}
          style={{
            backgroundColor: isDark ? colors.dark2 : colors.surface,
            borderColor: isDark ? colors.dark3 : colors.line,
          }}
        />
      </View>

      {/* Center cluster */}
      <View style={styles.center}>
        <Text style={[styles.timer, { color: timerColor }]}>{fmt(elapsed)}</Text>
        <Waveform active={isRecording} />
        {!isDark && (
          <Text style={styles.hint}>{h.holdMic}</Text>
        )}
        {isRecording && (
          <Text style={styles.hint2}>{h.release}</Text>
        )}
        {isProcessing && (
          <>
            <ProcessingSpinner />
            <Text style={styles.hint2}>
              {h.extracting}{'\n'}
              <Text style={styles.modelLabel}>{MODEL_LABEL} · {Math.floor(elapsed * 10) / 10}s</Text>
            </Text>
          </>
        )}
      </View>

      <View style={{ flex: 1 }} />

      {/* Action row */}
      <View style={styles.actionRow}>
        <Pressable
          style={[styles.iconBtn, isDark && styles.iconBtnDark, { opacity: isRecording ? 0.3 : 1 }]}
          onPress={() => { if (!isRecording && requireModel()) setOverlay('type'); }}
          disabled={isRecording || isProcessing}
        >
          <Icon name="keyboard" size={22} stroke={isDark ? '#fff' : colors.ink} />
        </Pressable>

        <View style={styles.micWrap}>
          {isRecording && (
            <>
              <PulseRing delay={0} />
              <PulseRing delay={800} />
            </>
          )}
          <Pressable
            style={[
              styles.micBtn,
              isRecording && styles.micBtnActive,
              isProcessing && styles.micBtnProcessing,
            ]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
            disabled={isProcessing}
          >
            <Icon
              name="mic"
              size={52}
              stroke={isRecording ? '#fff' : colors.ink}
              strokeWidth={isRecording ? 2.2 : 1.8}
            />
          </Pressable>
        </View>

        <Pressable
          style={[styles.iconBtn, isDark && styles.iconBtnDark, { opacity: isRecording ? 0.3 : 1 }]}
          onPress={() => !isRecording && setOverlay('form')}
          disabled={isRecording || isProcessing}
        >
          <Icon name="form" size={22} stroke={isDark ? '#fff' : colors.ink} />
        </Pressable>
      </View>

      <Text style={[styles.hint3, { color: isDark ? '#6b685c' : colors.ink3 }]}>
        {isRecording ? h.releaseHint.toUpperCase()
          : isProcessing ? h.waitHint.toUpperCase()
          : `${h.typeLabel}  ·  ${h.micLabel}  ·  ${h.formLabel}`.toUpperCase()}
      </Text>

      {/* Type overlay */}
      <Modal visible={overlay === 'type'} transparent animationType="fade">
        <View style={styles.overlayBg}>
          <View style={styles.overlayCard}>
            <View style={styles.overlayHeader}>
              <Text style={styles.overlayTitle}>{h.typeTitle}</Text>
              <Pressable onPress={() => { setOverlay(null); setTypeText(''); }}>
                <Icon name="x" size={20} stroke={colors.ink3} />
              </Pressable>
            </View>
            <Text style={styles.overlayBody}>{h.typeBody}</Text>
            <TextInput
              autoFocus
              multiline
              value={typeText}
              onChangeText={setTypeText}
              placeholder={h.typePlaceholder}
              placeholderTextColor={colors.ink4}
              style={styles.textarea}
            />
            <Badge label={h.processedOnDevice} style={{ marginVertical: 8 }} />
            <View style={styles.overlayActions}>
              <Pressable style={styles.btnCancel} onPress={() => { setOverlay(null); setTypeText(''); }}>
                <Text style={styles.btnCancelText}>{h.cancel}</Text>
              </Pressable>
              <Pressable
                style={[styles.btnPrimary, { opacity: typeText.trim() ? 1 : 0.5 }]}
                onPress={handleTypeSubmit}
                disabled={!typeText.trim()}
              >
                <Icon name="check" size={16} stroke="#fff" />
                <Text style={styles.btnPrimaryText}>{h.process}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Download do modelo — só aparece quando voz ou texto é acionado sem ele */}
      <Modal visible={showDownload} animationType="slide" onRequestClose={() => setShowDownload(false)}>
        <ModelDownloadScreen
          onCancel={() => setShowDownload(false)}
          onReady={() => {
            setShowDownload(false);
            void prepareModel();
          }}
        />
      </Modal>

      {/* Form overlay */}
      <Modal visible={overlay === 'form'} transparent animationType="slide">
        <View style={[styles.overlayFull, { backgroundColor: colors.bg }]}>
          <View style={styles.formHeader}>
            <Text style={styles.sectionLabel}>{h.manualEntry}</Text>
            <Pressable onPress={() => setOverlay(null)}>
              <Icon name="x" size={20} stroke={colors.ink3} />
            </Pressable>
          </View>
          <View style={{ flex: 1, paddingHorizontal: 20 }}>
            <MatchForm
              initial={{ format: settings.defaultFormat, myDeck: settings.defaultDeck || '' }}
              settings={settings}
              recentDecks={recentDecks}
              onSave={(match) => {
                addMatch({
                  format: settings.defaultFormat,
                  myDeck: '',
                  oppDeck: '',
                  archetype: 'Midrange',
                  onPlay: false,
                  won: true,
                  notes: '',
                  ...match,
                } as any);
                setOverlay(null);
              }}
              onCancel={() => setOverlay(null)}
            />
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLabel: {
    fontSize: 9.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerSub: { fontSize: 12, color: colors.ink3, marginTop: 2 },
  headerBold: { color: colors.ink, fontWeight: '600' },
  center: {
    paddingTop: 24,
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 20,
  },
  timer: { fontSize: 42, fontWeight: '600', letterSpacing: 3 },
  hint: { fontSize: 14, color: colors.ink2, textAlign: 'center', maxWidth: 280, lineHeight: 22 },
  hint2: { fontSize: 14, color: '#b5b29f', textAlign: 'center', maxWidth: 280, lineHeight: 22 },
  modelLabel: { fontSize: 10, color: '#6b685c' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  micWrap: {
    width: 168,
    height: 168,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  micBtn: {
    width: 168,
    height: 168,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.ink,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 2,
  },
  micBtnActive: {
    backgroundColor: colors.accent,
    borderWidth: 0,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
  },
  micBtnProcessing: {
    backgroundColor: colors.dark3,
    borderWidth: 0,
    opacity: 0.5,
  },
  iconBtn: {
    width: 52, height: 52, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  iconBtnDark: {
    borderColor: colors.dark3,
    backgroundColor: colors.dark2,
  },
  hint3: {
    textAlign: 'center',
    fontSize: 10,
    letterSpacing: 0.8,
    paddingBottom: 20,
  },
  spinner: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: colors.accent,
  },
  overlayBg: {
    flex: 1,
    backgroundColor: 'rgba(247,246,242,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  overlayCard: {
    width: '100%', maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 16, padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 24, elevation: 8,
  },
  overlayHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  overlayTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
  overlayBody: { fontSize: 12, color: colors.ink3, lineHeight: 18, marginBottom: 12 },
  textarea: {
    fontSize: 13, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1.5, borderColor: colors.line, borderRadius: 10,
    backgroundColor: colors.surface, color: colors.ink,
    height: 110, textAlignVertical: 'top',
  },
  overlayActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnCancel: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: colors.line, alignItems: 'center',
  },
  btnCancelText: { fontSize: 14, fontWeight: '500', color: colors.ink2 },
  btnPrimary: {
    flex: 2, flexDirection: 'row', paddingVertical: 12,
    borderRadius: 10, backgroundColor: colors.ink,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnPrimaryText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  overlayFull: { flex: 1, paddingTop: 60 },
  formHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14,
  },
  sectionLabel: {
    fontSize: 9.5, letterSpacing: 0.8,
    textTransform: 'uppercase', color: colors.ink3,
  },
});
