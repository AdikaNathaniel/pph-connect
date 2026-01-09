export type NotificationChannel = 'email' | 'in_app' | 'none';

export interface NotificationPreferences {
  reply: NotificationChannel;
  mention: NotificationChannel;
  upvote: NotificationChannel;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  reply: 'in_app',
  mention: 'email',
  upvote: 'in_app',
};

export const getNotificationPreferences = async (workerId: string | null): Promise<NotificationPreferences> => {
  if (!workerId) {
    return DEFAULT_PREFERENCES;
  }
  // placeholder: fetch from supabase once table exists
  return DEFAULT_PREFERENCES;
};

export const updateNotificationPreferences = async (
  workerId: string,
  prefs: NotificationPreferences
): Promise<void> => {
  // placeholder: upsert into supabase
  console.info('Saving notification prefs', workerId, prefs);
};

const notifyUser = (workerId: string, channel: NotificationChannel, message: string) => {
  console.info(`[notify:${channel}]`, workerId, message);
};

export const notifyThreadReply = async (workerId: string, threadTitle: string) => {
  const prefs = await getNotificationPreferences(workerId);
  if (prefs.reply !== 'none') {
    notifyUser(workerId, prefs.reply, `New reply on "${threadTitle}"`);
  }
};

export const notifyMention = async (workerId: string, postId: string) => {
  const prefs = await getNotificationPreferences(workerId);
  if (prefs.mention !== 'none') {
    notifyUser(workerId, prefs.mention, `You were mentioned in post ${postId}`);
  }
};

export const notifyPostUpvote = async (workerId: string, postId: string, upvotes: number) => {
  const prefs = await getNotificationPreferences(workerId);
  if (prefs.upvote !== 'none' && upvotes >= 5) {
    notifyUser(workerId, prefs.upvote, `Your post ${postId} reached ${upvotes} upvotes!`);
  }
};
