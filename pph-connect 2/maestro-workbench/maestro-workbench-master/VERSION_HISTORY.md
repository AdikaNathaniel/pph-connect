# Version History

## Version 0.2.200 - Shortform audio workflow functional (QC flow pending)
**Date:** October 26, 2025

### Changes
- Shortform audio workflow functional (QC flow pending)

---

## Version 0.2.122 - Dependency Updates & Security Patches
**Date:** October 12, 2025

### Changes
- Merged all 5 Snyk security/dependency updates:
  - @radix-ui/react-toast: 1.2.14 → 1.2.15
  - @radix-ui/react-context-menu: 2.2.15 → 2.2.16
  - @radix-ui/react-dropdown-menu: 2.1.15 → 2.1.16
  - @tanstack/react-query: 5.83.0 → 5.89.0
  - lucide-react: 0.462.0 → 0.544.0
- All builds tested successfully after each merge
- Version bump for dependency update milestone

---

## Version 0.2.121 - Backup Checkpoint Before Dependency Updates
**Date:** October 12, 2025

### Changes
- Created backup branch of main before dependency updates
- Version bump to 0.2.121
- Checkpoint commit for safe dependency management

---

## Version 0.2.0 - Audio Shortform Plugin & Major UI Overhaul
**Date:** October 6, 2025

### Major Features
- **Audio Shortform Plugin**: New modality for audio transcription tasks
  - Google Drive integration for audio file storage
  - WaveSurfer.js audio player with waveform visualization
  - Support for .mp3, .wav, .m4a, and .aac file formats
  - Dynamic question generation from Drive folder contents
- **Manager Dashboard Enhancements**:
  - Project Overview data table with TanStack Table
  - Real-time project data from Supabase (replaced mock data)
  - Column sorting, filtering, and visibility controls
  - Pagination support
  - Inline project editing dialog with due date support
  - Action dropdown menu (View Questions, Edit, Preview, State management)
  - Alert dialog confirmation for destructive actions
- **Worker Interface Redesign**:
  - Minimalist layout with subtle header and footer
  - 1568px max-width container across all /w pages
  - Full-focus task content area without interruptions
  - Improved workbench, dashboard, and analytics layouts
  - Logout functionality added to worker dashboard
  - Fixed scroll behavior for better focus

### Technical Improvements
- **Supabase Edge Functions**:
  - `populate-audio-questions`: Creates questions from Google Drive audio files
  - `list-drive-files`: Lists files in a Drive folder
  - `get-drive-file-url`: Generates temporary streaming URLs for audio files
  - `test-drive-access`: Debugging endpoint for Drive API access
- **Google Drive API Integration**:
  - Service account authentication
  - OAuth 2.0 JWT token generation
  - Folder-based file listing and access
- **Component Architecture**:
  - `AudioShortformPlayer`: Reusable audio player component
  - `ProjectsOverviewTable`: Full-featured data table
  - `projects-overview-columns`: Column definitions for project table
- **Bug Fixes**:
  - Fixed infinite re-render in data tables
  - Corrected routing for questions page
  - Fixed progress bar calculations using real question counts
  - Improved layout constraints (h-screen, overflow handling)
  - Enhanced error handling and logging throughout

### Database Changes
- Extended task templates to support audio-short modality
- Added modality_config for audio-specific settings
- Project schema supports Google Drive folder URLs

### Developer Experience
- Comprehensive debugging logs for troubleshooting
- Better error messages with context
- Improved code organization and documentation

### Known Issues (Work in Progress)
- Google Drive folder access permissions being debugged
- Service account authentication refinement in progress

---

## Version 0.1.8 - Updated Maestro branding colors to blue-900 theme
**Date:** October 4, 2025

### Changes
- Updated Maestro logo icon to white text on blue-900 background
- Changed "Maestro" text color to blue-900 for consistency
- Fixed responsive spacing on landing page (1rem mobile, 8rem desktop)

