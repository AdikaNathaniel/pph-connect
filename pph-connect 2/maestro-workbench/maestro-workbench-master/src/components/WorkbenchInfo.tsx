import React from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Project } from '@/types';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';

interface WorkbenchInfoProps {
  project: Project;
}

const WorkbenchInfo: React.FC<WorkbenchInfoProps> = ({ project }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Info className="h-4 w-4 mr-1" />
          Info
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Project Information</DialogTitle>
          <DialogDescription>
            Details about your current project assignment
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Project Name</h4>
            <p className="text-sm text-muted-foreground">{project.name}</p>
          </div>
          
          {project.description && (
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">{project.description}</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Locale</h4>
              <Badge variant="outline">{project.locale || 'en_us'}</Badge>
            </div>
            <div>
              <h4 className="font-medium mb-2">Language</h4>
              <p className="text-sm text-muted-foreground">{project.language || 'English'}</p>
            </div>
          </div>
          
          {project.instructions && (
            <div>
              <h4 className="font-medium mb-2">Instructions</h4>
              <div className="p-3 bg-muted rounded-md text-sm prose prose-sm max-w-none">
                <ReactMarkdown>{project.instructions}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkbenchInfo;