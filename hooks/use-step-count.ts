import { Pedometer } from "expo-sensors";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

const STEP_GOAL = 5000;

function getTodayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function useStepCount() {
  const [steps, setSteps] = useState<number>(0);
  const [available, setAvailable] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    if (Platform.OS === "web") {
      setAvailable(false);
      setSteps(0);
      return;
    }
    try {
      const isAvailable = await Pedometer.isAvailableAsync();
      setAvailable(isAvailable);
      if (!isAvailable) {
        setSteps(0);
        return;
      }
      // iOS supports getStepCountAsync for date range; Android throws
      try {
        const start = getTodayStart();
        const end = new Date();
        const result = await Pedometer.getStepCountAsync(start, end);
        setSteps(result.steps);
      } catch {
        setSteps(0);
      }
    } catch {
      setAvailable(false);
      setSteps(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(refresh, 60_000); // refresh every minute
    return () => clearInterval(interval);
  }, [refresh]);

  const meetsGoal = steps >= STEP_GOAL;

  return { steps, available, meetsGoal, refresh, stepGoal: STEP_GOAL };
}
