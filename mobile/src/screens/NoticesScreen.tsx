import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, FlatList, Linking, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { jobsApi, Job } from "../api/client";
import { useTheme } from "../theme/ThemeContext";
import { deadlineMeta } from "../components/JobCard";

// ── Community data ────────────────────────────────────────────────────────────
const COMMUNITY = [
  {
    category: "All Exams",
    color: "#185FA5",
    icon: "🏛️",
    channels: [
      { name: "Sarkari Naukri Alert",  platform: "Telegram", url: "https://t.me/sarkarinaukrialert",    members: "2.1L+" },
      { name: "Govt Jobs India",        platform: "Telegram", url: "https://t.me/govtjobsindia2024",     members: "1.8L+" },
    ],
  },
  {
    category: "SSC",
    color: "#1565C0",
    icon: "📘",
    channels: [
      { name: "SSC CGL / CHSL Hub",    platform: "Telegram", url: "https://t.me/ssccglchsl",            members: "3.4L+" },
      { name: "SSC Exam Updates",       platform: "Telegram", url: "https://t.me/sscexamupdates",        members: "1.2L+" },
      { name: "SSC Adda247",            platform: "YouTube",  url: "https://youtube.com/@adda247ssc",    members: "2M+"   },
    ],
  },
  {
    category: "UPSC",
    color: "#6A1B9A",
    icon: "🎓",
    channels: [
      { name: "UPSC CSE Aspirants",     platform: "Telegram", url: "https://t.me/upsccse",               members: "5L+"   },
      { name: "StudyIQ IAS",            platform: "YouTube",  url: "https://youtube.com/@StudyIQ",        members: "20M+"  },
      { name: "Drishti IAS",            platform: "YouTube",  url: "https://youtube.com/@DrishtiIAS",     members: "15M+"  },
    ],
  },
  {
    category: "Railway",
    color: "#1B5E20",
    icon: "🚂",
    channels: [
      { name: "RRB NTPC / Group D",     platform: "Telegram", url: "https://t.me/rrbntpc2024",           members: "4.2L+" },
      { name: "Railway Bharti Alert",   platform: "Telegram", url: "https://t.me/railwaybharti",         members: "1.5L+" },
    ],
  },
  {
    category: "Banking",
    color: "#2E7D32",
    icon: "🏦",
    channels: [
      { name: "IBPS / SBI PO Prep",     platform: "Telegram", url: "https://t.me/ibpspoclerk",           members: "2.8L+" },
      { name: "Bankers Adda",           platform: "YouTube",  url: "https://youtube.com/@BankersAdda247", members: "5M+"   },
    ],
  },
  {
    category: "Defence",
    color: "#4E342E",
    icon: "🪖",
    channels: [
      { name: "NDA / CDS Aspirants",    platform: "Telegram", url: "https://t.me/ndacdsprep",            members: "1.1L+" },
      { name: "Agniveer Updates",        platform: "Telegram", url: "https://t.me/agniveeralert",         members: "3.5L+" },
    ],
  },
];

type NoticeTab = "admit_card" | "result" | "community";

const TABS: { key: NoticeTab; label: string; icon: string }[] = [
  { key: "admit_card", label: "Admit Cards", icon: "🎫" },
  { key: "result",     label: "Results",     icon: "🏆" },
  { key: "community",  label: "Community",   icon: "💬" },
];

