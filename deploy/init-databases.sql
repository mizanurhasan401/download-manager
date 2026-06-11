SELECT 'CREATE DATABASE file_conversion'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'file_conversion')\gexec

SELECT 'CREATE DATABASE image_processing'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'image_processing')\gexec

GRANT ALL PRIVILEGES ON DATABASE file_conversion TO download_manager;
GRANT ALL PRIVILEGES ON DATABASE image_processing TO download_manager;
