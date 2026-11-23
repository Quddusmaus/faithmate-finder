import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { pushEnabled, registerForPush } from "@/lib/pushNotifications";

/**
 * Native app only: once a member is signed in, ask for notification
 * permission and register this device. Tapping a notification opens the
 * page it points to. Renders nothing.
 */
export function PushNotificationsRegistrar() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const userId = user?.id;

  useEffect(() => {
    if (!userId || !pushEnabled()) return;
    registerForPush((path) => navigate(path)).catch((err) =>
      console.warn("Push setup failed:", err),
    );
  }, [userId, navigate]);

  return null;
}
