#!/bin/bash

# Script to replace old toast system with Sonner across all files

echo "Replacing old toast system with Sonner..."

# List of files to update (excluding ui/toaster.tsx which is the old component)
files=(
  "src/components/QuestionStatusModal.tsx"
  "src/components/StatsModal.tsx"
  "src/components/ProjectPreviewModal.tsx"
  "src/components/ProjectEditModal.tsx"
  "src/components/TaskForm.tsx"
  "src/pages/ChangePassword.tsx"
  "src/pages/admin/Setup.tsx"
  "src/pages/manager/NewProject.tsx"
  "src/pages/manager/Questions.tsx"
  "src/pages/manager/UserManagement.tsx"
  "src/pages/manager/PluginManager.tsx"
  "src/pages/manager/Stats.tsx"
  "src/pages/manager/NewPlugin.tsx"
  "src/pages/manager/PasteLogs.tsx"
  "src/pages/manager/ProjectAssignment.tsx"
  "src/pages/worker/Workbench.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    
    # Replace import
    sed -i '' 's/import { useToast } from .*use-toast.*;/import { toast } from "sonner";/' "$file"
    
    # Remove useToast hook usage
    sed -i '' '/const { toast } = useToast();/d' "$file"
    
    # Replace toast calls with variant: "destructive" to toast.error
    sed -i '' 's/toast({[[:space:]]*title: "\([^"]*\)",[[:space:]]*description: "\([^"]*\)",[[:space:]]*variant: "destructive",[[:space:]]*})/toast.error("\1", {\n          description: "\2",\n        })/g' "$file"
    
    # Replace simple toast calls
    sed -i '' 's/toast({[[:space:]]*title: "\([^"]*\)",[[:space:]]*description: "\([^"]*\)",[[:space:]]*})/toast.success("\1", {\n          description: "\2",\n        })/g' "$file"
    
    echo "Updated $file"
  else
    echo "File $file not found, skipping..."
  fi
done

echo "Toast replacement complete!"
