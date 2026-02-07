import admin from "firebase-admin";

function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export async function sendPushNotification(
  token: string,
  options: {
    title: string;
    body: string;
    callId: string;
    roomUrl?: string;
    kidName?: string;
  }
): Promise<string> {
  const app = getFirebaseAdmin();

  return admin.messaging(app).send({
    token,
    notification: {
      title: options.title,
      body: options.body,
    },
    data: {
      callId: options.callId,
      roomUrl: options.roomUrl || "",
      kidName: options.kidName || "Dein Kind",
    },
    webpush: {
      fcmOptions: {
        link: options.roomUrl || "/parent",
      },
      notification: {
        requireInteraction: true,
      },
    },
    android: {
      priority: "high",
      notification: {
        channelId: "family_calls",
        priority: "max",
        defaultSound: true,
        defaultVibrateTimings: true,
      },
    },
  });
}

export async function sendPushToMultiple(
  tokens: string[],
  options: Parameters<typeof sendPushNotification>[1]
): Promise<{ successCount: number; failureCount: number }> {
  const app = getFirebaseAdmin();

  const response = await admin.messaging(app).sendEachForMulticast({
    tokens,
    notification: {
      title: options.title,
      body: options.body,
    },
    data: {
      callId: options.callId,
      roomUrl: options.roomUrl || "",
      kidName: options.kidName || "Dein Kind",
    },
  });

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
  };
}
