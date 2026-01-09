# Direct Message Test: View Thread History

Steps:
1. Seed a thread with multiple messages (worker ↔ manager) so that `/m/messages/thread/:id` has at least 60 entries.
2. Open the thread view; `fetchMessages` retrieves messages ordered by `sent_at DESC`, reverses them, and stores them via `setMessages`.
3. Scroll to the bottom and press “Load earlier messages.” The component raises `messagesLimit`, triggers another fetch, and sets `showLoadMore` based on the returned length.
4. Confirm that earlier messages appear and the thread reads chronologically after the reverse.

Result: Pass – thread history can be viewed and extended via the load-more control.
