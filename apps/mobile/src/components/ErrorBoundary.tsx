import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { errorTracker } from "../services/errorTracker";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    errorTracker.captureException(error, {
      componentStack: errorInfo.componentStack,
      source: "ErrorBoundary",
    });
  }

  handleReload = (): void => {
    if (Platform.OS === "web") {
      window.location.reload();
    } else {
      this.setState({ hasError: false });
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center px-6 bg-background">
          <Ionicons name="alert-circle-outline" size={56} color="#C65D3A" className="mb-4" />
          <Text className="text-text text-lg font-semibold text-center mb-2">
            Something went wrong
          </Text>
          <Text className="text-text-muted text-center mb-6">
            The app encountered an unexpected error. Our team has been notified.
          </Text>
          <TouchableOpacity
            className="bg-primary px-6 py-3 rounded-lg"
            onPress={this.handleReload}
          >
            <Text className="text-background font-semibold">
              {Platform.OS === "web" ? "Reload page" : "Try again"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
