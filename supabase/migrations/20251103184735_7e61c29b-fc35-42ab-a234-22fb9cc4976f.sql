-- Ensure typing_indicators has REPLICA IDENTITY FULL for realtime updates
ALTER TABLE typing_indicators REPLICA IDENTITY FULL;