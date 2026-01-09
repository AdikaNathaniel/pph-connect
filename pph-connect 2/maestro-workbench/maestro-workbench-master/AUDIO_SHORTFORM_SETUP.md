# Audio Shortform Plugin Setup Guide

This guide explains how to set up and deploy the new Audio Shortform plugin that loads audio files from Google Drive.

## Overview

The Audio Shortform plugin allows workers to:
1. Listen to audio files with a visual waveform player
2. Control playback (play/pause, scrubbing)
3. Enter transcriptions in a simple text field

## Components Created

### Frontend Components
1. **`AudioShortformPlayer.tsx`** - Audio player with waveform visualization
2. **`googleDriveLoader.ts`** - Utility functions for Google Drive integration
3. **Modified `TaskForm.tsx`** - Now supports audio-short modality rendering
4. **Modified `NewPlugin.tsx`** - Plugin creation form with Drive folder URL input
5. **Modified `NewProject.tsx`** - Project creation with auto-detection of audio plugins

### Supabase Edge Functions
1. **`list-drive-files`** - Lists audio files from a Google Drive folder
2. **`get-drive-file-url`** - Gets streaming URL for a specific audio file
3. **`populate-audio-questions`** - Creates questions from audio files in Drive folder

## Setup Instructions

### 1. Share Google Drive Folder with Service Account

Share the folder containing your audio files with the service account email:
```
data-ops-workbench-service-acc@data-ops-workbenches.iam.gserviceaccount.com
```

**Important**: Give the service account "Viewer" or "Reader" access.

Your folder URL should look like:
```
https://drive.google.com/drive/folders/18drIZuEJSr2-Xu3dsjwZ3VS6VMYFHc0P?usp=sharing
```

### 2. Deploy Supabase Edge Functions

Deploy the three new edge functions:

```bash
# Deploy list-drive-files function
supabase functions deploy list-drive-files

# Deploy get-drive-file-url function
supabase functions deploy get-drive-file-url

# Deploy populate-audio-questions function
supabase functions deploy populate-audio-questions
```

### 3. Set Environment Variables

Ensure these environment variables are set in your Supabase project:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - The service account email
- `GOOGLE_PRIVATE_KEY` - The private key from the service account JSON file

### 4. Create Audio Shortform Plugin

1. Navigate to `/m/plugins` in your app
2. Click "New Plugin"
3. Fill in the form:
   - **Name**: e.g., "Audio Transcription - Shortform"
   - **Description**: Describe the task
   - **Modality**: Select "🎵 Audio Shortform (Playback + Form)"
   - **Google Drive Folder URL**: Paste your folder URL
4. Click "Save Plugin"

The plugin will automatically create a transcription field configuration.

### 5. Create a Project

1. Navigate to `/m/projects/new`
2. Select your Audio Shortform plugin from the template dropdown
3. The Google Drive folder URL will auto-populate
4. Fill in project details (name, instructions, etc.)
5. Click "Launch Project"

The system will automatically:
- Scan the Drive folder for audio files
- Create one question per audio file
- Set up the project for worker assignment

### 6. Assign Workers

Use the `/m/assignments` page to assign workers to the project as normal.

## Worker Experience

When a worker opens the workbench for an audio-short project, they will see:

1. **Audio Player Section** (top):
   - Large play/pause button
   - Interactive waveform visualization
   - Time display (current/total)
   - Click waveform to skip to any position

2. **Transcription Field** (below):
   - Single textarea for entering transcription
   - Required field

3. **Submit Button** (bottom):
   - Standard submit workflow
   - Keyboard shortcut: Cmd/Ctrl + Enter

## Technical Details

### Data Flow

1. Plugin creation stores Drive folder URL in `google_sheet_url` field
2. Project creation calls `populate-audio-questions` edge function
3. Edge function lists all audio files from Drive folder
4. One question is created per audio file with metadata:
   ```json
   {
     "audio_file": "filename.mp3",
     "drive_file_id": "1abc...",
     "mime_type": "audio/mpeg"
   }
   ```
5. When worker opens task:
   - `TaskForm` detects audio-short modality
   - Calls `get-drive-file-url` with `drive_file_id`
   - Loads audio into `AudioShortformPlayer`
   - Renders transcription field

### Supported Audio Formats

- MP3 (`.mp3`)
- WAV (`.wav`)
- OGG (`.ogg`)
- M4A (`.m4a`)
- AAC (`.aac`)
- WebM Audio (`.webm`)

## Troubleshooting

### Audio files not loading
- Verify the folder is shared with the service account
- Check that the folder URL is correct
- Ensure audio files are directly in the folder (not in subfolders)
- Check Supabase edge function logs

### Waveform not displaying
- Ensure the browser supports the Web Audio API
- Check browser console for CORS errors
- Verify the audio file URL is accessible

### Questions not created
- Check that edge functions are deployed
- Verify environment variables are set
- Look at Supabase logs for errors
- Ensure folder contains valid audio files

## Next Steps

Future enhancements could include:
- Playback speed control
- Loop functionality  
- Rewind/forward buttons (±10s)
- Audio quality selection
- Multi-speaker identification
- Timestamp annotation

## Questions?

For issues or questions, check:
1. Supabase edge function logs
2. Browser developer console
3. Network tab for failed requests

