-- Create function to update timestamp on record updates
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;