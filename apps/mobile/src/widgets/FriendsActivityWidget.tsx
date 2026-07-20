import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import { WidgetFriendsData, WidgetActivityItem } from './widgetHelpers';

export interface FriendsActivityWidgetProps {
  data: WidgetFriendsData;
  title: string;
  emptyText: string;
  ratedLabel: string;
  commentedLabel: string;
  addedLabel: string;
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

function ActivityRow({
  item,
  ratedLabel,
  commentedLabel,
  addedLabel,
}: {
  item: WidgetActivityItem;
  ratedLabel: string;
  commentedLabel: string;
  addedLabel: string;
}) {
  const deepLink = `watchr://show/${item.tmdbId}`;

  let icon = '➕';
  let action = addedLabel;
  if (item.type === 'rating') {
    icon = '⭐';
    action = `${ratedLabel} ${item.ratingValue ?? ''}/5`;
  } else if (item.type === 'comment') {
    icon = '💬';
    action = commentedLabel;
  }

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: deepLink }}
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
      <TextWidget
        text={icon}
        style={{ fontSize: 16, marginRight: 8 }}
      />
      <FlexWidget
        style={{
          flex: 1,
          flexDirection: 'column',
        }}
      >
        <TextWidget
          text={`${item.username} ${action}`}
          style={{
            fontSize: 12,
            color: COLORS.text,
            fontWeight: 'bold',
            marginBottom: 2,
          }}
        />
        <TextWidget
          text={item.showTitle}
          style={{
            fontSize: 11,
            color: COLORS.textMuted,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

export function FriendsActivityWidget(props: FriendsActivityWidgetProps) {
  const { data } = props;
  const activities = data.activities;

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

      {activities.length > 0 ? (
        <FlexWidget
          style={{
            width: 'match_parent',
            flexDirection: 'column',
          }}
        >
          {activities.map((item, index) => (
            <ActivityRow
              key={index}
              item={item}
              ratedLabel={props.ratedLabel}
              commentedLabel={props.commentedLabel}
              addedLabel={props.addedLabel}
            />
          ))}
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            width: 'match_parent',
            paddingVertical: 20,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget
            text="👥"
            style={{ fontSize: 28, marginBottom: 8 }}
          />
          <TextWidget
            text={props.emptyText}
            style={{
              fontSize: 13,
              color: COLORS.textMuted,
            }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
