-- set up permissions and roles; this all needs to be executed as a superuser.
-- On the docker container, that's admin. In the RDS world, that's the rds
-- superuser. For some of these, the line will fail, depending on which world
-- you're in.

\set membersPwd `echo "$KANSA_PG_PASSWORD"`
\set hugoPwd `echo "$HUGO_PG_PASSWORD"`
\set artPwd `echo "$RAAMI_PG_PASSWORD"`


CREATE ROLE api_access;
GRANT api_access TO admin;
GRANT USAGE ON SCHEMA admin TO api_access;
GRANT SELECT ON TABLE admin.Admins TO api_access;
GRANT ALL PRIVILEGES ON TABLE public.session TO api_access;

CREATE USER members WITH PASSWORD :'membersPwd' IN ROLE api_access;
GRANT members TO admin;

CREATE USER hugo WITH PASSWORD :'hugoPwd' IN ROLE api_access;
GRANT hugo TO admin;

CREATE USER art WITH PASSWORD :'artPwd' IN ROLE api_access;
GRANT art TO admin;

