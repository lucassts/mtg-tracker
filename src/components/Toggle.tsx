import React from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface ToggleProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
}

export function Toggle({ value, onValueChange }: ToggleProps) {
  const anim = React.useRef(new Animated.Value(value ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 20] });
  const bgColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.ink5, colors.ink],
  });

  return (
    <Pressable onPress={() => onValueChange(!value)} style={styles.track}>
      <Animated.View style={[styles.track, { backgroundColor: bgColor, padding: 0 }]}>
        <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 26,
    borderRadius: 999,
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    top: 2,
  },
});
