import React, { Suspense } from "react";
import { View, StyleSheet } from "react-native";
import { CookPotLoader } from "@/components/CookPotLoader";

function LazyFallback() {
  return (
    <View style={styles.container}>
      <CookPotLoader size="lg" />
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
