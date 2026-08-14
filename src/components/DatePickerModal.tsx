import React from 'react';
import {
  View, Text, Pressable, Modal, StyleSheet,
} from 'react-native';
import { colors } from '../theme/colors';
import { Icon } from './Icon';
import { useT } from '../i18n/useT';

interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
}

export function DatePickerModal({ visible, value, onChange, onClose }: DatePickerModalProps) {
  const t = useT();
  const dp = t.datePicker;
  const MONTHS = dp.months;
  const WEEKDAYS = dp.weekdays;

  const [cursor, setCursor] = React.useState(() => new Date(value));

  React.useEffect(() => {
    if (visible) setCursor(new Date(value));
  }, [visible]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const prevMonth = () => {
    const d = new Date(cursor);
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    setCursor(d);
  };

  const nextMonth = () => {
    const d = new Date(cursor);
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    setCursor(d);
  };

  const selectDay = (day: number) => {
    const selected = new Date(year, month, day,
      value.getHours(), value.getMinutes(), value.getSeconds());
    onChange(selected);
    onClose();
  };

  // Build calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
  const isSelected = (d: number) =>
    value.getFullYear() === year && value.getMonth() === month && value.getDate() === d;
  const isFuture = (d: number) => new Date(year, month, d) > today;

  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={prevMonth} style={styles.navBtn} hitSlop={12}>
              <Icon name="back" size={18} stroke={colors.ink} />
            </Pressable>
            <Text style={styles.monthYear}>{MONTHS[month]} {year}</Text>
            <Pressable onPress={nextMonth} style={styles.navBtn} hitSlop={12}>
              <Icon name="chev" size={18} stroke={colors.ink} />
            </Pressable>
          </View>

          {/* Weekday labels */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((d, i) => (
              <Text key={i} style={styles.weekLabel}>{d}</Text>
            ))}
          </View>

          {/* Days grid */}
          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={i} style={styles.cell} />;
              const selected = isSelected(day);
              const todayCell = isToday(day);
              const future = isFuture(day);
              return (
                <Pressable
                  key={i}
                  onPress={() => !future && selectDay(day)}
                  style={[
                    styles.cell,
                    selected && styles.cellSelected,
                    todayCell && !selected && styles.cellToday,
                  ]}
                >
                  <Text style={[
                    styles.dayText,
                    selected && styles.dayTextSelected,
                    future && styles.dayTextFuture,
                    todayCell && !selected && styles.dayTextToday,
                  ]}>
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>{dp.cancel}</Text>
            </Pressable>
            <Pressable
              style={styles.todayBtn}
              onPress={() => { selectDay(today.getDate()); setCursor(new Date(today)); }}
            >
              <Text style={styles.todayText}>{dp.today}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  navBtn: {
    padding: 6,
  },
  monthYear: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontFamily: 'JetBrainsMono',
    color: colors.ink4,
    letterSpacing: 0.5,
    paddingVertical: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  cellSelected: {
    backgroundColor: colors.ink,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  dayText: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: colors.ink,
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dayTextFuture: {
    color: colors.ink5,
  },
  dayTextToday: {
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: colors.ink3,
  },
  todayBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.ink,
    alignItems: 'center',
  },
  todayText: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: '#fff',
  },
});
