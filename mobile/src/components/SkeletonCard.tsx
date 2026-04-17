import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";

export default function SkeletonCard() {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 750, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const GREY = theme.skeleton;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.divider }]}>
      <Animated.View style={[styles.badge, { opacity, backgroundColor: GREY }]} />
      <Animated.View style={[styles.titleFull, { opacity, backgroundColor: GREY }]} />
      <Animated.View style={[styles.titleShort, { opacity, backgroundColor: GREY }]} />
      <Animated.View style={[styles.org, { opacity, backgroundColor: GREY }]} />
      <View style={styles.metaRow}>
        <Animated.View style={[styles.chip, { opacity, backgroundColor: GREY }]} />
        <Animated.View style={[styles.chip, { opacity, backgroundColor: GREY, width: 80 }]} />
      </View>
      <View style={[styles.footer, { borderTopColor: theme.divider }]}>
        <Animated.View style={[styles.deadline, { opacity, backgroundColor: GREY }]} />
        <Animated.View style={[styles.star, { opacity, backgroundColor: GREY }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 6,
    borderWidth: 1,
    elevation: 1,
  },
  badge:      { height: 20, width: 52, borderRadius: 4, marginBottom: 10 },
  titleFull:  { height: 14, borderRadius: 4, marginBottom: 8 },
  titleShort: { height: 14, width: "65%", borderRadius: 4, marginBottom: 12 },
  org:        { height: 12, width: "50%", borderRadius: 4, marginBottom: 12 },
  metaRow:    { flexDirection: "row", gap: 8, marginBottom: 12 },
  chip:       { height: 20, width: 60, borderRadius: 4 },
  footer:     { flexDirection: "row", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1 },
  deadline:   { height: 12, width: 70, borderRadius: 4 },
  star:       { height: 18, width: 18, borderRadius: 9 },
});
