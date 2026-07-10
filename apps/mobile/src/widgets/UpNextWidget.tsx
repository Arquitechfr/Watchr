import React from 'react';
import { FlexWidget, TextWidget, ListWidget, ImageWidget } from 'react-native-android-widget';
import { WidgetTab, WidgetEpisode } from './widgetDataHelper';

export interface UpNextWidgetProps {
  activeTab: WidgetTab;
  episodes: WidgetEpisode[];
  tabUnwatchedLabel: string;
  tabUpcomingLabel: string;
  emptyUnwatchedText: string;
  emptyUpcomingText: string;
  markWatchedLabel: string;
}

const COLORS: Record<string, any> = {
  bg: '#1A1614',
  surface: '#252019',
  primary: '#C65D3A',
  text: '#F5F0EB',
  textMuted: '#A89B91',
  border: '#3D352D',
};

function TabButton({
  label,
  isActive,
  tab,
}: {
  label: string;
  isActive: boolean;
  tab: WidgetTab;
}) {
  return (
    <FlexWidget
      clickAction="SWITCH_TAB"
      clickActionData={{ tab }}
      style={{
        flex: 1,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 6,
        backgroundColor: isActive ? COLORS.primary : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <TextWidget
        text={label}
        style={{
          fontSize: 12,
          color: isActive ? COLORS.bg : COLORS.textMuted,
          fontWeight: 'bold',
        }}
      />
    </FlexWidget>
  );
}

function EpisodeRow({ episode, markWatchedLabel }: { episode: WidgetEpisode; markWatchedLabel: string }) {
  const episodeLabel = `S${String(episode.season).padStart(2, '0')}E${String(episode.episode).padStart(2, '0')}`;
  const subtitle = episode.name ? `${episodeLabel} • ${episode.name}` : episodeLabel;
  const deepLink = `watchr://show/${episode.tmdbId}`;

  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 8,
      }}
    >
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: deepLink }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
        }}
      >
        {episode.posterUrl ? (
          <ImageWidget
            image={episode.posterUrl as `https://${string}`}
            imageWidth={32}
            imageHeight={48}
            style={{ borderRadius: 4, marginRight: 8 }}
            radius={4}
          />
        ) : (
          <FlexWidget
            style={{
              width: 32,
              height: 48,
              backgroundColor: COLORS.surface,
              borderRadius: 4,
              marginRight: 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TextWidget text="📺" style={{ fontSize: 16 }} />
          </FlexWidget>
        )}

        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget
            text={episode.title}
            style={{ fontSize: 13, color: COLORS.text, fontWeight: 'bold' }}
            maxLines={1}
            truncate="END"
          />
          <TextWidget
            text={subtitle}
            style={{ fontSize: 11, color: COLORS.textMuted }}
            maxLines={1}
            truncate="END"
          />
          {episode.airDate ? (
            <TextWidget
              text={episode.airDate}
              style={{ fontSize: 10, color: COLORS.textMuted }}
            />
          ) : null}
        </FlexWidget>
      </FlexWidget>

      <FlexWidget
        clickAction="MARK_WATCHED"
        clickActionData={{
          showId: episode.showId,
          season: episode.season,
          episode: episode.episode,
        }}
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: COLORS.surface,
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 4,
        }}
      >
        <TextWidget
          text="✓"
          style={{ fontSize: 14, color: COLORS.primary, fontWeight: 'bold' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

export function UpNextWidget({
  activeTab,
  episodes,
  tabUnwatchedLabel,
  tabUpcomingLabel,
  emptyUnwatchedText,
  emptyUpcomingText,
  markWatchedLabel,
}: UpNextWidgetProps) {
  const emptyText = activeTab === 'unwatched' ? emptyUnwatchedText : emptyUpcomingText;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: COLORS.bg,
        flexDirection: 'column',
        borderRadius: 16,
        padding: 8,
      }}
    >
      <FlexWidget
        style={{
          flexDirection: 'row',
          backgroundColor: COLORS.surface,
          borderRadius: 8,
          padding: 2,
          marginBottom: 6,
        }}
      >
        <TabButton
          label={tabUnwatchedLabel}
          isActive={activeTab === 'unwatched'}
          tab="unwatched"
        />
        <TabButton
          label={tabUpcomingLabel}
          isActive={activeTab === 'upcoming'}
          tab="upcoming"
        />
      </FlexWidget>

      {episodes.length === 0 ? (
        <FlexWidget
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget
            text={emptyText}
            style={{ fontSize: 14, color: COLORS.textMuted }}
          />
        </FlexWidget>
      ) : (
        <ListWidget
          style={{
            height: 'match_parent',
            width: 'match_parent',
          }}
        >
          {episodes.map((ep, i) => (
            <EpisodeRow key={`${ep.showId}-${ep.season}-${ep.episode}-${i}`} episode={ep} markWatchedLabel={markWatchedLabel} />
          ))}
        </ListWidget>
      )}
    </FlexWidget>
  );
}