// ── Notice card ───────────────────────────────────────────────────────────────
function NoticeCard({ item, theme, tab }: { item: Job; theme: any; tab: NoticeTab }) {
  const { label, color } = deadlineMeta(item.last_date);
  const accentColor = tab === "admit_card" ? "#1565C0" : "#2E7D32";

  const handlePress = () => {
    const url = item.apply_link || item.source_url;
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    <TouchableOpacity
      style={[styles.noticeCard, { backgroundColor: theme.card, borderColor: theme.border,
        borderLeftColor: accentColor, borderLeftWidth: 3 }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={[styles.noticeBadge, { backgroundColor: accentColor + "18" }]}>
        <Text style={[styles.noticeBadgeText, { color: accentColor }]}>
          {tab === "admit_card" ? "🎫 Admit Card" : "🏆 Result"}
        </Text>
      </View>
      <Text style={[styles.noticeTitle, { color: theme.text }]} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={[styles.noticeOrg, { color: theme.subtext }]} numberOfLines={1}>
        {item.organisation}
      </Text>
      <View style={styles.noticeFooter}>
        {label ? <Text style={[styles.noticeDate, { color }]}>{label}</Text> : <View />}
        <View style={[styles.openBtn, { backgroundColor: accentColor }]}>
          <Text style={styles.openBtnText}>Open ↗</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Community card ────────────────────────────────────────────────────────────
function CommunitySection({ section, theme }: { section: typeof COMMUNITY[0]; theme: any }) {
  return (
    <View style={styles.communitySection}>
      <View style={styles.communitySectionHeader}>
        <Text style={styles.communitySectionIcon}>{section.icon}</Text>
        <Text style={[styles.communitySectionTitle, { color: theme.text }]}>
          {section.category}
        </Text>
      </View>
      {section.channels.map((ch, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.channelCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => Linking.openURL(ch.url).catch(() => {})}
          activeOpacity={0.8}
        >
          <View style={[styles.platformBadge,
            { backgroundColor: ch.platform === "Telegram" ? "#229ED9" + "20" : "#FF0000" + "15" }]}>
            <Text style={styles.platformIcon}>
              {ch.platform === "Telegram" ? "✈️" : "▶️"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.channelName, { color: theme.text }]}>{ch.name}</Text>
            <Text style={[styles.channelMeta, { color: theme.muted }]}>
              {ch.platform} · {ch.members} members
            </Text>
          </View>
          <Text style={[styles.joinBtn, { color: section.color }]}>Join →</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function NoticesScreen() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<NoticeTab>("admit_card");
  const [items, setItems] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchItems = useCallback(async (p = 1, reset = false) => {
    if (activeTab === "community") return;
    try {
      const { data } = await jobsApi.list({
        content_type: activeTab,
        page: p,
        per_page: 20,
        sort: "newest",
        include_closed: true,
      });
      setTotal(data.total);
      setItems((prev) => reset || p === 1 ? data.items : [...prev, ...data.items]);
      setPage(p);
    } catch (e) {
      console.warn("Notices fetch error:", e);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "community") return;
    setLoading(true);
    fetchItems(1, true).finally(() => setLoading(false));
  }, [activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchItems(1, true);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (!loading && items.length < total) fetchItems(page + 1);
  };

  const BLUE = theme.blue;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.tabBorder }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Notices</Text>
      </View>

      {/* Top tabs */}
      <View style={[styles.tabBar, { backgroundColor: theme.header, borderBottomColor: theme.border }]}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && { borderBottomColor: BLUE, borderBottomWidth: 2.5 }]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={styles.tabIcon}>{t.icon}</Text>
            <Text style={[styles.tabLabel,
              { color: activeTab === t.key ? BLUE : theme.muted,
                fontWeight: activeTab === t.key ? "700" : "500" }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === "community" ? (
        <FlatList
          data={COMMUNITY}
          keyExtractor={(item) => item.category}
          renderItem={({ item }) => <CommunitySection section={item} theme={theme} />}
          contentContainerStyle={{ paddingBottom: 30 }}
          ListHeaderComponent={
            <View style={[styles.communityBanner, { backgroundColor: theme.lightBlue }]}>
              <Text style={[styles.communityBannerText, { color: BLUE }]}>
                💬 Join active study groups & channels for your exam
              </Text>
            </View>
          }
        />
      ) : loading && items.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={BLUE} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(j) => j.id.toString()}
          renderItem={({ item }) => <NoticeCard item={item} theme={theme} tab={activeTab} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{activeTab === "admit_card" ? "🎫" : "🏆"}</Text>
              <Text style={[styles.emptyTitle, { color: theme.subtext }]}>
                {activeTab === "admit_card" ? "No admit cards yet" : "No results yet"}
              </Text>
              <Text style={[styles.emptyText, { color: theme.muted }]}>
                Pull down to refresh or check back later
              </Text>
            </View>
          }
          ListFooterComponent={
            items.length > 0 && items.length < total
              ? <ActivityIndicator style={{ padding: 20 }} color={BLUE} /> : null
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  header:      { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: "800" },

  tabBar:  { flexDirection: "row", borderBottomWidth: 1 },
  tab:     { flex: 1, alignItems: "center", paddingVertical: 10, borderBottomWidth: 2.5, borderBottomColor: "transparent" },
  tabIcon: { fontSize: 16, marginBottom: 2 },
  tabLabel:{ fontSize: 12 },

  noticeCard: {
    marginHorizontal: 12, marginVertical: 5, borderRadius: 10,
    padding: 14, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  noticeBadge:     { alignSelf: "flex-start", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  noticeBadgeText: { fontSize: 11, fontWeight: "700" },
  noticeTitle:     { fontSize: 14, fontWeight: "700", lineHeight: 20, marginBottom: 3 },
  noticeOrg:       { fontSize: 12, marginBottom: 10 },
  noticeFooter:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  noticeDate:      { fontSize: 11, fontWeight: "600" },
  openBtn:         { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  openBtnText:     { color: "#FFF", fontSize: 12, fontWeight: "700" },

  communityBanner:     { margin: 12, padding: 12, borderRadius: 10 },
  communityBannerText: { fontSize: 13, fontWeight: "600" },
  communitySection:    { marginHorizontal: 12, marginTop: 16 },
  communitySectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  communitySectionIcon:   { fontSize: 18 },
  communitySectionTitle:  { fontSize: 15, fontWeight: "700" },
  channelCard:  {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8,
  },
  platformBadge: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  platformIcon:  { fontSize: 20 },
  channelName:   { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  channelMeta:   { fontSize: 12 },
  joinBtn:       { fontSize: 13, fontWeight: "700" },

  empty:      { alignItems: "center", paddingTop: 80 },
  emptyIcon:  { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  emptyText:  { fontSize: 13 },
});
