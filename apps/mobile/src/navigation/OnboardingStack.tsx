import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OnboardingWelcomeScreen } from "../screens/onboarding/OnboardingWelcomeScreen";
import { OnboardingImportScreen } from "../screens/onboarding/OnboardingImportScreen";
import { OnboardingSelectionScreen } from "../screens/onboarding/OnboardingSelectionScreen";

export type OnboardingStackParamList = {
  OnboardingWelcome: undefined;
  OnboardingImport: undefined;
  OnboardingSelection: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

interface OnboardingStackProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingStack({ onComplete, onSkip }: OnboardingStackProps) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OnboardingWelcome">
        {({ navigation }) => <OnboardingWelcomeScreen navigation={navigation} onSkip={onSkip} />}
      </Stack.Screen>
      <Stack.Screen name="OnboardingImport">
        {({ navigation }) => (
          <OnboardingImportScreen
            onComplete={onComplete}
            onSkip={() => navigation.navigate("OnboardingSelection")}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="OnboardingSelection">
        {() => <OnboardingSelectionScreen onComplete={onComplete} onSkip={onSkip} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
