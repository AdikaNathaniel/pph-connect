# Exploratory Testing Plan

## Edge Case Scenarios
- **Marketplace**: Apply with rehire cooldown, expired training gate, and zero capacity listings.
- **Manager actions**: Approve/reject while capacity is full, listing toggled inactive, or worker already in project.
- **Messaging**: Send attachments at size limit, reply with long threads, verify real-time read receipts.
- **Lifecycle**: Submit exit survey twice, trigger auto-removal + rehire eligibility transitions.

## Browser Compatibility
| Browser | Viewports | Notes |
| --- | --- | --- |
| Chrome (latest) | Desktop 1280px, Tablet 1024px, Mobile 390px | Reference run for all features |
| Firefox (latest) | Desktop, Tablet | Focus on keyboard shortcuts + clipboard APIs |
| Safari (latest) | Desktop, iPad, iPhone | Validate flex layouts and file uploads |
| Edge (latest) | Desktop | Verify enterprise SSO + download flows |

## Mobile Responsiveness
- Validate `/w/dashboard`, `/w/projects/available`, `/w/messages/compose` on iPhone 14 Pro (390x844) and Pixel 7 width.
- Confirm manager dashboards degrade gracefully on iPad landscape (1024x768).
- Check sticky headers, cards, and tables for overflow + tap targets.

## Accessibility Checklist
- Run screen reader smoke (VoiceOver + NVDA) on dashboards and messaging forms.
- Keyboard navigation: Tab order, focus-visible styles, modals closable via ESC + shift+tab loops.
- Color contrast spot check on badges, status chips, and alerts.
- Ensure toast notifications expose `role="status"` for ARIA readers.

## Findings Log
| Date | Area | Browser/Device | Severity | Notes |
| --- | --- | --- | --- | --- |
| TBD | Marketplace apply modal | Safari / iPhone | Medium | Cover message textarea overlaps keyboard |
| TBD | Messaging composer | Firefox / Desktop | Low | Attachment button tooltip misaligned |
| TBD | Dashboard accessibility | Chrome / Screen reader | High | Quick-actions missing aria-labels |

Document exploratory findings here before each release and link follow-up tickets in the Notes column.
