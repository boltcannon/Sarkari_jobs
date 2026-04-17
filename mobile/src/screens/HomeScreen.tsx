import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Job, UserProfile, jobsApi, savedJobsStorage, profileStorage } from "../api/client";
import JobCard from "../components/JobCard";
import SkeletonCard from "../components/SkeletonCard";
import FilterModal, { SortOption } from "../components/FilterModal";
import { useTheme } from "../theme/ThemeContext";

const CATEGORIES = ["All", "SSC", "UPSC", "Railway", "Banking", "State PSC", "Defence", "Police", "Teaching"];

type FeedMode = "forYou" | "all";

export default function HomeScreen({ navigation }: any) {
  const { theme } = useTheme();
  const BLUE = theme.blue;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [feedMode, setFeedMode] = useState<FeedMode>("forYou");
  const [sort, setSort] = useState<SortOption>("newest");
  const [filterState, setFilterState] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const activeFilterCount =
    (sort !== "newest" ? 1 : 0) + (filterState ? 1 : 0);

  // Reload profile + saved IDs whenever screen gains focus
  useFocusEffect(
    useCallback(() => {
      savedJobsStorage.getSavedIds().then(setSavedIds).catch(() => {});
      profileStorage.get().then((p) => setProfile(p)).catch(() => {});
    }, [])
  );

  const buildParams = useCallback(
    (p: number, cat: string, q: string) => {
      const params: Record<string, any> = { page: p, per_page: 20, sort };
      if (feedMode === "forYou" && profile?.preferred_categories?.length) {
        params.categories = profile.preferred_categories.join(",");
      } else if (feedMode === "all" && cat !== "All") {
        params.category = cat;
      }
      if (q.trim()) params.q = q.trim();
      if (filterState) params.state = filterState;
      return params;
    },
    [feedMode, profile, category, sort, filterState]
  );

  const fetchJobs = useCallback(
    async (p = 1, cat = category, q = query, reset = false) => {
      try {
        const params = buildParams(p, cat, q);
        console.log("[HomeScreen] fetching jobs:", JSON.stringify(params));
        const { data } = await jobsApi.list(params);
        console.log("[HomeScreen] response: total=", data.total, "items=", data.items.length);
        setTotal(data.total);
        setJobs((prev) => (reset || p === 1 ? data.items : [...prev, ...data.items]));
        setPage(p);
      } catch (e: any) {
        console.warn("[HomeScreen] API error:", e?.message ?? e);
      }
    },
    [buildParams, category, query]
  );

  // Refetch when feedMode, category, profile, sort, or filterState changes
  useEffect(() => {
    setLoading(true);
    fetchJobs(1, category, query, true).finally(() => setLoading(false));
  }, [feedMode, category, profile?.preferred_categories?.join(","), sort, filterState]);

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setLoading(true);
      fetchJobs(1, category, query, true).finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs(1, category, query, true);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (!loading && jobs.length < total) {
      fetchJobs(page + 1, category, query);
    }
  };

  const toggleSave = async (job: Job) => {
    if (savedIds.has(job.id)) {
      await savedJobsStorage.remove(job.id);
      setSavedIds((prev) => { const s = new Set(prev); s.delete(job.id); return s; });
    } else {
      await savedJobsStorage.save(job);
      setSavedIds((prev) => new Set(prev).add(job.id));
    }
  };

  const switchFeed = (mode: FeedMode) => {
    if (mode === feedMode) return;
    setCategory("All");
    setQuery("");
    setFeedMode(mode);
  };

  const handleFilterApply = (newSort: SortOption, newState: string) => {
    setSort(newSort);
    setFilterState(newState);
  };

  const hasPreferences = (profile?.preferred_categories?.length ?? 0) > 0;
  const firstName = profile?.name?.split(" ")[0] || "";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.tabBorder }]}>
        <Text style={[styles.appName, { color: BLUE }]}>Where is my Job? 🔍</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Profile")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Feed mode toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, feedMode === "forYou" && styles.toggleBtnActive]}
          onPress={() => switchFeed("forYou")}
        >
          <Text style={[styles.toggleText, feedMode === "forYou" && styles.toggleTextActive]}>
            ✨ For You
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, feedMode === "all" && styles.toggleBtnActive]}
          onPress={() => switchFeed("all")}
        >
          <Text style={[styles.toggleText, feedMode === "all" && styles.toggleTextActive]}>
            All Jobs
          </Text>
        </TouchableOpacity>
      </View>

      {/* Greeting (For You mode with name) */}
      {feedMode === "forYou" && firstName ? (
        <View style={styles.greetingRow}>
          <Text style={styles.greetingText}>
            Hi {firstName} 👋  here are jobs for you
          </Text>
        </View>
      ) : null}

      {/* "Set profile" banner (For You mode, no preferences) */}
      {feedMode === "forYou" && !hasPreferences && (
        <TouchableOpacity
          style={styles.banner}
          onPress={() => navigation.navigate("Profile")}
          activeOpacity={0.8}
        >
          <Text style={styles.bannerText}>
            Set your profile to see personalised jobs →
          </Text>
        </TouchableOpacity>
      )}

      {/* Search bar + Filter button */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs, departments..."
            placeholderTextColor="#999"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setFilterVisible(true)}
          activeOpacity={0.75}
        >
          <Text style={styles.filterBtnIcon}>⚙️</Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Category chips (All Jobs mode only) */}
      {feedMode === "all" && (
        <View style={styles.categoryStrip}>
          <FlatList
            data={CATEGORIES}
            keyExtractor={(c) => c}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.categoryBtn, item === category && styles.categoryBtnActive]}
                onPress={() => setCategory(item)}
              >
                <Text style={[styles.categoryText, item === category && styles.categoryTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Job count */}
      {!loading && (
        <Text style={styles.countText}>
          {total.toLocaleString()} {feedMode === "forYou" && hasPreferences ? "matching" : ""} jobs
        </Text>
      )}

      {/* Jobs list or skeleton */}
      {loading && jobs.length === 0 ? (
        <FlatList
          data={[1, 2, 3, 4, 5]}
          keyExtractor={(i) => i.toString()}
          renderItem={() => <SkeletonCard />}
          scrollEnabled={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(j) => j.id.toString()}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              onPress={() => navigation.navigate("JobDetail", { job: item })}
              onSave={() => toggleSave(item)}
              isSaved={savedIds.has(item.id)}
              userDob={profile?.dob}
            />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />
          }
          ListFooterComponent={
            jobs.length > 0 && jobs.length < total ? (
              <ActivityIndicator style={{ padding: 20 }} color={BLUE} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No jobs found</Text>
              {feedMode === "forYou" && hasPreferences && (
                <Text style={styles.emptyHint}>
                  Try switching to "All Jobs" to see everything
                </Text>
              )}
            </View>
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}

      <FilterModal
        visible={filterVisible}
        sort={sort}
        filterState={filterState}
        onApply={handleFilterApply}
        onClose={() => setFilterVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
  },
  appName: { fontSize: 20, fontWeight: "800", color: BLUE, letterSpacing: -0.5 },
  profileIcon: { fontSize: 22 },

  // Feed toggle
  toggleRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleText: { fontSize: 13, color: "#888", fontWeight: "600" },
  toggleTextActive: { color: BLUE, fontWeight: "700" },

  // Greeting
  greetingRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
  },
  greetingText: { fontSize: 13, color: "#555", fontWeight: "500" },

  // Banner
  banner: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#E8F0FB",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#C5D8F5",
  },
  bannerText: { fontSize: 13, color: BLUE, fontWeight: "600" },

  // Search
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 2,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: "#1A1A1A" },
  clearIcon: { fontSize: 14, color: "#999", paddingLeft: 8 },
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtnActive: {
    borderColor: BLUE,
    backgroundColor: "#E8F0FB",
  },
  filterBtnIcon: { fontSize: 18 },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: BLUE,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  filterBadgeText: { fontSize: 10, color: "#FFF", fontWeight: "700" },

  // Category chips (All Jobs mode)
  categoryStrip: { height: 40, justifyContent: "center", overflow: "hidden", marginTop: 6 },
  categoryList: { paddingHorizontal: 12, alignItems: "center", gap: 8 },
  categoryBtn: {
    height: 30,
    paddingHorizontal: 14,
    paddingVertical: 0,
    borderRadius: 15,
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryBtnActive: { backgroundColor: BLUE, borderColor: BLUE },
  categoryText: { fontSize: 13, color: "#555", fontWeight: "500", includeFontPadding: false },
  categoryTextActive: { color: "#FFF", fontWeight: "700" },

  // Count
  countText: {
    fontSize: 12,
    color: "#888",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
  },

  // Empty state
  center: { alignItems: "center", paddingTop: 70 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 15, color: "#888", fontWeight: "600", marginBottom: 6 },
  emptyHint: { fontSize: 13, color: "#AAA", textAlign: "center", paddingHorizontal: 40 },
});
