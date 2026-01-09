import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, FileText, File, ExternalLink } from 'lucide-react';
import { Project } from '@/types';
import ReactMarkdown from 'react-markdown';

interface ProjectInstructionsProps {
  project: Project;
}

const ProjectInstructions: React.FC<ProjectInstructionsProps> = ({ project }) => {
  const [open, setOpen] = useState(false);

  // Don't render if no instructions at all
  if (!project.instructions && !project.instructions_pdf_url && !project.instructions_google_docs_url) {
    return null;
  }

  const hasMultiple = [project.instructions, project.instructions_pdf_url, project.instructions_google_docs_url].filter(Boolean).length > 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Info className="h-4 w-4 mr-2" />
          Instructions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Project Instructions: {project.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Always show markdown text first if available */}
          {project.instructions && (
            <ScrollArea className="max-h-[50vh] pr-4">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{project.instructions}</ReactMarkdown>
              </div>
            </ScrollArea>
          )}
          
          {/* Show additional resources as buttons below the text */}
          {(project.instructions_pdf_url || project.instructions_google_docs_url) && (
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              {project.instructions_pdf_url && (
                <Button 
                  asChild
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <a 
                    href={project.instructions_pdf_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <File className="h-4 w-4" />
                    View PDF Guide
                  </a>
                </Button>
              )}
              
              {project.instructions_google_docs_url && (
                <Button 
                  asChild
                  className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                >
                  <a 
                    href={project.instructions_google_docs_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Google Doc
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectInstructions;