import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { NotificationPreferences, NotificationChannel } from '@/services/notificationService';

const channelOptions: { value: NotificationChannel; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'in_app', label: 'In-app' },
  { value: 'none', label: 'None' },
];

const defaultPrefs: NotificationPreferences = {
  reply: 'in_app',
  mention: 'email',
  upvote: 'in_app',
};

export const WorkerNotificationsPage: React.FC = () => {
  const [prefs, setPrefs] = useState(defaultPrefs);

  const handleChange = (field: keyof NotificationPreferences, value: NotificationChannel) => {
    setPrefs((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="bg-background min-h-screen" data-testid="worker-notifications-page">
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Notifications</p>
          <h1 className="text-3xl font-bold">Forum Notifications</h1>
          <p className="text-sm text-muted-foreground">Choose how to get alerted when the community interacts with your content.</p>
        </div>

        <Card data-testid="notification-preferences-form">
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
                {([
                  ['reply', 'Reply to your thread'],
                  ['mention', 'Mention in a post'],
                  ['upvote', 'Upvotes on your post']
                ] as const).map(([field, label]) => (
                  <div key={field} className="flex flex-col gap-2">
                <Label>{label}</Label>
                <Select value={prefs[field]} onValueChange={(value) => handleChange(field, value as NotificationChannel)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {channelOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <Button disabled>Save preferences (coming soon)</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkerNotificationsPage;
