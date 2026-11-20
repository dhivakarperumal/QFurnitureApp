import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { CircleAlert } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type UserAlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type UserAlertData = {
  title: string;
  message?: string;
  buttons: UserAlertButton[];
};

type ShowUserAlert = (
  title: string,
  message?: string,
  buttons?: UserAlertButton[],
) => void;

const UserAlertContext = createContext<ShowUserAlert | null>(null);
const UserToastContext = createContext<((message: string) => void) | null>(null);

export function UserAlertProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [alert, setAlert] = useState<UserAlertData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAlert = useCallback<ShowUserAlert>(
    (title, message, buttons) => {
      setAlert({
        title,
        message,
        buttons: buttons?.length ? buttons : [{ text: 'OK' }],
      });
    },
    [],
  );

  const dismissAlert = useCallback(() => setAlert(null), []);
  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 2400);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  return (
    <UserAlertContext.Provider value={showAlert}>
      <UserToastContext.Provider value={showToast}>
        {children}
        {toast ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: insets.top + 12,
              left: 16,
              right: 16,
              zIndex: 1000,
              elevation: 1000,
            }}>
            <View className="self-center max-w-full rounded-full bg-[#187A45] px-5 py-3 shadow-lg">
              <Text
                accessibilityLiveRegion="polite"
                numberOfLines={2}
                className="text-center text-[14px] font-bold text-white">
                {toast}
              </Text>
            </View>
          </View>
        ) : null}
      </UserToastContext.Provider>
      <Modal
        visible={alert !== null}
        transparent
        animationType="fade"
        onRequestClose={dismissAlert}>
        <View className="flex-1 justify-center bg-black/45 px-6">
          {alert ? (
            <View className="rounded-[24px] border border-[#F6D4B2] bg-[#FFFCF8] p-5 shadow-2xl">
              <View className="mb-4 h-[44px] w-[44px] items-center justify-center rounded-full bg-[#FFF0E1]">
                <CircleAlert size={24} color="#E87424" />
              </View>
              <Text className="text-[18px] font-black text-[#351D0E]">
                {alert.title}
              </Text>
              {alert.message ? (
                <Text className="mt-2 text-[14px] leading-5 text-[#634D3B]">
                  {alert.message}
                </Text>
              ) : null}
              <View
                className={`mt-6 ${
                  alert.buttons.length === 2 ? 'flex-row gap-3' : 'gap-3'
                }`}>
                {alert.buttons.map((button, index) => {
                  const cancel = button.style === 'cancel';
                  const destructive = button.style === 'destructive';
                  return (
                    <Pressable
                      key={`${button.text}-${index}`}
                      accessibilityRole="button"
                      onPress={() => {
                        dismissAlert();
                        button.onPress?.();
                      }}
                      className={`h-[48px] items-center justify-center rounded-[14px] border px-4 ${
                        alert.buttons.length === 2 ? 'flex-1' : 'w-full'
                      } ${
                        cancel
                          ? 'border-[#E8D5C2] bg-white'
                          : destructive
                            ? 'border-[#C2410C] bg-[#C2410C]'
                            : 'border-[#F97316] bg-[#F97316]'
                      }`}>
                      <Text
                        className={`text-[14px] font-bold ${
                          cancel ? 'text-[#634D3B]' : 'text-white'
                        }`}>
                        {button.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </UserAlertContext.Provider>
  );
}

export function useUserAlert() {
  const showAlert = useContext(UserAlertContext);
  if (!showAlert) {
    throw new Error('useUserAlert must be used within UserAlertProvider.');
  }
  return showAlert;
}

export function useUserToast() {
  const showToast = useContext(UserToastContext);
  if (!showToast) {
    throw new Error('useUserToast must be used within UserAlertProvider.');
  }
  return showToast;
}
