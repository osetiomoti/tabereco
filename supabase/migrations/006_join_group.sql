-- Groups join RPC function with SECURITY DEFINER to bypass RLS
-- Allows a user to join a group by invite code without needing SELECT permission on the groups table first.

CREATE OR REPLACE FUNCTION join_group_by_code(p_invite_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the current authenticated user's ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find the group by invite code
  SELECT id INTO v_group_id FROM groups WHERE invite_code = p_invite_code;
  
  -- If no group found, return null
  IF v_group_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Add the user to the group members
  -- ON CONFLICT DO NOTHING handles the case where they are already a member
  INSERT INTO group_members (group_id, user_id) 
  VALUES (v_group_id, v_user_id)
  ON CONFLICT DO NOTHING;
  
  RETURN v_group_id;
END;
$$;
