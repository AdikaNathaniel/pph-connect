import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

const TestDriveAccess = () => {
  const [folderId, setFolderId] = useState('18drIZuEJSr2-Xu3dsjwZ3VS6VMYFHc0P');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-drive-access', {
        body: { folderId }
      });

      if (error) {
        setResult({ error: error.message, details: error });
      } else {
        setResult({ success: true, data });
      }
    } catch (err: any) {
      setResult({ error: err.message, details: err });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Test Google Drive Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Folder ID</Label>
            <Input
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              placeholder="Folder ID"
            />
          </div>

          <Button onClick={handleTest} disabled={testing}>
            {testing ? 'Testing...' : 'Test Drive Access'}
          </Button>

          {result && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Result:</h3>
              <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TestDriveAccess;

