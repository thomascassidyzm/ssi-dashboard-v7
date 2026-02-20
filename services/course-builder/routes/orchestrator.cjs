/**
 * Chat room for agent ↔ human communication.
 *
 * Simple model: both sides POST messages, both sides GET messages.
 * Agent polls GET /chat/:courseCode?after=<timestamp> for new messages.
 * Human approve/redo is just a message with role:'human' and action:'approve'|'redo'.
 *
 * All messages stored in orchestrator_messages table.
 */

const { Router } = require('express');

module.exports = function (ctx) {
  const router = Router();

  // ===========================================================================
  // POST /orchestrator/chat/:courseCode — Post a message (agent or human)
  // Body: { role: 'agent'|'human', message: string, action?: 'approve'|'redo', metadata?: {} }
  // ===========================================================================
  router.post('/orchestrator/chat/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const { role, message, action, metadata = {} } = req.body;

      if (!message) {
        return res.status(400).json({ ok: false, error: 'message is required' });
      }
      if (!role || !['agent', 'human'].includes(role)) {
        return res.status(400).json({ ok: false, error: 'role must be "agent" or "human"' });
      }

      const direction = role === 'agent' ? 'agent_to_human' : 'human_to_agent';

      const { data, error } = await ctx.supabase
        .from('orchestrator_messages')
        .insert({
          course_code: courseCode,
          direction,
          checkpoint: null,
          message,
          metadata: { ...metadata, ...(action ? { action } : {}) },
          status: action ? 'responded' : 'pending',
          response_action: action || null,
          responded_at: action ? new Date().toISOString() : null
        })
        .select('id, created_at')
        .single();

      if (error) throw error;

      // If human sends approve/redo, also mark the latest pending agent message as responded
      if (role === 'human' && (action === 'approve' || action === 'redo')) {
        const { data: pendingAgent } = await ctx.supabase
          .from('orchestrator_messages')
          .select('id')
          .eq('course_code', courseCode)
          .eq('direction', 'agent_to_human')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        if (pendingAgent?.length) {
          await ctx.supabase
            .from('orchestrator_messages')
            .update({
              status: 'responded',
              response_action: action,
              response: message || null,
              responded_at: new Date().toISOString()
            })
            .eq('id', pendingAgent[0].id);
        }

        // Set approved_at on the seed when human approves
        if (action === 'approve') {
          const seedMatch = (message || '').match(/seed\s+(\d+)/i);
          const seedNum = seedMatch ? parseInt(seedMatch[1]) : (metadata?.seed_number || null);
          if (seedNum) {
            await ctx.supabase
              .from('course_seeds')
              .update({ approved_at: new Date().toISOString() })
              .eq('course_code', courseCode)
              .eq('seed_number', seedNum);
            console.log(`[CHAT] Seed ${seedNum} approved for ${courseCode}`);
          }
        }
      }

      // Broadcast via WebSocket
      ctx.emitPipelineEvent(courseCode, 'chat:message', {
        id: data.id,
        role,
        message,
        action: action || null,
        created_at: data.created_at
      });

      res.json({ ok: true, id: data.id, created_at: data.created_at });
    } catch (err) {
      console.error('[CHAT] Post error:', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ===========================================================================
  // GET /orchestrator/chat/:courseCode — Get messages (both sides read the same stream)
  // Query: ?after=<ISO timestamp> to get only new messages, ?limit=N (default 50)
  // ===========================================================================
  router.get('/orchestrator/chat/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const after = req.query.after;
      const limit = parseInt(req.query.limit) || 50;

      let query = ctx.supabase
        .from('orchestrator_messages')
        .select('id, direction, message, metadata, status, response_action, response, created_at, responded_at')
        .eq('course_code', courseCode)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (after) {
        query = query.gt('created_at', after);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Simplify for consumers
      const messages = (data || []).map(m => ({
        id: m.id,
        role: m.direction === 'agent_to_human' ? 'agent' : 'human',
        message: m.message,
        action: m.metadata?.action || m.response_action || null,
        status: m.status,
        metadata: m.metadata,
        created_at: m.created_at
      }));

      res.json({ ok: true, messages });
    } catch (err) {
      console.error('[CHAT] Get error:', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ===========================================================================
  // Legacy endpoints — keep working for backwards compat during transition
  // ===========================================================================

  // Agent posts checkpoint (old style) — maps to chat post
  router.post('/orchestrator/message/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { checkpoint, message, metadata = {} } = req.body;
    if (!message) return res.status(400).json({ ok: false, error: 'message is required' });

    const { data, error } = await ctx.supabase
      .from('orchestrator_messages')
      .insert({
        course_code: courseCode,
        direction: 'agent_to_human',
        checkpoint: checkpoint || null,
        message,
        metadata,
        status: 'pending'
      })
      .select('id, created_at')
      .single();

    if (error) return res.status(500).json({ ok: false, error: error.message });

    ctx.emitPipelineEvent(courseCode, 'chat:message', {
      id: data.id, role: 'agent', message, created_at: data.created_at
    });

    res.json({ ok: true, message_id: data.id, created_at: data.created_at });
  });

  // Agent polls specific message (old style)
  router.get('/orchestrator/poll/:courseCode/:messageId', async (req, res) => {
    const { messageId } = req.params;
    const { data, error } = await ctx.supabase
      .from('orchestrator_messages')
      .select('status, response, response_action, responded_at')
      .eq('id', messageId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ ok: false, error: 'Not found' });
      return res.status(500).json({ ok: false, error: error.message });
    }

    res.json({ ok: true, ...data });
  });

  // Legacy respond endpoint
  router.post('/orchestrator/respond/:courseCode/:messageId', async (req, res) => {
    const { courseCode, messageId } = req.params;
    const { action, response } = req.body;
    if (!action) return res.status(400).json({ ok: false, error: 'action is required' });

    const { error } = await ctx.supabase
      .from('orchestrator_messages')
      .update({ status: 'responded', response_action: action, response: response || null, responded_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) return res.status(500).json({ ok: false, error: error.message });
    ctx.emitPipelineEvent(courseCode, 'orchestrator:response', { message_id: messageId, action, response });
    res.json({ ok: true, message_id: messageId, action });
  });

  // Legacy human message
  router.post('/orchestrator/human-message/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { message } = req.body;
    if (!message) return res.status(400).json({ ok: false, error: 'message is required' });

    const { data, error } = await ctx.supabase
      .from('orchestrator_messages')
      .insert({ course_code: courseCode, direction: 'human_to_agent', checkpoint: null, message, metadata: {}, status: 'pending' })
      .select('id, created_at')
      .single();

    if (error) return res.status(500).json({ ok: false, error: error.message });
    ctx.emitPipelineEvent(courseCode, 'chat:message', { id: data.id, role: 'human', message, created_at: data.created_at });
    res.json({ ok: true, message_id: data.id });
  });

  // Legacy full message log
  router.get('/orchestrator/messages/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const { data, error } = await ctx.supabase
      .from('orchestrator_messages')
      .select('*')
      .eq('course_code', courseCode)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) return res.status(500).json({ ok: false, error: error.message });
    res.json({ ok: true, messages: data || [] });
  });

  // Legacy status
  router.get('/orchestrator/status/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { getPipelineStatus } = require('../lib/pipeline.cjs');
    const pipelineStatus = await getPipelineStatus(ctx.supabase, courseCode);
    res.json({ ok: true, pipeline: pipelineStatus });
  });

  // Legacy mark-read
  router.post('/orchestrator/mark-read/:courseCode', async (req, res) => {
    const { message_ids } = req.body;
    if (!message_ids?.length) return res.json({ ok: true, marked: 0 });
    const { error } = await ctx.supabase
      .from('orchestrator_messages')
      .update({ status: 'responded', responded_at: new Date().toISOString() })
      .eq('course_code', req.params.courseCode)
      .eq('direction', 'human_to_agent')
      .in('id', message_ids);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    res.json({ ok: true, marked: message_ids.length });
  });

  return router;
};
