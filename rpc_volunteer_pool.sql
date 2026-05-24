-- SQL to create the RPC functions needed for the volunteer pool system
-- Run in Supabase SQL Editor

DROP FUNCTION IF EXISTS reserve_single_case(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS reserve_case_batch(uuid, uuid, int);
DROP FUNCTION IF EXISTS release_volunteer_session(uuid, uuid);

-- 1. Reserve a single case for a volunteer (atomic, prevents race conditions)
CREATE OR REPLACE FUNCTION reserve_single_case(
  p_volunteer_id uuid,
  p_family_id uuid,
  p_campaign_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment_id uuid;
BEGIN
  -- Check if already assigned
  IF EXISTS (
    SELECT 1 FROM case_assignments
    WHERE family_id = p_family_id
      AND campaign_id = p_campaign_id
      AND volunteer_id IS NOT NULL
      AND status NOT IN ('no_answer', 'unreachable')
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'already_assigned');
  END IF;

  -- Upsert into case_assignments
  INSERT INTO case_assignments (campaign_id, family_id, volunteer_id, status, assigned_at)
  VALUES (p_campaign_id, p_family_id, p_volunteer_id, 'in_progress', NOW())
  ON CONFLICT (campaign_id, family_id) DO UPDATE
    SET volunteer_id = p_volunteer_id,
        status = 'in_progress',
        assigned_at = NOW()
  WHERE case_assignments.status IN ('pending', 'no_answer', 'unreachable')
  RETURNING id INTO v_assignment_id;

  IF v_assignment_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'conflict');
  END IF;

  -- Lock it (with campaign context)
  INSERT INTO case_locks (family_id, campaign_id, locked_by, locked_at, expires_at)
  VALUES (p_family_id, p_campaign_id, p_volunteer_id, NOW(), NOW() + interval '30 minutes')
  ON CONFLICT (family_id) DO UPDATE SET
    campaign_id = p_campaign_id,
    locked_by = p_volunteer_id,
    locked_at = NOW(),
    expires_at = NOW() + interval '30 minutes';

  RETURN jsonb_build_object('success', true, 'assignment_id', v_assignment_id);
END;
$$;

-- 2. Reserve a batch of cases (e.g. 10 at a time) for offline work
CREATE OR REPLACE FUNCTION reserve_case_batch(
  p_volunteer_id uuid,
  p_campaign_id uuid,
  p_limit int DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int := 0;
BEGIN
  -- Assign unassigned (or previously failed) cases
  WITH available AS (
    SELECT id FROM case_assignments
    WHERE campaign_id = p_campaign_id
      AND status IN ('pending', 'no_answer', 'unreachable')
    ORDER BY RANDOM()
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE case_assignments
  SET volunteer_id = p_volunteer_id,
      status = 'in_progress',
      assigned_at = NOW()
  FROM available
  WHERE case_assignments.id = available.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'reserved', v_count);
END;
$$;

-- 3. Release all unfinished cases for a volunteer (end session)
CREATE OR REPLACE FUNCTION release_volunteer_session(
  p_volunteer_id uuid,
  p_campaign_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int;
BEGIN
  -- Reset in_progress cases (not completed ones) back to unassigned
  UPDATE case_assignments
  SET volunteer_id = NULL,
      status = 'pending',
      assigned_at = NULL
  WHERE volunteer_id = p_volunteer_id
    AND campaign_id = p_campaign_id
    AND status = 'in_progress';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Remove all locks by this volunteer
  DELETE FROM case_locks WHERE locked_by = p_volunteer_id;

  RETURN jsonb_build_object('success', true, 'released', v_count);
END;
$$;
