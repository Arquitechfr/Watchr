import { useRef } from "react";
import { Modal, View, Text, Image, ScrollView, TouchableOpacity, Animated } from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { Episode } from "../services/shows.service";
import { getStillUrl } from "../services/shows.service";
import { colors } from "../theme/colors";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface EpisodeDetailModalProps {
  visible: boolean;
  onClose: () => void;
  season: number;
  episode: Episode;
  isWatched: boolean;
  onToggleWatched: () => void;
  isPending?: boolean;
}

export function EpisodeDetailModal({
  visible,
  onClose,
  season,
  episode,
  isWatched,
  onToggleWatched,
  isPending,
}: EpisodeDetailModalProps) {
  const stillUrl = getStillUrl(episode.stillPath, 500);
  const airDate = episode.airDate ? new Date(episode.airDate) : null;
  const translateY = useRef(new Animated.Value(0)).current;

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: 600,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      translateY.setValue(0);
      onClose();
    });
  };

  const onPanGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true },
  );

  const onPanHandlerStateChange = (event: { nativeEvent: { oldState: number; translationY: number } }) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      if (event.nativeEvent.translationY > 120) {
        handleClose();
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View className="flex-1 bg-black/70">
        <TouchableOpacity
          className="absolute inset-0"
          onPress={handleClose}
          activeOpacity={1}
        />
        <Animated.View
          className="flex-1 bg-background rounded-t-2xl overflow-hidden mt-20"
          style={{ transform: [{ translateY }] }}
        >
          <PanGestureHandler
            onGestureEvent={onPanGestureEvent}
            onHandlerStateChange={onPanHandlerStateChange}
          >
            <View className="flex-row items-center justify-between px-4 pt-4 pb-2 border-b border-border">
              <TouchableOpacity onPress={handleClose} className="p-2">
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
              <Text className="text-text font-semibold">Détail de l'épisode</Text>
              <View className="w-10" />
            </View>
          </PanGestureHandler>

          <ScrollView className="flex-1">
            {stillUrl ? (
              <Image
                source={{ uri: stillUrl }}
                className="w-full h-56 bg-surface-light"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-56 bg-surface-light items-center justify-center">
                <Ionicons name="image-outline" size={48} color={colors.textMuted} />
              </View>
            )}

            <View className="px-4 py-4">
              <Text className="text-primary text-sm font-semibold mb-1">
                S{season}E{episode.episodeNumber}
              </Text>
              <Text className="text-text text-2xl font-bold mb-2">
                {episode.name ?? `Épisode ${episode.episodeNumber}`}
              </Text>
              {airDate && !Number.isNaN(airDate.getTime()) && (
                <Text className="text-text-muted text-sm mb-4">
                  {format(airDate, "EEEE d MMMM yyyy", { locale: fr })}
                </Text>
              )}
              {episode.overview ? (
                <Text className="text-text leading-relaxed mb-6">{episode.overview}</Text>
              ) : (
                <Text className="text-text-muted italic mb-6">Aucun résumé disponible.</Text>
              )}
            </View>
          </ScrollView>

          <View className="p-4 border-t border-border">
            <TouchableOpacity
              className={`flex-row items-center justify-center py-3 rounded-lg ${
                isWatched ? "bg-surface border border-primary" : "bg-primary"
              }`}
              onPress={onToggleWatched}
              disabled={isPending}
            >
              <Ionicons
                name={isWatched ? "checkmark-circle" : "ellipse-outline"}
                size={20}
                color={isWatched ? colors.primary : colors.background}
                style={{ marginRight: 8 }}
              />
              <Text
                className={`font-semibold ${isWatched ? "text-primary" : "text-background"}`}
              >
                {isWatched ? "Marquer comme non vu" : "Marquer comme vu"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
