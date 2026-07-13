import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OnboardingWelcomeScreen } from "../screens/onboarding/OnboardingWelcomeScreen";
import { OnboardingImportScreen } from "../screens/onboarding/OnboardingImportScreen";
import { OnboardingSelectionScreen } from "../screens/onboarding/OnboardingSelectionScreen";

export type OnboardingStackParamList = {
  OnboardingWelcome: undefined;
  OnboardingSelection: undefined;
  OnboardingImport: undefined;
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
      <Stack.Screen name="OnboardingSelection">
        {({ navigation }) => (
          <OnboardingSelectionScreen
            onComplete={() => navigation.navigate("OnboardingImport")}
            onSkip={() => navigation.navigate("OnboardingImport")}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="OnboardingImport">
        {() => <OnboardingImportScreen onComplete={onComplete} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
