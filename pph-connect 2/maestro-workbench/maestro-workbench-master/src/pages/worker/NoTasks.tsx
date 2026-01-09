import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NoTasks = () => {
  const navigate = useNavigate();

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Worker Workbench</h1>
        <p className="text-muted-foreground">No tasks available</p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-muted p-6">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          
          <h2 className="text-2xl font-semibold mb-4">No Tasks Available</h2>
          
          <div className="space-y-4 text-muted-foreground max-w-md mx-auto">
            <p>
              There are currently no tasks you can work on. Common reasons:
            </p>
            
            <ul className="text-left space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></span>
                You've completed all available tasks in your assigned projects
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></span>
                All assigned projects are currently paused or completed
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></span>
                You haven't been assigned to any active projects yet
              </li>
            </ul>

            <div className="pt-4">
              <p className="font-medium text-foreground">What should you do?</p>
              <p>
                Refresh to check for new tasks, or contact your project manager for additional assignments.
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-3 mt-8">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Check for New Tasks
            </Button>
            <Button variant="default" asChild>
              <a href="mailto:maxim.stockschlader@productiveplayhouse.com?subject=Worker%20Workbench%20-%20Need%20Task%20Assignment">
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact Manager
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NoTasks;