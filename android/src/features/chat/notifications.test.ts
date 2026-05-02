jest.mock("expo-notifications", () => ({
  AndroidImportance: {
    DEFAULT: 3,
    HIGH: 4,
    MAX: 5,
  },
  IosAuthorizationStatus: {
    PROVISIONAL: 3,
  },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { createDefaultAppSettings } from "../../settings/schema/defaults";
import type { AppSettings } from "../../settings/schema/types";
import {
  initializeNotificationsRuntime,
  scheduleLocalActivityNotification,
  syncNotificationChannels,
} from "./notifications";
import type {
  ActivityNotificationKind,
  MobileActivityNotification,
} from "./types";

const originalPlatformOs = Platform.OS;

function setPlatformOs(os: "android" | "ios") {
  Object.defineProperty(Platform, "OS", {
    configurable: true,
    value: os,
  });
}

function createNotification(
  kind: ActivityNotificationKind = "status",
): MobileActivityNotification {
  return {
    id: `notification-${kind}`,
    kind,
    laudoId: 80,
    title: "Atualização",
    body: "Mensagem",
    createdAt: "2026-03-26T18:00:00.000Z",
    unread: true,
    targetThread: kind.startsWith("mesa_") ? "mesa" : "chat",
  };
}

function createNotificationSettings(
  overrides: Partial<AppSettings["notifications"]> = {},
): AppSettings["notifications"] {
  return {
    ...createDefaultAppSettings().notifications,
    ...overrides,
  };
}

describe("notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPlatformOs("android");
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
    });
    (Notifications.setNotificationChannelAsync as jest.Mock).mockResolvedValue(
      undefined,
    );
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(
      "scheduled-1",
    );
  });

  afterAll(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatformOs,
    });
  });

  it("usa a preferência de som no handler de notificações em primeiro plano", async () => {
    await syncNotificationChannels(
      createNotificationSettings({ soundEnabled: false }),
    );

    initializeNotificationsRuntime();

    const handler = (Notifications.setNotificationHandler as jest.Mock).mock
      .calls[0]?.[0] as {
      handleNotification: () => Promise<{ shouldPlaySound: boolean }>;
    };

    await expect(handler.handleNotification()).resolves.toMatchObject({
      shouldPlaySound: false,
    });
  });

  it("não agenda notificação local quando a categoria está desligada", async () => {
    await scheduleLocalActivityNotification({
      notification: createNotification("status"),
      settings: createNotificationSettings({ chatCategoryEnabled: false }),
    });

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("configura canais Android com som e vibração desligados", async () => {
    await syncNotificationChannels(
      createNotificationSettings({
        soundEnabled: false,
        vibrationEnabled: false,
      }),
    );

    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      "tariel-chat",
      expect.objectContaining({
        enableVibrate: false,
        sound: null,
        vibrationPattern: undefined,
      }),
    );
  });
});
