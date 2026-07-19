import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";

vi.mock("../../services/unwatched.service", () => ({
  getUnwatchedShows: vi.fn(),
}));

vi.mock("../../services/upcoming.service", () => ({
  getUpcomingEpisodes: vi.fn(),
}));

vi.mock("../../store/localeStore", () => ({
  useLocaleStore: {
    getState: () => ({ locale: "fr" }),
  },
}));

vi.mock("../logger", () => ({
  log: vi.fn(),
}));

import { getUnwatchedShows } from "../../services/unwatched.service";
import { getUpcomingEpisodes } from "../../services/upcoming.service";
import { prefetchSeriesData } from "../prefetch";

const mockedGetUnwatchedShows = vi.mocked(getUnwatchedShows);
const mockedGetUpcomingEpisodes = vi.mocked(getUpcomingEpisodes);

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

describe("prefetchSeriesData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("regression: prefetchQuery never rejects — must use fetchQuery to detect failure", async () => {
    mockedGetUnwatchedShows.mockRejectedValue(new Error("network down"));
    mockedGetUpcomingEpisodes.mockRejectedValue(new Error("network down"));

    const queryClient = createQueryClient();

    await prefetchSeriesData(queryClient);

    expect(queryClient.getQueryState(["unwatched", "tv", "fr"])).toBeUndefined();
    expect(queryClient.getQueryState(["upcoming", "fr"])).toBeUndefined();
  });

  it("caches data on success (nominal path)", async () => {
    const unwatchedData = [{ id: "1", title: "Show A" }];
    const upcomingData = [{ id: "2", title: "Episode B" }];

    mockedGetUnwatchedShows.mockResolvedValue(unwatchedData);
    mockedGetUpcomingEpisodes.mockResolvedValue(upcomingData);

    const queryClient = createQueryClient();

    await prefetchSeriesData(queryClient);

    expect(queryClient.getQueryData(["unwatched", "tv", "fr"])).toEqual(unwatchedData);
    expect(queryClient.getQueryData(["upcoming", "fr"])).toEqual(upcomingData);
  });
});
