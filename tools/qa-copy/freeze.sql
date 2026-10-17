-- Run with -v dbname=<copy>. Makes the finished copy read-only by default (a client can still override
-- it, but nothing writes to the copy by accident).
ALTER DATABASE :"dbname" SET default_transaction_read_only = on;