## Version 0.1.7 - Redesigned landing and auth pages with shadcn/ui
**Date:** October 4, 2025

### Changes
- Completely redesigned landing page with shadcn/ui Blue theme and Geist fonts
- Implemented unified landing/auth flow with seamless role selection
- Added subtle animations and improved responsive design
- Applied consistent 1568px max-width layout across all pages
- Enhanced visual hierarchy with proper spacing and typography
- Fixed layout consistency between landing and auth pages

---

## Version 0.1.6 - Fixed favicon loading and rebuilt dist folder
**Date:** October 4, 2025

### Changes
- Fixed favicon loading issue by rebuilding dist folder with updated index.html
- Ensured all Lovable branding removed from production build
- All meta tags now properly reference Maestro branding

---

## Version 0.1.5 - Updated favicon.ico with proper Maestro branding
**Date:** October 4, 2025

### Changes
- Updated favicon.ico with proper Maestro branding

---

## Version 0.1.4 - Added proper Maestro logo image
**Date:** October 4, 2025

### Changes
- Added proper Maestro logo image

---

## Version 0.1.3 - Updated site branding to Maestro - Preview with new logo
**Date:** October 4, 2025

### Changes
- Updated site branding to Maestro - Preview with new logo

---

## Version 0.1.2 - Added Vercel Speed Insights and environment variable support
**Date:** October 3, 2025

### Changes
- Added Vercel Speed Insights and environment variable support

---

## Version 0.1.1 - Added version tracking system
**Date:** October 3, 2025

### Changes
- Added version tracking system

---

This document tracks all changes and updates to the Maestro Workbench application.

## Version 0.1.0 - Initial Release
**Date:** January 3, 2025

### Features Added
- **Version Tracking System**: Added version tracker component to all main pages
- **Landing Page**: Role selection interface for Manager/Worker access
- **Manager Dashboard**: Complete project management interface
  - Project creation and management
  - User management and assignments
  - Real-time progress tracking
  - Analytics and reporting
- **Worker Workbench**: Task completion interface
  - Question claiming system
  - Task form with validation
  - Progress tracking
  - Session-based completion counting
- **Authentication System**: Role-based access control
- **Database Integration**: Supabase backend with RLS policies
- **Question Management**: Dynamic question generation and replication
- **Analytics Dashboard**: Worker performance metrics

### Technical Implementation
- React 18 with TypeScript
- Vite build system
- Tailwind CSS for styling
- Shadcn/ui component library
- Supabase for backend services
- Real-time data synchronization

### Database Schema
- Projects table with status tracking
- Questions table with replication management
- Tasks table with assignment system
- Answers table with AHT tracking
- User profiles with role management
- Project assignments with priority system

---

## Version Management Guidelines

### Semantic Versioning
We use semantic versioning (SemVer) format: `MAJOR.MINOR.PATCH`

- **MAJOR** (0.x.x): Breaking changes or major feature additions
- **MINOR** (x.1.x): New features, backward compatible
- **PATCH** (x.x.1): Bug fixes, small improvements

### Pre-Launch Versioning
Since we haven't launched yet, we're using `0.x.x` format:
- `0.1.0` - Initial development version
- `0.2.0` - Next major feature set
- `0.1.1` - Bug fixes and minor improvements

### Version Update Process
1. Update version in `package.json`
2. Document changes in this file
3. Commit with version tag
4. Deploy and verify version tracker displays correctly

### Version Tracker Locations
- Landing page (/) - Footer
- Manager Dashboard (/dashboard) - Footer  
- Worker Workbench (/dashboard) - Footer

---

## Future Versions

### Planned Features (0.2.0)
- [ ] Enhanced analytics dashboard
- [ ] Bulk project operations
- [ ] Advanced reporting features
- [ ] Mobile app optimization

### Planned Features (0.3.0)
- [ ] API rate limiting
- [ ] Advanced user permissions
- [ ] Export functionality
- [ ] Integration with external tools

---

*Last Updated: October 6, 2025*
