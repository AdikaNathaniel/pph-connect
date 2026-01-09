import React from 'react';
import { ForumBoard } from '@/pages/worker/Forum';

export const CommunityForumPage: React.FC = () => (
  <ForumBoard
    testId="community-forum-page"
    heading="Community Hub"
    subheading="Company-wide knowledge sharing for workers and managers."
  />
);

export default CommunityForumPage;
