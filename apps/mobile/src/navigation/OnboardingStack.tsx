import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OnboardingWelcomeScreen } from "../screens/onboarding/OnboardingWelcomeScreen";
import { OnboardingSelectionScreen } from "../screens/onboarding/OnboardingSelectionScreen";
import { OnboardingConfirmationScreen } from "../screens/onboarding/OnboardingConfirmationScreen";

export type OnboardingStackParamList = {
  OnboardingWelcome: undefined;
  OnboardingSelection: undefined;
  OnboardingConfirmation: undefined;
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
        {({ navigation }) => <OnboardingSelectionScreen navigation={navigation} onSkip={onSkip} />}
      </Stack.Screen>
      <Stack.Screen name="OnboardingConfirmation">
        {() => <OnboardingConfirmationScreen onComplete={onComplete} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
