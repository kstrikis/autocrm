-- Create function to update user role with transaction safety
CREATE OR REPLACE FUNCTION public.update_user_role(p_user_id UUID, p_role text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result json;
BEGIN
    -- Validate role
    IF p_role NOT IN ('customer', 'service_rep', 'admin') THEN
        RAISE EXCEPTION 'Invalid role: %', p_role;
    END IF;

    -- Start transaction
    BEGIN
        -- Update user_profiles
        UPDATE public.user_profiles
        SET role = p_role,
            updated_at = NOW()
        WHERE id = p_user_id
        RETURNING json_build_object(
            'id', id,
            'role', role,
            'updated_at', updated_at
        ) INTO v_result;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'User not found: %', p_user_id;
        END IF;

        -- Return the result
        RETURN v_result;
    EXCEPTION
        WHEN OTHERS THEN
            -- Roll back transaction and re-raise the error
            RAISE;
    END;
END;
$$;
