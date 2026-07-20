import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { WidgetStatsData } from './widgetHelpers';

export interface StatsWidgetProps {
  data: WidgetStatsData;
  title: string;
  episodesLabel: string;
  hoursLabel: string;
  streakLabel: string;
  showsLabel: string;
  moviesLabel: string;
  daysLabel: string;
}

const COLORS: Record<string, any> = {
  bg: '#1A1614',
  surface: '#252019',
  surfaceLight: '#2D2620',
  primary: '#C65D3A',
  text: '#F5F0EB',
  textMuted: '#A89B91',
  border: '#3D352D',
};

function StatCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <FlexWidget
      style={{
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingVertical: 10,
        paddingHorizontal: 8,
        marginHorizontal: 3,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
      }}
    >
      <TextWidget
        text={icon}
        style={{ fontSize: 18, marginBottom: 4 }}
      />
      <TextWidget
        text={value}
        style={{
          fontSize: 16,
          color: COLORS.text,
          fontWeight: 'bold',
          marginBottom: 2,
        }}
      />
      <TextWidget
        text={label}
        style={{
          fontSize: 10,
          color: COLORS.textMuted,
        }}
      />
    </FlexWidget>
  );
}

export function StatsWidget(props: StatsWidgetProps) {
  const { data } = props;

  return (
    <FlexWidget
      style={{
        backgroundColor: COLORS.bg,
        borderRadius: 16,
        padding: 14,
        flexDirection: 'column',
      }}
    >
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <TextWidget
          text={props.title}
          style={{
            fontSize: 14,
            color: COLORS.primary,
            fontWeight: 'bold',
            letterSpacing: 1,
          }}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          marginBottom: 6,
        }}
      >
        <StatCard
          icon="📺"
          value={String(data.episodesWatched)}
          label={props.episodesLabel}
        />
        <StatCard
          icon="⏱️"
          value={String(Math.round(data.hoursWatched))}
          label={props.hoursLabel}
        />
        <StatCard
          icon="🔥"
          value={String(data.watchStreak)}
          label={props.streakLabel}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
        }}
      >
        <StatCard
          icon="🎬"
          value={String(data.tvCount)}
          label={props.showsLabel}
        />
        <StatCard
          icon="🎥"
          value={String(data.movieCount)}
          label={props.moviesLabel}
        />
        <StatCard
          icon="📅"
          value={props.daysLabel}
          label=""
        />
      </FlexWidget>
    </FlexWidget>
  );
}
