'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { getJoinedGroups } from '@/lib/api/groups';

export function useGroupMembers() {
  const [memberUsers, setMemberUsers] = useState<{ id: string; name: string }[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  const { data: groupsData, isLoading: groupsLoading } = useSWR<any[]>('/api/groups', () => getJoinedGroups(), {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const joinedGroups = groupsData || [];

  useEffect(() => {
    if (groupsLoading) return;
    if (joinedGroups.length > 0) {
      setMembersLoading(true);
      const loadAllMembers = async () => {
        const map = new Map<string, { id: string; name: string }>();
        try {
          const profileRes = await fetch('/api/profiles/me');
          const profileJson = await profileRes.json();
          if (profileJson.data) {
            const myId = profileJson.data.id;
            map.set(myId, { id: myId, name: profileJson.data.name || '自分' });
          }
        } catch (e) {
          console.error(e);
        }

        await Promise.all(
          joinedGroups.map(async (g: any) => {
            try {
              const r = await fetch(`/api/groups/${g.id}/members`);
              const j = await r.json();
              (j.data || []).forEach((m: any) => {
                map.set(m.id, { id: m.id, name: m.name });
              });
            } catch (e) {
              console.error(e);
            }
          })
        );
        setMemberUsers(Array.from(map.values()));
        setMembersLoading(false);
      };
      loadAllMembers();
    } else {
      setMembersLoading(false);
    }
  }, [joinedGroups, groupsLoading]);

  return { memberUsers, joinedGroups, isLoading: groupsLoading || membersLoading };
}

