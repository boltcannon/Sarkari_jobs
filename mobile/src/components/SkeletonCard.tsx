import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

export default function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 750, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop(); // stop loop when card unmounts
  }, []);

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.badge, { opacity }]} />
      <Animated.View style={[styles.titleFull, { opacity }]} />
      <Animated.View style={[styles.titleShort, { opacity }]} />
      <Animated.View style={[styles.org, { opacity }]} />
      <View style={styles.metaRow}>
        <Animated.View style={[styles.chip, { opacity }]} />
        <Animated.View style={[styles.chip, { opacity, width: 80 }]} />
      </View>
      <View style={styles.footer}>
        <Animated.View style={[styles.deadline, { opacity }]} />
        <Animated.View style={[styles.star, { opacity }]} />
      </View>
    </View>
  );
}

const GREY = "#E8E8E8";

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    elevation: 1,
  },
  badge: { height: 20, width: 52, borderRadius: 4, backgroundColor: GREY, marginBottom: 10 },
  titleFull: { height: 14, borderRadius: 4, backgroundColor: GREY, marginBottom: 8 },
  titleShort: { height: 14, width: "65%", borderRadius: 4, backgroundColor: GREY, marginBottom: 12 },
  org: { height: 12, width: "50%", borderRadius: 4, backgroundColor: GREY, marginBottom: 12 },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  chip: { height: 20, width: 60, borderRadius: 4, backgroundColor: GREY },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  deadline: { height: 12, width: 70, borderRadius: 4, backgroundColor: GREY },
  star: { height: 18, width: 18, borderRadius: 9, backgroundColor: GREY },
});
