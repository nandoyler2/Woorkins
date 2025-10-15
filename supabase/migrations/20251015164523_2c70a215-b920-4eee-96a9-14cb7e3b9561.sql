-- Update message-attachments bucket to 49MB limit
UPDATE storage.buckets 
SET file_size_limit = 51380224
WHERE id = 'message-attachments';