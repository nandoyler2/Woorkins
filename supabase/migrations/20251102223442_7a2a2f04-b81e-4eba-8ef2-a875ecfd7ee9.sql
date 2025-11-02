-- Add skills column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add category column as array to support multiple categories
ALTER TABLE projects ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create index for better performance on array searches
CREATE INDEX IF NOT EXISTS idx_projects_skills ON projects USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_projects_categories ON projects USING GIN(categories);

-- Comment explaining the columns
COMMENT ON COLUMN projects.skills IS 'Array of skill tags associated with the project (e.g., React, Photoshop, SEO)';
COMMENT ON COLUMN projects.categories IS 'Array of project categories (e.g., Desenvolvimento Web, Design Gráfico)';