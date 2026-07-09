import { useEffect, useRef, useState } from "react";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { useLocaleStore } from "../store/localeStore";

export function useLocaleInvalidation() {
  const queryClient = useQueryClient();
  const locale = useLocaleStore((state) => state.locale);
  const prevLocale = useRef(locale);
  const [localeChanged, setLocaleChanged] = useState(false);

  useEffect(() => {
    if (prevLocale.current === locale) return;
    prevLocale.current = locale;
    setLocaleChanged(true);
    queryClient.invalidateQueries();
  }, [locale, queryClient]);

  const isFetching = useIsFetching();
  const isRefetching = localeChanged && isFetching > 0;

  useEffect(() => {
    if (localeChanged && isFetching === 0) {
      setLocaleChanged(false);
    }
  }, [localeChanged, isFetching]);

  return { isRefetching };
}
