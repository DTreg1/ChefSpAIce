import React, { Suspense } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";

function LazyFallback() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
}

export function withSuspense<P extends object>(
  LazyComponent: React.LazyExoticComponent<React.ComponentType<P>>,
) {
  return function SuspenseWrapper(props: P) {
    return (
      <Suspense fallback={<LazyFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
});
