import React from 'react';
import { format } from 'date-fns';
import { FlexWidget, TextWidget, ListWidget, ImageWidget } from 'react-native-android-widget';
import { WidgetTab, WidgetEpisode } from './widgetDataHelper';
import { getDateFnsLocaleSync } from '../i18n/useI18n';
import { useLocaleStore } from '../store/localeStore';
import { SupportedLocale } from '../i18n/translations';

export interface UpNextWidgetProps {
  activeTab: WidgetTab;
  episodes: WidgetEpisode[];
  headerTitle: string;
  tabUnwatchedLabel: string;
  tabUpcomingLabel: string;
  emptyUnwatchedText: string;
  emptyUpcomingText: string;
  markWatchedLabel: string;
}

const COLORS: Record<string, any> = {
  bg: '#1A1614',
  surface: '#252019',
  surfaceLight: '#2D2620',
  primary: '#C65D3A',
  text: '#F5F0EB',
  textMuted: '#A89B91',
  border: '#3D352D',
  borderSubtle: '#2D2620',
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
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: isActive ? COLORS.surfaceLight : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 2,
        flexDirection: 'column',
      }}
    >
      <TextWidget
        text={label}
        style={{
          fontSize: 13,
          color: isActive ? COLORS.primary : COLORS.textMuted,
          fontWeight: isActive ? 'bold' : 'normal',
        }}
      />
      {isActive ? (
        <FlexWidget
          style={{
            width: 'match_parent',
            height: 2,
            backgroundColor: COLORS.primary,
            marginTop: 4,
            borderRadius: 1,
          }}
        />
      ) : null}
    </FlexWidget>
  );
}

function EpisodeRow({ episode }: { episode: WidgetEpisode }) {
  const episodeLabel = `S${String(episode.season).padStart(2, '0')}E${String(episode.episode).padStart(2, '0')}`;
  const subtitle = episode.name ? `${episodeLabel} • ${episode.name}` : episodeLabel;
  const deepLink = `watchr://episode?showId=${episode.showId}&tmdbId=${episode.tmdbId}&season=${episode.season}&episodeNumber=${episode.episode}`;

  let formattedDate: string | null = null;
  if (episode.airDate) {
    try {
      const locale = useLocaleStore.getState().locale || 'en';
      const dateFnsLocale = getDateFnsLocaleSync(locale as SupportedLocale);
      formattedDate = format(new Date(episode.airDate), 'd MMM yyyy', { locale: dateFnsLocale });
    } catch {
      formattedDate = episode.airDate;
    }
  }

  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.borderSubtle,
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginBottom: 6,
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
            imageWidth={40}
            imageHeight={60}
            style={{ borderRadius: 4, marginRight: 8 }}
            radius={4}
          />
        ) : (
          <FlexWidget
            style={{
              width: 40,
              height: 60,
              backgroundColor: COLORS.surface,
              borderRadius: 4,
              marginRight: 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TextWidget text="📺" style={{ fontSize: 14 }} />
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
          {formattedDate ? (
            <TextWidget
              text={formattedDate}
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
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: COLORS.primary,
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 8,
        }}
      >
        <TextWidget
          text="✓"
          style={{ fontSize: 16, color: COLORS.bg, fontWeight: 'bold' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

export function UpNextWidget({
  activeTab,
  episodes,
  headerTitle,
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
        padding: 10,
      }}
    >
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <FlexWidget
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: COLORS.primary,
            marginRight: 6,
          }}
        />
        <TextWidget
          text={headerTitle}
          style={{
            fontSize: 15,
            color: COLORS.text,
            fontWeight: 'bold',
          }}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          backgroundColor: COLORS.surface,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: COLORS.borderSubtle,
          padding: 4,
          marginBottom: 8,
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
            width: 'match_parent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget
            text="📺"
            style={{ fontSize: 32, color: COLORS.textMuted }}
          />
          <TextWidget
            text={emptyText}
            style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 8 }}
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
            <EpisodeRow key={`${ep.showId}-${ep.season}-${ep.episode}-${i}`} episode={ep} />
          ))}
        </ListWidget>
      )}
    </FlexWidget>
  );
}
