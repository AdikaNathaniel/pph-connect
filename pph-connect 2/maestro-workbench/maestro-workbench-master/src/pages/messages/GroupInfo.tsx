import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Users,
  Loader2,
  UserMinus,
  UserPlus,
  LogOut,
  Shield,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface GroupMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  full_name: string;
  email: string;
  user_role: string;
}

interface GroupDetails {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  is_active: boolean;
}

const GroupInfo: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const getMessagesBasePath = () => {
    return user?.role === 'worker' ? '/w/messages' : '/m/messages';
  };

  const getInboxPath = () => {
    return user?.role === 'worker' ? '/w/messages/inbox' : '/m/messages/inbox';
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (groupId && currentUserId) {
      fetchGroupDetails();
      fetchMembers();
    }
  }, [groupId, currentUserId]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchGroupDetails = async () => {
    if (!groupId) return;

    setLoading(true);
    try {
      const { data: groupData, error } = await supabase
        .from('message_groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) throw error;

      setGroup(groupData);

      // Check if current user is admin
      if (currentUserId) {
        const { data: memberData } = await supabase
          .from('group_members')
          .select('role')
          .eq('group_id', groupId)
          .eq('user_id', currentUserId)
          .is('left_at', null)
          .single();

        setIsAdmin(
          memberData?.role === 'admin' || groupData.created_by === currentUserId
        );
      }
    } catch (error: any) {
      console.error('Error fetching group:', error);
      toast.error('Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!groupId) return;

    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          profiles!group_members_user_id_fkey(full_name, email, role)
        `)
        .eq('group_id', groupId)
        .is('left_at', null)
        .order('role', { ascending: false })
        .order('joined_at', { ascending: true });

      if (error) throw error;

      const formattedMembers: GroupMember[] = (data || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        full_name: m.profiles?.full_name || 'Unknown',
        email: m.profiles?.email || '',
        user_role: m.profiles?.role || 'unknown',
      }));

      setMembers(formattedMembers);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    }
  };

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the group?')) {
      return;
    }

    try {
      // Set left_at timestamp instead of deleting
      const { error } = await supabase
        .from('group_members')
        .update({ left_at: new Date().toISOString() })
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Member removed from group');
      await fetchMembers();
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleLeaveGroup = async () => {
    if (!currentUserId || !groupId) return;

    if (
      !confirm(
        'Are you sure you want to leave this group? You will no longer receive messages from this group.'
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('group_members')
        .update({ left_at: new Date().toISOString() })
        .eq('group_id', groupId)
        .eq('user_id', currentUserId);

      if (error) throw error;

      toast.success('You have left the group');
      navigate(getBasePath());
    } catch (error: any) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave group');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(getInboxPath())}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Messages
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Group not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate(`${getMessagesBasePath()}/group/${groupId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Conversation
        </Button>
      </div>

      {/* Group Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Group Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Group Avatar and Name */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {getInitials(group.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{group.name}</h2>
              {group.description && (
                <p className="text-muted-foreground mt-1">{group.description}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Group Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Members</p>
              <p className="text-2xl font-bold">{members.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDistanceToNow(new Date(group.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          <Separator />

          {/* Leave Group Button */}
          {!isAdmin && (
            <Button
              variant="destructive"
              onClick={handleLeaveGroup}
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Leave Group
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Members List Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Members ({members.length})
            </CardTitle>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info('Add member feature coming soon')}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{member.full_name}</p>
                      {member.role === 'admin' && (
                        <Badge variant="default" className="text-xs">
                          <Shield className="mr-1 h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                      {member.user_id === currentUserId && (
                        <Badge variant="secondary" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                      <Badge variant={getRoleBadgeColor(member.user_role)}>
                        {member.user_role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Joined {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {/* Remove Member Button (admins only, can't remove self or creator) */}
                {isAdmin &&
                  member.user_id !== currentUserId &&
                  member.user_id !== group.created_by && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id, member.user_id)}
                    >
                      <UserMinus className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GroupInfo;
