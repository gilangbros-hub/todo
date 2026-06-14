-- Drop the tables associated with the RPG Quest Board
DROP TABLE IF EXISTS clipboard_items CASCADE;
DROP TABLE IF EXISTS battle_log CASCADE;
DROP TABLE IF EXISTS player_stats CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS folders CASCADE;

-- Drop any related functions (that aren't shared by the remaining auth/oracle features)
DROP FUNCTION IF EXISTS update_streak() CASCADE;
DROP FUNCTION IF EXISTS record_battle_move(uuid, text, integer, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS forfeit_quest(uuid, uuid, jsonb) CASCADE;
