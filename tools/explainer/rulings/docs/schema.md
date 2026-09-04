<!-- The schema-truth ruling — HAND-MAINTAINED RULINGS SOURCE, rendered in the
Rulings layer of the Pedagogy surface and quoted beside every schema render on the
Stock-take surface. Founder ruling 2026-07-29. -->

## current schema is truth, migrations lie

The live schema snapshot is the single source of truth about the database; migration history
is a lossy changelog. Proof from this system's own life: `family_members` was live in the
database from 2026-07-10 with no migration file ever committed — anyone reading the migrations
pile would have sworn the table didn't exist. This is the database twin of the ruling that
hand-written docs are stale caches: a pile of past intentions is not a description of the
present, and the only honest way to describe the present is to dump it. So wherever Popty
shows schema, it renders from a live dump of the running database — never from migration
files, and never from prose that remembers what the schema used to be. The code-reference scan
(the tables the code actually touches) rides alongside as a cross-check, not as the truth: a
table can be real and unreferenced, exactly as `family_members` was.
