import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Search, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated: (groupId: string) => void;
}

const CreateGroupDialog: React.FC<CreateGroupDialogProps> = ({
  open,
  onOpenChange,
  onGroupCreated,
}) => {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  useEffect(() => {
    if (open) {
      fetchAvailableUsers();
    }
  }, [open]);

  const fetchAvailableUsers = async () => {
    setFetchingUsers(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Fetch all users except the current user
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .neq('id', currentUser.id)
        .order('full_name');

      if (error) throw error;

      setAvailableUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setFetchingUsers(false);
    }
  };

  // Filter users based on search query
  useEffect(() => {
    if (!userSearchQuery.trim()) {
      setFilteredUsers(availableUsers);
    } else {
      const filtered = availableUsers.filter((user) =>
        user.full_name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(userSearchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [userSearchQuery, availableUsers]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Group name is required');
      return;
    }

    if (selectedUserIds.length === 0) {
      toast.error('Please select at least one member');
      return;
    }

    setLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      // Step 1: Create the group
      const { data: group, error: groupError } = await supabase
        .from('message_groups')
        .insert({
          name: groupName,
          description: groupDescription || null,
          created_by: currentUser.id,
          group_type: 'conversation',
          is_active: true,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Step 2: Add selected members to the group
      // Note: The creator is automatically added as admin by the database trigger
      const memberRecords = selectedUserIds.map((userId) => ({
        group_id: group.id,
        user_id: userId,
        role: 'member',
      }));

      const { error: membersError } = await supabase
        .from('group_members')
        .insert(memberRecords);

      if (membersError) throw membersError;

      toast.success(`Group "${groupName}" created successfully`);

      // Reset form
      setGroupName('');
      setGroupDescription('');
      setSelectedUserIds([]);

      // Close dialog and notify parent
      onOpenChange(false);
      onGroupCreated(group.id);
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'root':
      case 'super_admin':
      case 'admin':
        return 'destructive';
      case 'manager':
        return 'default';
      case 'team_lead':
        return 'secondary';
      case 'worker':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create New Group
          </DialogTitle>
          <DialogDescription>
            Create a conversation group to chat with multiple team members
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name *</Label>
            <Input
              id="group-name"
              placeholder="e.g., Project Team, Marketing Department"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Group Description */}
          <div className="space-y-2">
            <Label htmlFor="group-description">Description (Optional)</Label>
            <Textarea
              id="group-description"
              placeholder="What is this group for?"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          {/* Member Selection */}
          <div className="space-y-2">
            <Label>Select Members *</Label>
            <p className="text-sm text-muted-foreground">
              Choose team members to add to this group. You will be added as the group admin.
            </p>

            {/* User Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, or role..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-10 pr-10"
                disabled={loading || fetchingUsers}
              />
              {userSearchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setUserSearchQuery('')}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {fetchingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {userSearchQuery ? 'No users found matching your search' : 'No users available'}
                  </p>
                ) : (
                  filteredUsers.map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent"
                    >
                      <Checkbox
                        id={`user-${profile.id}`}
                        checked={selectedUserIds.includes(profile.id)}
                        onCheckedChange={() => toggleUserSelection(profile.id)}
                        disabled={loading}
                      />
                      <label
                        htmlFor={`user-${profile.id}`}
                        className="flex-1 flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <p className="text-sm font-medium">{profile.full_name}</p>
                          <p className="text-xs text-muted-foreground">{profile.email}</p>
                        </div>
                        <Badge variant={getRoleBadgeColor(profile.role)}>
                          {profile.role}
                        </Badge>
                      </label>
                    </div>
                  ))
                )}
              </div>
            )}

            {selectedUserIds.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedUserIds.length} member{selectedUserIds.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateGroup}
            disabled={loading || !groupName.trim() || selectedUserIds.length === 0}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
