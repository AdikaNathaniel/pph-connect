# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/0e8ab2aa-99c4-4c01-a31b-a9a675dbc2ef

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/0e8ab2aa-99c4-4c01-a31b-a9a675dbc2ef) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/0e8ab2aa-99c4-4c01-a31b-a9a675dbc2ef) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Version Management

This project includes a comprehensive version tracking system to help you monitor updates and changes.

### Version Tracker
- **Location**: Displayed in the footer of all main pages (Landing, Manager Dashboard, Worker Workbench)
- **Format**: Shows current version number (e.g., "Version 0.1.0")
- **Purpose**: Helps users identify which version they're currently viewing

### Version History
- **File**: `VERSION_HISTORY.md` - Complete changelog of all updates
- **Format**: Semantic versioning (MAJOR.MINOR.PATCH)
- **Pre-launch**: Using `0.x.x` format until official release

### Updating Versions
Use the automated version update script:

```bash
# Update to patch version (bug fixes)
npm run version:update 0.1.1 "Fixed task assignment bug"

# Update to minor version (new features)
npm run version:update 0.2.0 "Added analytics dashboard"

# Update to major version (breaking changes)
npm run version:update 1.0.0 "Official launch version"
```

The script will:
1. Update `package.json` version
2. Add entry to `VERSION_HISTORY.md`
3. Provide commit instructions

### Version Display
The version is automatically injected during build from `package.json` and displayed via the `VersionTracker` component on:
- Landing page (`/`)
- Manager Dashboard (`/dashboard`)
- Worker Workbench (`/dashboard`)
