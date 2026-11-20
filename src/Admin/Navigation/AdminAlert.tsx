/**
 * AdminAlert — custom styled confirmation modal for the Admin side.
 * Matches the visual style of the User-side UserAlert.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { CircleAlert } from 'lucide-react-native';

type AdminAlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type AdminAlertData = {
  title: string;
  message?: string;
  buttons: AdminAlertButton[];
};

type ShowAdminAlert = (
  title: string,
  message?: string,
  buttons?: AdminAlertButton[],
) => void;

const AdminAlertContext = createContext<ShowAdminAlert | null>(null);

export function AdminAlertProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [alert, setAlert] = useState<AdminAlertData | null>(null);

  const showAlert = useCallback<ShowAdminAlert>(
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

  return (
    <AdminAlertContext.Provider value={showAlert}>
      {children}
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
    </AdminAlertContext.Provider>
  );
}

export function useAdminAlert() {
  const showAlert = useContext(AdminAlertContext);
  if (!showAlert) {
    throw new Error('useAdminAlert must be used within AdminAlertProvider.');
  }
  return showAlert;
}
