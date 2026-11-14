import { Pressable, StyleSheet, Text, View } from "react-native";
import AvatarFrame from "../components/AvatarFrame";
import DailyLimits from "../components/DailyLimits";
import { BadgeIcon, PointIcon, XpIcon } from "../components/Icons";
import { Appear, Bar, CountUp, PressScale } from "../components/Motion";
import { Card, List, SectionTitle } from "../components/ListRows";
import ReportCard from "../components/ReportCard";
import Screen from "../components/Screen";
import { Empty, Loading, refresher } from "../components/States";
import {
  DEX_TOTAL,
  dexCount,
  progress,
  statsOf,
  titleText,
} from "../lib/achievements";
import { useApp } from "../state/AppState";
import { colors, font, radius, text } from "../theme";

const day = (t) => {
  const d = new Date(t);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};

export default function MeScreen({ navigation }) {
  const app = useApp();
  const p = app.profile;
  if (!p) {
    return (
      <Screen refreshControl={refresher(app)}>
        {app.loading ? (
          <Loading />
        ) : (
          <Empty
            title="내 정보를 불러오지 못했어요"
            action="다시 시도"
            onAction={() => app.refresh()}
          />
        )}
      </Screen>
    );
  }
  const progress01 = p.xp_for_next_level
    ? Math.min(1, (p.xp_in_level || 0) / p.xp_for_next_level)
    : 0;
  const mine = app.reports.filter(
    (r) => r.i_am_participating && r.status !== "completed",
  );
  const s = statsOf(p, app.myCrew);
  const feats = progress(s);
  const weekly = p.weekly || [];
  const top = Math.max(1, ...weekly);
  const vault = (p.coupons || []).length + (p.rewards || []).length;
  const waiting = app.notices.filter((n) => !n.answer).length;
  return (
    <Screen refreshControl={refresher(app)}>
      <View style={styles.me}>
        <Pressable
          onPress={() => app.canStyle && navigation.navigate("Style")}
          accessibilityRole={app.canStyle ? "button" : undefined}
          accessibilityLabel="프로필 꾸미기 열기"
        >
          <AvatarFrame
            frame={p.frame}
            size={64}
            letter={(p.nickname || "줍").slice(0, 1)}
            uri={p.avatar_url}
          />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              text.cardTitle,
              { fontSize: 20 },
              p.name_color && { color: p.name_color },
            ]}
          >
            {p.nickname}
          </Text>
          <Text style={[text.chip, { color: colors.tape, marginTop: 2 }]}>
            {titleText(p, app.myCrew)}
          </Text>
          <Text style={[text.small, { marginTop: 4 }]}>
            {app.myCrew ? app.myCrew.name : "크루 없음"}
          </Text>
        </View>
        <View style={{ gap: 6 }}>
          {app.canStyle ? (
            <Text
              onPress={() => navigation.navigate("Style")}
              style={[text.chip, styles.settings]}
              accessibilityRole="button"
            >
              꾸미기
            </Text>
          ) : null}
          <Text
            onPress={() => navigation.navigate("Settings")}
            style={[text.chip, styles.settings]}
            accessibilityRole="button"
          >
            설정
          </Text>
        </View>
      </View>

      <Card style={{ gap: 8 }}>
        <View style={styles.row}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <XpIcon size={18} />
            <Text style={text.small}>레벨</Text>
          </View>
          <Text style={text.num}>Lv.{p.level}</Text>
        </View>
        <Bar ratio={progress01} color={colors.blue} track={colors.panel2} />
        <View style={styles.row}>
          <Text style={text.small}>
            다음 레벨까지{" "}
            {Math.max(0, (p.xp_for_next_level || 0) - (p.xp_in_level || 0))}XP
          </Text>
          <Text style={text.small}>누적 {(p.xp || 0).toLocaleString()}XP</Text>
        </View>
      </Card>

      <Appear from="left">
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <PressScale
              onPress={() => navigation.navigate("Collection")}
              accessibilityRole="button"
              accessibilityLabel="도전과제와 도감 열기"
              style={[styles.tile, styles.feats]}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <BadgeIcon size={22} />
                <Text style={[text.chip, { color: colors.purple }]}>
                  도전과제 · 도감
                </Text>
              </View>
              <Text style={[text.point, { color: colors.fg }]}>
                {feats.filter((a) => a.done).length}
                <Text style={[text.small, { color: colors.sub }]}>
                  {" "}
                  /{feats.length} 달성
                </Text>
              </Text>
              <Text style={text.caption}>
                도감 {dexCount(s)}/{DEX_TOTAL}
              </Text>
            </PressScale>
          </View>
          <View style={{ flex: 1 }}>
            <PressScale
              onPress={() => navigation.navigate("Shop")}
              accessibilityRole="button"
              accessibilityLabel="포인트 교환 상점 열기"
              style={[styles.tile, styles.wallet]}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <PointIcon size={22} />
                <Text style={[text.chip, { color: colors.tape }]}>
                  교환 상점
                </Text>
              </View>
              <CountUp
                value={p.points || 0}
                style={[text.point, { color: colors.tape }]}
              />
              <Text style={text.caption}>내 포인트</Text>
            </PressScale>
          </View>
        </View>
      </Appear>

      <SectionTitle>내 활동</SectionTitle>
      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: "row" }}>
          {[
            [p.completed_count || 0, "건", "완료한 의뢰"],
            [p.streak_weeks || 0, "주", "연속 활동"],
            [weekly[weekly.length - 1] || 0, "건", "이번 주"],
          ].map(([num, unit, label]) => (
            <View key={label} style={{ flex: 1 }}>
              <Text style={text.point}>
                {num}
                <Text style={[text.small, { color: colors.sub }]}> {unit}</Text>
              </Text>
              <Text style={[text.caption, { marginTop: 2 }]}>{label}</Text>
            </View>
          ))}
        </View>
        <View
          style={styles.chart}
          accessibilityRole="image"
          accessibilityLabel={`최근 8주 동안 주마다 해결한 수: ${weekly.join(", ")}`}
        >
          {weekly.map((n, i) => {
            const now = i === weekly.length - 1;
            // 오른쪽 끝에서부터 이어진 주가 연속 활동 구간입니다.
            const inStreak =
              weekly.length - 1 - i <
                (p.streak_weeks || 0) + (weekly[weekly.length - 1] ? 0 : 1) &&
              n > 0;
            return (
              <View key={i} style={styles.col}>
                <Text
                  style={[
                    text.caption,
                    { color: n > 0 ? colors.fg : colors.disabled },
                  ]}
                >
                  {n}
                </Text>
                <View style={styles.track}>
                  <View
                    style={{
                      height: `${Math.max(4, (n / top) * 100)}%`,
                      borderRadius: 5,
                      backgroundColor:
                        n === 0
                          ? colors.panel2
                          : inStreak
                            ? colors.green
                            : colors.blue,
                    }}
                  />
                </View>
                <Text
                  numberOfLines={1}
                  style={[text.caption, now && { color: colors.fg }]}
                >
                  {now
                    ? "이번주"
                    : i === weekly.length - 2
                      ? "지난주"
                      : `${weekly.length - 1 - i}주 전`}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={text.caption}>
          {p.streak_weeks > 0
            ? `초록 막대가 이어진 ${p.streak_weeks}주예요. ${p.active_this_week ? "이번 주도 이어 갔어요" : "이번 주에 한 건만 해결하면 이어져요"}`
            : "한 주에 한 건만 해결해도 연속 활동이 시작돼요"}
        </Text>
      </Card>

      <SectionTitle>오늘 남은 횟수</SectionTitle>
      <DailyLimits profile={p} />

      <List
        rows={[
          {
            label: "보관함",
            value: vault > 0 ? `쿠폰·제휴 보상 ${vault}개` : "쿠폰·제휴 보상",
            onPress: () => navigation.navigate("Vault"),
          },
        ]}
      />

      {p.cleaned?.length > 0 ? (
        <>
          <SectionTitle>내가 치운 곳</SectionTitle>
          <List
            rows={p.cleaned
              .slice(0, 10)
              .map((c) => ({
                label: c.title,
                value: [c.place_label, day(c.at)].filter(Boolean).join(" · "),
                key: `${c.id}-${c.at}`,
              }))}
          />
        </>
      ) : null}

      <SectionTitle>진행 중인 내 의뢰</SectionTitle>
      <View style={{ gap: 14 }}>
        {mine.map((r) => (
          <ReportCard
            key={r.id}
            report={r}
            onPress={() => app.openSheet(r.id)}
            onHeart={() => app.toggleHeart(r.id)}
          />
        ))}
        {mine.length === 0 ? (
          <List
            rows={[
              {
                label: "수락한 의뢰가 없어요",
                value: "의뢰판에서 골라 보세요",
                onPress: () => navigation.navigate("Board"),
              },
            ]}
          />
        ) : null}
      </View>

      <List
        rows={[
          ...(app.social
            ? [
                {
                  label: "해결 확인",
                  value: `${waiting}건 대기`,
                  onPress: () => navigation.navigate("Notices"),
                },
              ]
            : []),
          {
            label: "도움말",
            value: "쓰는 법과 규칙",
            onPress: () => navigation.navigate("Help"),
          },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  me: {
    flexDirection: "row",
    gap: 18,
    paddingLeft: 6,
    paddingTop: 6,
    alignItems: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.panel2,
    borderWidth: 2,
    borderColor: colors.tape,
    alignItems: "center",
    justifyContent: "center",
  },
  settings: {
    color: colors.fg,
    backgroundColor: colors.panel2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    overflow: "hidden",
    ...font.bodyBold,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tile: {
    gap: 6,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
    borderWidth: 1,
  },
  feats: {
    borderColor: colors.purple,
    backgroundColor: "rgba(169,124,255,0.08)",
  },
  wallet: {
    borderColor: colors.tape,
    backgroundColor: "rgba(255,212,59,0.06)",
  },
  chart: { flexDirection: "row", gap: 6, height: 132 },
  col: { flex: 1, alignItems: "center", gap: 4 },
  track: { flex: 1, alignSelf: "stretch", justifyContent: "flex-end" },
});
