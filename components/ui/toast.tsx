export type Toast = {
  id: string;
  title?: string;
  message: string;
};

import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useRef, useState } from "react";
import { View, Text, Animated, Easing } from "react-native";

const ToastContext = createContext<{ show: (message: string, title?: string) => void }>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<Toast | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;

  const hide = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => setToast(null));
  }, [opacity]);

  const show = useCallback((message: string, title?: string) => {
    const id = String(Date.now());
    setToast({ id, title, message });
    Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
      setTimeout(hide, 2200);
    });
  }, [hide, opacity]);

  const ctx = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={{ position: "absolute", left: 0, right: 0, top: 48, opacity }}
          className="px-4"
        >
          <View className="mx-auto max-w-[92%] rounded-lg bg-foreground/90 px-3 py-2 shadow-lg">
            {toast.title ? <Text className="text-background font-semibold mb-0.5">{toast.title}</Text> : null}
            <Text className="text-background">{toast.message}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}
