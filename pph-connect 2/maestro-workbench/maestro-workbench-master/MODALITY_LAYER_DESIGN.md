# Modality Layer Implementation

## Overview
This document describes the Modality Layer added to the plugin system. This is a **non-breaking** change that adds modality classification and optional label ontology support to task templates (plugins).

## Design Philosophy
- **Additive, Not Destructive**: All existing spreadsheet plugins continue to work without any changes
- **Optional Features**: Label ontology is only required for modalities that need annotation (audio, text, image, video)
- **Backward Compatible**: All existing plugins automatically become "spreadsheet" modality via database defaults

---

## Database Schema

### New Columns in `task_templates` Table

```sql
-- Modality type (defaults to 'spreadsheet' for existing plugins)
modality TEXT NOT NULL DEFAULT 'spreadsheet'

-- Modality-specific configuration
modality_config JSONB DEFAULT '{}'

-- Optional label ontology for annotation tasks
label_ontology JSONB DEFAULT NULL
```

### Valid Modality Types
- `spreadsheet` - Current spreadsheet-based tasks (no ontology needed)
- `audio` - Audio annotation tasks with optional ontology
- `text` - Text annotation tasks with optional ontology
- `image` - Image annotation tasks with optional ontology
- `video` - Video annotation tasks with optional ontology
- `multimodal` - Mixed media tasks with optional ontology

---

## TypeScript Interfaces

### Modality Configuration

```typescript
interface ModalityConfig {
  // Spreadsheet modality (current)
  spreadsheet?: Record<string, never>; // Empty object
  
  // Audio modality
  audio?: {
    fileFormats: string[];
    duration: 'short' | 'long';
    quality: 'high' | 'standard';
    storageUrl: string;
    transcriptionRequired: boolean;
    playbackControls: {
      speed: boolean;
      loop: boolean;
      waveform: boolean;
    };
  };
  
  // Text modality
  text?: {
    maxLength: number;
    minLength: number;
    allowMarkdown: boolean;
  };
  
  // Image modality
  image?: {
    fileFormats: string[];
    maxResolution: string;
    annotationTools: string[];
  };
  
  // Video modality
  video?: {
    fileFormats: string[];
    maxDuration: number;
    playbackControls: {
      speed: boolean;
      frame: boolean;
    };
  };
}
```

### Label Ontology (Optional)

```typescript
interface LabelOntology {
  name: string;                      // "Sentiment Classification"
  description: string;
  
  categories: {
    id: string;
    name: string;                    // "Sentiment"
    labels: {
      id: string;
      name: string;                  // "Positive"
      color: string;                 // "#22c55e"
      description?: string;
      shortcut?: string;             // "P" key
    }[];
    multiSelect: boolean;            // Can select multiple labels?
    required: boolean;
  }[];
  
  hierarchical?: {
    enabled: boolean;
    parentChild: Record<string, string[]>;
  };
}
```

---

## Migration Strategy

### Step 1: Database Migration ✅
- File: `supabase/migrations/20251004000000_add_modality_layer.sql`
- Adds new columns with safe defaults
- All existing plugins become 'spreadsheet' modality automatically
- No data migration required

### Step 2: TypeScript Types ✅
- Updated `src/types/index.ts` with new interfaces
- Added `Modality`, `ModalityConfig`, and `LabelOntology` types
- Extended `TaskTemplate` interface with new fields

### Step 3: Plugin Manager Updates ✅
- Updated `src/pages/manager/NewPlugin.tsx`
- Form now includes modality fields (defaults to 'spreadsheet')
- Save/load functions handle new fields
- Backward compatible with existing plugins

---

## Usage Examples

### Example 1: Existing Spreadsheet Plugin (No Changes Needed)
```typescript
{
  name: "Data Entry Plugin",
  modality: "spreadsheet",          // Automatically set
  modality_config: {},              // Empty for spreadsheet
  label_ontology: null,             // Not needed for spreadsheet
  column_config: [...]              // Existing config works as-is
}
```

### Example 2: New Audio Plugin with Ontology
```typescript
{
  name: "Audio Sentiment Analysis",
  modality: "audio",
  modality_config: {
    audio: {
      fileFormats: ['mp3', 'wav'],
      duration: 'short',
      quality: 'high',
      storageUrl: 'https://storage.example.com/audio/',
      transcriptionRequired: true,
      playbackControls: {
        speed: true,
        loop: true,
        waveform: true
      }
    }
  },
  label_ontology: {
    name: "Sentiment Classification",
    description: "Classify audio sentiment",
    categories: [
      {
        id: "sentiment",
        name: "Sentiment",
        labels: [
          { id: "pos", name: "Positive", color: "#22c55e", shortcut: "P" },
          { id: "neg", name: "Negative", color: "#ef4444", shortcut: "N" },
          { id: "neu", name: "Neutral", color: "#6b7280", shortcut: "U" }
        ],
        multiSelect: false,
        required: true
      }
    ]
  },
  column_config: []  // Not used for audio modality
}
```

---

## Next Steps

### Immediate Next Steps
1. **Apply Migration**: Run the database migration to add new columns
2. **Test Existing Plugins**: Verify all existing spreadsheet plugins still work
3. **UI Enhancement**: Add modality selector dropdown in NewPlugin form

### Future Enhancements
1. **Audio Plugin Builder**: Create specialized UI for audio plugin configuration
2. **Label Ontology Editor**: WYSIWYG editor for creating annotation schemas
3. **Modality-Specific Workbench**: Worker UI adapts based on plugin modality
4. **Quality Control**: Add inter-rater reliability metrics for annotation tasks

---

## Safety Guarantees

✅ **No Breaking Changes**
- All existing plugins continue working without modification
- Database defaults ensure backward compatibility
- TypeScript types are additive (new optional fields)

✅ **Gradual Adoption**
- Can create new audio/text/image plugins alongside spreadsheet plugins
- Existing workflows unchanged
- Migration path is smooth and non-disruptive

✅ **Data Integrity**
- Validation constraints ensure data quality
- JSONB fields allow flexible configuration
- Proper indexes for performance

---

*Document Created: October 4, 2025*
*Last Updated: October 4, 2025*

