/**
 * Minimal in-memory fake of the supabase-js query builder, for route/gate
 * tests that need real chained-filter behavior without a live DB.
 * Supports the subset of the API this repo's routes actually use:
 * select/eq/neq/in/lt/gt/lte/gte/not/order/limit/single, insert/update/upsert/delete,
 * awaited directly (thenable) or via .select() afterward.
 */
function makeFakeSupabase(db) {
  function table(name) {
    db[name] = db[name] || [];
    return db[name];
  }

  function query(name) {
    const rows = table(name);
    let filters = [];
    let singleMode = false;
    let orderCol = null, orderAsc = true;
    let limitN = null;
    let wantCount = false;
    let pendingOp = null; // { type, payload, opts }

    const matches = (row) => filters.every(f => {
      const v = row[f.col];
      switch (f.op) {
        case 'eq': return v === f.val;
        case 'neq': return v !== f.val;
        case 'in': return f.val.includes(v);
        case 'lt': return v < f.val;
        case 'gt': return v > f.val;
        case 'lte': return v <= f.val;
        case 'gte': return v >= f.val;
        case 'not_null': return v !== null && v !== undefined;
        default: return true;
      }
    });

    const apply = () => {
      let r = rows.filter(matches);
      if (orderCol) {
        r = [...r].sort((a, b) => {
          const dir = orderAsc ? 1 : -1;
          if (a[orderCol] < b[orderCol]) return -dir;
          if (a[orderCol] > b[orderCol]) return dir;
          return 0;
        });
      }
      if (limitN != null) r = r.slice(0, limitN);
      return r;
    };

    const resolveSelect = () => {
      // Clone rows out — a real supabase-js select() round-trips through JSON,
      // so callers never hold a live reference into the in-memory table (a
      // later update() must not retroactively mutate an already-read row).
      const matched = apply().map(r => ({ ...r }));
      const data = singleMode ? (matched[0] || null) : matched;
      const out = { data, error: null };
      if (wantCount) out.count = matched.length;
      return out;
    };

    const resolveOp = () => {
      if (pendingOp.type === 'update') {
        const matched = apply();
        for (const row of matched) Object.assign(row, pendingOp.payload);
        const returned = matched.map(r => ({ ...r })); // decouple from the live row, see resolveSelect
        return { data: singleMode ? (returned[0] || null) : returned, error: null, count: matched.length };
      }
      if (pendingOp.type === 'delete') {
        const matched = apply();
        db[name] = rows.filter(r => !matched.includes(r));
        return { data: matched, error: null, count: matched.length };
      }
      if (pendingOp.type === 'insert' || pendingOp.type === 'upsert') {
        const arr = Array.isArray(pendingOp.payload) ? pendingOp.payload : [pendingOp.payload];
        const onConflict = pendingOp.opts && pendingOp.opts.onConflict
          ? pendingOp.opts.onConflict.split(',') : null;
        const inserted = [];
        for (const row of arr) {
          if (pendingOp.type === 'upsert' && onConflict) {
            const idx = rows.findIndex(r => onConflict.every(k => r[k] === row[k]));
            if (idx >= 0) { rows[idx] = { ...rows[idx], ...row }; inserted.push(rows[idx]); continue; }
          }
          const copy = { ...row };
          rows.push(copy);
          inserted.push(copy);
        }
        return { data: singleMode ? (inserted[0] || null) : inserted, error: null };
      }
      return { data: null, error: null };
    };

    const builder = {
      select(_cols, opts) { if (opts && opts.count) wantCount = true; return builder; },
      eq(col, val) { filters.push({ op: 'eq', col, val }); return builder; },
      neq(col, val) { filters.push({ op: 'neq', col, val }); return builder; },
      in(col, val) { filters.push({ op: 'in', col, val }); return builder; },
      lt(col, val) { filters.push({ op: 'lt', col, val }); return builder; },
      gt(col, val) { filters.push({ op: 'gt', col, val }); return builder; },
      lte(col, val) { filters.push({ op: 'lte', col, val }); return builder; },
      gte(col, val) { filters.push({ op: 'gte', col, val }); return builder; },
      not(col, _is, _val) { filters.push({ op: 'not_null', col }); return builder; },
      order(col, opts) { orderCol = col; orderAsc = !(opts && opts.ascending === false); return builder; },
      limit(n) { limitN = n; return builder; },
      single() { singleMode = true; return builder; },
      insert(payload) { pendingOp = { type: 'insert', payload }; return builder; },
      update(payload) { pendingOp = { type: 'update', payload }; return builder; },
      upsert(payload, opts) { pendingOp = { type: 'upsert', payload, opts }; return builder; },
      delete(_opts) { pendingOp = { type: 'delete' }; return builder; },
      // Real Promise under the hood (not a bare thenable) so chained
      // .then(...).catch(...)/.finally(...) — used by fire-and-forget writes
      // in several routes — works exactly like the live supabase-js client.
      _toPromise() {
        return new Promise((resolve) => {
          resolve(pendingOp ? resolveOp() : resolveSelect());
        });
      },
      then(onFulfilled, onRejected) { return builder._toPromise().then(onFulfilled, onRejected); },
      catch(onRejected) { return builder._toPromise().catch(onRejected); },
      finally(onFinally) { return builder._toPromise().finally(onFinally); },
    };
    return builder;
  }

  return { from: (name) => query(name) };
}

module.exports = { makeFakeSupabase };
