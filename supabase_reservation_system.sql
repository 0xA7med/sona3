-- DROP FUNCTION IF EXISTS reserve_case_batch(uuid, uuid, int);

CREATE OR REPLACE FUNCTION reserve_case_batch(
    p_volunteer_id UUID,
    p_campaign_id UUID,
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    assignment_id UUID,
    family_id UUID,
    mother_name TEXT,
    phone TEXT,
    total_amount NUMERIC
) AS $$
DECLARE
    v_family_record RECORD;
    v_new_assignment_id UUID;
BEGIN
    -- 1. Atomic Selection of N unassigned families in the campaign
    -- This uses FOR UPDATE SKIP LOCKED to prevent race conditions
    FOR v_family_record IN (
        SELECT f.id, f.mother_name, f.phone, f.total_amount
        FROM families f
        WHERE f.status = 'active'
          AND NOT EXISTS (
              SELECT 1 FROM case_assignments ca 
              WHERE ca.family_id = f.id 
                AND ca.campaign_id = p_campaign_id
                AND ca.status IN ('pending', 'in_progress', 'completed')
          )
        ORDER BY f.priority_score DESC
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    ) LOOP
        -- 2. Insert into assignments
        INSERT INTO case_assignments (
            volunteer_id,
            family_id,
            campaign_id,
            status,
            assigned_at
        ) VALUES (
            p_volunteer_id,
            v_family_record.id,
            p_campaign_id,
            'pending',
            NOW()
        )
        RETURNING id INTO v_new_assignment_id;

        -- 3. Return results
        assignment_id := v_new_assignment_id;
        family_id := v_family_record.id;
        mother_name := v_family_record.mother_name;
        phone := v_family_record.phone;
        total_amount := COALESCE(v_family_record.total_amount, 0);
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for single reservation
CREATE OR REPLACE FUNCTION reserve_single_case(
    p_volunteer_id UUID,
    p_family_id UUID,
    p_campaign_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_new_id UUID;
BEGIN
    -- Check if already assigned
    IF EXISTS (
        SELECT 1 FROM case_assignments 
        WHERE family_id = p_family_id AND campaign_id = p_campaign_id
    ) THEN
        RAISE EXCEPTION 'Case already assigned';
    END IF;

    INSERT INTO case_assignments (
        volunteer_id,
        family_id,
        campaign_id,
        status,
        assigned_at
    ) VALUES (
        p_volunteer_id,
        p_family_id,
        p_campaign_id,
        'pending',
        NOW()
    ) RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

