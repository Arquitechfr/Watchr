import { View, Text } from "react-native";
import { type Genre } from "../../services/shows.service";

interface GenresSectionProps {
  genres: Genre[];
  aiTags?: string[];
}

export function GenresSection({ genres, aiTags }: GenresSectionProps) {
  const hasGenres = genres.length > 0;
  const filteredAiTags = (aiTags ?? []).filter((tag) => !genres.some((g) => g.name === tag));
  const hasAiTags = filteredAiTags.length > 0;

  if (!hasGenres && !hasAiTags) return null;

  return (
    <>
      {hasGenres && (
        <View className="flex-row flex-wrap mb-4">
          {genres.map((genre) => (
            <View key={genre.id} className="bg-surface rounded-full px-3 py-1 mr-2 mb-2">
              <Text className="text-text text-xs">{genre.name}</Text>
            </View>
          ))}
        </View>
      )}

      {hasAiTags && (
        <View className="flex-row flex-wrap mb-4">
          {filteredAiTags.map((tag) => (
            <View key={`ai-tag-${tag}`} className="bg-primary/15 rounded-full px-3 py-1 mr-2 mb-2" style={{ flexDirection: "row", alignItems: "center" }}>
              <View className="bg-primary/20 rounded px-1 py-0 mr-1">
                <Text className="text-primary text-[9px] font-bold">AI</Text>
              </View>
              <Text className="text-text text-xs">{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}
